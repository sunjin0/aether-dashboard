import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { history, useIntl, useModel, useParams } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Collapse,
  Drawer,
  Grid,
  List,
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  ApartmentOutlined,
  BlockOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  DeleteOutlined,
  DownOutlined,
  FilterOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  NotificationOutlined,
  PlayCircleFilled,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
  SendOutlined,
  SettingOutlined,
  StopFilled,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  ReactFlow,
  ReactFlowInstance,
  addEdge,
  reconnectEdge,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Panel,
  Position,
  Handle,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AgentWorkflow,
  WorkflowNode,
  WorkflowVersion,
  getWorkflow,
  getWorkflowList,
  getWorkflowVersions,
  publishWorkflow,
  updateWorkflow,
  validateWorkflowDraft,
} from '@/services/workflow/workflow/WorkflowController';
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController';
import { getAgentToolInfo, getAgentToolOptions } from '@/services/agent/ToolController';
import StartVariablesBuilder from '../StartVariablesBuilder';
import useDraftGuard from './useDraftGuard';
import { validateBeforePublish } from './validation';
import styles from './index.less';

type WorkflowData = { workflowNode: WorkflowNode };
const FieldTip: React.FC<{ title: React.ReactNode }> = ({ title }) => (
  <Tooltip title={title}>
    <InfoCircleOutlined style={{ color: '#8c8c8c', marginLeft: 4 }} />
  </Tooltip>
);
const CardTitle: React.FC<{ title: React.ReactNode; tip: React.ReactNode }> = ({ title, tip }) => (
  <span>
    {title} <FieldTip title={tip} />
  </span>
);
const color: Record<string, string> = {
  start: '#52c41a',
  agent: '#1677ff',
  tool: '#fa8c16',
  interaction: '#722ed1',
  wait_event: '#13c2c2',
  rule: '#9254de',
  http: '#d46b08',
  notification: '#eb2f96',
  subflow: '#2f54eb',
  parallel: '#531dab',
  join: '#531dab',
  delay: '#fa8c16',
  end: '#13c2c2',
};
const paletteIcon = (type: WorkflowNode['type']) => {
  const style = { color: color[type] || '#1677ff', fontSize: 17 };
  switch (type) {
    case 'start':
      return <PlayCircleFilled style={style} />;
    case 'agent':
      return <RobotOutlined style={style} />;
    case 'tool':
      return <ToolOutlined style={style} />;
    case 'interaction':
      return <UserOutlined style={style} />;
    case 'rule':
      return <FilterOutlined style={style} />;
    case 'http':
      return <GlobalOutlined style={style} />;
    case 'notification':
      return <NotificationOutlined style={style} />;
    case 'subflow':
      return <BlockOutlined style={style} />;
    case 'parallel':
      return <ApartmentOutlined style={style} />;
    case 'join':
      return <ClusterOutlined style={style} />;
    case 'wait_event':
      return <ClockCircleOutlined style={style} />;
    case 'delay':
      return <ClockCircleOutlined style={style} />;
    case 'end':
      return <StopFilled style={style} />;
    default:
      return <SettingOutlined style={style} />;
  }
};
const nodeUsageKeys: Record<WorkflowNode['type'], string> = {
  start: 'nodeUsageStart',
  agent: 'nodeUsageAgent',
  tool: 'nodeUsageTool',
  interaction: 'nodeUsageInteraction',
  rule: 'nodeUsageRule',
  http: 'nodeUsageHttp',
  notification: 'nodeUsageNotification',
  subflow: 'nodeUsageSubflow',
  parallel: 'nodeUsageParallel',
  join: 'nodeUsageJoin',
  wait_event: 'nodeUsageWaitEvent',
  delay: 'nodeUsageDelay',
  end: 'nodeUsageEnd',
};
const nodeUsage = (intl: ReturnType<typeof useIntl>, type: WorkflowNode['type']) =>
  intl.formatMessage({ id: `pages.agent.workflow.editor.${nodeUsageKeys[type]}` });
const paletteGroups: Array<{ key: string; labelKey: string; types: WorkflowNode['type'][] }> = [
  {
    key: 'execute',
    labelKey: 'pages.agent.workflow.editor.groupExecute',
    types: ['agent', 'tool', 'rule', 'http', 'notification'],
  },
  {
    key: 'collaborate',
    labelKey: 'pages.agent.workflow.editor.groupCollaborate',
    types: ['interaction', 'subflow', 'wait_event'],
  },
  {
    key: 'control',
    labelKey: 'pages.agent.workflow.editor.groupControl',
    types: ['delay', 'parallel', 'join'],
  },
];
const nodeLabel = (intl: ReturnType<typeof useIntl>, type: string) =>
  intl.formatMessage({ id: `pages.agent.workflow.run.node.${type}` });
const textValue = (value: unknown) => (typeof value === 'string' ? value : undefined);
const numberValue = (value: unknown) => (typeof value === 'number' ? value : undefined);
const initial = (intl: ReturnType<typeof useIntl>): WorkflowNode[] => [
  { id: 'start', type: 'start', name: nodeLabel(intl, 'start'), position: { x: 80, y: 260 } },
  { id: 'end', type: 'end', name: nodeLabel(intl, 'end'), position: { x: 780, y: 260 } },
];
const buildArgumentsTemplate = (schema?: string) => {
  if (!schema) return '{}';
  try {
    const parsed = JSON.parse(schema);
    const properties =
      parsed?.properties && typeof parsed.properties === 'object' ? parsed.properties : parsed;
    if (!properties || Array.isArray(properties) || typeof properties !== 'object') return '{}';
    const initialValues: Record<string, unknown> = {};
    Object.entries(properties).forEach(([key, value]: [string, any]) => {
      initialValues[key] = value?.example ?? value?.default ?? '';
    });
    return JSON.stringify(initialValues, null, 2);
  } catch {
    return '{}';
  }
};
// 并行分支内容允许普通 Agent 与确定性节点：规则/HTTP/通知/延时，或免确认（never）的工具；交互/子流程/等待等节点不允许。
const isDeterministicBranchNode = (node: WorkflowNode): boolean => {
  if (node.type === 'tool')
    return String(node.toolApprovalPolicy ?? 'ask').toLowerCase() === 'never';
  return (
    node.type === 'agent' ||
    node.type === 'rule' ||
    node.type === 'http' ||
    node.type === 'notification' ||
    node.type === 'delay'
  );
};
// 并行分支区域：从各并行节点出边出发沿连线前进、不跨越汇聚节点，所覆盖的节点集合。
const computeParallelBranchRegion = (
  workflowNodes: WorkflowNode[],
  workflowEdges: Array<{ source: string; target: string }>,
) => {
  const adjacency = new Map<string, string[]>();
  workflowEdges.forEach((edge) => {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  });
  const joins = new Set(
    workflowNodes.filter((node) => node.type === 'join').map((node) => node.id),
  );
  const region = new Set<string>();
  const seen = new Set<string>();
  const queue: string[] = [];
  workflowNodes.forEach((node) => {
    if (node.type === 'parallel') queue.push(...(adjacency.get(node.id) || []));
  });
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current) || joins.has(current)) continue;
    seen.add(current);
    region.add(current);
    queue.push(...(adjacency.get(current) || []));
  }
  return region;
};
// 该连线是否会破坏“并行分支内仅允许普通 Agent 与确定性节点”：返回 'join'（并行直连汇聚）或 'interactive'（交互/审批/子流程/等待入分支）。
const parallelBranchViolation = (
  workflowNodes: WorkflowNode[],
  workflowEdges: Array<{ source: string; target: string }>,
  source: WorkflowNode,
  target: WorkflowNode,
): 'join' | 'interactive' | undefined => {
  if (source.type === 'parallel') {
    if (target.type === 'join') return 'join';
    return isDeterministicBranchNode(target) ? undefined : 'interactive';
  }
  const region = computeParallelBranchRegion(workflowNodes, workflowEdges);
  if (!region.has(source.id) && !region.has(target.id)) return undefined;
  if (target.type === 'join') return undefined;
  return isDeterministicBranchNode(target) ? undefined : 'interactive';
};
const toFlowNodes = (items: WorkflowNode[]): Node<WorkflowData>[] =>
  items.map((item) => ({
    id: item.id,
    type: 'workflow',
    position: item.position || { x: 100, y: 200 },
    data: { workflowNode: item },
    deletable: !['start', 'end'].includes(item.type),
  }));
const toFlowEdges = (items: any[], defaultBranch: string, allNodes?: WorkflowNode[]): Edge[] =>
  items.map((item, index) => {
    const isLoop =
      allNodes && item.target && item.source
        ? allNodes.findIndex((n) => n.id === item.target) <
          allNodes.findIndex((n) => n.id === item.source)
        : false;
    const edgeLabel = item.condition
      ? item.label || item.condition
      : item.isDefault
        ? item.label || defaultBranch
        : item.label;
    return {
      id: item.id || `edge_${item.source}_${item.target}_${index}`,
      source: item.source,
      target: item.target,
      sourceHandle: item.sourceHandle,
      targetHandle: item.targetHandle,
      markerEnd: { type: MarkerType.ArrowClosed },
      type: 'smoothstep',
      selectable: true,
      deletable: true,
      label: edgeLabel || undefined,
      style: isLoop
        ? { stroke: '#ff4d4f', strokeDasharray: '6 3', strokeWidth: 2 }
        : item.condition
          ? { stroke: '#fa8c16', strokeWidth: 2 }
          : undefined,
      data: {
        condition: item.condition,
        isDefault: item.isDefault,
        maxIterations: item.maxIterations,
        loopLabel: item.label,
      },
    };
  });

const WorkflowCanvasNode: React.FC<NodeProps<Node<WorkflowData>>> = ({ data, selected }) => {
  const intl = useIntl();
  const item = data.workflowNode;
  const nodeColor = color[item.type];
  return (
    <div
      style={{
        minWidth: 176,
        border: `1px solid ${selected ? '#1677ff' : '#e5eaf1'}`,
        borderRadius: 8,
        overflow: 'visible',
        background: '#fff',
        boxShadow: selected ? '0 0 0 3px #91caff66, 0 5px 16px #0f172a1a' : '0 3px 10px #0f172a14',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        style={{ background: nodeColor, width: 12, height: 12 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        style={{ background: nodeColor, width: 12, height: 12 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{ background: nodeColor, width: 12, height: 12 }}
      />
      {/* 兼容早期画布保存的左侧输出和右侧输入句柄，避免历史连线丢失。 */}
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        style={{ background: nodeColor, width: 12, height: 12 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        style={{ background: nodeColor, width: 12, height: 12 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        style={{ background: nodeColor, width: 12, height: 12 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px 9px' }}>
        <span
          style={{
            width: 29,
            height: 29,
            borderRadius: 7,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${nodeColor}16`,
          }}
        >
          {paletteIcon(item.type)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: '#172033',
              fontWeight: 600,
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name || nodeLabel(intl, item.type)}
          </div>
          <div style={{ color: nodeColor, fontSize: 12, marginTop: 2 }}>
            {nodeLabel(intl, item.type)}
          </div>
        </div>
      </div>
    </div>
  );
};

type StateMappingRow = { key: string; value: string };
type OutputMappingRow = { target?: string; source?: string; template?: string; value?: string };
/** 节点输出结构叶子：点选即以 source 模式追加一行引用该来源。source 形如 $output.result 或 $output.answer。 */
type OutputLeaf = { source: string; label: string };
/** 会把输出写入全局变量的节点类型（与后端 WorkflowDefinitionValidator 产出契约一致）。 */
const PRODUCING_NODE_TYPES: WorkflowNode['type'][] = [
  'agent',
  'tool',
  'interaction',
  'rule',
  'http',
  'notification',
  'subflow',
  'wait_event',
];
const isProducingNode = (type: WorkflowNode['type']) => PRODUCING_NODE_TYPES.includes(type);
const parseOutputMappings = (value: unknown): OutputMappingRow[] =>
  Array.isArray(value)
    ? value.filter((row): row is OutputMappingRow => !!row && typeof row === 'object')
    : [];
/** 取值方式：每行三选一。与后端 applyNodeOutputs 判定一致（template > source > value），无键时缺省引用。 */
type OutputMode = 'source' | 'template' | 'value';
const outputModeKey = (
  id: 'outputMappingModeSource' | 'outputMappingModeTemplate' | 'outputMappingModeValue',
) => `pages.agent.workflow.editor.${id}`;
const outputModePlaceholderKey: Record<OutputMode, string> = {
  source: 'pages.agent.workflow.editor.outputModePlaceholderSource',
  template: 'pages.agent.workflow.editor.outputModePlaceholderTemplate',
  value: 'pages.agent.workflow.editor.outputModePlaceholderValue',
};
const hasMappingKey = (row: OutputMappingRow, key: keyof OutputMappingRow) =>
  Object.prototype.hasOwnProperty.call(row, key);
const outputModeOf = (row: OutputMappingRow): OutputMode => {
  if (hasMappingKey(row, 'template')) return 'template';
  if (hasMappingKey(row, 'source')) return 'source';
  if (hasMappingKey(row, 'value')) return 'value';
  return 'source';
};
const outputModeText = (row: OutputMappingRow, mode: OutputMode): string => {
  if (mode === 'template') return row.template || '';
  if (mode === 'source') return row.source || '';
  return row.value || '';
};

/** 统一输出映射：把节点原始输出写入流程变量。每行一个目标变量 + 单一取值方式（引用/模板/字面值三选一）。 */
const OutputsMappingEditor: React.FC<{
  value?: unknown;
  targetOptions?: Array<{ value: string; label?: string }>;
  /** source 模式下的可读变量建议（既有流程变量 + 上游节点产出）。 */
  sourceSuggestions?: Array<{ value: string; label?: string }>;
  /** 本节点可静态枚举的输出结构叶子（subflow 读子流程版本 outputSchema、form 交互读问题键）。点选即在 source 模式追加一行引用。 */
  outputStructure?: OutputLeaf[];
  /** 无结构叶子时展示的说明（自由 JSON 输出、子流程未声明输出等）。 */
  outputStructureNote?: string;
  onChange: (value: OutputMappingRow[]) => void;
}> = ({
  value,
  onChange,
  targetOptions,
  sourceSuggestions,
  outputStructure,
  outputStructureNote,
}) => {
  const intl = useIntl();
  const rows = parseOutputMappings(value);
  const t = (id: string) => intl.formatMessage({ id });
  const editTarget = (index: number, target: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, target } : row)));
  /** 行内只保留 target 与当前取值方式这一个键，避免后端按"键存在"把空模板/空来源误判为有效值。 */
  const editValue = (index: number, mode: OutputMode, text: string) =>
    onChange(
      rows.map((row, i) => {
        if (i !== index) return row;
        const next: OutputMappingRow = { target: row.target };
        next[mode] = text;
        return next;
      }),
    );
  const switchMode = (index: number, mode: OutputMode) => {
    const row = rows[index];
    editValue(index, mode, outputModeText(row, mode));
  };
  const pickStructureLeaf = (leaf: OutputLeaf) => {
    const exists = rows.some((row) => outputModeOf(row) === 'source' && row.source === leaf.source);
    if (exists) {
      message.info(t('pages.agent.workflow.editor.outputSourceDuplicated'));
      return;
    }
    onChange([...rows, { target: '', source: leaf.source }]);
  };
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {outputStructure && outputStructure.length > 0 && (
        <div>
          <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>
            {t('pages.agent.workflow.editor.outputStructureTitle')}
          </div>
          <Space size={[4, 4]} wrap>
            {outputStructure.map((leaf) => {
              const used = rows.some(
                (row) => outputModeOf(row) === 'source' && row.source === leaf.source,
              );
              return (
                <Tag
                  key={leaf.source}
                  color={used ? 'blue' : undefined}
                  style={{ cursor: 'pointer', marginInlineEnd: 0 }}
                  onClick={() => pickStructureLeaf(leaf)}
                >
                  {leaf.label}
                </Tag>
              );
            })}
          </Space>
        </div>
      )}
      {(!outputStructure || outputStructure.length === 0) && outputStructureNote && (
        <div style={{ color: '#8c8c8c', fontSize: 12, lineHeight: 1.6 }}>{outputStructureNote}</div>
      )}
      <label style={{ marginBottom: -6, fontWeight: 500 }}>
        {t('pages.agent.workflow.editor.outputMappings')}
        <FieldTip title={t('pages.agent.workflow.editor.outputMappingsTip')} />
      </label>
      {rows.map((row, index) => {
        const mode = outputModeOf(row);
        return (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(90px,0.9fr) 92px minmax(0,1.1fr) 28px',
              gap: 6,
            }}
          >
            <AutoComplete
              value={row.target || ''}
              placeholder={t('pages.agent.workflow.editor.targetVariablePlaceholder')}
              options={targetOptions}
              onChange={(target) => editTarget(index, target)}
              style={{ width: '100%' }}
            />
            <Select
              value={mode}
              style={{ width: '100%' }}
              options={[
                { value: 'source', label: t(outputModeKey('outputMappingModeSource')) },
                { value: 'template', label: t(outputModeKey('outputMappingModeTemplate')) },
                { value: 'value', label: t(outputModeKey('outputMappingModeValue')) },
              ]}
              onChange={(next) => switchMode(index, next as OutputMode)}
            />
            {mode === 'source' && sourceSuggestions?.length ? (
              <AutoComplete
                value={outputModeText(row, mode)}
                placeholder={t(outputModePlaceholderKey[mode])}
                options={sourceSuggestions}
                onChange={(text) => editValue(index, mode, text)}
                style={{ width: '100%' }}
              />
            ) : (
              <Input
                value={outputModeText(row, mode)}
                placeholder={t(outputModePlaceholderKey[mode])}
                onChange={(e) => editValue(index, mode, e.target.value)}
              />
            )}
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            />
          </div>
        );
      })}
      <Button
        type="dashed"
        block
        size="small"
        icon={<PlusOutlined />}
        onClick={() => onChange([...rows, {}])}
      >
        {t('pages.agent.workflow.editor.addOutputMapping')}
      </Button>
    </Space>
  );
};

type StructuredField = { key: string; label: string; placeholder?: string };
const StructuredListEditor: React.FC<{
  value?: unknown;
  fields: StructuredField[];
  onChange: (value: Record<string, string>[]) => void;
  addText: string;
}> = ({ value, fields, onChange, addText }) => {
  const rows = Array.isArray(value)
    ? value.filter((row): row is Record<string, string> => !!row && typeof row === 'object')
    : [];
  const update = (index: number, key: string, next: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: next } : row)));
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr)) 28px`,
            gap: 6,
          }}
        >
          {fields.map((field) => (
            <Input
              key={field.key}
              value={row[field.key] || ''}
              placeholder={field.placeholder || field.label}
              onChange={(e) => update(index, field.key, e.target.value)}
            />
          ))}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <Button
        type="dashed"
        block
        size="small"
        icon={<PlusOutlined />}
        onClick={() =>
          onChange([...rows, Object.fromEntries(fields.map((field) => [field.key, '']))])
        }
      >
        {addText}
      </Button>
    </Space>
  );
};

const TemplateObjectEditor: React.FC<{ value?: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const parse = (): StateMappingRow[] => {
    try {
      const parsed = JSON.parse(value || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.entries(parsed).map(([key, mapped]) => ({ key, value: String(mapped ?? '') }))
        : [];
    } catch {
      return [];
    }
  };
  const rows = parse();
  const update = (next: StateMappingRow[]) =>
    onChange(
      JSON.stringify(
        next.reduce<Record<string, string>>((result, row) => {
          if (row.key.trim()) result[row.key.trim()] = row.value;
          return result;
        }, {}),
      ),
    );
  return (
    <>
      <label style={{ marginBottom: -6, fontWeight: 500 }}>
        {intl.formatMessage({ id: 'pages.agent.workflow.editor.argumentsTemplate' })}
      </label>
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {rows.map((row, index) => (
          <Space key={index} size={6} style={{ display: 'flex' }}>
            <Input
              value={row.key}
              placeholder={t('pages.agent.workflow.editor.paramNamePlaceholder')}
              onChange={(e) =>
                update(
                  rows.map((item, i) => (i === index ? { ...item, key: e.target.value } : item)),
                )
              }
            />
            <Input
              value={row.value}
              placeholder={t('pages.agent.workflow.editor.paramValuePlaceholder')}
              onChange={(e) =>
                update(
                  rows.map((item, i) => (i === index ? { ...item, value: e.target.value } : item)),
                )
              }
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => update(rows.filter((_, i) => i !== index))}
            />
          </Space>
        ))}
        <Button
          type="dashed"
          block
          size="small"
          icon={<PlusOutlined />}
          onClick={() => update([...rows, { key: '', value: '' }])}
        >
          {t('pages.agent.workflow.editor.addArgument')}
        </Button>
      </Space>
    </>
  );
};

type SchemaFieldOption = { value: string; label: string };
const parseSchemaFieldOptions = (schema?: string): SchemaFieldOption[] => {
  try {
    const parsed = JSON.parse(schema || '[]');
    if (!Array.isArray(parsed)) return [];
    const options: SchemaFieldOption[] = [];
    parsed.forEach((item) => {
      if (item && typeof item === 'object' && item.name) {
        options.push({
          value: String(item.name),
          label: item.label ? `${item.name}（${item.label}）` : String(item.name),
        });
      }
    });
    return options;
  } catch {
    return [];
  }
};
/** 优先下拉选择变量/字段；当没有可选项或需要自定义名称时回退为输入框。 */
const MappingFieldSelect: React.FC<{
  value?: string;
  options: SchemaFieldOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ value, options, placeholder, onChange }) => {
  const merged = useMemo(
    () =>
      value && !options.some((item) => item.value === value)
        ? [...options, { value, label: value }]
        : options,
    [options, value],
  );
  if (!merged.length) {
    return (
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    );
  }
  return (
    <Select
      style={{ width: '100%' }}
      showSearch
      optionFilterProp="label"
      value={value || undefined}
      placeholder={placeholder}
      options={merged}
      onChange={(next) => onChange(next || '')}
    />
  );
};
type SubflowMappingRow = { target: string; source: string };
/** 子流程输入/输出映射：target 与 source 均通过下拉选择对应字段/变量。 */
const SubflowMappingEditor: React.FC<{
  value?: unknown;
  targetLabel: string;
  sourceLabel: string;
  targetOptions: SchemaFieldOption[];
  sourceOptions: SchemaFieldOption[];
  onChange: (value: SubflowMappingRow[]) => void;
  addText: string;
}> = ({ value, targetLabel, sourceLabel, targetOptions, sourceOptions, onChange, addText }) => {
  const rows = Array.isArray(value)
    ? value.filter((row): row is SubflowMappingRow => !!row && typeof row === 'object')
    : [];
  const update = (index: number, patch: Partial<SubflowMappingRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) 28px',
            gap: 6,
          }}
        >
          <MappingFieldSelect
            value={row.target}
            options={targetOptions}
            placeholder={targetLabel}
            onChange={(target) => update(index, { target })}
          />
          <MappingFieldSelect
            value={row.source}
            options={sourceOptions}
            placeholder={sourceLabel}
            onChange={(source) => update(index, { source })}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <Button
        type="dashed"
        block
        size="small"
        icon={<PlusOutlined />}
        onClick={() => onChange([...rows, { target: '', source: '' }])}
      >
        {addText}
      </Button>
    </Space>
  );
};

type CondRow = { variable: string; op: string; value: string; logic: '&&' | '||' };
const COND_OPS = ['==', '!=', '>', '>=', '<', '<=', 'contains'].map((v) => ({
  value: v,
  label: v,
}));
const COND_LOGIC: { value: '&&' | '||'; label: string }[] = [
  { value: '&&', label: '&&' },
  { value: '||', label: '||' },
];
const EMPTY_COND_ROW = (): CondRow => ({ variable: '', op: '==', value: '', logic: '&&' });
const buildCondition = (rows: CondRow[]) => {
  let out = '';
  let first = true;
  rows.forEach((r) => {
    const v = (r.variable || '').trim();
    if (!v) return;
    const part = `\${${v}} ${r.op || '=='} ${r.value}`;
    out = first ? part : `${out} ${r.logic || '&&'} ${part}`;
    first = false;
  });
  return out;
};
const parseCondition = (expr: string): CondRow[] | null => {
  if (!expr || !expr.trim()) return [EMPTY_COND_ROW()];
  const COND_RE = /^\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\s*(==|!=|>=|<=|>|<|contains)\s*(.*)$/;
  const tokens = expr.split(/\s*(&&|\|\|)\s*/).filter((t) => t.length > 0);
  const rows: CondRow[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const match = COND_RE.exec(tokens[i]);
    if (!match) return null;
    rows.push({
      variable: match[1],
      op: match[2],
      value: (match[3] || '').trim(),
      logic: i > 0 ? (tokens[i - 1] as '&&' | '||') : '&&',
    });
  }
  return rows.length ? rows : [EMPTY_COND_ROW()];
};

const draftData = (
  nodes: Node<WorkflowData>[],
  edges: Edge[],
  inputSchema: string,
  outputSchema: string,
) => ({
  nodes: JSON.stringify(
    nodes.map((node) => ({ ...node.data.workflowNode, position: node.position })),
  ),
  edges: JSON.stringify(
    edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      condition: edge.data?.condition,
      label: edge.data?.loopLabel || edge.label,
      isDefault: edge.data?.isDefault,
      maxIterations: edge.data?.maxIterations,
    })),
  ),
  inputSchema,
  outputSchema,
});

const Editor: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const { id } = useParams<{ id: string }>();
  const { initialState } = useModel('@@initialState');
  const canRun = Boolean(initialState?.currentUser?.permissionMap?.['/workflow/run']);
  const screens = Grid.useBreakpoint();
  const narrow = !screens.xl;
  const [paletteSearch, setPaletteSearch] = useState('');
  const [savedDraft, setSavedDraft] = useState<string>();
  const [issues, setIssues] = useState<Array<{ message: string; nodeId?: string }>>([]);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState<string>();
  const saveLock = useRef(false);
  const [workflow, setWorkflow] = useState<AgentWorkflow>();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowData>>(
    toFlowNodes(initial(intl)),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    toFlowEdges(
      [{ source: 'start', target: 'end' }],
      intl.formatMessage({ id: 'pages.agent.workflow.run.defaultBranch' }),
    ),
  );
  const [selectedId, setSelectedId] = useState('start');
  const [schema, setSchema] = useState('[]');
  const [outputSchema, setOutputSchema] = useState('[]');
  const draft = draftData(nodes, edges, schema, outputSchema);
  const draftSnapshot = JSON.stringify(draft);
  const dirty = savedDraft !== undefined && savedDraft !== draftSnapshot;
  useEffect(() => {
    setChecked(false);
    setIssues([]);
  }, [draftSnapshot]);
  const [agentOptions, setAgentOptions] = useState<any[]>([]);
  const [toolOptions, setToolOptions] = useState<any[]>([]);
  const [subflowWorkflows, setSubflowWorkflows] = useState<AgentWorkflow[]>([]);
  const [subflowVersions, setSubflowVersions] = useState<WorkflowVersion[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteGroup, setPaletteGroup] = useState('execute');
  const [propertyOpen, setPropertyOpen] = useState(false);
  useEffect(() => {
    setPaletteOpen(!narrow);
    setPropertyOpen(!narrow);
  }, [narrow]);
  const [propertyWidth, setPropertyWidth] = useState(338);
  const propertyResize = useRef<{ x: number; width: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [edgeCondition, setEdgeCondition] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeIsDefault, setEdgeIsDefault] = useState(false);
  const [edgeMaxIter, setEdgeMaxIter] = useState<number>(10);
  const [condRows, setCondRows] = useState<CondRow[]>(() => [EMPTY_COND_ROW()]);
  const [flow, setFlow] = useState<ReactFlowInstance<Node<WorkflowData>, Edge> | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{
    past: Array<{ nodes: Node<WorkflowData>[]; edges: Edge[] }>;
    future: Array<{ nodes: Node<WorkflowData>[]; edges: Edge[] }>;
  }>({ past: [], future: [] });
  const selected = nodes.find((node) => node.id === selectedId)?.data.workflowNode;
  const canvasSnapshot = () => ({
    nodes: nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data, workflowNode: { ...node.data.workflowNode } },
    })),
    edges: edges.map((edge) => ({ ...edge, data: { ...(edge.data || {}) } })),
  });
  const recordHistory = () => {
    historyRef.current.past = [...historyRef.current.past.slice(-39), canvasSnapshot()];
    historyRef.current.future = [];
  };
  const undo = () => {
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.push(canvasSnapshot());
    setNodes(previous.nodes);
    setEdges(previous.edges);
  };
  const redo = () => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(canvasSnapshot());
    setNodes(next.nodes);
    setEdges(next.edges);
  };
  const panelStyle = (key: string, style?: React.CSSProperties): React.CSSProperties => ({
    ...style,
  });
  const startPropertyResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    propertyResize.current = { x: event.clientX, width: propertyWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const resizeProperty = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!propertyResize.current) return;
    setPropertyWidth(
      Math.max(
        338,
        Math.min(620, propertyResize.current.width + propertyResize.current.x - event.clientX),
      ),
    );
  };
  const stopPropertyResize = () => {
    propertyResize.current = null;
  };
  const schemaFields = useMemo(() => {
    try {
      const parsed = JSON.parse(schema || '[]');
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item && typeof item === 'object' && item.name)
            .map((item) => ({
              value: String(item.name),
              label: item.label ? `${item.name}（${item.label}）` : String(item.name),
            }))
        : [];
    } catch {
      return [];
    }
  }, [schema]);
  const outputFields = useMemo(() => {
    try {
      const parsed = JSON.parse(outputSchema || '[]');
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item && typeof item === 'object' && item.name)
            .map((item) => ({
              value: String(item.name),
              label: item.label ? `${item.name}（${item.label}）` : String(item.name),
            }))
        : [];
    } catch {
      return [];
    }
  }, [outputSchema]);
  /** 自动登记所有产出节点 outputs 的目标变量（含嵌套叶子），供下游节点映射/条件引用时提示。 */
  const producedTargetOptions = useMemo(() => {
    const seen = new Map<string, string>();
    nodes.forEach((node) => {
      const wf = node.data?.workflowNode;
      if (!wf || !Array.isArray(wf.outputs)) return;
      const nodeName = wf.name ? String(wf.name) : String(wf.id);
      wf.outputs.forEach((mapping: unknown) => {
        const row =
          mapping && typeof mapping === 'object' ? (mapping as Record<string, unknown>) : null;
        const target = row ? String(row.target || '').trim() : '';
        if (!target || target.startsWith('_') || target.startsWith('.')) return;
        if (!seen.has(target)) seen.set(target, nodeName);
      });
    });
    return Array.from(seen.entries()).map(([value, producedBy]) => ({
      value,
      label: intl.formatMessage(
        { id: 'pages.agent.workflow.editor.producedBySuffix' },
        { value, producedBy },
      ),
    }));
  }, [nodes, intl]);
  const variableOptions = useMemo(() => {
    const base = [
      ...schemaFields.map((item) => ({
        ...item,
        label: intl.formatMessage(
          { id: 'pages.agent.workflow.editor.inputSuffix' },
          { label: item.label },
        ),
      })),
      ...outputFields.map((item) => ({
        ...item,
        label: intl.formatMessage(
          { id: 'pages.agent.workflow.editor.outputSuffix' },
          { label: item.label },
        ),
      })),
    ];
    const known = new Set(base.map((item) => item.value));
    return [
      ...base,
      ...producedTargetOptions
        .filter((item) => !known.has(item.value))
        .map((item) => ({ ...item })),
    ];
  }, [schemaFields, outputFields, producedTargetOptions, intl]);
  const selectedSubflowWorkflowId =
    selected?.type === 'subflow' ? textValue(selected.workflowId) : undefined;
  const selectedSubflowVersionNo =
    selected?.type === 'subflow' ? numberValue(selected.versionNo) : undefined;
  const subflowWorkflowOptions = subflowWorkflows
    .filter(
      (workflow) =>
        workflow.status === 1 && workflow.publishedVersion != null && workflow.id !== id,
    )
    .map((workflow) => ({
      value: workflow.id as string,
      label: workflow.code
        ? `${workflow.name || workflow.id}（${workflow.code}）`
        : workflow.name || (workflow.id as string),
    }));
  const subflowVersionOptions = subflowVersions.map((version) => ({
    value: version.versionNo,
    label: `v${version.versionNo}${version.publishedAt ? ` · ${new Date(Number(version.publishedAt)).toLocaleDateString()}` : ''}`,
  }));
  const selectedSubflowVersion = subflowVersions.find(
    (version) => version.versionNo === selectedSubflowVersionNo,
  );
  const interactionFormMode =
    selected?.type === 'interaction' ? (selected.mode ?? 'form') === 'form' : true;
  const subflowInputFields = useMemo(
    () => parseSchemaFieldOptions(selectedSubflowVersion?.inputSchema),
    [selectedSubflowVersion],
  );
  /** 当前选中节点的可静态枚举输出结构：subflow 读所选版本 outputSchema；form 交互读问题键；其余自由输出节点为空、用 note 提示。 */
  const selectedOutputStructure = useMemo<OutputLeaf[]>(() => {
    if (!selected) return [];
    if (selected.type === 'subflow') {
      const fields = parseSchemaFieldOptions(selectedSubflowVersion?.outputSchema);
      return fields.map((field) => ({ source: `$output.${field.value}`, label: field.label }));
    }
    if (selected.type === 'interaction' && interactionFormMode) {
      const raw = Array.isArray(selected.questions) ? selected.questions : [];
      const leaves = raw
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as { key?: unknown; question?: unknown };
          const key = typeof row.key === 'string' ? row.key.trim() : '';
          if (!key) return null;
          const question =
            typeof row.question === 'string' && row.question.trim() ? row.question.trim() : '';
          return { source: `$output.${key}`, label: question ? `${key} · ${question}` : key };
        })
        .filter((leaf): leaf is OutputLeaf => !!leaf);
      if (leaves.length > 0) return leaves;
      return textValue(selected.question)
        ? [
            {
              source: '$output.answer',
              label: intl.formatMessage({
                id: 'pages.agent.workflow.editor.singleQuestionAnswerLabel',
              }),
            },
          ]
        : [];
    }
    return [];
  }, [selected, selectedSubflowVersion, interactionFormMode, intl]);
  const selectedOutputStructureNote = useMemo(() => {
    if (!selected || !isProducingNode(selected.type)) return undefined;
    if (selectedOutputStructure.length > 0) return undefined;
    if (selected.type === 'subflow')
      return intl.formatMessage({ id: 'pages.agent.workflow.editor.outputStructureNoteSubflow' });
    if (selected.type === 'interaction')
      return interactionFormMode
        ? intl.formatMessage({ id: 'pages.agent.workflow.editor.outputStructureNoteNoQuestions' })
        : undefined;
    return intl.formatMessage({ id: 'pages.agent.workflow.editor.outputStructureNoteFreeform' });
  }, [selected, selectedOutputStructure, interactionFormMode, intl]);
  useEffect(() => {
    if (!id) return;
    getWorkflow(id).then((r) => {
      if (r.code !== 200 || !r.data) return;
      setWorkflow(r.data);
      getAgentDefinitionOptions({ applicationId: r.data.applicationId }).then(setAgentOptions);
      try {
        const parsedNodes = r.data.nodes ? JSON.parse(r.data.nodes) : [];
        const restored = (
          Array.isArray(parsedNodes) && parsedNodes.length > 0 ? parsedNodes : initial(intl)
        ).map((node: WorkflowNode | any) =>
          node.type === 'mcp' ? { ...node, type: 'tool' } : node,
        );
        const parsedEdges = r.data.edges ? JSON.parse(r.data.edges) : [];
        const restoredEdges =
          Array.isArray(parsedEdges) && parsedEdges.length > 0
            ? parsedEdges
            : restored.slice(0, -1).map((node: WorkflowNode, index: number) => ({
                source: node.id,
                target: restored[index + 1].id,
              }));
        // 并行分叉改为编排式：以并行节点引出连线定义分支，汇聚由连线推导，不再保存 branches/joinNodeId。
        // 兼容旧草稿：将 branches 中尚未与并行节点相连的入口补成连线，并移除冗余配置。
        const normalized = (
          restored as Array<WorkflowNode & { branches?: unknown; joinNodeId?: unknown }>
        ).map((node) => {
          if (node.type !== 'parallel') return node;
          const legacyBranches = Array.isArray(node.branches)
            ? node.branches.filter((b): b is string => typeof b === 'string')
            : [];
          const clean = { ...node };
          delete clean.branches;
          delete clean.joinNodeId;
          if (legacyBranches.length > 0) {
            const connected = new Set(
              restoredEdges
                .filter((edge: any) => edge.source === node.id)
                .map((edge: any) => edge.target),
            );
            legacyBranches.forEach((branch) => {
              if (!connected.has(branch)) restoredEdges.push({ source: node.id, target: branch });
            });
          }
          return clean;
        });
        const loadedNodes = toFlowNodes(normalized);
        const loadedEdges = toFlowEdges(
          restoredEdges,
          t('pages.agent.workflow.run.defaultBranch'),
          normalized,
        );
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setSavedDraft(
          JSON.stringify(
            draftData(
              loadedNodes,
              loadedEdges,
              r.data.inputSchema || '[]',
              r.data.outputSchema || '[]',
            ),
          ),
        );
        setSchema(r.data.inputSchema || '[]');
        setOutputSchema(r.data.outputSchema || '[]');
      } catch {
        message.error(t('pages.agent.workflow.editor.canvasDataInvalid'));
      }
    });
    if (!id) getAgentDefinitionOptions().then(setAgentOptions);
    getAgentToolOptions().then(setToolOptions);
  }, [id, intl, setEdges, setNodes]);
  useEffect(() => {
    getWorkflowList({ status: 1, current: 1, pageSize: 100 }).then((r) => {
      if (r.code === 200) setSubflowWorkflows(r.data || []);
    });
  }, []);
  // 选中子流程节点时按引用的工作流加载已发布版本；未选版本则默认取最新。
  useEffect(() => {
    if (!selectedSubflowWorkflowId) {
      setSubflowVersions([]);
      return;
    }
    let cancelled = false;
    getWorkflowVersions(selectedSubflowWorkflowId).then((r) => {
      if (cancelled || r.code !== 200) return;
      const versions = r.data || [];
      setSubflowVersions(versions);
      const latest = versions.reduce((max, version) => Math.max(max, version.versionNo), 0);
      if (latest > 0) {
        setNodes((current) =>
          current.map((node) =>
            node.id === selectedId && !numberValue(node.data.workflowNode.versionNo)
              ? {
                  ...node,
                  data: { workflowNode: { ...node.data.workflowNode, versionNo: latest } },
                }
              : node,
          ),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSubflowWorkflowId, selectedId, setNodes]);
  const validateConnection = useCallback(
    (connection: Connection, excludedEdgeId?: string) => {
      const source = nodes.find((node) => node.id === connection.source)?.data.workflowNode;
      const target = nodes.find((node) => node.id === connection.target)?.data.workflowNode;
      if (!source || !target) {
        message.warning(t('pages.agent.workflow.editor.edgeEndpointRequired'));
        return false;
      }
      if (source.id === target.id) {
        message.warning(t('pages.agent.workflow.editor.edgeSelfReference'));
        return false;
      }
      if (source.type === 'end') {
        message.warning(t('pages.agent.workflow.editor.endCannotConnect'));
        return false;
      }
      if (target.type === 'start') {
        message.warning(t('pages.agent.workflow.editor.startCannotFollow'));
        return false;
      }
      // 并行分叉内容只允许确定性节点：禁止并行直连汇聚，或把交互/等待/子流程节点接入任一分支区域。
      const violation = parallelBranchViolation(
        nodes.map((node) => node.data.workflowNode),
        edges
          .filter((edge) => edge.id !== excludedEdgeId)
          .map((edge) => ({ source: edge.source, target: edge.target })),
        source,
        target,
      );
      if (violation === 'join') {
        message.warning(t('pages.agent.workflow.editor.validation.parallelJoinDirect'));
        return false;
      }
      if (violation === 'interactive') {
        const warningText = t('pages.agent.workflow.editor.validation.parallelBranchInteractive', {
          name: target.name || target.id,
        });
        message.warning(warningText);
        return false;
      }
      return true;
    },
    [nodes, edges, t],
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!validateConnection(connection)) return;
      recordHistory();
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: `edge_${connection.source}_${connection.target}_${Date.now()}`,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          current,
        ),
      );
    },
    [validateConnection, setEdges],
  );
  const onReconnect = useCallback(
    (oldEdge: Edge, connection: Connection) => {
      if (!validateConnection(connection, oldEdge.id)) return;
      recordHistory();
      setEdges((current) =>
        reconnectEdge(oldEdge, connection, current, { shouldReplaceId: false }),
      );
    },
    [validateConnection, setEdges],
  );
  const add = (type: WorkflowNode['type'], position?: { x: number; y: number }) => {
    recordHistory();
    const item: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      name: nodeLabel(intl, type),
      position: position || { x: 300 + Math.random() * 220, y: 120 + Math.random() * 300 },
      // 开始表单默认为空；不要引用未声明变量，否则用户刚添加 Agent 就无法发布。
      prompt: type === 'agent' ? t('pages.agent.workflow.editor.defaultPrompt') : undefined,
      mode: type === 'interaction' ? 'form' : undefined,
      question:
        type === 'interaction' ? t('pages.agent.workflow.editor.defaultQuestion') : undefined,
      argumentsTemplate: type === 'tool' ? '{}' : undefined,
    };
    setNodes((current) => [...current, ...toFlowNodes([item])]);
    if (narrow) setPaletteOpen(false);
    setPropertyOpen(true);
    setSelectedId(item.id);
  };
  const updateSelected = (values: Partial<WorkflowNode>) => {
    recordHistory();
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId
          ? { ...node, data: { workflowNode: { ...node.data.workflowNode, ...values } } }
          : node,
      ),
    );
  };
  // 切换子流程引用时清空固定版本，由上面的 effect 加载版本并默认选最新。
  const onSubflowWorkflowChange = (workflowId?: string) => {
    updateSelected({ workflowId: workflowId || undefined, versionNo: undefined });
  };
  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedId('');
    const d = (edge as any).data || {};
    const condition = d.condition || '';
    setEdgeCondition(condition);
    const parsed = parseCondition(condition);
    setCondRows(parsed ?? [EMPTY_COND_ROW()]);
    setEdgeLabel(d.loopLabel || edge.label || '');
    setEdgeIsDefault(!!d.isDefault);
    setEdgeMaxIter(d.maxIterations || 10);
  };
  const onEdgeDoubleClick = (event: React.MouseEvent, edge: Edge) => {
    onEdgeClick(event, edge);
    setEdgeModalOpen(true);
  };
  const removeSelectedEdge = () => {
    if (!selectedEdgeId) return;
    recordHistory();
    setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };
  const updateCondRow = (i: number, patch: Partial<CondRow>) => {
    const next = condRows.map((row, idx) => (idx === i ? { ...row, ...patch } : row));
    setCondRows(next);
    setEdgeCondition(buildCondition(next));
  };
  const addCondRow = () => {
    const next = [...condRows, EMPTY_COND_ROW()];
    setCondRows(next);
    setEdgeCondition(buildCondition(next));
  };
  const removeCondRow = (i: number) => {
    const next = condRows.filter((_, idx) => idx !== i);
    setCondRows(next);
    setEdgeCondition(buildCondition(next));
  };
  const saveEdgeEdit = () => {
    if (!selectedEdgeId) return;
    recordHistory();
    setEdges((current) =>
      current.map((e) =>
        e.id === selectedEdgeId
          ? {
              ...e,
              label: edgeCondition ? edgeLabel || edgeCondition : edgeLabel || undefined,
              style: edgeCondition
                ? { stroke: '#fa8c16', strokeWidth: 2 }
                : (e as any).data?.loopLabel
                  ? { stroke: '#ff4d4f', strokeDasharray: '6 3', strokeWidth: 2 }
                  : undefined,
              data: {
                ...(e as any).data,
                condition: edgeCondition || undefined,
                isDefault: edgeIsDefault || undefined,
                maxIterations: edgeMaxIter,
                loopLabel: edgeLabel || undefined,
              },
            }
          : e,
      ),
    );
    setEdgeModalOpen(false);
  };
  const autoArrange = () => {
    recordHistory();
    if (nodes.length < 2) return;
    const rank: Record<string, number> = {};
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const backEdges = new Set<string>();
    const outgoing = new Map<string, Edge[]>();
    const incoming = new Map<string, Edge[]>();
    edges.forEach((edge) =>
      outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge]),
    );
    edges.forEach((edge) =>
      incoming.set(edge.target, [...(incoming.get(edge.target) || []), edge]),
    );
    const detectBackEdges = (nodeId: string) => {
      if (visiting.has(nodeId) || visited.has(nodeId)) return;
      visiting.add(nodeId);
      (outgoing.get(nodeId) || []).forEach((edge) => {
        if (visiting.has(edge.target)) backEdges.add(edge.id);
        else detectBackEdges(edge.target);
      });
      visiting.delete(nodeId);
      visited.add(nodeId);
    };
    nodes.forEach((node) => detectBackEdges(node.id));
    const roots = nodes.filter(
      (node) =>
        node.data.workflowNode.type === 'start' ||
        !(incoming.get(node.id) || []).some((edge) => !backEdges.has(edge.id)),
    );
    (roots.length ? roots : nodes).forEach((node) => {
      rank[node.id] = 0;
    });
    let moved = true;
    let guard = 0;
    while (moved && guard++ < nodes.length * nodes.length) {
      moved = false;
      edges.forEach((edge) => {
        if (backEdges.has(edge.id)) return;
        if (
          rank[edge.source] !== undefined &&
          (rank[edge.target] === undefined || rank[edge.target] < rank[edge.source] + 1)
        ) {
          rank[edge.target] = rank[edge.source] + 1;
          moved = true;
        }
      });
    }
    const groups: Record<number, Node<WorkflowData>[]> = {};
    const rankedNodeIds = new Set(Object.keys(rank));
    const lastRank = Math.max(0, ...Object.values(rank));
    nodes.forEach((node) => {
      const level = rank[node.id] ?? (rankedNodeIds.size ? lastRank + 1 : 0);
      groups[level] = [...(groups[level] || []), node];
    });
    const newPositions: Record<string, { x: number; y: number }> = {};
    const levels = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b);
    const maxLayerSize = Math.max(...Object.values(groups).map((list) => list.length));
    const parallelBranches = new Map<string, number>();
    const branchSources = nodes.filter(
      (node) =>
        node.data.workflowNode.type === 'parallel' ||
        node.data.workflowNode.type === 'rule' ||
        (outgoing.get(node.id) || []).filter((edge) => !backEdges.has(edge.id)).length > 1,
    );
    branchSources.forEach((parallel) => {
      const branches = (outgoing.get(parallel.id) || []).filter((edge) => !backEdges.has(edge.id));
      branches.forEach((edge, index) => {
        parallelBranches.set(edge.target, index - (branches.length - 1) / 2);
      });
    });
    const hasParallelTopology =
      nodes.some((node) => ['parallel', 'join'].includes(node.data.workflowNode.type)) ||
      branchSources.length > 0;
    // 并行/汇聚流程必须纵向分层，保证 parallel 与 join 位于同一中轴、分支位于同一行。
    // 纯长链也使用纵向推进，避免画布被拉成一条很长的横向流程。
    const vertical = hasParallelTopology || (levels.length > 7 && maxLayerSize <= 2);
    const levelGap = vertical ? 164 : 270;
    const laneGap = vertical ? 240 : 150;
    levels.forEach((level) => {
      const list = groups[level];
      const coordinateFor = (node: Node<WorkflowData>) => {
        const branchIndex = parallelBranches.get(node.id);
        if (branchIndex !== undefined) return branchIndex * laneGap;
        const parents = (incoming.get(node.id) || [])
          .filter((edge) => !backEdges.has(edge.id))
          .map((edge) => newPositions[edge.source])
          .filter(Boolean);
        if (parents.length) {
          return (
            parents.reduce((sum, position) => sum + (vertical ? position.x : position.y), 0) /
            parents.length
          );
        }
        return vertical ? node.position.x : node.position.y;
      };
      const sorted = [...list].sort((a, b) => coordinateFor(a) - coordinateFor(b));
      const laidOut: Array<{ node: Node<WorkflowData>; coordinate: number; size: number }> = [];
      let cursor = Number.NEGATIVE_INFINITY;
      sorted.forEach((node) => {
        const size = vertical ? (node.measured?.width ?? 180) : (node.measured?.height ?? 76);
        const desired = coordinateFor(node);
        const coordinate = Math.max(desired - size / 2, cursor + laneGap);
        cursor = coordinate + size;
        laidOut.push({ node, coordinate, size });
      });
      const first = laidOut[0]?.coordinate ?? 0;
      const last = laidOut.at(-1);
      const extent = last ? last.coordinate + last.size - first : 0;
      laidOut.forEach(({ node, coordinate }) => {
        const lane = coordinate - first - extent / 2;
        newPositions[node.id] = vertical
          ? { x: Math.round(lane), y: level * levelGap }
          : { x: level * levelGap, y: Math.round(lane) };
      });
    });
    const minX = Math.min(...Object.values(newPositions).map((position) => position.x));
    const minY = Math.min(...Object.values(newPositions).map((position) => position.y));
    const offsetX = minX < 64 ? 64 - minX : 0;
    const offsetY = minY < 64 ? 64 - minY : 0;
    setNodes((current) =>
      current.map((node) => {
        const p = newPositions[node.id];
        return {
          ...node,
          position: {
            x: Math.round(((p?.x ?? node.position.x) + offsetX) / 8) * 8,
            y: Math.round(((p?.y ?? node.position.y) + offsetY) / 8) * 8,
          },
        };
      }),
    );
    // 节点位置变化后同步连线手柄。历史流程可能保留左右手柄，直接沿用会让纵向分支
    // 出现折返或交叉；主流程与并行分支统一从下方进入下一层，循环边保留原路由。
    setEdges((current) =>
      current.map((edge) => {
        if (backEdges.has(edge.id)) return edge;
        return vertical
          ? { ...edge, sourceHandle: 'source-bottom', targetHandle: 'target-top' }
          : { ...edge, sourceHandle: 'source-right', targetHandle: 'target-left' };
      }),
    );
    requestAnimationFrame(() => flow?.fitView({ padding: 0.16, duration: 220, maxZoom: 1.1 }));
  };
  const removeSelected = () => {
    if (!selected || ['start', 'end'].includes(selected.type)) return;
    recordHistory();
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId),
    );
    setSelectedId('start');
  };
  const save = async (mode: 'save' | 'validate' | 'publish' | 'run' = 'save') => {
    if (!id || !workflow || saveLock.current) return false;
    const publish = mode === 'publish' || mode === 'run';
    try {
      if (!Array.isArray(JSON.parse(schema)) || !Array.isArray(JSON.parse(outputSchema))) {
        throw new Error('Invalid schema');
      }
    } catch {
      message.error(t('pages.agent.workflow.editor.schemasMustArray'));
      return false;
    }
    const workflowNodes = nodes.map((node) => ({
      ...node.data.workflowNode,
      position: node.position,
    }));
    const workflowEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      condition: (edge as any).data?.condition,
      label: (edge as any).data?.loopLabel || edge.label,
      isDefault: (edge as any).data?.isDefault,
      maxIterations: (edge as any).data?.maxIterations,
    }));
    if (mode !== 'save') {
      const errors = validateBeforePublish(intl, workflowNodes, workflowEdges);
      if (errors.length) {
        setIssues(errors);
        setChecked(true);
        return false;
      }
    }
    saveLock.current = true;
    setSaving(mode);
    try {
      const result = await updateWorkflow(
        id,
        {
          name: workflow.name,
          description: workflow.description,
          nodes: JSON.stringify(workflowNodes),
          edges: JSON.stringify(workflowEdges),
          inputSchema: schema,
          outputSchema,
          maxConcurrentInstances: workflow.maxConcurrentInstances,
        },
        { skipSuccessMessage: mode !== 'save' },
      );
      if (result.code !== 200) return false;
      setSavedDraft(draftSnapshot);
      if (mode !== 'save') {
        const validation = await validateWorkflowDraft(id, { skipSuccessMessage: publish });
        if (validation.code !== 200) {
          setIssues([
            {
              message:
                validation.message || t('pages.agent.workflow.editor.publishValidationFailed'),
            },
          ]);
          setChecked(true);
          return false;
        }
        setIssues([]);
        setChecked(true);
      }
      if (publish) {
        const published = await publishWorkflow(id);
        if (published.code !== 200) return false;
        setWorkflow(
          (current) => current && { ...current, status: 1, publishedVersion: published.data },
        );
        Modal.success({
          title: t('pages.agent.workflow.editor.published', { version: published.data }),
          content: t('pages.workflowUX.publishNext'),
          footer: (
            <Space wrap>
              {canRun && (
                <Button
                  type="primary"
                  onClick={() => {
                    Modal.destroyAll();
                    history.push(`/workflow/workflow/${id}/run`);
                  }}
                >
                  {t('pages.workflowUX.runVersion')}
                </Button>
              )}
              <Button
                onClick={() => {
                  Modal.destroyAll();
                  history.push(`/workflow/schedule?workflowId=${encodeURIComponent(id)}&create=1`);
                }}
              >
                {t('pages.agent.workflow.schedule.create')}
              </Button>
              <Button onClick={() => Modal.destroyAll()}>{t('pages.common.close')}</Button>
            </Space>
          ),
        });
      }
      return true;
    } catch {
      return false;
    } finally {
      saveLock.current = false;
      setSaving(undefined);
    }
  };
  const paletteContent = (
    <>
      {paletteOpen ? (
        <Card
          size="small"
          bordered={false}
          style={panelStyle('palette', {
            width: '100%',
            borderRadius: 10,
          })}
          title={
            <CardTitle
              title={t('pages.agent.workflow.editor.componentLibrary')}
              tip={t('pages.agent.workflow.editor.nodeLibraryTip')}
            />
          }
          extra={
            <Button type="text" icon={<DownOutlined />} onClick={() => setPaletteOpen(false)} />
          }
        >
          <Input.Search
            allowClear
            value={paletteSearch}
            onChange={(e) => setPaletteSearch(e.target.value)}
            placeholder={t('pages.workflowUX.searchNodes')}
            style={{ marginBottom: 12 }}
          />
          <Tabs
            activeKey={paletteSearch ? 'search' : paletteGroup}
            onChange={setPaletteGroup}
            size="small"
            items={(paletteSearch
              ? [
                  {
                    key: 'search',
                    labelKey: 'pages.workflowUX.searchResults',
                    types: paletteGroups.flatMap((group) => group.types),
                  },
                ]
              : paletteGroups
            ).map((group) => ({
              key: group.key,
              label: t(group.labelKey),
              children: (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {group.types
                    .filter((type) =>
                      nodeLabel(intl, type).toLowerCase().includes(paletteSearch.toLowerCase()),
                    )
                    .map((type) => {
                      const fixed = type === 'start' || type === 'end';
                      return (
                        <Button
                          key={type}
                          block
                          disabled={fixed}
                          icon={paletteIcon(type)}
                          onClick={() => add(type)}
                          draggable={!fixed}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('application/aether-workflow-node', type);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                          style={{
                            height: 34,
                            paddingInline: 10,
                            textAlign: 'left',
                            color: fixed ? '#94a3b8' : '#334155',
                            borderColor: '#e6eaf0',
                            background: '#fff',
                            boxShadow: 'none',
                          }}
                        >
                          {nodeLabel(intl, type)}
                        </Button>
                      );
                    })}
                </Space>
              ),
            }))}
          />
        </Card>
      ) : (
        <Tooltip title={t('pages.agent.workflow.editor.expandNodeLibrary')}>
          <Button
            shape="round"
            size="large"
            icon={<DownOutlined rotate={-90} />}
            onClick={() => setPaletteOpen(true)}
          />
        </Tooltip>
      )}
    </>
  );
  const propertyContent = (
    <>
      {propertyOpen ? (
        <div
          style={panelStyle('properties', {
            width: '100%',
            maxWidth: '100%',
            position: 'relative',
          })}
        >
          <div
            aria-label="resize properties"
            onPointerDown={startPropertyResize}
            onPointerMove={resizeProperty}
            onPointerUp={stopPropertyResize}
            onPointerCancel={stopPropertyResize}
            style={{
              position: 'absolute',
              left: -6,
              top: 0,
              bottom: 0,
              width: 10,
              cursor: 'ew-resize',
              zIndex: 2,
            }}
          />
          <Card
            size="small"
            bordered={false}
            style={{ width: '100%', borderRadius: 10 }}
            styles={{
              body: {
                maxHeight: narrow ? 'calc(100dvh - 150px)' : 'calc(100dvh - 260px)',
                overflowY: 'auto',
                padding: '16px 18px',
              },
            }}
            title={
              narrow ? undefined : (
                <CardTitle
                  title={t('pages.agent.workflow.editor.nodeProperties')}
                  tip={t('pages.agent.workflow.editor.nodePropertiesTip')}
                />
              )
            }
            extra={
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setPropertyOpen(false)}
              />
            }
          >
            {selectedEdgeId ? (
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <span style={{ color: '#595959' }}>
                  {t('pages.agent.workflow.editor.edgeSelected')}
                </span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                  {t('pages.agent.workflow.editor.edgeSelectedTip')}
                </span>
                <Popconfirm
                  title={t('pages.agent.workflow.editor.deleteEdgeConfirm')}
                  onConfirm={removeSelectedEdge}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    {t('pages.agent.workflow.editor.deleteEdge')}
                  </Button>
                </Popconfirm>
              </Space>
            ) : selected ? (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Collapse
                  key={selected.id}
                  size="small"
                  defaultActiveKey={['basic', 'inputs']}
                  items={[
                    {
                      key: 'basic',
                      label: t('pages.workflowUX.basic'),
                      children: (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <label style={{ marginBottom: -6, fontWeight: 500 }}>
                            {t('pages.agent.workflow.run.nodeName')}
                          </label>
                          <Input
                            value={selected.name}
                            onChange={(e) => updateSelected({ name: e.target.value })}
                          />
                          <div
                            style={{
                              padding: '9px 10px',
                              borderRadius: 6,
                              background: '#f5f8fc',
                              color: '#526074',
                              fontSize: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            <strong style={{ color: '#334155' }}>
                              {t('pages.agent.workflow.editor.nodeUsageTitle')}
                            </strong>
                            {nodeUsage(intl, selected.type)}
                          </div>
                        </Space>
                      ),
                    },
                    {
                      key: 'inputs',
                      label: t('pages.workflowUX.inputs'),
                      children: (
                        <div className={styles.fields}>
                          {' '}
                          {selected.type === 'start' && (
                            <StartVariablesBuilder value={schema} onChange={setSchema} />
                          )}
                          {selected.type === 'end' && (
                            <StartVariablesBuilder
                              value={outputSchema}
                              onChange={setOutputSchema}
                              mode="output"
                            />
                          )}
                          {selected.type === 'agent' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.run.node.agent')}
                              </label>
                              <Select
                                style={{ width: '100%' }}
                                value={selected.resourceId}
                                options={agentOptions}
                                onChange={(resourceId) => updateSelected({ resourceId })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.prompt')}
                              </label>
                              <Input.TextArea
                                value={selected.prompt}
                                rows={5}
                                onChange={(e) => updateSelected({ prompt: e.target.value })}
                              />
                            </>
                          )}
                          {selected.type === 'tool' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {nodeLabel(intl, 'tool')}
                              </label>
                              <Select
                                style={{ width: '100%' }}
                                value={selected.resourceId}
                                options={toolOptions}
                                onChange={async (resourceId) => {
                                  updateSelected({ resourceId });
                                  const result = await getAgentToolInfo(resourceId);
                                  if (result.code !== 200 || !result.data) return;
                                  updateSelected({
                                    resourceId,
                                    toolName: result.data.mcpToolName || result.data.name,
                                    // 参数模板与 MCP 工具的输入 schema 是一组配置。切换工具时必须
                                    // 同步重置，避免把上一个工具的参数带到新工具中执行。
                                    argumentsTemplate: buildArgumentsTemplate(
                                      result.data.mcpInputSchema,
                                    ),
                                  });
                                }}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.mcpMethodName')}
                              </label>
                              <Input
                                value={selected.toolName}
                                onChange={(e) => updateSelected({ toolName: e.target.value })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.toolApprovalPolicy')}
                              </label>
                              <Select
                                style={{ width: '100%' }}
                                value={selected.toolApprovalPolicy || 'ask'}
                                options={[
                                  {
                                    value: 'ask',
                                    label: t('pages.agent.workflow.editor.toolApproval.ask'),
                                  },
                                  {
                                    value: 'risky',
                                    label: t('pages.agent.workflow.editor.toolApproval.risky'),
                                  },
                                  {
                                    value: 'never',
                                    label: t('pages.agent.workflow.editor.toolApproval.never'),
                                  },
                                ]}
                                onChange={(toolApprovalPolicy) =>
                                  updateSelected({ toolApprovalPolicy })
                                }
                              />
                              <TemplateObjectEditor
                                value={selected.argumentsTemplate}
                                onChange={(argumentsTemplate) =>
                                  updateSelected({ argumentsTemplate })
                                }
                              />
                            </>
                          )}
                          {selected.type === 'interaction' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.interactionMode')}
                              </label>
                              <Select
                                value={selected.mode || 'form'}
                                options={[
                                  {
                                    value: 'form',
                                    label: t('pages.agent.workflow.editor.interactionModeForm'),
                                  },
                                  {
                                    value: 'approval',
                                    label: t('pages.agent.workflow.editor.interactionModeApproval'),
                                  },
                                ]}
                                onChange={(mode) => updateSelected({ mode })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t(
                                  interactionFormMode
                                    ? 'pages.agent.workflow.editor.question'
                                    : 'pages.agent.workflow.editor.approvalDescription',
                                )}
                                {interactionFormMode && (
                                  <FieldTip title={t('pages.agent.workflow.editor.questionTip')} />
                                )}
                              </label>
                              <Input.TextArea
                                value={selected.question}
                                rows={interactionFormMode ? 4 : 3}
                                onChange={(e) => updateSelected({ question: e.target.value })}
                              />
                              {interactionFormMode ? (
                                <>
                                  <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                    {t('pages.agent.workflow.editor.multiQuestionConfig')}
                                    <FieldTip
                                      title={t(
                                        'pages.agent.workflow.editor.multiQuestionConfigTip',
                                      )}
                                    />
                                  </label>
                                  <StructuredListEditor
                                    value={selected.questions}
                                    fields={[
                                      {
                                        key: 'key',
                                        label: t('pages.agent.workflow.editor.questionKeyLabel'),
                                        placeholder: 'reason',
                                      },
                                      {
                                        key: 'question',
                                        label: t('pages.agent.workflow.editor.questionLabel'),
                                        placeholder: t(
                                          'pages.agent.workflow.editor.questionPlaceholder',
                                        ),
                                      },
                                    ]}
                                    onChange={(questions) => updateSelected({ questions })}
                                    addText={t('pages.agent.workflow.editor.addQuestion')}
                                  />
                                </>
                              ) : (
                                <>
                                  <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                    {t('pages.agent.workflow.editor.approverServiceAccount')}
                                  </label>
                                  <Input
                                    value={selected.approverServiceAccountId}
                                    onChange={(e) =>
                                      updateSelected({ approverServiceAccountId: e.target.value })
                                    }
                                  />
                                  <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                    {t('pages.agent.workflow.editor.approvalMode')}
                                  </label>
                                  <Select
                                    value={selected.approvalMode || 'ANY'}
                                    options={[
                                      {
                                        value: 'ANY',
                                        label: t('pages.agent.workflow.editor.anyApproval'),
                                      },
                                    ]}
                                    onChange={(approvalMode) => updateSelected({ approvalMode })}
                                  />
                                </>
                              )}
                            </>
                          )}
                          {selected.type === 'wait_event' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.eventType')}
                              </label>
                              <Input
                                value={selected.eventType}
                                placeholder="payment.completed"
                                onChange={(e) => updateSelected({ eventType: e.target.value })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.correlationKeyTemplate')}
                              </label>
                              <Input
                                value={selected.correlationKeyTemplate}
                                placeholder="${orderId}"
                                onChange={(e) =>
                                  updateSelected({ correlationKeyTemplate: e.target.value })
                                }
                              />
                            </>
                          )}
                          {selected.type === 'rule' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.ruleConditionsTitle')}
                              </label>
                              <StructuredListEditor
                                value={selected.rules}
                                fields={[
                                  {
                                    key: 'condition',
                                    label: t('pages.agent.workflow.editor.conditionLabel'),
                                    placeholder: '${amount} > 1000',
                                  },
                                  {
                                    key: 'value',
                                    label: t('pages.agent.workflow.editor.resultLabel'),
                                    placeholder: 'high',
                                  },
                                ]}
                                onChange={(rules) => updateSelected({ rules })}
                                addText={t('pages.agent.workflow.editor.addRule')}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.defaultResult')}
                              </label>
                              <Input
                                value={selected.defaultValue as string}
                                onChange={(e) => updateSelected({ defaultValue: e.target.value })}
                              />
                            </>
                          )}
                          {selected.type === 'http' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.httpMethod')}
                              </label>
                              <Select
                                value={selected.method || 'POST'}
                                options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({
                                  value,
                                  label: value,
                                }))}
                                onChange={(method) => updateSelected({ method })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.httpUrl')}
                              </label>
                              <Input
                                value={textValue(selected.url)}
                                placeholder="https://api.example.com/orders/${orderId}"
                                onChange={(e) => updateSelected({ url: e.target.value })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.httpBodyTemplate')}
                              </label>
                              <Input.TextArea
                                value={textValue(selected.bodyTemplate)}
                                rows={4}
                                onChange={(e) => updateSelected({ bodyTemplate: e.target.value })}
                              />
                            </>
                          )}
                          {selected.type === 'notification' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.notificationChannel')}
                              </label>
                              <Select
                                value={selected.channel || 'email'}
                                options={[{ value: 'email', label: 'Email' }]}
                                onChange={(channel) => updateSelected({ channel })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.notificationToTemplate')}
                              </label>
                              <Input
                                value={textValue(selected.toTemplate)}
                                placeholder="${requesterEmail}"
                                onChange={(e) => updateSelected({ toTemplate: e.target.value })}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.notificationSubject')}
                              </label>
                              <Input
                                value={textValue(selected.subjectTemplate)}
                                onChange={(e) =>
                                  updateSelected({ subjectTemplate: e.target.value })
                                }
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.notificationBody')}
                              </label>
                              <Input.TextArea
                                value={textValue(selected.bodyTemplate)}
                                rows={4}
                                onChange={(e) => updateSelected({ bodyTemplate: e.target.value })}
                              />
                            </>
                          )}
                          {selected.type === 'subflow' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.subflowWorkflow')}
                              </label>
                              <Select
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                allowClear
                                placeholder={t(
                                  'pages.agent.workflow.editor.subflowSelectPlaceholder',
                                )}
                                value={selectedSubflowWorkflowId || undefined}
                                options={subflowWorkflowOptions}
                                onChange={onSubflowWorkflowChange}
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.subflowVersionLabel')}
                              </label>
                              <Select
                                style={{ width: '100%' }}
                                placeholder={
                                  selectedSubflowWorkflowId
                                    ? t('pages.agent.workflow.editor.subflowVersionPlaceholder')
                                    : t('pages.agent.workflow.editor.subflowSelectFirst')
                                }
                                value={selectedSubflowVersionNo ?? undefined}
                                options={subflowVersionOptions}
                                disabled={
                                  !selectedSubflowWorkflowId || subflowVersions.length === 0
                                }
                                onChange={(versionNo) =>
                                  updateSelected({ versionNo: versionNo || undefined })
                                }
                              />
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.subflowInputMapping')}
                              </label>
                              <SubflowMappingEditor
                                value={selected.inputMappings}
                                targetLabel={t('pages.agent.workflow.editor.subflowInputField')}
                                sourceLabel={t('pages.agent.workflow.editor.parentFlowVariable')}
                                targetOptions={subflowInputFields}
                                sourceOptions={variableOptions}
                                onChange={(inputMappings) => updateSelected({ inputMappings })}
                                addText={t('pages.agent.workflow.editor.addInputMapping')}
                              />
                            </>
                          )}
                          {selected.type === 'parallel' && (
                            <>
                              <div
                                style={{
                                  color: '#8c8c8c',
                                  fontSize: 12,
                                  lineHeight: 1.6,
                                  marginBottom: 4,
                                }}
                              >
                                {t('pages.agent.workflow.editor.parallelHint')}
                              </div>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.maxBranches')}
                              </label>
                              <InputNumber
                                min={1}
                                max={50}
                                value={numberValue(selected.maxBranches)}
                                onChange={(maxBranches) =>
                                  updateSelected({ maxBranches: maxBranches || undefined })
                                }
                                style={{ width: '100%' }}
                              />
                            </>
                          )}
                          {selected.type === 'join' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.joinMode')}
                              </label>
                              <Select
                                value={selected.joinMode || 'ALL_SUCCESS'}
                                options={[
                                  {
                                    value: 'ALL_SUCCESS',
                                    label: t('pages.agent.workflow.editor.joinModeAllSuccess'),
                                  },
                                  {
                                    value: 'ANY_SUCCESS',
                                    label: t('pages.agent.workflow.editor.joinModeAnySuccess'),
                                  },
                                  {
                                    value: 'ALLOW_PARTIAL_FAILURE',
                                    label: t(
                                      'pages.agent.workflow.editor.joinModeAllowPartialFailure',
                                    ),
                                  },
                                ]}
                                onChange={(joinMode) => updateSelected({ joinMode })}
                              />
                              <div style={{ color: '#8c8c8c', fontSize: 12, lineHeight: 1.6 }}>
                                {t('pages.agent.workflow.editor.joinHint')}
                              </div>
                            </>
                          )}
                          {selected.type === 'delay' && (
                            <>
                              <label style={{ marginBottom: -6, fontWeight: 500 }}>
                                {t('pages.agent.workflow.editor.delayMillis')}
                              </label>
                              <InputNumber
                                min={1}
                                value={numberValue(selected.delayMillis)}
                                onChange={(delayMillis) =>
                                  updateSelected({ delayMillis: delayMillis || undefined })
                                }
                                style={{ width: '100%' }}
                              />
                            </>
                          )}
                        </div>
                      ),
                    },
                    ...([
                      'agent',
                      'tool',
                      'interaction',
                      'wait_event',
                      'rule',
                      'http',
                      'notification',
                      'subflow',
                      'join',
                    ].includes(selected.type)
                      ? [
                          {
                            key: 'outputs',
                            label: t('pages.workflowUX.outputs'),
                            children: (
                              <OutputsMappingEditor
                                targetOptions={variableOptions}
                                sourceSuggestions={variableOptions}
                                outputStructure={selectedOutputStructure}
                                outputStructureNote={
                                  selected.type === 'join'
                                    ? t('pages.agent.workflow.editor.joinOutputStructureNote')
                                    : selectedOutputStructureNote
                                }
                                value={selected.outputs}
                                onChange={(outputs) => updateSelected({ outputs })}
                              />
                            ),
                          },
                        ]
                      : []),
                    ...(['http', 'notification', 'wait_event', 'subflow', 'parallel'].includes(
                      selected.type,
                    )
                      ? [
                          {
                            key: 'advanced',
                            label: t('pages.workflowUX.advanced'),
                            children: (
                              <div className={styles.fields}>
                                {['http', 'notification'].includes(selected.type) && (
                                  <>
                                    <label>
                                      {t('pages.agent.workflow.editor.idempotencyKeyTemplate')}
                                    </label>
                                    <Input
                                      value={textValue(selected.idempotencyKeyTemplate)}
                                      onChange={(e) =>
                                        updateSelected({ idempotencyKeyTemplate: e.target.value })
                                      }
                                    />
                                  </>
                                )}
                                {['wait_event', 'subflow'].includes(selected.type) && (
                                  <>
                                    <label>{t('pages.agent.workflow.editor.timeoutMillis')}</label>
                                    <InputNumber
                                      min={1}
                                      value={selected.timeoutMillis}
                                      onChange={(value) =>
                                        updateSelected({ timeoutMillis: value || undefined })
                                      }
                                      style={{ width: '100%' }}
                                    />
                                  </>
                                )}
                                {selected.type === 'wait_event' && (
                                  <>
                                    <label>
                                      {t('pages.agent.workflow.editor.timeoutTargetId')}
                                    </label>
                                    <Input
                                      value={selected.timeoutTargetId}
                                      onChange={(e) =>
                                        updateSelected({ timeoutTargetId: e.target.value })
                                      }
                                    />
                                  </>
                                )}
                                {selected.type === 'parallel' && (
                                  <>
                                    <label>
                                      {t('pages.agent.workflow.editor.branchTimeoutMillis')}
                                    </label>
                                    <InputNumber
                                      min={1}
                                      value={numberValue(selected.branchTimeoutMillis)}
                                      onChange={(value) =>
                                        updateSelected({ branchTimeoutMillis: value || undefined })
                                      }
                                      style={{ width: '100%' }}
                                    />
                                  </>
                                )}
                              </div>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />

                {!['start', 'end'].includes(selected.type) && (
                  <Popconfirm
                    title={t('pages.agent.workflow.editor.removeNodeConfirm')}
                    onConfirm={removeSelected}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      {t('pages.agent.workflow.editor.deleteNode')}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ) : (
              <span style={{ color: '#8c8c8c' }}>
                {t('pages.agent.workflow.editor.selectNodeTip')}
              </span>
            )}
          </Card>
        </div>
      ) : (
        <Tooltip title={t('pages.agent.workflow.editor.expandNodeProperties')}>
          <Button
            shape="round"
            size="large"
            icon={<SettingOutlined />}
            onClick={() => setPropertyOpen(true)}
          />
        </Tooltip>
      )}
    </>
  );
  const draftGuard = useDraftGuard(
    dirty,
    () => save(),
    () => {
      if (!savedDraft) return;
      const saved = JSON.parse(savedDraft);
      const restoredNodes = JSON.parse(saved.nodes);
      setNodes(toFlowNodes(restoredNodes));
      setEdges(
        toFlowEdges(
          JSON.parse(saved.edges),
          t('pages.agent.workflow.run.defaultBranch'),
          restoredNodes,
        ),
      );
      setSchema(saved.inputSchema);
      setOutputSchema(saved.outputSchema);
      historyRef.current = { past: [], future: [] };
    },
    `/workflow/workflow/${id}`,
  );
  const nodeTypes = useMemo(() => ({ workflow: WorkflowCanvasNode }), []);
  return (
    <PageContainer
      className={styles.page}
      header={{
        title: workflow?.name || t('components.routeTabs.workflowEditor'),
        subTitle: (
          <Tag color={dirty ? 'orange' : 'default'}>
            {t(dirty ? 'pages.workflowUX.unsaved' : 'pages.workflowUX.saved')}
          </Tag>
        ),
        breadcrumb: undefined,
        tags: (
          <Tag color={workflow?.status === 1 ? 'green' : 'orange'}>
            {workflow?.status === 1
              ? t('pages.agent.workflow.status.published', {
                  version: workflow.publishedVersion ?? '-',
                })
              : workflow?.status === 2
                ? t('pages.agent.workflow.status.offline')
                : t('pages.agent.workflow.status.draft')}
          </Tag>
        ),
      }}
      extra={
        <Space wrap>
          <Button disabled={!!saving} onClick={() => history.push('/workflow/workflow')}>
            {t('pages.agent.workflow.editor.back')}
          </Button>
          <Button
            disabled={!workflow || !!saving}
            loading={saving === 'validate'}
            onClick={() => save('validate')}
          >
            {t('pages.agent.workflow.editor.saveAndValidate')}
          </Button>
          <Button
            disabled={!workflow || !!saving}
            loading={saving === 'save'}
            icon={<SaveOutlined />}
            onClick={() => save()}
          >
            {t('pages.agent.workflow.editor.save')}
          </Button>
          <Button
            disabled={!workflow || !!saving}
            loading={saving === 'publish'}
            type="primary"
            icon={<SendOutlined />}
            onClick={() => save('publish')}
          >
            {t('pages.agent.workflow.action.publish')}
          </Button>
        </Space>
      }
    >
      {draftGuard}
      {checked && (
        <Collapse
          className={styles.issues}
          defaultActiveKey={['issues']}
          items={[
            {
              key: 'issues',
              label: t('pages.workflowUX.validationResult'),
              children: issues.length ? (
                <List
                  size="small"
                  dataSource={issues}
                  renderItem={(issue) => (
                    <List.Item>
                      <Button
                        type="link"
                        onClick={() => {
                          if (!issue.nodeId) return;
                          setSelectedId(issue.nodeId);
                          setPropertyOpen(true);
                          flow?.fitView({
                            nodes: [{ id: issue.nodeId }],
                            duration: 250,
                            maxZoom: 1.2,
                          });
                        }}
                      >
                        {issue.message}
                      </Button>
                    </List.Item>
                  )}
                />
              ) : (
                <Alert type="success" showIcon message={t('pages.workflowUX.validationPassed')} />
              ),
            },
          ]}
        />
      )}
      <div className={styles.workspace}>
        {!narrow && paletteOpen && (
          <aside className={styles.palette} style={{ width: 220 }}>
            {paletteContent}
          </aside>
        )}
        <div className={styles.canvas}>
          {narrow && (
            <Space className={styles.mobileTools}>
              <Button onClick={() => setPaletteOpen(true)}>
                {t('pages.agent.workflow.editor.componentLibrary')}
              </Button>
              <Button onClick={() => setPropertyOpen(true)}>
                {t('pages.agent.workflow.editor.nodeProperties')}
              </Button>
            </Space>
          )}
          <div
            ref={canvasRef}
            style={{
              height: '100%',
              minHeight: 440,
              background: '#fbfcfe',
              border: '1px solid #e8ebef',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const type = event.dataTransfer.getData(
                  'application/aether-workflow-node',
                ) as WorkflowNode['type'];
                if (!type || type === 'start' || type === 'end' || !flow) return;
                add(type, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
              }}
              onInit={setFlow}
              onNodeDragStart={recordHistory}
              onNodesDelete={recordHistory}
              onEdgesDelete={recordHistory}
              onNodeClick={(_: React.MouseEvent, node: Node<WorkflowData>) => {
                setSelectedId(node.id);
                setSelectedEdgeId(null);
                setPropertyOpen(true);
              }}
              onEdgeClick={onEdgeClick as any}
              onEdgeDoubleClick={onEdgeDoubleClick as any}
              onReconnect={onReconnect}
              edgesReconnectable
              onPaneClick={() => {
                setSelectedId('');
                setSelectedEdgeId(null);
              }}
              fitView
              deleteKeyCode={['Backspace', 'Delete']}
              selectionOnDrag
              panOnDrag={[1, 2]}
              multiSelectionKeyCode={['Meta', 'Control']}
              connectionMode={ConnectionMode.Loose}
              defaultEdgeOptions={{
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
            >
              {showGrid && <Background gap={16} size={1} color="#e8edf3" />}
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) =>
                  color[(node.data as WorkflowData)?.workflowNode?.type] || '#999'
                }
              />
              <Controls position="bottom-right" showInteractive={false} />
              <Panel position="top-left" style={{ margin: 12, zIndex: 5 }}>
                <Space.Compact>
                  {!paletteOpen && (
                    <Tooltip title={t('pages.agent.workflow.editor.componentLibrary')}>
                      <Button
                        aria-label="open node library"
                        icon={<BlockOutlined />}
                        onClick={() => setPaletteOpen(true)}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title={t('pages.agent.workflow.editor.toolbarUndo')}>
                    <Button
                      aria-label="undo"
                      disabled={!historyRef.current.past.length}
                      onClick={undo}
                    >
                      ↶
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('pages.agent.workflow.editor.toolbarRedo')}>
                    <Button
                      aria-label="redo"
                      disabled={!historyRef.current.future.length}
                      onClick={redo}
                    >
                      ↷
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('pages.agent.workflow.editor.toolbarZoomOut')}>
                    <Button aria-label="zoom out" onClick={() => flow?.zoomOut()}>
                      −
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('pages.agent.workflow.editor.toolbarResetZoom')}>
                    <Button
                      aria-label="reset zoom"
                      onClick={() => flow?.setViewport({ x: 0, y: 0, zoom: 1 })}
                    >
                      100%
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('pages.agent.workflow.editor.toolbarZoomIn')}>
                    <Button aria-label="zoom in" onClick={() => flow?.zoomIn()}>
                      ＋
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('pages.agent.workflow.editor.toolbarFullscreen')}>
                    <Button
                      aria-label="fullscreen"
                      onClick={() => canvasRef.current?.requestFullscreen?.()}
                    >
                      ⛶
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('pages.agent.workflow.editor.autoArrangeTip')}>
                    <Button aria-label="auto arrange" onClick={autoArrange}>
                      ▦
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('pages.agent.workflow.editor.toolbarToggleGrid')}>
                    <Button
                      aria-label="toggle grid"
                      type={showGrid ? 'primary' : 'default'}
                      onClick={() => setShowGrid((current) => !current)}
                    >
                      ⋮
                    </Button>
                  </Tooltip>
                </Space.Compact>
              </Panel>
              {!propertyOpen && (
                <Panel position="top-right" style={{ margin: 12, zIndex: 5 }}>
                  <Tooltip title={t('pages.agent.workflow.editor.nodeProperties')}>
                    <Button
                      aria-label="open node properties"
                      icon={<SettingOutlined />}
                      onClick={() => setPropertyOpen(true)}
                    />
                  </Tooltip>
                </Panel>
              )}
            </ReactFlow>
          </div>
        </div>
        {!narrow && propertyOpen && (
          <aside className={styles.properties} style={{ width: propertyWidth }}>
            {propertyContent}
          </aside>
        )}
      </div>
      {narrow && (
        <>
          <Drawer
            title={t('pages.agent.workflow.editor.componentLibrary')}
            placement="left"
            width={280}
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
          >
            {paletteContent}
          </Drawer>
          <Drawer
            title={t('pages.agent.workflow.editor.nodeProperties')}
            width="min(440px, 100vw)"
            open={propertyOpen}
            onClose={() => setPropertyOpen(false)}
          >
            {propertyContent}
          </Drawer>
        </>
      )}
      <Modal
        title={t('pages.agent.workflow.editor.edgeConditionSettings')}
        open={edgeModalOpen}
        onOk={saveEdgeEdit}
        onCancel={() => setEdgeModalOpen(false)}
        okText={t('pages.common.confirm')}
        cancelText={t('pages.agent.workflow.editor.cancel')}
        width={480}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ fontWeight: 600 }}>
              {t('pages.agent.workflow.editor.conditionExpression')}
              <FieldTip title={t('pages.agent.workflow.editor.conditionExpressionTip')} />
            </label>
            <Space direction="vertical" style={{ width: '100%' }} size={6}>
              {condRows.map((row, i) => (
                <Space key={i} style={{ width: '100%' }} size={4}>
                  <Select
                    size="small"
                    style={{ width: 116 }}
                    value={row.variable || undefined}
                    options={variableOptions}
                    showSearch
                    placeholder={t('pages.agent.workflow.editor.variable')}
                    onChange={(v) => updateCondRow(i, { variable: v || '' })}
                  />
                  <Select
                    size="small"
                    style={{ width: 72 }}
                    value={row.op}
                    options={COND_OPS}
                    onChange={(v) => updateCondRow(i, { op: v })}
                  />
                  <Input
                    size="small"
                    style={{ flex: 1, minWidth: 0 }}
                    value={row.value}
                    placeholder={t('pages.agent.workflow.editor.conditionValuePlaceholder')}
                    onChange={(e) => updateCondRow(i, { value: e.target.value })}
                  />
                  {i > 0 && (
                    <Select
                      size="small"
                      style={{ width: 56 }}
                      value={row.logic}
                      options={COND_LOGIC}
                      onChange={(v) => updateCondRow(i, { logic: v })}
                    />
                  )}
                  {i > 0 && (
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeCondRow(i)}
                    />
                  )}
                </Space>
              ))}
              <Button type="dashed" block size="small" icon={<PlusOutlined />} onClick={addCondRow}>
                {t('pages.agent.workflow.editor.addCondition')}
              </Button>
            </Space>
            <Input.TextArea
              style={{ marginTop: 8 }}
              rows={2}
              value={edgeCondition}
              onChange={(e) => {
                setEdgeCondition(e.target.value);
                const parsed = parseCondition(e.target.value);
                if (parsed) setCondRows(parsed);
              }}
              placeholder={t('pages.agent.workflow.editor.advancedConditionPlaceholder')}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>{t('pages.agent.workflow.editor.label')}</label>
            <Input
              value={edgeLabel}
              onChange={(e) => setEdgeLabel(e.target.value)}
              placeholder={t('pages.agent.workflow.editor.edgeLabelPlaceholder')}
            />
          </div>
          <div>
            <Checkbox checked={edgeIsDefault} onChange={(e) => setEdgeIsDefault(e.target.checked)}>
              {t('pages.agent.workflow.editor.defaultBranch')}
            </Checkbox>
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>
              {t('pages.agent.workflow.editor.maxIterations')}
            </label>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>
              {t('pages.agent.workflow.editor.maxIterationsTip')}
            </div>
            <InputNumber
              min={1}
              max={100}
              value={edgeMaxIter}
              onChange={(v) => setEdgeMaxIter(v || 10)}
              style={{ width: 120 }}
            />
          </div>
        </Space>
      </Modal>
    </PageContainer>
  );
};
export default Editor;
