import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { history, useIntl, useParams } from '@umijs/max'
import { PageContainer } from '@ant-design/pro-components'
import { Button, Card, Checkbox, Input, InputNumber, Modal, Popconfirm, Select, Space, Tag, Tooltip, message } from 'antd'
import {
  AppstoreOutlined,
  DeleteOutlined,
  DownOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {
  ReactFlow,
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
} from '@/services/workflow/WorkflowController'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import { getAgentToolInfo, getAgentToolOptions } from '@/services/agent/ToolController'
import StartVariablesBuilder from './StartVariablesBuilder'

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
  mcp: '#fa8c16',
  human: '#722ed1',
  end: '#13c2c2',
}
const nodeLabel = (intl: ReturnType<typeof useIntl>, type: string) =>
  intl.formatMessage({ id: `pages.agent.workflow.run.node.${type}` })
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
        minWidth: 190,
        border: `2px solid ${selected ? '#1677ff' : nodeColor}`,
        borderRadius: 10,
        overflow: 'visible',
        background: '#fff',
        boxShadow: selected ? '0 0 0 3px #91caff66' : '0 3px 12px #0000001a',
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
      <div
        style={{
          padding: '6px 10px',
          background: `${nodeColor}18`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Tag color={nodeColor} style={{ margin: 0 }}>
          {nodeLabel(intl, item.type)}
        </Tag>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>{intl.formatMessage({ id: 'pages.agent.workflow.editor.dragToMove' })}</span>
      </div>
      <div style={{ padding: '11px 12px', fontWeight: 600 }}>{item.name || nodeLabel(intl, item.type)}</div>
    </div>
  )
}

const StateMappingEditor: React.FC<{ value?: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => (
  <StateMappingEditorContent value={value} onChange={onChange} />
)
const StateMappingEditorContent: React.FC<{ value?: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const intl = useIntl()
  return <>
    <label>
      {intl.formatMessage({ id: 'pages.agent.workflow.editor.stateMapping' })}
      <FieldTip title={intl.formatMessage({ id: 'pages.agent.workflow.editor.stateMappingTip' })} />
    </label>
    <Input.TextArea
      value={value}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      placeholder={'{"result":"$output","score":"$json.score"}'}
    />
  </>
}

const OutputKeySelect: React.FC<{
  value?: string
  onChange: (value?: string) => void
  options: { value: string; label: string }[]
}> = ({ value, onChange, options }) => {
  const intl = useIntl()
  return <>
    <label>
      {intl.formatMessage({ id: 'pages.agent.workflow.editor.outputKey' })}
      <FieldTip title={intl.formatMessage({ id: 'pages.agent.workflow.editor.outputKeyTip' })} />
    </label>
    <Select
      style={{ width: '100%' }}
      value={value || undefined}
      options={options}
      showSearch
      allowClear
      notFoundContent={intl.formatMessage({ id: 'pages.agent.workflow.editor.noStartVariables' })}
      placeholder={intl.formatMessage({ id: 'pages.agent.workflow.editor.selectOutputKey' })}
      filterOption={(input, option) =>
        `${option?.value ?? ''} ${option?.label ?? ''}`
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      onChange={(v) => onChange(v)}
    />
  </>
}

const InternalKeyInput: React.FC<{
  value?: string
  onChange: (value?: string) => void
}> = ({ value, onChange }) => {
  const intl = useIntl()
  return <>
    <label>
      {intl.formatMessage({ id: 'pages.agent.workflow.editor.internalKey' })}
      <FieldTip title={intl.formatMessage({ id: 'pages.agent.workflow.editor.internalKeyTip' })} />
    </label>
    <Input
      style={{ width: '100%' }}
      value={value || ''}
      onChange={(e) => {
        const trimmed = e.target.value.trim()
        onChange(
          trimmed ? (trimmed.startsWith('_') ? trimmed : `_${trimmed}`) : undefined,
        )
      }}
      placeholder={intl.formatMessage({ id: 'pages.agent.workflow.editor.internalKeyPlaceholder' })}
    />
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
  const [propertyOpen, setPropertyOpen] = useState(true)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [edgeModalOpen, setEdgeModalOpen] = useState(false)
  const [edgeCondition, setEdgeCondition] = useState('')
  const [edgeLabel, setEdgeLabel] = useState('')
  const [edgeIsDefault, setEdgeIsDefault] = useState(false)
  const [edgeMaxIter, setEdgeMaxIter] = useState<number>(10)
  const [condRows, setCondRows] = useState<CondRow[]>(() => [EMPTY_COND_ROW()])
  const selected = nodes.find((node) => node.id === selectedId)?.data.workflowNode
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
  useEffect(() => {
    if (!id) return
    getWorkflow(id).then((r) => {
      if (r.code !== 200 || !r.data) return
      setWorkflow(r.data)
      try {
        const parsedNodes = r.data.nodes ? JSON.parse(r.data.nodes) : []
        const restored =
          Array.isArray(parsedNodes) && parsedNodes.length > 0 ? parsedNodes : initial(intl)
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
    getAgentDefinitionOptions().then(setAgentOptions)
    getAgentToolOptions().then(setToolOptions)
  }, [id, intl, setEdges, setNodes])
  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source)?.data.workflowNode
      const target = nodes.find((node) => node.id === connection.target)?.data.workflowNode
      if (source?.type === 'end') { message.warning(t('pages.agent.workflow.editor.endCannotConnect')); return }
      if (target?.type === 'start') { message.warning(t('pages.agent.workflow.editor.startCannotFollow')); return }
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
  const add = (type: WorkflowNode['type']) => {
    const item: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      name: nodeLabel(intl, type),
      position: { x: 300 + Math.random() * 220, y: 120 + Math.random() * 300 },
      // 开始表单默认为空；不要引用未声明变量，否则用户刚添加 Agent 就无法发布。
      prompt: type === 'agent' ? t('pages.agent.workflow.editor.defaultPrompt') : undefined,
      question: type === 'human' ? t('pages.agent.workflow.editor.defaultQuestion') : undefined,
      argumentsTemplate: type === 'mcp' ? '{}' : undefined,
    }
    setNodes((current) => [...current, ...toFlowNodes([item])])
    setSelectedId(item.id)
  }
  const updateSelected = (values: Partial<WorkflowNode>) =>
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId
          ? { ...node, data: { workflowNode: { ...node.data.workflowNode, ...values } } }
          : node,
      ),
    )
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
    })
    if (result.code !== 200) return
    if (publish) {
      const validation = await validateWorkflowDraft(id)
      if (validation.code !== 200) return
      const published = await publishWorkflow(id)
      if (published.code !== 200) return
    }
  }
  const nodeTypes = useMemo(() => ({ workflow: WorkflowCanvasNode }), [])
  return (
    <PageContainer
      header={{ title: workflow?.name || t('components.routeTabs.workflowEditor'), breadcrumb: undefined }}
      extra={
        <Space>
          <Button onClick={() => history.push('/workflow/workflow')}>{t('pages.agent.workflow.editor.back')}</Button>
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
        style={{
          height: 'calc(100vh - 208px)',
          minHeight: 560,
          border: '1px solid #e5e7eb',
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
          <Background gap={16} size={1} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => color[(node.data as WorkflowData)?.workflowNode?.type] || '#999'}
          />
          <Controls showInteractive={false} />
          <Panel position="top-left">
            {paletteOpen ? (
              <Card
                size="small"
                style={{ width: 220 }}
                title={
                  <CardTitle
                    title={t('pages.agent.workflow.editor.nodeLibrary')}
                    tip={t('pages.agent.workflow.editor.nodeLibraryTip')}
                  />
                }
                extra={
                  <Button
                    type="text"
                    icon={<DownOutlined />}
                    onClick={() => setPaletteOpen(false)}
                  />
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button icon={<PlusOutlined />} onClick={() => add('agent')}>
                    {t('pages.agent.workflow.run.node.agent')}
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={() => add('mcp')}>
                    {t('pages.agent.workflow.run.node.mcp')}
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={() => add('human')}>
                    {t('pages.agent.workflow.run.node.human')}
                  </Button>
                  <Tooltip title={t('pages.agent.workflow.editor.autoArrangeTip')}>
                    <Button icon={<AppstoreOutlined />} onClick={autoArrange}>
                      {t('pages.agent.workflow.editor.autoArrange')}
                    </Button>
                  </Tooltip>
                </Space>
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
          <Panel position="top-right">
            {propertyOpen ? (
              <Card
                size="small"
                style={{ width: 380, maxWidth: 'calc(100vw - 48px)' }}
                styles={{
                  body: {
                    maxHeight: 'calc(100vh - 310px)',
                    overflowY: 'auto',
                    padding: '16px 18px',
                  },
                }}
                title={
                  <CardTitle title={t('pages.agent.workflow.editor.nodeProperties')} tip={t('pages.agent.workflow.editor.nodePropertiesTip')} />
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
                        <OutputKeySelect
                          value={selected.outputKey}
                          options={schemaFields}
                          onChange={(v) => updateSelected({ outputKey: v })}
                        />
                        <InternalKeyInput
                          value={selected.internalKey}
                          onChange={(v) => updateSelected({ internalKey: v })}
                        />
                        <StateMappingEditor
                          value={selected.stateMapping}
                          onChange={(v) => updateSelected({ stateMapping: v })}
                        />
                      </>
                    )}
                    {selected.type === 'mcp' && (
                      <>
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.run.node.mcp')}</label>
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
                        <label style={{ marginBottom: -6, fontWeight: 500 }}>{t('pages.agent.workflow.editor.argumentsTemplate')}</label>
                        <Input.TextArea
                          value={selected.argumentsTemplate}
                          rows={4}
                          onChange={(e) => updateSelected({ argumentsTemplate: e.target.value })}
                        />
                        <OutputKeySelect
                          value={selected.outputKey}
                          options={schemaFields}
                          onChange={(v) => updateSelected({ outputKey: v })}
                        />
                        <InternalKeyInput
                          value={selected.internalKey}
                          onChange={(v) => updateSelected({ internalKey: v })}
                        />
                        <StateMappingEditor
                          value={selected.stateMapping}
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
                        <Input.TextArea
                          key={selected.id}
                          defaultValue={selected.questions?.length ? JSON.stringify(selected.questions, null, 2) : ''}
                          rows={6}
                          placeholder={t('pages.agent.workflow.editor.multiQuestionConfigPlaceholder')}
                          onBlur={(e) => {
                            const value = e.target.value.trim()
                            if (!value) { updateSelected({ questions: undefined }); return }
                            try {
                              const parsed = JSON.parse(value)
                              if (!Array.isArray(parsed)) throw new Error()
                              updateSelected({ questions: parsed })
                            } catch {
                              message.warning(t('pages.agent.workflow.editor.multiQuestionConfigInvalid'))
                            }
                          }}
                        />
                        <OutputKeySelect
                          value={selected.outputKey}
                          options={schemaFields}
                          onChange={(v) => updateSelected({ outputKey: v })}
                        />
                        <InternalKeyInput
                          value={selected.internalKey}
                          onChange={(v) => updateSelected({ internalKey: v })}
                        />
                        <StateMappingEditor
                          value={selected.stateMapping}
                          onChange={(v) => updateSelected({ stateMapping: v })}
                        />
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
          <Panel position="bottom-left">
            <Card
              size="small"
              title={
                <CardTitle
                  title={t('pages.agent.workflow.editor.startVariables')}
                  tip={t('pages.agent.workflow.editor.startVariablesTip')}
                />
              }
              style={{ width: 320 }}
              styles={{ body: { maxHeight: 360, overflow: 'auto' } }}
            >
              <StartVariablesBuilder value={schema} onChange={setSchema} />
            </Card>
          </Panel>
          <Panel position="bottom-right">
            <Card
              size="small"
              title={
                <CardTitle
                  title={t('pages.agent.workflow.editor.finalOutput')}
                  tip={t('pages.agent.workflow.editor.finalOutputTip')}
                />
              }
              style={{ width: 320 }}
              styles={{ body: { maxHeight: 360, overflow: 'auto' } }}
            >
              <StartVariablesBuilder value={outputSchema} onChange={setOutputSchema} mode="output" />
            </Card>
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
                    options={schemaFields}
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
