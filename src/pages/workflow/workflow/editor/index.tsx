import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { history, useIntl, useParams } from '@umijs/max'
import { PageContainer } from '@ant-design/pro-components'
import { Button, Card, Checkbox, Input, InputNumber, Modal, Popconfirm, Select, Space, Tabs, Tag, Tooltip, message } from 'antd'
import {
  ApartmentOutlined,
  BlockOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  DeleteOutlined,
  DownOutlined,
  FilterOutlined,
  GlobalOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  NotificationOutlined,
  PlayCircleFilled,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
  SendOutlined,
  SettingOutlined,
  StopFilled,
  SwapOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  ReactFlow,
  ReactFlowInstance,
  addEdge,
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AgentWorkflow,
  WorkflowNode,
  getWorkflow,
  publishWorkflow,
  updateWorkflow,
  validateWorkflowDraft,
} from '@/services/workflow/workflow/WorkflowController'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import { getAgentToolInfo, getAgentToolOptions } from '@/services/agent/ToolController'
import StartVariablesBuilder from '../StartVariablesBuilder'

type WorkflowData = { workflowNode: WorkflowNode };
const FieldTip: React.FC<{ title: React.ReactNode }> = ({ title }) => (
  <Tooltip title={title}>
    <InfoCircleOutlined style={{ color: '#8c8c8c', marginLeft: 4 }} />
  </Tooltip>
)
const CardTitle: React.FC<{ title: React.ReactNode; tip: React.ReactNode }> = ({ title, tip }) => (
  <span>
    {title} <FieldTip title={tip} />
  </span>
)
const color: Record<string, string> = {
  start: '#52c41a',
  agent: '#1677ff',
  tool: '#fa8c16',
  human: '#722ed1',
  approval: '#eb2f96',
  wait_event: '#13c2c2',
  rule: '#9254de', transform: '#08979c', http: '#d46b08', notification: '#eb2f96',
  subflow: '#2f54eb', parallel: '#531dab', join: '#531dab', delay: '#fa8c16',
  end: '#13c2c2',
}
const paletteIcon = (type: WorkflowNode['type']) => {
  const style = { color: color[type] || '#1677ff', fontSize: 17 }
  switch (type) {
    case 'start': return <PlayCircleFilled style={style} />
    case 'agent': return <RobotOutlined style={style} />
    case 'tool': return <ToolOutlined style={style} />
    case 'human': return <UserOutlined style={style} />
    case 'approval': return <CheckCircleOutlined style={style} />
    case 'rule': return <FilterOutlined style={style} />
    case 'transform': return <SwapOutlined style={style} />
    case 'http': return <GlobalOutlined style={style} />
    case 'notification': return <NotificationOutlined style={style} />
    case 'subflow': return <BlockOutlined style={style} />
    case 'parallel': return <ApartmentOutlined style={style} />
    case 'join': return <ClusterOutlined style={style} />
    case 'wait_event': return <ClockCircleOutlined style={style} />
    case 'delay': return <ClockCircleOutlined style={style} />
    case 'end': return <StopFilled style={style} />
    default: return <SettingOutlined style={style} />
  }
}
const nodeUsage: Record<WorkflowNode['type'], string> = {
  start: '配置流程启动时可接收的输入变量。', agent: '调用指定 Agent 处理提示词并将结果按状态映射写入变量池。',
  tool: '调用已接入的工具；参数可引用流程变量。', human: '暂停流程，收集人工填写的信息后继续。',
  approval: '等待服务账号提交审批结论。', rule: '按顺序判断条件并输出首个命中的结果。',
  transform: '将已有变量按字段映射转换为新的流程变量。', http: '调用外部 HTTP 接口，并映射响应结果。',
  notification: '向指定收件人发送流程通知。', subflow: '启动固定版本的子流程并接收其契约输出。',
  parallel: '从多个入口并行执行业务分支。', join: '按策略汇聚并行分支的执行结果。',
  wait_event: '等待指定事件及关联键匹配后恢复流程。', delay: '等待指定时长后继续执行。', end: '声明允许业务接口和回调返回的最终输出。',
}
const paletteGroups: Array<{ key: string; label: string; types: WorkflowNode['type'][] }> = [
  { key: 'execute', label: '执行', types: ['agent', 'tool', 'rule', 'transform', 'http', 'notification'] },
  { key: 'collaborate', label: '协作', types: ['human', 'approval', 'subflow', 'wait_event'] },
  { key: 'control', label: '控制', types: ['delay', 'parallel', 'join'] },
]
const nodeLabel = (intl: ReturnType<typeof useIntl>, type: string) =>
  intl.formatMessage({ id: `pages.agent.workflow.run.node.${type}` })
const textValue = (value: unknown) => typeof value === 'string' ? value : undefined
const numberValue = (value: unknown) => typeof value === 'number' ? value : undefined
const initial = (intl: ReturnType<typeof useIntl>): WorkflowNode[] => [
  { id: 'start', type: 'start', name: nodeLabel(intl, 'start'), position: { x: 80, y: 260 } },
  { id: 'end', type: 'end', name: nodeLabel(intl, 'end'), position: { x: 780, y: 260 } },
]
const buildArgumentsTemplate = (schema?: string) => {
  if (!schema) return '{}'
  try {
    const parsed = JSON.parse(schema)
    const properties = parsed?.properties && typeof parsed.properties === 'object' ? parsed.properties : parsed
    if (!properties || Array.isArray(properties) || typeof properties !== 'object') return '{}'
    const initialValues: Record<string, unknown> = {}
    Object.entries(properties).forEach(([key, value]: [string, any]) => {
      initialValues[key] = value?.example ?? value?.default ?? ''
    })
    return JSON.stringify(initialValues, null, 2)
  } catch {
    return '{}'
  }
}
const validateBeforePublish = (intl: ReturnType<typeof useIntl>, workflowNodes: WorkflowNode[], workflowEdges: Array<{ source: string; target: string }>) => {
  const ids = new Set(workflowNodes.map((node) => node.id))
  const starts = workflowNodes.filter((node) => node.type === 'start')
  const ends = workflowNodes.filter((node) => node.type === 'end')
  if (starts.length !== 1 || ends.length !== 1) return intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.startEnd' })
  if (workflowEdges.some((edge) => !ids.has(edge.source) || !ids.has(edge.target))) return intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.deletedEdge' })
  if (workflowEdges.some((edge) => edge.source === ends[0].id)) return intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.endOutput' })
  const next = new Map<string, string[]>()
  const previous = new Map<string, string[]>()
  workflowEdges.forEach((edge) => {
    next.set(edge.source, [...(next.get(edge.source) || []), edge.target])
    previous.set(edge.target, [...(previous.get(edge.target) || []), edge.source])
  })
  const traverse = (from: string, graph: Map<string, string[]>) => {
    const visited = new Set<string>([from])
    const queue = [from]
    while (queue.length) {
      const current = queue.shift()!
      ;(graph.get(current) || []).forEach((target) => {
        if (!visited.has(target)) { visited.add(target); queue.push(target) }
      })
    }
    return visited
  }
  const reachable = traverse(starts[0].id, next)
  const canReachEnd = traverse(ends[0].id, previous)
  const unreachable = workflowNodes.find((node) => !reachable.has(node.id))
  if (unreachable) return intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.unreachable' }, { name: unreachable.name || unreachable.id })
  const deadEnd = workflowNodes.find((node) => !canReachEnd.has(node.id))
  if (deadEnd) return intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.deadEnd' }, { name: deadEnd.name || deadEnd.id })
  return undefined
}
const toFlowNodes = (items: WorkflowNode[]): Node<WorkflowData>[] =>
  items.map((item) => ({
    id: item.id,
    type: 'workflow',
    position: item.position || { x: 100, y: 200 },
    data: { workflowNode: item },
    deletable: !['start', 'end'].includes(item.type),
  }))
const toFlowEdges = (items: any[], defaultBranch: string, allNodes?: WorkflowNode[]): Edge[] =>
  items.map((item, index) => {
    const isLoop = allNodes && item.target && item.source
      ? allNodes.findIndex((n) => n.id === item.target) < allNodes.findIndex((n) => n.id === item.source)
      : false
    const edgeLabel = item.condition
      ? (item.label || item.condition)
      : item.isDefault
        ? (item.label || defaultBranch)
        : item.label
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
      data: { condition: item.condition, isDefault: item.isDefault, maxIterations: item.maxIterations, loopLabel: item.label },
    }
  })

const WorkflowCanvasNode: React.FC<NodeProps<Node<WorkflowData>>> = ({ data, selected }) => {
  const intl = useIntl()
  const item = data.workflowNode
  const nodeColor = color[item.type]
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
        <span style={{ width: 29, height: 29, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${nodeColor}16` }}>
          {paletteIcon(item.type)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#172033', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name || nodeLabel(intl, item.type)}
          </div>
          <div style={{ color: nodeColor, fontSize: 12, marginTop: 2 }}>{nodeLabel(intl, item.type)}</div>
        </div>
      </div>
    </div>
  )
}

type StateMappingRow = { key: string; value: string }
const parseStateMapping = (value?: string): StateMappingRow[] => {
  if (!value?.trim()) return []
  try {
    const mapping = JSON.parse(value)
    if (!mapping || Array.isArray(mapping) || typeof mapping !== 'object') return []
    return Object.entries(mapping).map(([key, mappedValue]) => ({ key, value: String(mappedValue ?? '') }))
  } catch {
    return []
  }
}
const StateMappingEditor: React.FC<{ value?: string; onChange: (value: string) => void; options: { value: string; label: string }[] }> = ({ value, onChange, options }) => {
  const intl = useIntl()
  const [rows, setRows] = useState<StateMappingRow[]>(() => parseStateMapping(value))
  useEffect(() => { setRows(parseStateMapping(value)) }, [value])
  const updateRows = (next: StateMappingRow[]) => {
    setRows(next)
    const mapping = next.reduce<Record<string, string>>((result, row) => {
      const key = row.key.trim()
      if (key) result[key] = row.value
      return result
    }, {})
    onChange(Object.keys(mapping).length ? JSON.stringify(mapping) : '')
  }
  return <>
    <label>
      {intl.formatMessage({ id: 'pages.agent.workflow.editor.stateMapping' })}
      <FieldTip title={intl.formatMessage({ id: 'pages.agent.workflow.editor.stateMappingTip' })} />
    </label>
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <Space key={index} size={6} style={{ display: 'flex' }}>
          <Select
            style={{ width: 116 }}
            value={row.key}
            options={options}
            showSearch
            placeholder={intl.formatMessage({ id: 'pages.agent.workflow.editor.stateMappingKey' })}
            onChange={(key) => updateRows(rows.map((item, i) => (i === index ? { ...item, key } : item)))}
          />
          <Input
            style={{ flex: 1, minWidth: 0 }}
            value={row.value}
            placeholder={intl.formatMessage({ id: 'pages.agent.workflow.editor.stateMappingValue' })}
            onChange={(e) => updateRows(rows.map((item, i) => (i === index ? { ...item, value: e.target.value } : item)))}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={intl.formatMessage({ id: 'pages.agent.workflow.editor.removeStateMapping' })}
            onClick={() => updateRows(rows.filter((_, i) => i !== index))}
          />
        </Space>
      ))}
      <Button
        type="dashed"
        block
        size="small"
        icon={<PlusOutlined />}
        onClick={() => updateRows([...rows, { key: '', value: '' }])}
      >
        {intl.formatMessage({ id: 'pages.agent.workflow.editor.addStateMapping' })}
      </Button>
    </Space>
  </>
}

type StructuredField = { key: string; label: string; placeholder?: string }
const StructuredListEditor: React.FC<{
  value?: unknown
  fields: StructuredField[]
  onChange: (value: Record<string, string>[]) => void
  addText: string
}> = ({ value, fields, onChange, addText }) => {
  const rows = Array.isArray(value) ? value.filter((row): row is Record<string, string> => !!row && typeof row === 'object') : []
  const update = (index: number, key: string, next: string) =>
    onChange(rows.map((row, i) => i === index ? { ...row, [key]: next } : row))
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <div key={index} style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr)) 28px`, gap: 6 }}>
          {fields.map((field) => (
            <Input key={field.key} value={row[field.key] || ''} placeholder={field.placeholder || field.label} onChange={(e) => update(index, field.key, e.target.value)} />
          ))}
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onChange(rows.filter((_, i) => i !== index))} />
        </div>
      ))}
      <Button type="dashed" block size="small" icon={<PlusOutlined />} onClick={() => onChange([...rows, Object.fromEntries(fields.map((field) => [field.key, '']))])}>
        {addText}
      </Button>
    </Space>
  )
}

const TemplateObjectEditor: React.FC<{ value?: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const intl = useIntl()
  const parse = (): StateMappingRow[] => {
    try {
      const parsed = JSON.parse(value || '{}')
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.entries(parsed).map(([key, mapped]) => ({ key, value: String(mapped ?? '') })) : []
    } catch { return [] }
  }
  const rows = parse()
  const update = (next: StateMappingRow[]) => onChange(JSON.stringify(next.reduce<Record<string, string>>((result, row) => {
    if (row.key.trim()) result[row.key.trim()] = row.value
    return result
  }, {})))
  return <>
    <label style={{ marginBottom: -6, fontWeight: 500 }}>{intl.formatMessage({ id: 'pages.agent.workflow.editor.argumentsTemplate' })}</label>
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <Space key={index} size={6} style={{ display: 'flex' }}>
          <Input value={row.key} placeholder="参数名" onChange={(e) => update(rows.map((item, i) => i === index ? { ...item, key: e.target.value } : item))} />
          <Input value={row.value} placeholder="值或 ${变量}" onChange={(e) => update(rows.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => update(rows.filter((_, i) => i !== index))} />
        </Space>
      ))}
      <Button type="dashed" block size="small" icon={<PlusOutlined />} onClick={() => update([...rows, { key: '', value: '' }])}>添加参数</Button>
    </Space>
  </>
}

type CondRow = { variable: string; op: string; value: string; logic: '&&' | '||' }
const COND_OPS = ['==', '!=', '>', '>=', '<', '<='].map((v) => ({ value: v, label: v }))
const COND_LOGIC: { value: '&&' | '||'; label: string }[] = [
  { value: '&&', label: '&&' },
  { value: '||', label: '||' },
]
const EMPTY_COND_ROW = (): CondRow => ({ variable: '', op: '==', value: '', logic: '&&' })
const buildCondition = (rows: CondRow[]) => {
  let out = ''
  let first = true
  rows.forEach((r) => {
    const v = (r.variable || '').trim()
    if (!v) return
    const part = `\${${v}} ${r.op || '=='} ${r.value}`
    out = first ? part : `${out} ${r.logic || '&&'} ${part}`
    first = false
  })
  return out
}
const parseCondition = (expr: string): CondRow[] | null => {
  if (!expr || !expr.trim()) return [EMPTY_COND_ROW()]
  const COND_RE = /^\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}\s*(==|!=|>=|<=|>|<)\s*(.*)$/
  const tokens = expr.split(/\s*(&&|\|\|)\s*/).filter((t) => t.length > 0)
  const rows: CondRow[] = []
  for (let i = 0; i < tokens.length; i += 2) {
    const match = COND_RE.exec(tokens[i])
    if (!match) return null
    rows.push({
      variable: match[1],
      op: match[2],
      value: (match[3] || '').trim(),
      logic: i > 0 ? (tokens[i - 1] as '&&' | '||') : '&&',
    })
  }
  return rows.length ? rows : [EMPTY_COND_ROW()]
}

const Editor: React.FC = () => {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values)
  const { id } = useParams<{ id: string }>()
  const [workflow, setWorkflow] = useState<AgentWorkflow>()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowData>>(toFlowNodes(initial(intl)))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    toFlowEdges([{ source: 'start', target: 'end' }], intl.formatMessage({ id: 'pages.agent.workflow.run.defaultBranch' })),
  )
  const [selectedId, setSelectedId] = useState('start')
  const [schema, setSchema] = useState('[]')
  const [outputSchema, setOutputSchema] = useState('[]')
  const [agentOptions, setAgentOptions] = useState<any[]>([])
  const [toolOptions, setToolOptions] = useState<any[]>([])
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [paletteGroup, setPaletteGroup] = useState('execute')
  const [propertyOpen, setPropertyOpen] = useState(true)
  const [propertyWidth, setPropertyWidth] = useState(338)
  const [panelOffsets, setPanelOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const panelDrag = useRef<{ key: string; x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const propertyResize = useRef<{ x: number; width: number } | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [edgeModalOpen, setEdgeModalOpen] = useState(false)
  const [edgeCondition, setEdgeCondition] = useState('')
  const [edgeLabel, setEdgeLabel] = useState('')
  const [edgeIsDefault, setEdgeIsDefault] = useState(false)
  const [edgeMaxIter, setEdgeMaxIter] = useState<number>(10)
  const [condRows, setCondRows] = useState<CondRow[]>(() => [EMPTY_COND_ROW()])
  const [flow, setFlow] = useState<ReactFlowInstance<Node<WorkflowData>, Edge> | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<{ past: Array<{ nodes: Node<WorkflowData>[]; edges: Edge[] }>; future: Array<{ nodes: Node<WorkflowData>[]; edges: Edge[] }> }>({ past: [], future: [] })
  const selected = nodes.find((node) => node.id === selectedId)?.data.workflowNode
  const canvasSnapshot = () => ({
    nodes: nodes.map((node) => ({ ...node, position: { ...node.position }, data: { ...node.data, workflowNode: { ...node.data.workflowNode } } })),
    edges: edges.map((edge) => ({ ...edge, data: { ...(edge.data || {}) } })),
  })
  const recordHistory = () => {
    historyRef.current.past = [...historyRef.current.past.slice(-39), canvasSnapshot()]
    historyRef.current.future = []
  }
  const undo = () => {
    const previous = historyRef.current.past.pop()
    if (!previous) return
    historyRef.current.future.push(canvasSnapshot())
    setNodes(previous.nodes); setEdges(previous.edges)
  }
  const redo = () => {
    const next = historyRef.current.future.pop()
    if (!next) return
    historyRef.current.past.push(canvasSnapshot())
    setNodes(next.nodes); setEdges(next.edges)
  }
  const panelStyle = (key: string, style?: React.CSSProperties): React.CSSProperties => {
    const offset = panelOffsets[key] || { x: 0, y: 0 }
    return { ...style, transform: `translate(${offset.x}px, ${offset.y}px)` }
  }
  const startPanelDrag = (key: string) => (event: React.PointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const offset = panelOffsets[key] || { x: 0, y: 0 }
    panelDrag.current = { key, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const movePanel = (event: React.PointerEvent<HTMLSpanElement>) => {
    const drag = panelDrag.current
    if (!drag) return
    setPanelOffsets((current) => ({
      ...current,
      [drag.key]: {
        x: drag.offsetX + event.clientX - drag.x,
        y: drag.offsetY + event.clientY - drag.y,
      },
    }))
  }
  const stopPanelDrag = () => { panelDrag.current = null }
  const startPropertyResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    propertyResize.current = { x: event.clientX, width: propertyWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const resizeProperty = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!propertyResize.current) return
    setPropertyWidth(Math.max(338, Math.min(620, propertyResize.current.width + propertyResize.current.x - event.clientX)))
  }
  const stopPropertyResize = () => { propertyResize.current = null }
  const draggablePanelTitle = (key: string, title: React.ReactNode, tip: React.ReactNode) => (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', cursor: 'move', touchAction: 'none' }}
      onPointerDown={startPanelDrag(key)}
      onPointerMove={movePanel}
      onPointerUp={stopPanelDrag}
      onPointerCancel={stopPanelDrag}
    >
      <HolderOutlined style={{ color: '#8c8c8c', marginRight: 6 }} />
      <CardTitle title={title} tip={tip} />
    </span>
  )
  const schemaFields = useMemo(() => {
    try {
      const parsed = JSON.parse(schema || '[]')
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item && typeof item === 'object' && item.name)
            .map((item) => ({
              value: String(item.name),
              label: item.label ? `${item.name}（${item.label}）` : String(item.name),
            }))
        : []
    } catch {
      return []
    }
  }, [schema])
  const outputFields = useMemo(() => {
    try {
      const parsed = JSON.parse(outputSchema || '[]')
      return Array.isArray(parsed)
        ? parsed.filter((item) => item && typeof item === 'object' && item.name).map((item) => ({
            value: String(item.name),
            label: item.label ? `${item.name}（${item.label}）` : String(item.name),
          }))
        : []
    } catch { return [] }
  }, [outputSchema])
  const variableOptions = useMemo(() => [
    ...schemaFields.map((item) => ({ ...item, label: `${item.label}（输入）` })),
    ...outputFields.map((item) => ({ ...item, label: `${item.label}（输出）` })),
  ], [schemaFields, outputFields])
  const workflowNodeOptions = useMemo(
    () => nodes.map((node) => ({ value: node.id, label: `${node.data.workflowNode.name || node.id} (${node.id})` })),
    [nodes],
  )
  useEffect(() => {
    if (!id) return
    getWorkflow(id).then((r) => {
      if (r.code !== 200 || !r.data) return
      setWorkflow(r.data)
      getAgentDefinitionOptions({ applicationId: r.data.applicationId }).then(setAgentOptions)
      try {
        const parsedNodes = r.data.nodes ? JSON.parse(r.data.nodes) : []
        const restored =
          (Array.isArray(parsedNodes) && parsedNodes.length > 0 ? parsedNodes : initial(intl))
            .map((node: WorkflowNode | any) => node.type === 'mcp' ? { ...node, type: 'tool' } : node)
        const parsedEdges = r.data.edges ? JSON.parse(r.data.edges) : []
        const restoredEdges =
          Array.isArray(parsedEdges) && parsedEdges.length > 0
            ? parsedEdges
            : restored
              .slice(0, -1)
              .map((node: WorkflowNode, index: number) => ({
                source: node.id,
                target: restored[index + 1].id,
              }))
        setNodes(toFlowNodes(restored))
        setEdges(toFlowEdges(restoredEdges, t('pages.agent.workflow.run.defaultBranch'), restored))
        setSchema(r.data.inputSchema || '[]')
        setOutputSchema(r.data.outputSchema || '[]')
      } catch {
        message.error(t('pages.agent.workflow.editor.canvasDataInvalid'))
      }
    })
    if (!id) getAgentDefinitionOptions().then(setAgentOptions)
    getAgentToolOptions().then(setToolOptions)
  }, [id, intl, setEdges, setNodes])
  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source)?.data.workflowNode
      const target = nodes.find((node) => node.id === connection.target)?.data.workflowNode
      if (source?.type === 'end') { message.warning(t('pages.agent.workflow.editor.endCannotConnect')); return }
      if (target?.type === 'start') { message.warning(t('pages.agent.workflow.editor.startCannotFollow')); return }
      recordHistory()
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
      )
    },
    [nodes, setEdges, t],
  )
  const add = (type: WorkflowNode['type'], position?: { x: number; y: number }) => {
    recordHistory()
    const item: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      name: nodeLabel(intl, type),
      position: position || { x: 300 + Math.random() * 220, y: 120 + Math.random() * 300 },
      // 开始表单默认为空；不要引用未声明变量，否则用户刚添加 Agent 就无法发布。
      prompt: type === 'agent' ? t('pages.agent.workflow.editor.defaultPrompt') : undefined,
      question: type === 'human' ? t('pages.agent.workflow.editor.defaultQuestion') : undefined,
      argumentsTemplate: type === 'tool' ? '{}' : undefined,
    }
    setNodes((current) => [...current, ...toFlowNodes([item])])
    setSelectedId(item.id)
  }
  const updateSelected = (values: Partial<WorkflowNode>) => {
    recordHistory()
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId
          ? { ...node, data: { workflowNode: { ...node.data.workflowNode, ...values } } }
          : node,
      ),
    )
  }
  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id)
    setSelectedId('')
    const d = (edge as any).data || {}
    const condition = d.condition || ''
    setEdgeCondition(condition)
    const parsed = parseCondition(condition)
    setCondRows(parsed ?? [EMPTY_COND_ROW()])
    setEdgeLabel(d.loopLabel || edge.label || '')
    setEdgeIsDefault(!!d.isDefault)
    setEdgeMaxIter(d.maxIterations || 10)
  }
  const onEdgeDoubleClick = (event: React.MouseEvent, edge: Edge) => {
    onEdgeClick(event, edge)
    setEdgeModalOpen(true)
  }
  const removeSelectedEdge = () => {
    if (!selectedEdgeId) return
    recordHistory()
    setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId))
    setSelectedEdgeId(null)
  }
  const updateCondRow = (i: number, patch: Partial<CondRow>) => {
    const next = condRows.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    setCondRows(next)
    setEdgeCondition(buildCondition(next))
  }
  const addCondRow = () => {
    const next = [...condRows, EMPTY_COND_ROW()]
    setCondRows(next)
    setEdgeCondition(buildCondition(next))
  }
  const removeCondRow = (i: number) => {
    const next = condRows.filter((_, idx) => idx !== i)
    setCondRows(next)
    setEdgeCondition(buildCondition(next))
  }
  const saveEdgeEdit = () => {
    if (!selectedEdgeId) return
    recordHistory()
    setEdges((current) =>
      current.map((e) =>
        e.id === selectedEdgeId
          ? {
              ...e,
              label: edgeCondition ? (edgeLabel || edgeCondition) : edgeLabel || undefined,
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
    )
    setEdgeModalOpen(false)
  }
  const autoArrange = () => {
    recordHistory()
    const rank: Record<string, number> = { start: 0 }
    const visiting = new Set<string>()
    const visited = new Set<string>()
    const backEdges = new Set<string>()
    const outgoing = new Map<string, Edge[]>()
    edges.forEach((edge) => outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge]))
    const detectBackEdges = (nodeId: string) => {
      if (visiting.has(nodeId) || visited.has(nodeId)) return
      visiting.add(nodeId)
      ;(outgoing.get(nodeId) || []).forEach((edge) => {
        if (visiting.has(edge.target)) backEdges.add(edge.id)
        else detectBackEdges(edge.target)
      })
      visiting.delete(nodeId)
      visited.add(nodeId)
    }
    nodes.forEach((node) => detectBackEdges(node.id))
    let moved = true
    let guard = 0
    while (moved && guard++ < nodes.length * nodes.length) {
      moved = false
      edges.forEach((edge) => {
        if (backEdges.has(edge.id)) return
        if (
          rank[edge.source] !== undefined &&
          (rank[edge.target] === undefined || rank[edge.target] < rank[edge.source] + 1)
        ) {
          rank[edge.target] = rank[edge.source] + 1
          moved = true
        }
      })
    }
    const groups: Record<number, Node<WorkflowData>[]> = {}
    nodes.forEach((node) => {
      const level = rank[node.id] ?? 1
      groups[level] = [...(groups[level] || []), node]
    })
    const newPositions: Record<string, { x: number; y: number }> = {}
    Object.entries(groups).forEach(([level, list]) => {
      const lv = Number(level)
      const sorted = [...list].sort((a, b) => a.position.y - b.position.y)
      const levelX = list.reduce((sum, n) => sum + n.position.x, 0) / list.length
      const baseY = sorted[0].position.y
      let cursorY = baseY
      sorted.forEach((node) => {
        const height = (node.measured?.height ?? 70) + 40
        newPositions[node.id] = { x: levelX, y: cursorY }
        cursorY += height
      })
    })
    setNodes((current) =>
      current.map((node) => {
        const p = newPositions[node.id]
        return {
          ...node,
          position: {
            x: Math.round((p?.x ?? node.position.x) / 8) * 8,
            y: Math.round((p?.y ?? node.position.y) / 8) * 8,
          },
        }
      }),
    )
  }
  const removeSelected = () => {
    if (!selected || ['start', 'end'].includes(selected.type)) return
    recordHistory()
    setNodes((current) => current.filter((node) => node.id !== selectedId))
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId),
    )
    setSelectedId('start')
  }
  const save = async (publish = false) => {
    if (!id || !workflow) return
    try {
      JSON.parse(schema)
      JSON.parse(outputSchema)
    } catch {
      message.error(t('pages.agent.workflow.editor.schemasMustArray'))
      return
    }
    const workflowNodes = nodes.map((node) => ({
      ...node.data.workflowNode,
      position: node.position,
    }))
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
    }))
    if (publish) {
      const error = validateBeforePublish(intl, workflowNodes, workflowEdges)
      if (error) {
        message.error(error)
        return
      }
    }
    const result = await updateWorkflow(id, {
      name: workflow.name,
      description: workflow.description,
      nodes: JSON.stringify(workflowNodes),
      edges: JSON.stringify(workflowEdges),
      inputSchema: schema,
      outputSchema,
      maxConcurrentInstances: workflow.maxConcurrentInstances,
    }, { skipSuccessMessage: publish })
    if (result.code !== 200) return
    if (publish) {
      const validation = await validateWorkflowDraft(id, { skipSuccessMessage: true })
      if (validation.code !== 200) return
      const published = await publishWorkflow(id)
      if (published.code !== 200) return
    }
  }
  const nodeTypes = useMemo(() => ({ workflow: WorkflowCanvasNode }), [])
  return (
    <PageContainer
      header={{
        title: t('components.routeTabs.workflowEditor'),
        breadcrumb: undefined,
        tags: workflow?.publishedVersion ? <Tag color="blue">v{workflow.publishedVersion}.0</Tag> : <Tag>v0.0</Tag>,
      }}
      extra={
        <Space>
          <Button onClick={() => history.push('/workflow/workflow')}>{t('pages.agent.workflow.editor.back')}</Button>
          <Button onClick={() => id && validateWorkflowDraft(id)}>{t('pages.agent.workflow.editor.validate')}</Button>
          <Button icon={<SaveOutlined />} onClick={() => save(false)}>
            {t('pages.agent.workflow.editor.save')}
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => save(true)}>
            {t('pages.agent.workflow.action.publish')}
          </Button>
        </Space>
      }
    >
      <div
        ref={canvasRef}
        style={{
          height: 'calc(100vh - 196px)',
          minHeight: 640,
          background: '#fff',
          border: '1px solid #edf0f4',
          borderRadius: 8,
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
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
          onDrop={(event) => {
            event.preventDefault()
            const type = event.dataTransfer.getData('application/aether-workflow-node') as WorkflowNode['type']
            if (!type || type === 'start' || type === 'end' || !flow) return
            add(type, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
          }}
          onInit={setFlow}
          onNodeDragStart={recordHistory}
          onNodesDelete={recordHistory}
          onEdgesDelete={recordHistory}
          onNodeClick={(_: React.MouseEvent, node: Node<WorkflowData>) => { setSelectedId(node.id); setSelectedEdgeId(null) }}
          onEdgeClick={onEdgeClick as any}
          onEdgeDoubleClick={onEdgeDoubleClick as any}
          onPaneClick={() => { setSelectedId(''); setSelectedEdgeId(null) }}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          selectionOnDrag
          panOnDrag={[1, 2]}
          multiSelectionKeyCode={['Meta', 'Control']}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }}
        >
          {showGrid && <Background gap={16} size={1} color="#e8edf3" />}
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => color[(node.data as WorkflowData)?.workflowNode?.type] || '#999'}
          />
          <Controls position="bottom-right" showInteractive={false} />
          <Panel position="top-left" style={{ margin: 12, zIndex: 5 }}>
            <Space.Compact>
              <Button aria-label="undo" disabled={!historyRef.current.past.length} onClick={undo}>↶</Button>
              <Button aria-label="redo" disabled={!historyRef.current.future.length} onClick={redo}>↷</Button>
              <Button aria-label="zoom out" onClick={() => flow?.zoomOut()}>−</Button>
              <Button aria-label="reset zoom" onClick={() => flow?.setViewport({ x: 0, y: 0, zoom: 1 })}>100%</Button>
              <Button aria-label="zoom in" onClick={() => flow?.zoomIn()}>＋</Button>
              <Button aria-label="fullscreen" onClick={() => canvasRef.current?.requestFullscreen?.()}>⛶</Button>
              <Button aria-label="auto arrange" onClick={autoArrange}>▦</Button>
              <Button aria-label="toggle grid" type={showGrid ? 'primary' : 'default'} onClick={() => setShowGrid((current) => !current)}>⋮</Button>
            </Space.Compact>
          </Panel>
          <Panel position="top-left" style={{ margin: '70px 12px 12px', zIndex: 5 }}>
            {paletteOpen ? (
              <Card
                size="small"
                style={panelStyle('palette', { width: 174, borderRadius: 8, boxShadow: '0 4px 16px #00000012' })}
                title={<CardTitle title={t('pages.agent.workflow.editor.componentLibrary')} tip={t('pages.agent.workflow.editor.nodeLibraryTip')} />}
                extra={
                  <Button
                    type="text"
                    icon={<DownOutlined />}
                    onClick={() => setPaletteOpen(false)}
                  />
                }
              >
                <Tabs activeKey={paletteGroup} onChange={setPaletteGroup} size="small" items={paletteGroups.map((group) => ({
                  key: group.key,
                  label: group.label,
                  children: <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {group.types.map((type) => {
                    const fixed = type === 'start' || type === 'end'
                    return (
                      <Button
                        key={type}
                        block
                        disabled={fixed}
                        icon={paletteIcon(type)}
                        onClick={() => add(type)}
                        draggable={!fixed}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/aether-workflow-node', type)
                          event.dataTransfer.effectAllowed = 'move'
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
                    )
                  })}
                  </Space>,
                }))} />
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
          </Panel>
          <Panel position="top-right" style={{ margin: 12, zIndex: 5 }}>
            {propertyOpen ? (
              <div style={panelStyle('properties', { width: propertyWidth, maxWidth: 'calc(100vw - 48px)', position: 'relative' })}>
                <div
                  aria-label="resize properties"
                  onPointerDown={startPropertyResize}
                  onPointerMove={resizeProperty}
                  onPointerUp={stopPropertyResize}
                  onPointerCancel={stopPropertyResize}
                  style={{ position: 'absolute', left: -6, top: 0, bottom: 0, width: 10, cursor: 'ew-resize', zIndex: 2 }}
                />
              <Card
                size="small"
                style={{ width: '100%', borderRadius: 8, boxShadow: '0 4px 16px #00000012' }}
                styles={{
                  body: {
                    maxHeight: 'calc(100vh - 310px)',
                    overflowY: 'auto',
                    padding: '16px 18px',
                  },
                }}
                title={<CardTitle title={t('pages.agent.workflow.editor.nodeProperties')} tip={t('pages.agent.workflow.editor.nodePropertiesTip')} />}
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
                    <span style={{ color: '#595959' }}>{t('pages.agent.workflow.editor.edgeSelected')}</span>
                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>{t('pages.agent.workflow.editor.edgeSelectedTip')}</span>
                    <Popconfirm title={t('pages.agent.workflow.editor.deleteEdgeConfirm')} onConfirm={removeSelectedEdge}>
                      <Button danger icon={<DeleteOutlined />}>{t('pages.agent.workflow.editor.deleteEdge')}</Button>
                    </Popconfirm>
                  </Space>
                ) : selected ? (
                  <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.run.nodeName')}</label>
                    <Input
                      value={selected.name}
                      onChange={(e) => updateSelected({ name: e.target.value })}
                    />
                    <div style={{ padding: '9px 10px', borderRadius: 6, background: '#f5f8fc', color: '#526074', fontSize: 12, lineHeight: 1.6 }}>
                      <strong style={{ color: '#334155' }}>节点作用与使用说明：</strong>{nodeUsage[selected.type]}
                    </div>
                    {selected.type === 'start' && <StartVariablesBuilder value={schema} onChange={setSchema} />}
                    {selected.type === 'end' && <StartVariablesBuilder value={outputSchema} onChange={setOutputSchema} mode="output" />}
                    {selected.type === 'agent' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.run.node.agent')}</label>
                        <Select
                          style={{ width: '100%' }}
                          value={selected.resourceId}
                          options={agentOptions}
                          onChange={(resourceId) => updateSelected({ resourceId })}
                        />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.prompt')}</label>
                        <Input.TextArea
                          value={selected.prompt}
                          rows={5}
                          onChange={(e) => updateSelected({ prompt: e.target.value })}
                        />
                        <StateMappingEditor
                          value={selected.stateMapping}
                          options={variableOptions}
                          onChange={(v) => updateSelected({ stateMapping: v })}
                        />
                      </>
                    )}
                    {selected.type === 'tool' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{nodeLabel(intl, 'tool')}</label>
                        <Select
                          style={{ width: '100%' }}
                          value={selected.resourceId}
                          options={toolOptions}
                          onChange={async (resourceId) => {
                            updateSelected({ resourceId })
                            const result = await getAgentToolInfo(resourceId)
                            if (result.code !== 200 || !result.data) return
                              updateSelected({
                                resourceId,
                                toolName: result.data.mcpToolName || result.data.name,
                                // 参数模板与 MCP 工具的输入 schema 是一组配置。切换工具时必须
                                // 同步重置，避免把上一个工具的参数带到新工具中执行。
                                argumentsTemplate: buildArgumentsTemplate(result.data.mcpInputSchema),
                              })
                          }}
                        />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.mcpMethodName')}</label>
                        <Input
                          value={selected.toolName}
                          onChange={(e) => updateSelected({ toolName: e.target.value })}
                        />
                        <TemplateObjectEditor value={selected.argumentsTemplate} onChange={(argumentsTemplate) => updateSelected({ argumentsTemplate })} />
                        <StateMappingEditor
                          value={selected.stateMapping}
                          options={variableOptions}
                          onChange={(v) => updateSelected({ stateMapping: v })}
                        />
                      </>
                    )}
                    {selected.type === 'human' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>
                          {t('pages.agent.workflow.editor.question')}
                          <FieldTip title={t('pages.agent.workflow.editor.questionTip')} />
                        </label>
                        <Input.TextArea
                          value={selected.question}
                          rows={4}
                          onChange={(e) => updateSelected({ question: e.target.value })}
                        />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>
                          {t('pages.agent.workflow.editor.multiQuestionConfig')}
                          <FieldTip title={t('pages.agent.workflow.editor.multiQuestionConfigTip')} />
                        </label>
                        <StructuredListEditor
                          value={selected.questions}
                          fields={[{ key: 'key', label: '字段名', placeholder: 'reason' }, { key: 'question', label: '问题', placeholder: '请输入原因' }]}
                          onChange={(questions) => updateSelected({ questions })}
                          addText="添加问题"
                        />
                        <StateMappingEditor
                          value={selected.stateMapping}
                          options={variableOptions}
                          onChange={(v) => updateSelected({ stateMapping: v })}
                        />
                      </>
                    )}
                    {selected.type === 'approval' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.approvalDescription')}</label>
                        <Input.TextArea value={selected.question} rows={3} onChange={(e) => updateSelected({ question: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.approverServiceAccount')}</label>
                        <Input value={selected.approverServiceAccountId} onChange={(e) => updateSelected({ approverServiceAccountId: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.approvalMode')}</label>
                        <Select value={selected.approvalMode || 'ANY'} options={[{ value: 'ANY', label: t('pages.agent.workflow.editor.anyApproval') }]} onChange={(approvalMode) => updateSelected({ approvalMode })} />
                        <StateMappingEditor value={selected.stateMapping} options={variableOptions} onChange={(stateMapping) => updateSelected({ stateMapping })} />
                      </>
                    )}
                    {selected.type === 'wait_event' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.eventType')}</label>
                        <Input value={selected.eventType} placeholder="payment.completed" onChange={(e) => updateSelected({ eventType: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.correlationKeyTemplate')}</label>
                        <Input value={selected.correlationKeyTemplate} placeholder="${orderId}" onChange={(e) => updateSelected({ correlationKeyTemplate: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.timeoutMillis')}</label>
                        <InputNumber min={1} value={selected.timeoutMillis} onChange={(timeoutMillis) => updateSelected({ timeoutMillis: timeoutMillis || undefined })} style={{ width: '100%' }} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.timeoutTargetId')}</label>
                        <Input value={selected.timeoutTargetId} placeholder="timeout-handler" onChange={(e) => updateSelected({ timeoutTargetId: e.target.value })} />
                        <StateMappingEditor value={selected.stateMapping} options={variableOptions} onChange={(stateMapping) => updateSelected({ stateMapping })} />
                      </>
                    )}
                    {selected.type === 'rule' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>规则条件与结果</label>
                        <StructuredListEditor value={selected.rules} fields={[{ key: 'condition', label: '条件', placeholder: '${amount} > 1000' }, { key: 'value', label: '结果', placeholder: 'high' }]} onChange={(rules) => updateSelected({ rules })} addText="添加规则" />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>默认结果</label>
                        <Input value={selected.defaultValue as string} onChange={(e) => updateSelected({ defaultValue: e.target.value })} />
                        <StateMappingEditor value={selected.stateMapping} options={variableOptions} onChange={(stateMapping) => updateSelected({ stateMapping })} />
                      </>
                    )}
                    {selected.type === 'transform' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>字段映射</label>
                        <StructuredListEditor value={selected.mappings} fields={[{ key: 'target', label: '目标字段', placeholder: 'customerName' }, { key: 'source', label: '来源路径', placeholder: 'customer.name' }, { key: 'template', label: '模板', placeholder: '${customer.name}' }]} onChange={(mappings) => updateSelected({ mappings })} addText="添加映射" />
                        <StateMappingEditor value={selected.stateMapping} options={variableOptions} onChange={(stateMapping) => updateSelected({ stateMapping })} />
                      </>
                    )}
                    {selected.type === 'http' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>请求方法</label>
                        <Select value={selected.method || 'POST'} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({ value, label: value }))} onChange={(method) => updateSelected({ method })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>请求地址</label>
                        <Input value={textValue(selected.url)} placeholder="https://api.example.com/orders/${orderId}" onChange={(e) => updateSelected({ url: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>请求体模板</label>
                        <Input.TextArea value={textValue(selected.bodyTemplate)} rows={4} onChange={(e) => updateSelected({ bodyTemplate: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>幂等键模板</label>
                        <Input value={textValue(selected.idempotencyKeyTemplate)} placeholder="${orderId}" onChange={(e) => updateSelected({ idempotencyKeyTemplate: e.target.value })} />
                        <StateMappingEditor value={selected.stateMapping} options={variableOptions} onChange={(stateMapping) => updateSelected({ stateMapping })} />
                      </>
                    )}
                    {selected.type === 'notification' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>通知渠道</label>
                        <Select value={selected.channel || 'email'} options={[{ value: 'email', label: 'Email' }]} onChange={(channel) => updateSelected({ channel })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>收件人模板</label>
                        <Input value={textValue(selected.toTemplate)} placeholder="${requesterEmail}" onChange={(e) => updateSelected({ toTemplate: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>邮件主题</label>
                        <Input value={textValue(selected.subjectTemplate)} onChange={(e) => updateSelected({ subjectTemplate: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>邮件内容</label>
                        <Input.TextArea value={textValue(selected.bodyTemplate)} rows={4} onChange={(e) => updateSelected({ bodyTemplate: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>幂等键模板</label>
                        <Input value={textValue(selected.idempotencyKeyTemplate)} onChange={(e) => updateSelected({ idempotencyKeyTemplate: e.target.value })} />
                        <StateMappingEditor value={selected.stateMapping} options={variableOptions} onChange={(stateMapping) => updateSelected({ stateMapping })} />
                      </>
                    )}
                    {selected.type === 'subflow' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>子流程 ID</label>
                        <Input value={textValue(selected.workflowId)} onChange={(e) => updateSelected({ workflowId: e.target.value })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>固定版本</label>
                        <InputNumber min={1} value={numberValue(selected.versionNo)} onChange={(versionNo) => updateSelected({ versionNo: versionNo || undefined })} style={{ width: '100%' }} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>超时（毫秒）</label>
                        <InputNumber min={1} value={selected.timeoutMillis} onChange={(timeoutMillis) => updateSelected({ timeoutMillis: timeoutMillis || undefined })} style={{ width: '100%' }} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>输入映射</label>
                        <StructuredListEditor value={selected.inputMappings} fields={[{ key: 'target', label: '子流程字段' }, { key: 'source', label: '父流程变量' }]} onChange={(inputMappings) => updateSelected({ inputMappings })} addText="添加输入映射" />
                        <StateMappingEditor value={selected.stateMapping} options={variableOptions} onChange={(stateMapping) => updateSelected({ stateMapping })} />
                      </>
                    )}
                    {selected.type === 'parallel' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>分支入口节点</label>
                        <Select mode="multiple" value={Array.isArray(selected.branches) ? selected.branches : []} options={workflowNodeOptions.filter((option) => option.value !== selected.id)} onChange={(branches) => updateSelected({ branches })} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>汇聚节点</label>
                        <Select value={selected.joinNodeId} options={workflowNodeOptions.filter((option) => nodes.find((node) => node.id === option.value)?.data.workflowNode.type === 'join')} onChange={(joinNodeId) => updateSelected({ joinNodeId })} allowClear />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>最大分支数</label>
                        <InputNumber min={1} max={50} value={numberValue(selected.maxBranches)} onChange={(maxBranches) => updateSelected({ maxBranches: maxBranches || undefined })} style={{ width: '100%' }} />
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>分支超时（毫秒）</label>
                        <InputNumber min={1} value={numberValue(selected.branchTimeoutMillis)} onChange={(branchTimeoutMillis) => updateSelected({ branchTimeoutMillis: branchTimeoutMillis || undefined })} style={{ width: '100%' }} />
                      </>
                    )}
                    {selected.type === 'join' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>汇聚策略</label>
                        <Select value={selected.joinMode || 'ALL_SUCCESS'} options={[{ value: 'ALL_SUCCESS', label: '全部成功' }, { value: 'ANY_SUCCESS', label: '任一成功' }, { value: 'ALLOW_PARTIAL_FAILURE', label: '允许部分失败' }]} onChange={(joinMode) => updateSelected({ joinMode })} />
                      </>
                    )}
                    {selected.type === 'delay' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>延时时长（毫秒）</label>
                        <InputNumber min={1} value={numberValue(selected.delayMillis)} onChange={(delayMillis) => updateSelected({ delayMillis: delayMillis || undefined })} style={{ width: '100%' }} />
                      </>
                    )}
                    {!['start', 'end'].includes(selected.type) && (
                      <Popconfirm title={t('pages.agent.workflow.editor.removeNodeConfirm')} onConfirm={removeSelected}>
                        <Button danger icon={<DeleteOutlined />}>
                          {t('pages.agent.workflow.editor.deleteNode')}
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                ) : (
                  <span style={{ color: '#8c8c8c' }}>{t('pages.agent.workflow.editor.selectNodeTip')}</span>
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
          </Panel>
        </ReactFlow>
      </div>
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
              <Button
                type="dashed"
                block
                size="small"
                icon={<PlusOutlined />}
                onClick={addCondRow}
              >
                {t('pages.agent.workflow.editor.addCondition')}
              </Button>
            </Space>
            <Input.TextArea
              style={{ marginTop: 8 }}
              rows={2}
              value={edgeCondition}
              onChange={(e) => {
                setEdgeCondition(e.target.value)
                const parsed = parseCondition(e.target.value)
                if (parsed) setCondRows(parsed)
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
            <Checkbox
              checked={edgeIsDefault}
              onChange={(e) => setEdgeIsDefault(e.target.checked)}
            >
              {t('pages.agent.workflow.editor.defaultBranch')}
            </Checkbox>
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>{t('pages.agent.workflow.editor.maxIterations')}</label>
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
  )
}
export default Editor
