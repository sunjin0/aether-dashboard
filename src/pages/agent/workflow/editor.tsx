import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { history, useParams } from '@umijs/max'
import { PageContainer } from '@ant-design/pro-components'
import { Button, Card, Input, Popconfirm, Select, Space, Tag, Tooltip, message } from 'antd'
import {
  AppstoreOutlined,
  DeleteOutlined,
  DownOutlined,
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
} from '@/services/agent/WorkflowController'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import { getAgentToolOptions } from '@/services/agent/ToolController'
import StartVariablesBuilder from './StartVariablesBuilder'

const moduleDesc: React.CSSProperties = {
  color: '#8c8c8c',
  fontSize: 12,
  lineHeight: 1.6,
  marginBottom: 8,
}
type WorkflowData = { workflowNode: WorkflowNode };
const label: Record<string, string> = {
  start: '开始',
  agent: '普通 Agent',
  mcp: 'MCP 工具',
  human: '人工提问',
  end: '结束',
}
const color: Record<string, string> = {
  start: '#52c41a',
  agent: '#1677ff',
  mcp: '#fa8c16',
  human: '#722ed1',
  end: '#13c2c2',
}
const initial: WorkflowNode[] = [
  { id: 'start', type: 'start', name: '开始', position: { x: 80, y: 260 } },
  { id: 'end', type: 'end', name: '结束', position: { x: 780, y: 260 } },
]
const toFlowNodes = (items: WorkflowNode[]): Node<WorkflowData>[] =>
  items.map((item) => ({
    id: item.id,
    type: 'workflow',
    position: item.position || { x: 100, y: 200 },
    data: { workflowNode: item },
    deletable: !['start', 'end'].includes(item.type),
  }))
const toFlowEdges = (items: any[]): Edge[] =>
  items.map((item, index) => ({
    id: item.id || `${item.source}-${item.target}-${index}`,
    source: item.source,
    target: item.target,
    sourceHandle: item.sourceHandle,
    targetHandle: item.targetHandle,
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    selectable: true,
    deletable: true,
  }))

const WorkflowCanvasNode: React.FC<NodeProps<Node<WorkflowData>>> = ({ data, selected }) => {
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
        style={{ background: nodeColor }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        style={{ background: nodeColor }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{ background: nodeColor }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        style={{ background: nodeColor }}
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
          {label[item.type]}
        </Tag>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>拖拽移动</span>
      </div>
      <div style={{ padding: '11px 12px', fontWeight: 600 }}>{item.name || label[item.type]}</div>
    </div>
  )
}

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [workflow, setWorkflow] = useState<AgentWorkflow>()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowData>>(toFlowNodes(initial))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    toFlowEdges([{ source: 'start', target: 'end' }]),
  )
  const [selectedId, setSelectedId] = useState('start')
  const [schema, setSchema] = useState('[]')
  const [agentOptions, setAgentOptions] = useState<any[]>([])
  const [toolOptions, setToolOptions] = useState<any[]>([])
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [propertyOpen, setPropertyOpen] = useState(true)
  const selected = nodes.find((node) => node.id === selectedId)?.data.workflowNode
  useEffect(() => {
    if (!id) return
    getWorkflow(id).then((r) => {
      if (r.code !== 200 || !r.data) return
      setWorkflow(r.data)
      try {
        const parsedNodes = r.data.nodes ? JSON.parse(r.data.nodes) : []
        const restored =
          Array.isArray(parsedNodes) && parsedNodes.length > 0 ? parsedNodes : initial
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
        setEdges(toFlowEdges(restoredEdges))
        setSchema(r.data.inputSchema || '[]')
      } catch {
        message.error('画布数据格式错误')
      }
    })
    getAgentDefinitionOptions().then(setAgentOptions)
    getAgentToolOptions().then(setToolOptions)
  }, [id, setEdges, setNodes])
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          { ...connection, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
          current,
        ),
      ),
    [setEdges],
  )
  const add = (type: WorkflowNode['type']) => {
    const item: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      name: label[type],
      position: { x: 300 + Math.random() * 220, y: 120 + Math.random() * 300 },
      prompt: type === 'agent' ? '请根据输入变量完成任务：${input}' : undefined,
      question: type === 'human' ? '请补充必要信息' : undefined,
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
  const autoArrange = () => {
    const rank: Record<string, number> = { start: 0 }
    let moved = true
    let guard = 0
    while (moved && guard++ < nodes.length * nodes.length) {
      moved = false
      edges.forEach((edge) => {
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
    setNodes((current) =>
      current.map((node) => {
        const level = rank[node.id] ?? 1
        const index = groups[level].findIndex((item) => item.id === node.id)
        return { ...node, position: { x: 80 + level * 260, y: 110 + index * 170 } }
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
    } catch {
      message.error('开始表单字段必须是合法 JSON 数组')
      return
    }
    const workflowNodes = nodes.map((node) => ({
      ...node.data.workflowNode,
      position: node.position,
    }))
    const workflowEdges = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }))
    const result = await updateWorkflow(id, {
      name: workflow.name,
      description: workflow.description,
      nodes: JSON.stringify(workflowNodes),
      edges: JSON.stringify(workflowEdges),
      inputSchema: schema,
    })
    if (result.code !== 200) {
      message.error(result.message || '保存失败')
      return
    }
    if (publish) {
      const published = await publishWorkflow(id)
      if (published.code !== 200) {
        message.error(published.message || '发布校验失败')
        return
      }
      message.success(`已发布 v${published.data}`)
    } else message.success('草稿已保存')
  }
  const nodeTypes = useMemo(() => ({ workflow: WorkflowCanvasNode }), [])
  return (
    <PageContainer
      header={{ title: workflow?.name || '工作流编排', breadcrumb: undefined }}
      extra={
        <Space>
          <Button onClick={() => history.push('/agent/workflow')}>返回</Button>
          <Button icon={<SaveOutlined />} onClick={() => save(false)}>
            保存
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => save(true)}>
            发布
          </Button>
        </Space>
      }
    >
      <div
        style={{
          height: 'calc(92vh - 208px)',
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
          onNodeClick={(_: React.MouseEvent, node: Node<WorkflowData>) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId('')}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          selectionOnDrag
          panOnDrag={[1, 2]}
          multiSelectionKeyCode={['Meta', 'Control']}
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
                title="节点库"
                extra={
                  <Button
                    type="text"
                    icon={<DownOutlined />}
                    onClick={() => setPaletteOpen(false)}
                  />
                }
              >
                <div style={moduleDesc}>点击添加各类节点到画布，流程按连线顺序依次执行。</div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button icon={<PlusOutlined />} onClick={() => add('agent')}>
                    普通 Agent
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={() => add('mcp')}>
                    MCP 工具
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={() => add('human')}>
                    人工提问
                  </Button>
                  <Tooltip title="自动根据连接关系重新排列节点">
                    <Button icon={<AppstoreOutlined />} onClick={autoArrange}>
                      自动整理
                    </Button>
                  </Tooltip>
                  <small>从右/下输出点拖至左/上输入点连接。选中连接线后按 Delete 删除。</small>
                </Space>
              </Card>
            ) : (
              <Tooltip title="展开节点库">
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
                style={{ width: 300 }}
                title="节点属性"
                extra={
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={() => setPropertyOpen(false)}
                  />
                }
              >
                <div style={moduleDesc}>选中画布中的节点后，在此编辑节点名称与运行配置。</div>
                {selected ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <label>节点名称</label>
                    <Input
                      value={selected.name}
                      onChange={(e) => updateSelected({ name: e.target.value })}
                    />
                    {selected.type === 'agent' && (
                      <>
                        <label>普通 Agent</label>
                        <Select
                          style={{ width: '100%' }}
                          value={selected.resourceId}
                          options={agentOptions}
                          onChange={(resourceId) => updateSelected({ resourceId })}
                        />
                        <label>提示词</label>
                        <Input.TextArea
                          value={selected.prompt}
                          rows={5}
                          onChange={(e) => updateSelected({ prompt: e.target.value })}
                        />
                      </>
                    )}
                    {selected.type === 'mcp' && (
                      <>
                        <label>MCP 工具</label>
                        <Select
                          style={{ width: '100%' }}
                          value={selected.resourceId}
                          options={toolOptions}
                          onChange={(resourceId) => updateSelected({ resourceId })}
                        />
                        <label>MCP 方法名</label>
                        <Input
                          value={selected.toolName}
                          onChange={(e) => updateSelected({ toolName: e.target.value })}
                        />
                        <label>参数模板</label>
                        <Input.TextArea
                          value={selected.argumentsTemplate}
                          rows={4}
                          onChange={(e) => updateSelected({ argumentsTemplate: e.target.value })}
                        />
                      </>
                    )}
                    {selected.type === 'human' && (
                      <>
                        <label>问题</label>
                        <Input.TextArea
                          value={selected.question}
                          rows={4}
                          onChange={(e) => updateSelected({ question: e.target.value })}
                        />
                        <label>写入变量名</label>
                        <Input
                          value={selected.outputKey}
                          onChange={(e) => updateSelected({ outputKey: e.target.value })}
                        />
                      </>
                    )}
                    {!['start', 'end'].includes(selected.type) && (
                      <Popconfirm title="移除该节点及其连线？" onConfirm={removeSelected}>
                        <Button danger icon={<DeleteOutlined />}>
                          删除节点
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                ) : (
                  <span style={{ color: '#8c8c8c' }}>点击节点编辑属性</span>
                )}
              </Card>
            ) : (
              <Tooltip title="展开节点属性">
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
              title="开始变量"
              style={{ width: 320 }}
              styles={{ body: { maxHeight: 360, overflow: 'auto' } }}
            >
              <div style={moduleDesc}>
                声明流程启动时由用户填写的输入字段，可在节点提示词或参数模板中用 {'${字段名}'}{' '}
                引用。
              </div>
              <StartVariablesBuilder value={schema} onChange={setSchema} />
            </Card>
          </Panel>
        </ReactFlow>
      </div>
    </PageContainer>
  )
}
export default Editor
