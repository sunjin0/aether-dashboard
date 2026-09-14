import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history, useIntl, useLocation, useModel, useParams } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Drawer,
  Table,
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tag,
  message,
} from 'antd';
import useLiveInstance from './useLiveInstance';
import { ReloadOutlined } from '@ant-design/icons';
import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MiniMap,
  MarkerType,
  Node,
  NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getWorkflow, AgentWorkflow } from '@/services/workflow/workflow/WorkflowController';
import {
  getWorkflowInstance,
  getWorkflowCallbacks,
  getWorkflowInstances,
  startWorkflow,
  startBusinessWorkflow,
  answerWorkflow,
  retryWorkflow,
  replayWorkflow,
  terminateWorkflow,
  updateWorkflowVariables,
  retryWorkflowCallback,
  getWorkflowExternalInvocations,
  confirmWorkflowExternalInvocation,
  retryWorkflowExternalInvocation,
  WorkflowInstance,
  WorkflowCallbackDelivery,
  WorkflowExternalInvocation,
} from '@/services/workflow/instance/WorkflowInstanceController';
import FormattedContent from '@/components/FormattedContent';
import { HumanOption, normalizeHumanOptions } from '../humanOptions';
import VariableStructEditor from '../VariableStructEditor';
import WorkflowInputs, { parseWorkflowFields, submittedValue } from '../../WorkflowInputs';
import styles from './index.less';
import { useActivate, useUnactivate } from 'react-activation';

const statusColor: Record<string, string> = {
  RUNNING: 'processing',
  WAITING_USER: 'warning',
  WAITING_SUBFLOW: 'warning',
  WAITING_EVENT: 'warning',
  WAITING_DELAY: 'warning',
  FAILED: 'error',
  COMPLETED: 'success',
  TERMINATED: 'default',
  TIMED_OUT: 'error',
  PENDING: 'default',
};
const nodeColor: Record<string, string> = {
  start: '#52c41a',
  agent: '#1677ff',
  tool: '#fa8c16',
  interaction: '#722ed1',
  rule: '#9254de',
  http: '#d46b08',
  notification: '#eb2f96',
  subflow: '#2f54eb',
  parallel: '#531dab',
  join: '#531dab',
  wait_event: '#13c2c2',
  delay: '#fa8c16',
  end: '#13c2c2',
};
const runStatusColor: Record<string, string> = {
  RUNNING: '#1677ff',
  WAITING_USER: '#fa8c16',
  WAITING_SUBFLOW: '#fa8c16',
  WAITING_EVENT: '#fa8c16',
  WAITING_DELAY: '#fa8c16',
  COMPLETED: '#52c41a',
  FAILED: '#ff4d4f',
  TERMINATED: '#999',
  TIMED_OUT: '#ff4d4f',
  PENDING: '#bfbfbf',
};
type RunNodeData = { def: Record<string, any>; log?: Record<string, any> };
type HumanQuestion = { key: string; question: string; required?: boolean; options?: HumanOption[] };

const getHumanQuestions = (
  intl: ReturnType<typeof useIntl>,
  config: Record<string, any>,
): HumanQuestion[] => {
  const raw = Array.isArray(config.questions) ? config.questions : [];
  const questions = raw
    .map((item: any, index: number) => {
      if (typeof item === 'string')
        return { key: `answer_${index + 1}`, question: item, required: true };
      return {
        key: item?.key || item?.name || `answer_${index + 1}`,
        question:
          item?.question ||
          item?.label ||
          intl.formatMessage(
            { id: 'pages.agent.workflow.run.questionNumber' },
            { number: index + 1 },
          ),
        required: item?.required !== false,
        options: normalizeHumanOptions(item?.options),
      };
    })
    .filter((item) => item.question);
  return questions.length
    ? questions
    : [
        {
          key: 'answer',
          question:
            config.question ||
            intl.formatMessage({ id: 'pages.agent.workflow.run.defaultQuestion' }),
          required: true,
        },
      ];
};

const formatVarValue = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return JSON.stringify(parsed, null, 2);
        }
      } catch {
        /* keep original */
      }
    }
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const hasNodeOutput = (log?: Record<string, any>) =>
  Boolean(
    log &&
    Object.prototype.hasOwnProperty.call(log, 'outputData') &&
    log.outputData !== undefined &&
    log.outputData !== null,
  );

const RunCanvasNode: React.FC<NodeProps<Node<RunNodeData>>> = ({ data, selected }) => {
  const intl = useIntl();
  const def = data.def;
  const log = data.log;
  const status = log?.status || 'PENDING';
  const typeColor = nodeColor[def.type] || '#999';
  const statusFill = runStatusColor[status] || '#bfbfbf';
  const unknownLabel = intl.formatMessage({ id: 'pages.workflowUX.unknown' });
  const typeLabel = intl.formatMessage({
    id: `pages.agent.workflow.run.node.${def.type}`,
    defaultMessage: unknownLabel,
  });
  const statusLabel = intl.formatMessage({
    id: `pages.agent.workflow.run.status.${status}`,
    defaultMessage: unknownLabel,
  });
  return (
    <div
      style={{
        minWidth: 170,
        border: `2px solid ${selected ? '#1677ff' : statusFill}`,
        borderRadius: 10,
        overflow: 'visible',
        background: '#fff',
        boxShadow: selected
          ? '0 0 0 3px #91caff66'
          : status === 'RUNNING'
            ? '0 0 0 3px #91caff66'
            : '0 3px 12px #0000001a',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        style={{ background: typeColor, width: 12, height: 12 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        style={{ background: typeColor, width: 12, height: 12 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{ background: typeColor, width: 12, height: 12 }}
      />
      {/* 兼容已保存工作流的 source-left / target-right 句柄。 */}
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        style={{ background: typeColor, width: 12, height: 12 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        style={{ background: typeColor, width: 12, height: 12 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        style={{ background: typeColor, width: 12, height: 12 }}
      />
      <div
        style={{
          padding: '6px 10px',
          background: `${typeColor}18`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Tag color={typeColor} style={{ margin: 0 }}>
          {typeLabel}
        </Tag>
        <Tag color={status === 'PENDING' ? 'default' : statusFill} style={{ margin: 0 }}>
          {statusLabel}
        </Tag>
      </div>
      <div style={{ padding: '11px 12px' }}>
        <div style={{ fontWeight: 600 }}>{def.name || typeLabel}</div>
        {log?.status === 'FAILED' && log.errorMessage && (
          <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 6 }}>{log.errorMessage}</div>
        )}
      </div>
    </div>
  );
};

const RunPage: React.FC = () => {
  const intl = useIntl();
  const t = (key: string, values?: Record<string, string | number>) =>
    intl.formatMessage(
      { id: key, defaultMessage: intl.formatMessage({ id: 'pages.workflowUX.unknown' }) },
      values,
    );
  const formatWorkflowStatus = (status?: string) =>
    intl.formatMessage({
      id: `pages.agent.workflow.run.status.${status || 'PENDING'}`,
      defaultMessage: t('pages.workflowUX.unknown'),
    });
  const { id } = useParams<{ id: string }>();
  const { initialState } = useModel('@@initialState');
  const canStart = Boolean(initialState?.currentUser?.permissionMap?.['/workflow/run']);
  const location = useLocation();
  const requestedInstanceId = useMemo(
    () => new URLSearchParams(location.search).get('instanceId'),
    [location.search],
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<string>();
  const [historyDate, setHistoryDate] = useState<string>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState(true);
  const [loadError, setLoadError] = useState(false);
  useActivate(() => setActive(true));
  useUnactivate(() => setActive(false));
  const loadSequence = useRef(0);
  const startLock = useRef(false);
  const [workflow, setWorkflow] = useState<AgentWorkflow>();
  const [instance, setInstance] = useState<WorkflowInstance>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [form] = Form.useForm();
  const [answerForm] = Form.useForm();
  const [starting, setStarting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [acting, setActing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyInstances, setHistoryInstances] = useState<WorkflowInstance[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesDraft, setVariablesDraft] = useState<Record<string, unknown>>({});
  const [savingVariables, setSavingVariables] = useState(false);
  const [callbackDeliveries, setCallbackDeliveries] = useState<WorkflowCallbackDelivery[]>([]);
  const [externalInvocations, setExternalInvocations] = useState<WorkflowExternalInvocation[]>([]);
  useEffect(() => {
    if (id) getWorkflow(id).then((r) => r.data && setWorkflow(r.data));
  }, [id]);
  const fields = parseWorkflowFields(workflow?.publishedInputSchema || workflow?.inputSchema);
  const currentVariables = (() => {
    try {
      return instance?.variables ? JSON.parse(instance.variables) : {};
    } catch {
      return {};
    }
  })();
  const publicVariables = (() => {
    const vars: Record<string, unknown> = {};
    Object.entries(currentVariables).forEach(([k, v]) => {
      if (k.startsWith('_')) return;
      vars[k] = v;
    });
    return vars;
  })();
  const declaredSharedFields = (() => {
    const names = new Set<string>();
    fields.forEach((f: any) => {
      if (f?.name && !String(f.name).startsWith('_')) names.add(f.name);
    });
    try {
      const defs = JSON.parse(instance?.versionNodes || '[]');
      if (Array.isArray(defs)) {
        defs.forEach((def: any) => {
          if (Array.isArray(def?.outputs)) {
            def.outputs.forEach((mapping: any) => {
              const target = mapping?.target;
              if (target && !String(target).startsWith('_')) {
                // 嵌套目标 result.order.total 对应顶层变量 result，仅登记根段
                names.add(String(target).split('.')[0]);
              }
            });
          }
        });
      }
    } catch {
      /* ignore */
    }
    return Array.from(names);
  })();
  const sharedStateKeys = Array.from(
    new Set([...declaredSharedFields, ...Object.keys(publicVariables)]),
  );
  const load = async (instanceId: string) => {
    const sequence = ++loadSequence.current;
    const results = await Promise.allSettled([
      getWorkflowInstance(instanceId),
      getWorkflowCallbacks(instanceId),
      getWorkflowExternalInvocations(instanceId),
    ]);
    if (sequence !== loadSequence.current) return;
    const [detail, callbacks, invocations] = results;
    if (detail.status === 'fulfilled' && detail.value.code === 200 && detail.value.data) {
      setInstance(detail.value.data);
      setLoadError(false);
    } else setLoadError(true);
    if (callbacks.status === 'fulfilled' && callbacks.value.code === 200)
      setCallbackDeliveries(callbacks.value.data || []);
    if (invocations.status === 'fulfilled' && invocations.value.code === 200)
      setExternalInvocations(invocations.value.data || []);
  };
  const selectInstance = (instanceId?: string) => {
    const search = new URLSearchParams(location.search);
    if (instanceId) search.set('instanceId', instanceId);
    else search.delete('instanceId');
    history.replace({ pathname: location.pathname, search: search.toString() ? `?${search}` : '' });
    setHistoryOpen(false);
  };
  useEffect(() => {
    loadSequence.current += 1;
    setInstance(undefined);
    setSelectedNodeId(undefined);
    setLoadError(false);
    setCallbackDeliveries([]);
    setExternalInvocations([]);
    if (requestedInstanceId) void load(requestedInstanceId);
    return () => {
      loadSequence.current += 1;
    };
  }, [requestedInstanceId, id]);
  const loadHistory = () => {
    if (!id) return;
    return getWorkflowInstances({ workflowId: id, current: 1, pageSize: 100 }).then((r) => {
      if (r.code === 200) setHistoryInstances(r.data || []);
    });
  };
  useEffect(() => {
    loadHistory();
  }, [id]);
  const refresh = async () => {
    setRefreshing(true);
    try {
      if (id) {
        const r = await getWorkflow(id);
        if (r.data) setWorkflow(r.data);
      }
      if (instance || requestedInstanceId) await load(instance?.id || requestedInstanceId!);
      await loadHistory();
    } finally {
      setRefreshing(false);
    }
  };
  const connection = useLiveInstance(
    instance?.id,
    instance?.status,
    active,
    () => {
      if (instance) void load(instance.id);
    },
    () => {
      void loadHistory();
    },
  );
  const start = async () => {
    if (!id || startLock.current) return;
    startLock.current = true;
    setStarting(true);
    try {
      const values = await form.validateFields();
      const variables: Record<string, unknown> = {};
      fields.forEach((field: any) => {
        if (field?.name) variables[field.name] = submittedValue(field, values[field.name]);
      });
      const businessType = String(values._businessType || '').trim();
      const businessId = String(values._businessId || '').trim();
      const idempotencyKey = String(values._idempotencyKey || '').trim();
      const callbackUrl = String(values._callbackUrl || '').trim();
      const hasBusinessFields = !!(
        businessType ||
        businessId ||
        idempotencyKey ||
        callbackUrl ||
        values._deadlineAt
      );
      if (hasBusinessFields && (!businessType || !businessId || !idempotencyKey)) {
        message.error(t('pages.agent.workflow.run.businessStartRequired'));
        return;
      }
      const deadlineAt = values._deadlineAt?.valueOf?.();
      const result = hasBusinessFields
        ? await startBusinessWorkflow(id, {
            variables,
            businessType,
            businessId,
            idempotencyKey,
            callbackUrl: callbackUrl || undefined,
            deadlineAt,
          })
        : await startWorkflow(id, variables);
      if (result.code === 200 && result.data) {
        selectInstance(result.data);
        loadHistory();
      }
    } catch (error) {
      const fields = (error as { errorFields?: Array<{ name: string[] }> }).errorFields;
      if (fields?.length) form.scrollToField(fields[0].name);
    } finally {
      startLock.current = false;
      setStarting(false);
    }
  };
  const answer = async () => {
    if (!instance) return;
    setAnswering(true);
    try {
      await answerForm.validateFields();
      const node = instance.nodes?.find((item) => item.status === 'WAITING_USER');
      const config = node?.interactionConfig ? JSON.parse(node.interactionConfig) : {};
      const result = await answerWorkflow(
        instance.id,
        config.type === 'mcp_tool_approval'
          ? { decision: answerForm.getFieldValue('decision') }
          : answerForm.getFieldsValue(),
      );
      if (result.code === 200) {
        answerForm.resetFields();
        load(instance.id);
        loadHistory();
      }
    } catch {
      // Field-level validation and the request handler display failures.
    } finally {
      setAnswering(false);
    }
  };
  // 子流程待处理面板：父流程发起人可直接代答子流程的人工交互/审批（answer 打到子实例）。
  const answerChild = async () => {
    if (!instance) return;
    const sub = instance.pendingSubflowInteraction;
    if (!sub?.childInstanceId) return;
    setAnswering(true);
    try {
      await answerForm.validateFields();
      const result = await answerWorkflow(
        sub.childInstanceId,
        sub.interactionType === 'mcp_tool_approval'
          ? { decision: answerForm.getFieldValue('decision') }
          : answerForm.getFieldsValue(),
      );
      if (result.code === 200) {
        answerForm.resetFields();
        load(instance.id);
        loadHistory();
      }
    } catch {
      // Field-level validation and the request handler display failures.
    } finally {
      setAnswering(false);
    }
  };
  const act = async (action: () => Promise<void>) => {
    setActing(true);
    try {
      await action();
    } catch {
      // API failures are displayed by the global request handler.
    } finally {
      setActing(false);
    }
  };
  const openVariablesEditor = () => {
    setVariablesDraft(JSON.parse(JSON.stringify(publicVariables)));
    setVariablesOpen(true);
  };
  const saveVariables = async () => {
    if (!instance) return;
    const draft = variablesDraft;
    if (Object.keys(draft).some((key) => key.startsWith('_'))) {
      message.error(t('pages.agent.workflow.run.internalVariablesForbidden'));
      return;
    }
    // 后端 updateVariables 仅做顶层合并：不存在的 key 传 null 表示删除，其余整值替换
    const payload: Record<string, unknown> = { ...draft };
    Object.keys(publicVariables).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(draft, key)) payload[key] = null;
    });
    setSavingVariables(true);
    try {
      const result = await updateWorkflowVariables(instance.id, payload);
      if (result.code === 200) {
        setVariablesOpen(false);
        load(instance.id);
      }
    } finally {
      setSavingVariables(false);
    }
  };
  const detailNodeId = selectedNodeId ?? instance?.currentNodeId;
  const pendingSub =
    instance?.status === 'WAITING_SUBFLOW' ? instance.pendingSubflowInteraction : undefined;
  const flowNodes = useMemo(() => {
    if (!instance) return [];
    let defs: Record<string, any>[] = [];
    try {
      const parsed = JSON.parse(instance.versionNodes || '[]');
      if (Array.isArray(parsed)) defs = parsed;
    } catch {
      /* ignore */
    }
    const logs = (instance.nodes || []).map((n: any) => n);
    const logByNode: Record<string, Record<string, any>> = {};
    logs.forEach((log: any) => {
      logByNode[log.nodeId] = log;
    });
    return defs.map((def) => ({
      id: def.id,
      type: 'run',
      position: def.position || { x: 100, y: 200 },
      selected: def.id === detailNodeId,
      data: { def, log: logByNode[def.id] },
    })) as Node<RunNodeData>[];
  }, [instance, detailNodeId]);
  const flowEdges = useMemo(() => {
    if (!instance) return [];
    let edges: Record<string, any>[] = [];
    try {
      const parsed = JSON.parse(instance.versionEdges || '[]');
      if (Array.isArray(parsed)) edges = parsed;
    } catch {
      /* ignore */
    }
    const defs = new Map(flowNodes.map((n: any) => [n.id, n.data.def]));
    return edges.map((edge, index) => {
      const isLoop =
        edge.target && edge.source
          ? defs.has(edge.target) && defs.has(edge.source)
            ? flowNodes.findIndex((n: any) => n.id === edge.target) <
              flowNodes.findIndex((n: any) => n.id === edge.source)
            : false
          : false;
      const edgeLabel = edge.condition
        ? edge.label || edge.condition
        : edge.isDefault
          ? edge.label || t('pages.agent.workflow.run.defaultBranch')
          : edge.label;
      return {
        id: edge.id || `edge_${edge.source}_${edge.target}_${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'smoothstep',
        label: edgeLabel || undefined,
        style: isLoop
          ? { stroke: '#ff4d4f', strokeDasharray: '6 3', strokeWidth: 2 }
          : edge.condition
            ? { stroke: '#fa8c16', strokeWidth: 2 }
            : undefined,
      };
    });
  }, [instance, flowNodes]);
  const detailContent = (
    <>
      <Card
        size="small"
        style={{ width: '100%' }}
        title={t('pages.agent.workflow.run.nodeDetail')}
        styles={{ body: { maxHeight: 'calc(100dvh - 350px)', overflow: 'auto' } }}
      >
        {(() => {
          const target = flowNodes.find((n) => n.id === detailNodeId);
          const def = target?.data.def;
          const log = target?.data.log;
          if (!def)
            return (
              <span style={{ color: '#8c8c8c' }}>
                {t('pages.agent.workflow.run.noNodeSelected')}
              </span>
            );
          const statusText = log?.status
            ? t(`pages.agent.workflow.run.status.${log.status}`)
            : t('pages.agent.workflow.run.status.PENDING');
          const typeText = t(`pages.agent.workflow.run.node.${def.type}`);
          const detail = [
            [t('pages.agent.workflow.run.nodeName'), def.name || typeText],
            [t('pages.agent.workflow.run.nodeType'), typeText],
            [t('pages.agent.workflow.run.status'), statusText],
          ];
          return (
            <Descriptions column={1} size="small" bordered>
              {detail.map(([labelText, value]) => (
                <Descriptions.Item key={labelText} label={labelText}>
                  {value}
                </Descriptions.Item>
              ))}
              <Descriptions.Item label={t('pages.workflowUX.nodeInput')}>
                {log?.inputData != null ? (
                  <FormattedContent content={formatVarValue(log.inputData)} />
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.agent.workflow.run.output')}>
                {hasNodeOutput(log) ? (
                  <FormattedContent content={formatVarValue(log?.outputData)} />
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.agent.workflow.run.errorMessage')}>
                {log?.status === 'FAILED' ? log.errorMessage || '-' : '-'}
              </Descriptions.Item>
            </Descriptions>
          );
        })()}
      </Card>
    </>
  );
  const nodeTypes = useMemo(() => ({ run: RunCanvasNode }), []);
  return (
    <PageContainer
      className={styles.page}
      header={{
        title: workflow?.name || t('pages.agent.workflow.run.title'),
        subTitle: requestedInstanceId
          ? t('pages.workflowUX.instanceMode')
          : t('pages.workflowUX.runVersionLabel', {
              version: workflow?.publishedVersion || '—',
            }),
        breadcrumb: undefined,
      }}
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={refresh}>
            {t('pages.agent.workflow.run.refresh')}
          </Button>
          <Button
            onClick={() => {
              loadHistory();
              setHistoryOpen(true);
            }}
          >
            {t('pages.workflowUX.runHistory')}
          </Button>
          <Button
            onClick={() => history.push(`/workflow/run?workflowId=${encodeURIComponent(id || '')}`)}
          >
            {t('pages.workflowUX.allRecords')}
          </Button>
          {instance && (
            <Popconfirm
              title={t('pages.agent.workflow.run.restartConfirm')}
              onConfirm={() => selectInstance()}
            >
              <Button>{t('pages.agent.workflow.run.restart')}</Button>
            </Popconfirm>
          )}
          <Button onClick={() => history.push(`/workflow/workflow/${id}`)}>
            {t('pages.agent.workflow.run.backEditor')}
          </Button>
        </Space>
      }
    >
      {requestedInstanceId && !instance && (
        <Alert
          type={loadError ? 'error' : 'info'}
          showIcon
          message={t(
            loadError ? 'pages.workflowUX.loadFailed' : 'pages.workflowUX.loadingInstance',
          )}
          action={
            loadError && <Button onClick={refresh}>{t('pages.agent.workflow.run.refresh')}</Button>
          }
        />
      )}
      {instance && (
        <Alert
          style={{ marginBottom: 12 }}
          showIcon
          type={
            instance.status === 'FAILED'
              ? 'error'
              : instance.status.startsWith('WAITING')
                ? 'warning'
                : 'info'
          }
          message={
            <Space wrap>
              <Tag>{formatWorkflowStatus(instance.status)}</Tag>
              <span>{instance.id}</span>
            </Space>
          }
          description={
            <Space wrap>
              <span>
                {t('pages.agent.workflow.instance.startedAt')}:{' '}
                {instance.startedAt ? new Date(Number(instance.startedAt)).toLocaleString() : '—'}
              </span>
              {instance.startedAt && (
                <span>
                  {t('pages.workflowUX.elapsed', {
                    seconds: Math.max(
                      0,
                      Math.floor(
                        ((instance.completedAt || Date.now()) - instance.startedAt) / 1000,
                      ),
                    ),
                  })}
                </span>
              )}
              {!['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT'].includes(instance.status) && (
                <Tag>{t(`pages.workflowUX.connection.${connection}`)}</Tag>
              )}
              {instance.status === 'FAILED' && (
                <Button
                  onClick={() => {
                    setSelectedNodeId(
                      instance.nodes?.find((node) => node.status === 'FAILED')?.nodeId,
                    );
                    setDetailOpen(true);
                  }}
                >
                  {t('pages.workflowUX.locateFailure')}
                </Button>
              )}
            </Space>
          }
        />
      )}
      {!instance && !requestedInstanceId && canStart && (
        <Card
          className={styles.startCard}
          title={t('pages.agent.workflow.run.startForm')}
          style={{ marginBottom: 16 }}
          extra={
            <Button
              type="primary"
              loading={starting}
              onClick={start}
              disabled={workflow?.status !== 1}
            >
              {t('pages.agent.workflow.run.start')}
            </Button>
          }
        >
          <Form form={form} layout="vertical">
            <WorkflowInputs fields={fields} />
            <Collapse
              ghost
              style={{ marginBottom: 12 }}
              items={[
                {
                  key: 'business',
                  label: t('pages.agent.workflow.run.businessIntegration'),
                  children: (
                    <>
                      <p style={{ color: '#8c8c8c', fontSize: 12 }}>
                        {t('pages.agent.workflow.run.businessIntegrationTip')}
                      </p>
                      <Form.Item
                        name="_businessType"
                        label={t('pages.agent.workflow.run.businessType')}
                      >
                        <Input
                          placeholder={t('pages.agent.workflow.run.businessTypePlaceholder')}
                        />
                      </Form.Item>
                      <Form.Item
                        name="_businessId"
                        label={t('pages.agent.workflow.run.businessId')}
                      >
                        <Input placeholder={t('pages.agent.workflow.run.businessIdPlaceholder')} />
                      </Form.Item>
                      <Form.Item
                        name="_idempotencyKey"
                        label={t('pages.agent.workflow.run.idempotencyKey')}
                      >
                        <Input
                          placeholder={t('pages.agent.workflow.run.idempotencyKeyPlaceholder')}
                        />
                      </Form.Item>
                      <Form.Item
                        name="_callbackUrl"
                        label={t('pages.agent.workflow.run.callbackUrl')}
                      >
                        <Input placeholder="https://workflow.example.com/callback" />
                      </Form.Item>
                      <Form.Item
                        name="_deadlineAt"
                        label={t('pages.agent.workflow.run.deadlineAt')}
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
            {workflow?.status !== 1 && (
              <span style={{ color: '#fa8c16' }}>
                {t('pages.agent.workflow.run.publishFirst')}
              </span>
            )}
          </Form>
        </Card>
      )}
      {!instance && !requestedInstanceId && !canStart && (
        <Card style={{ marginBottom: 16 }}>{t('pages.agent.workflow.run.startReadOnly')}</Card>
      )}
      {instance && (
        <>
          {[
            'RUNNING',
            'WAITING_USER',
            'WAITING_SUBFLOW',
            'WAITING_EVENT',
            'WAITING_DELAY',
            'FAILED',
          ].includes(instance.status) && (
            <Space wrap style={{ marginBottom: 12 }}>
              {instance.status === 'FAILED' && (
                <Button
                  type="primary"
                  loading={acting}
                  onClick={() =>
                    act(async () => {
                      await retryWorkflow(instance.id);
                      load(instance.id);
                      loadHistory();
                    })
                  }
                >
                  {t('pages.agent.workflow.run.retry')}
                </Button>
              )}
              <Button
                danger
                loading={acting}
                onClick={() =>
                  Modal.confirm({
                    title: t('pages.workflowUX.terminateTitle'),
                    content: t('pages.workflowUX.terminateBody', { id: instance.id }),
                    okButtonProps: { danger: true },
                    onOk: () =>
                      act(async () => {
                        await terminateWorkflow(instance.id);
                        load(instance.id);
                        loadHistory();
                      }),
                  })
                }
              >
                {t('pages.agent.workflow.run.terminate')}
              </Button>
            </Space>
          )}
          {['FAILED', 'COMPLETED', 'TERMINATED'].includes(instance.status) &&
            !instance.businessType &&
            !instance.businessId &&
            !instance.idempotencyKey && (
              <Popconfirm
                title={t('pages.agent.workflow.run.replayConfirm')}
                onConfirm={() =>
                  act(async () => {
                    const result = await replayWorkflow(instance.id);
                    if (result.code !== 200 || !result.data) return;
                    selectInstance(result.data);
                    await loadHistory();
                  })
                }
              >
                <Button style={{ marginBottom: 12, marginLeft: 8 }} loading={acting}>
                  {t('pages.agent.workflow.run.replay')}
                </Button>
              </Popconfirm>
            )}
          <div className={styles.instanceContent}>
            <Collapse
              className={styles.secondarySection}
              style={{ marginBottom: 12 }}
              items={[
                {
                  key: 'details',
                  label: t('pages.workflowUX.instanceDetails'),
                  children: (
                    <Descriptions column={2}>
                      <Descriptions.Item label={t('pages.agent.workflow.run.instanceId')}>
                        {instance.id}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('pages.agent.workflow.run.businessAssociation')}>
                        {instance.businessType && instance.businessId
                          ? `${instance.businessType} · ${instance.businessId}`
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('pages.agent.workflow.run.currentNode')}>
                        {instance.currentNodeId || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('pages.agent.workflow.run.error')}>
                        {instance.status === 'FAILED' ? instance.errorMessage || '-' : '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
              ]}
            />
            {callbackDeliveries.length > 0 && (
              <Card
                className={styles.secondarySection}
                size="small"
                title={t('pages.agent.workflow.run.callbackDelivery')}
                style={{ marginTop: 12 }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {callbackDeliveries.map((delivery) => (
                    <Space
                      key={delivery.id}
                      style={{ justifyContent: 'space-between', width: '100%' }}
                      wrap
                    >
                      <span>
                        {delivery.eventType} ·{' '}
                        {t('pages.agent.workflow.run.deliveryAttempt', {
                          count: delivery.attemptCount || 0,
                        })}
                      </span>
                      <Space>
                        <Tag
                          color={
                            delivery.status === 'DELIVERED'
                              ? 'success'
                              : delivery.status === 'FAILED'
                                ? 'error'
                                : 'processing'
                          }
                        >
                          {t(`pages.workflowUX.delivery.${delivery.status}`)}
                        </Tag>
                        {delivery.responseStatus && <span>HTTP {delivery.responseStatus}</span>}
                        {delivery.status === 'FAILED' && (
                          <Button
                            size="small"
                            loading={acting}
                            onClick={() =>
                              act(async () => {
                                await retryWorkflowCallback(instance.id, delivery.id);
                                load(instance.id);
                              })
                            }
                          >
                            {t('pages.agent.workflow.run.retryDelivery')}
                          </Button>
                        )}
                      </Space>
                      {delivery.errorMessage && (
                        <span style={{ color: '#ff4d4f', width: '100%' }}>
                          {delivery.errorMessage}
                        </span>
                      )}
                    </Space>
                  ))}
                </Space>
              </Card>
            )}
            {externalInvocations.length > 0 && (
              <Card
                className={styles.secondarySection}
                size="small"
                title={t('pages.agent.workflow.run.externalInvocations')}
                style={{ marginTop: 12 }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {externalInvocations.map((invocation) => (
                    <Space
                      key={invocation.id}
                      style={{ justifyContent: 'space-between', width: '100%' }}
                      wrap
                    >
                      <span>
                        {intl.formatMessage({
                          id: `pages.agent.workflow.run.invocationType.${invocation.invocationType}`,
                          defaultMessage: t('pages.workflowUX.unknown'),
                        })}{' '}
                        · {invocation.nodeId}
                      </span>
                      <Space>
                        <Tag
                          color={
                            invocation.status === 'COMPLETED'
                              ? 'success'
                              : invocation.status === 'UNKNOWN'
                                ? 'error'
                                : 'processing'
                          }
                        >
                          {intl.formatMessage({
                            id: `pages.agent.workflow.run.invocationStatus.${invocation.status}`,
                            defaultMessage: t('pages.workflowUX.unknown'),
                          })}
                        </Tag>
                        {invocation.status === 'UNKNOWN' && instance.status === 'FAILED' && (
                          <>
                            <Button
                              size="small"
                              loading={acting}
                              onClick={() =>
                                act(async () => {
                                  await confirmWorkflowExternalInvocation(
                                    instance.id,
                                    invocation.id,
                                  );
                                  load(instance.id);
                                })
                              }
                            >
                              {t('pages.agent.workflow.run.confirmSuccess')}
                            </Button>
                            <Button
                              size="small"
                              danger
                              loading={acting}
                              onClick={() =>
                                act(async () => {
                                  await retryWorkflowExternalInvocation(instance.id, invocation.id);
                                  load(instance.id);
                                })
                              }
                            >
                              {t('pages.agent.workflow.run.explicitRetry')}
                            </Button>
                          </>
                        )}
                      </Space>
                      {invocation.errorMessage && (
                        <span style={{ color: '#ff4d4f', width: '100%' }}>
                          {invocation.errorMessage}
                        </span>
                      )}
                    </Space>
                  ))}
                </Space>
              </Card>
            )}
            {instance.status === 'WAITING_USER' && (
              <>
                <Card
                  size="small"
                  style={{ width: '100%', marginBottom: 12 }}
                  title={t('pages.agent.workflow.run.waiting')}
                >
                  <Form form={answerForm} layout="vertical">
                    {(() => {
                      const node = instance.nodes?.find((item) => item.status === 'WAITING_USER');
                      const config = node?.interactionConfig
                        ? JSON.parse(node.interactionConfig)
                        : {};
                      return config.type === 'mcp_tool_approval' ? (
                        <>
                          <p>
                            {config.question || t('pages.agent.workflow.run.confirmMcpToolCall')}
                          </p>
                          {config.arguments && <FormattedContent content={config.arguments} />}
                          <Form.Item
                            name="decision"
                            rules={[
                              {
                                required: true,
                                message: t('pages.agent.workflow.run.selectDecision'),
                              },
                            ]}
                          >
                            <Radio.Group>
                              <Space direction="vertical">
                                <Radio value="once">{t('pages.agent.workflow.run.mcpOnce')}</Radio>
                                <Radio value="allow_10m">
                                  {t('pages.agent.workflow.run.mcpAllowTenMinutes')}
                                </Radio>
                                <Radio value="reject">
                                  {t('pages.agent.workflow.run.mcpReject')}
                                </Radio>
                              </Space>
                            </Radio.Group>
                          </Form.Item>
                        </>
                      ) : (
                        <>
                          {getHumanQuestions(intl, config).map((question, index) => (
                            <Form.Item
                              key={question.key}
                              name={question.key}
                              label={question.question}
                              rules={
                                question.required
                                  ? [
                                      {
                                        required: true,
                                        message: t('pages.agent.workflow.run.answerRequired'),
                                      },
                                    ]
                                  : undefined
                              }
                            >
                              {question.options?.length ? (
                                <Radio.Group>
                                  <Space direction="vertical">
                                    {question.options.map((option) => (
                                      <Radio key={option.value} value={option.value}>
                                        {option.label}
                                      </Radio>
                                    ))}
                                  </Space>
                                </Radio.Group>
                              ) : (
                                <Input.TextArea
                                  autoSize={{ minRows: index === 0 ? 3 : 2, maxRows: 6 }}
                                />
                              )}
                            </Form.Item>
                          ))}
                        </>
                      );
                    })()}
                    <Button type="primary" loading={answering} onClick={answer}>
                      {t('pages.agent.workflow.run.submitAndContinue')}
                    </Button>
                  </Form>
                </Card>
              </>
            )}
            {pendingSub && (
              <>
                <Card
                  size="small"
                  style={{ width: '100%', marginBottom: 12 }}
                  title={t('pages.agent.workflow.run.waitingSubflow')}
                  extra={
                    <a
                      onClick={() => {
                        history.push(
                          `/workflow/workflow/${pendingSub.childWorkflowId}/run?instanceId=${encodeURIComponent(pendingSub.childInstanceId)}`,
                        );
                      }}
                    >
                      {t('pages.agent.workflow.run.openSubflow')}
                    </a>
                  }
                >
                  {(() => {
                    const sub = pendingSub;
                    const waiting = sub.status === 'WAITING_USER';
                    const approvalOnly = waiting && sub.answerable === false;
                    return (
                      <>
                        <p>
                          <strong>{sub.childWorkflowName || sub.childWorkflowId}</strong>
                          {sub.nodeId ? ` · ${sub.nodeId}` : ''}
                          {sub.question ? `：${sub.question}` : ''}
                        </p>
                        {!waiting && <p>{t('pages.agent.workflow.run.subflowExecuting')}</p>}
                        {approvalOnly && (
                          <p>{t('pages.agent.workflow.run.subflowPendingApprover')}</p>
                        )}
                        {waiting && !approvalOnly && (
                          <Form form={answerForm} layout="vertical">
                            {sub.interactionType === 'mcp_tool_approval' ? (
                              <>
                                <p>
                                  {sub.question || t('pages.agent.workflow.run.confirmMcpToolCall')}
                                </p>
                                {sub.arguments && <FormattedContent content={sub.arguments} />}
                                <Form.Item
                                  name="decision"
                                  rules={[
                                    {
                                      required: true,
                                      message: t('pages.agent.workflow.run.selectDecision'),
                                    },
                                  ]}
                                >
                                  <Radio.Group>
                                    <Space direction="vertical">
                                      <Radio value="once">
                                        {t('pages.agent.workflow.run.mcpOnce')}
                                      </Radio>
                                      <Radio value="allow_10m">
                                        {t('pages.agent.workflow.run.mcpAllowTenMinutes')}
                                      </Radio>
                                      <Radio value="reject">
                                        {t('pages.agent.workflow.run.mcpReject')}
                                      </Radio>
                                    </Space>
                                  </Radio.Group>
                                </Form.Item>
                              </>
                            ) : (
                              <>
                                {getHumanQuestions(intl, sub).map((question, index) => (
                                  <Form.Item
                                    key={question.key}
                                    name={question.key}
                                    label={question.question}
                                    rules={
                                      question.required
                                        ? [
                                            {
                                              required: true,
                                              message: t('pages.agent.workflow.run.answerRequired'),
                                            },
                                          ]
                                        : undefined
                                    }
                                  >
                                    {question.options?.length ? (
                                      <Radio.Group>
                                        <Space direction="vertical">
                                          {question.options.map((option) => (
                                            <Radio key={option.value} value={option.value}>
                                              {option.label}
                                            </Radio>
                                          ))}
                                        </Space>
                                      </Radio.Group>
                                    ) : (
                                      <Input.TextArea
                                        autoSize={{ minRows: index === 0 ? 3 : 2, maxRows: 6 }}
                                      />
                                    )}
                                  </Form.Item>
                                ))}
                              </>
                            )}
                            <Button type="primary" loading={answering} onClick={answerChild}>
                              {t('pages.agent.workflow.run.submitAndContinue')}
                            </Button>
                          </Form>
                        )}
                      </>
                    );
                  })()}
                </Card>
              </>
            )}

            <Collapse
              className={styles.secondarySection}
              style={{ marginBottom: 12 }}
              items={[
                {
                  key: 'variables',
                  label: t('pages.agent.workflow.run.sharedState'),
                  children: (
                    <>
                      <div className={styles.sharedState}>
                        {['RUNNING', 'WAITING_USER', 'FAILED'].includes(instance.status) && (
                          <Button size="small" onClick={openVariablesEditor}>
                            {t('pages.agent.workflow.run.edit')}
                          </Button>
                        )}
                        {sharedStateKeys.length ? (
                          sharedStateKeys.map((k) => {
                            const value = publicVariables[k];
                            return (
                              <div key={k} style={{ marginBottom: 8 }}>
                                <div style={{ fontWeight: 600, fontSize: 12, color: '#595959' }}>
                                  {k}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    wordBreak: 'break-all',
                                    whiteSpace: 'pre-wrap',
                                  }}
                                >
                                  {value === undefined ? (
                                    <span style={{ color: '#bfbfbf' }}>
                                      {t('pages.agent.workflow.run.notGenerated')}
                                    </span>
                                  ) : (
                                    <FormattedContent content={formatVarValue(value)} />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <span style={{ color: '#8c8c8c' }}>
                            {t('pages.agent.workflow.run.emptyState')}
                          </span>
                        )}
                      </div>
                    </>
                  ),
                },
              ]}
            />
            <div className={styles.runWorkspace}>
              <div className={styles.canvas}>
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable
                  panOnDrag={[1, 2]}
                  connectionMode={ConnectionMode.Loose}
                  onNodeClick={(_, node) => {
                    setSelectedNodeId(node.id);
                    setDetailOpen(true);
                  }}
                  onPaneClick={() => setSelectedNodeId(undefined)}
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed },
                  }}
                >
                  <Background gap={16} size={1} />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => {
                      const d = (node.data as RunNodeData)?.log?.status;
                      return (
                        runStatusColor[d] ||
                        nodeColor[(node.data as RunNodeData)?.def?.type] ||
                        '#999'
                      );
                    }}
                  />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>
            </div>
            <Drawer
              title={t('pages.agent.workflow.run.nodeDetail')}
              width="min(440px, 100vw)"
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
            >
              {detailContent}
            </Drawer>
          </div>
        </>
      )}
      <Modal
        title={t('pages.agent.workflow.run.editVariables')}
        open={variablesOpen}
        onCancel={() => setVariablesOpen(false)}
        onOk={saveVariables}
        confirmLoading={savingVariables}
        destroyOnClose
      >
        <p style={{ color: '#8c8c8c' }}>{t('pages.agent.workflow.run.editVariablesTip')}</p>
        <VariableStructEditor value={variablesDraft} onChange={setVariablesDraft} />
      </Modal>
      <Drawer
        title={t('pages.workflowUX.runHistory')}
        width="min(760px, 100vw)"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            style={{ width: 180 }}
            value={historyStatus}
            onChange={setHistoryStatus}
            placeholder={t('pages.agent.workflow.instance.status')}
            options={Object.keys(statusColor).map((value) => ({
              value,
              label: formatWorkflowStatus(value),
            }))}
          />
          <DatePicker
            onChange={(_, value) => setHistoryDate(typeof value === 'string' ? value : undefined)}
          />
        </Space>
        <Table
          rowKey="id"
          size="small"
          dataSource={historyInstances.filter(
            (item) =>
              (!historyStatus || item.status === historyStatus) &&
              (!historyDate ||
                new Date(Number(item.startedAt)).toLocaleDateString('sv-SE') === historyDate),
          )}
          columns={[
            {
              title: t('pages.agent.workflow.instance.startedAt'),
              dataIndex: 'startedAt',
              render: (value) => (value ? new Date(Number(value)).toLocaleString() : '—'),
            },
            {
              title: t('pages.agent.workflow.instance.status'),
              dataIndex: 'status',
              render: formatWorkflowStatus,
            },
            {
              title: t('pages.agent.workflow.action'),
              render: (_, record) => (
                <Button type="link" onClick={() => selectInstance(record.id)}>
                  {t('pages.agent.workflow.instance.open')}
                </Button>
              ),
            },
          ]}
        />
        <Button
          onClick={() => history.push(`/workflow/run?workflowId=${encodeURIComponent(id || '')}`)}
        >
          {t('pages.workflowUX.allRecords')}
        </Button>
      </Drawer>
    </PageContainer>
  );
};
export default RunPage;
