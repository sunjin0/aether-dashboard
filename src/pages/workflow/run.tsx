import React, { useEffect, useMemo, useState } from 'react'
import { getLocale, history, useIntl, useLocation, useModel, useParams } from '@umijs/max'
import { PageContainer } from '@ant-design/pro-components'
import { Button, Card, Collapse, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Radio, Select, Space, Tag, message } from 'antd'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { ReloadOutlined } from '@ant-design/icons'
import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MiniMap,
  MarkerType,
  Node,
  NodeProps,
  Panel,
  Position,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  getWorkflow,
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
  AgentWorkflow,
  WorkflowInstance,
  WorkflowCallbackDelivery,
} from '@/services/workflow/WorkflowController'
import FormattedContent from '@/components/FormattedContent'

const statusColor: Record<string, string> = {
  RUNNING: 'processing',
  WAITING_USER: 'warning',
  FAILED: 'error',
  COMPLETED: 'success',
  TERMINATED: 'default',
  TIMED_OUT: 'error',
  PENDING: 'default',
}
const nodeColor: Record<string, string> = {
  start: '#52c41a',
  agent: '#1677ff',
  mcp: '#fa8c16',
  human: '#722ed1',
  end: '#13c2c2',
}
const runStatusColor: Record<string, string> = {
  RUNNING: '#1677ff',
  WAITING_USER: '#fa8c16',
  COMPLETED: '#52c41a',
  FAILED: '#ff4d4f',
  TERMINATED: '#999',
  TIMED_OUT: '#ff4d4f',
  PENDING: '#bfbfbf',
}
type RunNodeData = { def: Record<string, any>; log?: Record<string, any> }
type HumanQuestion = { key: string; question: string; required?: boolean; options?: string[] }

const getHumanQuestions = (intl: ReturnType<typeof useIntl>, config: Record<string, any>): HumanQuestion[] => {
  const raw = Array.isArray(config.questions) ? config.questions : []
  const questions = raw.map((item: any, index: number) => {
    if (typeof item === 'string') return { key: `answer_${index + 1}`, question: item, required: true }
    return {
      key: item?.key || item?.name || `answer_${index + 1}`,
      question: item?.question || item?.label || intl.formatMessage({ id: 'pages.agent.workflow.run.questionNumber' }, { number: index + 1 }),
      required: item?.required !== false,
      options: Array.isArray(item?.options) ? item.options : undefined,
    }
  }).filter((item) => item.question)
  return questions.length ? questions : [{ key: 'answer', question: config.question || intl.formatMessage({ id: 'pages.agent.workflow.run.defaultQuestion' }), required: true }]
}

const formatVarValue = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return JSON.stringify(parsed, null, 2)
        }
      } catch {
        /* keep original */
      }
    }
    return value
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

const hasNodeOutput = (log?: Record<string, any>) =>
  Boolean(log && Object.prototype.hasOwnProperty.call(log, 'outputData') && log.outputData !== undefined && log.outputData !== null)

const RunCanvasNode: React.FC<NodeProps<Node<RunNodeData>>> = ({ data, selected }) => {
  const intl = useIntl()
  const def = data.def
  const log = data.log
  const status = log?.status || 'PENDING'
  const typeColor = nodeColor[def.type] || '#999'
  const statusFill = runStatusColor[status] || '#bfbfbf'
  const typeLabel = intl.formatMessage({ id: `pages.agent.workflow.run.node.${def.type}` })
  const statusLabel = intl.formatMessage({ id: `pages.agent.workflow.run.status.${status}` })
  return (
    <div
      style={{
        minWidth: 170,
        border: `2px solid ${selected ? '#1677ff' : statusFill}`,
        borderRadius: 10,
        overflow: 'visible',
        background: '#fff',
        boxShadow: selected ? '0 0 0 3px #91caff66' : status === 'RUNNING' ? '0 0 0 3px #91caff66' : '0 3px 12px #0000001a',
      }}
    >
      <Handle type="target" position={Position.Top} id="target-top" style={{ background: typeColor, width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ background: typeColor, width: 12, height: 12 }} />
      <Handle type="target" position={Position.Left} id="target-left" style={{ background: typeColor, width: 12, height: 12 }} />
      {/* 兼容已保存工作流的 source-left / target-right 句柄。 */}
      <Handle type="source" position={Position.Left} id="source-left" style={{ background: typeColor, width: 12, height: 12 }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ background: typeColor, width: 12, height: 12 }} />
      <Handle type="source" position={Position.Right} id="source-right" style={{ background: typeColor, width: 12, height: 12 }} />
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
          {typeLabel || def.type}
        </Tag>
        <Tag color={status === 'PENDING' ? 'default' : statusFill} style={{ margin: 0 }}>
          {statusLabel || status}
        </Tag>
      </div>
      <div style={{ padding: '11px 12px' }}>
        <div style={{ fontWeight: 600 }}>{def.name || typeLabel || def.type}</div>
        {log?.status === 'FAILED' && log.errorMessage && (
          <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 6 }}>{log.errorMessage}</div>
        )}
      </div>
    </div>
  )
}

const RunPage: React.FC = () => {
  const intl = useIntl()
  const t = (key: string, values?: Record<string, string | number>) => intl.formatMessage({ id: key }, values)
  const formatWorkflowStatus = (status?: string) => intl.formatMessage({
    id: `pages.agent.workflow.run.status.${status || 'PENDING'}`,
    defaultMessage: status || '-',
  })
  const { id } = useParams<{ id: string }>()
  const { initialState } = useModel('@@initialState')
  const canStart = Boolean(initialState?.currentUser?.permissionMap?.['/workflow/run'])
  const location = useLocation()
  const requestedInstanceId = useMemo(() => new URLSearchParams(location.search).get('instanceId'), [location.search])
  const [workflow, setWorkflow] = useState<AgentWorkflow>()
  const [instance, setInstance] = useState<WorkflowInstance>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [form] = Form.useForm()
  const [answerForm] = Form.useForm()
  const [starting, setStarting] = useState(false)
  const [answering, setAnswering] = useState(false)
  const [acting, setActing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [historyInstances, setHistoryInstances] = useState<WorkflowInstance[]>([])
  const [variablesOpen, setVariablesOpen] = useState(false)
  const [variablesJson, setVariablesJson] = useState('{}')
  const [savingVariables, setSavingVariables] = useState(false)
  const [callbackDeliveries, setCallbackDeliveries] = useState<WorkflowCallbackDelivery[]>([])
  useEffect(() => {
    if (id) getWorkflow(id).then((r) => r.data && setWorkflow(r.data))
  }, [id])
  const fields = (() => {
    try {
      return JSON.parse(workflow?.publishedInputSchema || workflow?.inputSchema || '[]')
    } catch {
      return []
    }
  })()
  const currentVariables = (() => {
    try {
      return instance?.variables ? JSON.parse(instance.variables) : {}
    } catch {
      return {}
    }
  })()
  const publicVariables = (() => {
    const vars: Record<string, unknown> = {}
    Object.entries(currentVariables).forEach(([k, v]) => {
      if (k.startsWith('_')) return
      vars[k] = v
    })
    return vars
  })()
  const declaredSharedFields = (() => {
    const names = new Set<string>()
    fields.forEach((f: any) => {
      if (f?.name && !String(f.name).startsWith('_')) names.add(f.name)
    })
    try {
      const defs = JSON.parse(instance?.versionNodes || '[]')
      if (Array.isArray(defs)) {
        defs.forEach((def: any) => {
          if (def?.outputKey && !String(def.outputKey).startsWith('_')) names.add(def.outputKey)
          if (def?.stateMapping) {
            try {
              const mapping = JSON.parse(def.stateMapping)
              if (mapping && typeof mapping === 'object') {
                Object.keys(mapping).forEach((k) => {
                  if (!k.startsWith('_')) names.add(k)
                })
              }
            } catch {
              /* ignore */
            }
          }
        })
      }
    } catch {
      /* ignore */
    }
    return Array.from(names)
  })()
  const sharedStateKeys = Array.from(new Set([...declaredSharedFields, ...Object.keys(publicVariables)]))
  const load = (instanceId: string) => {
    getWorkflowInstance(instanceId).then((r) => {
      if (r.code === 200) setInstance(r.data)
    })
    getWorkflowCallbacks(instanceId).then((r) => {
      if (r.code === 200) setCallbackDeliveries(r.data || [])
    })
  }
  useEffect(() => {
    if (requestedInstanceId) load(requestedInstanceId)
  }, [requestedInstanceId])
  const loadHistory = () => {
    if (!id) return
    getWorkflowInstances({ workflowId: id, current: 1, pageSize: 50 }).then((r) => {
      if (r.code === 200) setHistoryInstances(r.data || [])
    })
  }
  useEffect(() => { loadHistory() }, [id])
  const refresh = async () => {
    setRefreshing(true)
    try {
      if (id) {
        const r = await getWorkflow(id)
        if (r.data) setWorkflow(r.data)
      }
      if (instance) await load(instance.id)
      loadHistory()
    } finally {
      setRefreshing(false)
    }
  }
  useEffect(() => {
    if (!instance || ['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT'].includes(instance.status)) return
    const controller = new AbortController()
    const token = localStorage.getItem('token')
    fetchEventSource(`/api/agent/workflow/instances/${encodeURIComponent(instance.id)}/events`, {
      headers: { 'Accept-Language': getLocale(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: controller.signal,
      onmessage: () => load(instance.id),
      onerror: () => { controller.abort() },
    }).catch(() => undefined)
    return () => controller.abort()
  }, [instance?.id, instance?.status])
  useEffect(() => {
    if (!instance || instance.status !== 'RUNNING') return
    const timer = window.setInterval(() => {
      load(instance.id)
      loadHistory()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [instance?.id, instance?.status])
  const start = async () => {
    if (!id) return
    setStarting(true)
    try {
      const values = form.getFieldsValue()
      const variables: Record<string, unknown> = {}
      fields.forEach((field: any) => {
        if (field?.name) variables[field.name] = values[field.name]
      })
      const businessType = String(values._businessType || '').trim()
      const businessId = String(values._businessId || '').trim()
      const idempotencyKey = String(values._idempotencyKey || '').trim()
      const callbackUrl = String(values._callbackUrl || '').trim()
      const hasBusinessFields = !!(businessType || businessId || idempotencyKey || callbackUrl || values._deadlineAt)
      if (hasBusinessFields && (!businessType || !businessId || !idempotencyKey)) {
        message.error(t('pages.agent.workflow.run.businessStartRequired'))
        return
      }
      const deadlineAt = values._deadlineAt?.valueOf?.()
      const result = hasBusinessFields
        ? await startBusinessWorkflow(id, { variables, businessType, businessId, idempotencyKey, callbackUrl: callbackUrl || undefined, deadlineAt })
        : await startWorkflow(id, variables)
      if (result.code === 200 && result.data) {
        load(result.data)
        loadHistory()
      }
    } finally {
      setStarting(false)
    }
  }
  const answer = async () => {
    if (!instance) return
    setAnswering(true)
    try {
      const node = instance.nodes?.find((item) => item.status === 'WAITING_USER')
      const config = node?.interactionConfig ? JSON.parse(node.interactionConfig) : {}
      const result = await answerWorkflow(
        instance.id,
        config.type === 'mcp_tool_approval'
          ? { decision: answerForm.getFieldValue('decision') }
          : answerForm.getFieldsValue(),
      )
      if (result.code === 200) {
        answerForm.resetFields()
        load(instance.id)
        loadHistory()
      }
    } finally {
      setAnswering(false)
    }
  }
  const act = async (action: () => Promise<void>) => {
    setActing(true)
    try {
      await action()
    } catch {
      // API failures are displayed by the global request handler.
    } finally {
      setActing(false)
    }
  }
  const openVariablesEditor = () => {
    setVariablesJson(JSON.stringify(publicVariables, null, 2))
    setVariablesOpen(true)
  }
  const saveVariables = async () => {
    if (!instance) return
    let variables: Record<string, unknown>
    try {
      const parsed = JSON.parse(variablesJson)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error()
      variables = parsed
    } catch {
      message.error(t('pages.agent.workflow.run.variablesMustObject'))
      return
    }
    if (Object.keys(variables).some((key) => key.startsWith('_'))) {
      message.error(t('pages.agent.workflow.run.internalVariablesForbidden'))
      return
    }
    setSavingVariables(true)
    try {
      const result = await updateWorkflowVariables(instance.id, variables)
      if (result.code === 200) {
        setVariablesOpen(false)
        load(instance.id)
      }
    } finally {
      setSavingVariables(false)
    }
  }
  const detailNodeId = selectedNodeId ?? instance?.currentNodeId
  const flowNodes = useMemo(() => {
    if (!instance) return []
    let defs: Record<string, any>[] = []
    try {
      const parsed = JSON.parse(instance.versionNodes || '[]')
      if (Array.isArray(parsed)) defs = parsed
    } catch {
      /* ignore */
    }
    const logs = (instance.nodes || []).map((n: any) => n)
    const logByNode: Record<string, Record<string, any>> = {}
    logs.forEach((log: any) => {
      logByNode[log.nodeId] = log
    })
    return defs.map((def) => ({
      id: def.id,
      type: 'run',
      position: def.position || { x: 100, y: 200 },
      selected: def.id === detailNodeId,
      data: { def, log: logByNode[def.id] },
    })) as Node<RunNodeData>[]
  }, [instance, detailNodeId])
  const flowEdges = useMemo(() => {
    if (!instance) return []
    let edges: Record<string, any>[] = []
    try {
      const parsed = JSON.parse(instance.versionEdges || '[]')
      if (Array.isArray(parsed)) edges = parsed
    } catch {
      /* ignore */
    }
    const defs = new Map(flowNodes.map((n: any) => [n.id, n.data.def]))
    return edges.map((edge, index) => {
      const isLoop = edge.target && edge.source
        ? defs.has(edge.target) && defs.has(edge.source)
          ? flowNodes.findIndex((n: any) => n.id === edge.target) < flowNodes.findIndex((n: any) => n.id === edge.source)
          : false
        : false
      const edgeLabel = edge.condition
        ? edge.label || edge.condition
        : edge.isDefault
          ? edge.label || t('pages.agent.workflow.run.defaultBranch')
          : edge.label
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
      }
    })
  }, [instance, flowNodes])
  const nodeTypes = useMemo(() => ({ run: RunCanvasNode }), [])
  return (
    <PageContainer
      header={{ title: t('pages.agent.workflow.run.title'), breadcrumb: undefined }}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={refresh}>
            {t('pages.agent.workflow.run.refresh')}
          </Button>
          <Select
            style={{ width: 230 }}
            value={instance?.id}
            placeholder={t('pages.agent.workflow.run.historyPlaceholder')}
            allowClear
            onChange={(value) => value ? load(value) : setInstance(undefined)}
            options={historyInstances.map((item) => ({
              value: item.id,
              label: `${formatWorkflowStatus(item.status)} · ${item.id}`,
            }))}
          />
          {instance && (
            <Popconfirm title={t('pages.agent.workflow.run.restartConfirm')} onConfirm={() => setInstance(undefined)}>
              <Button>{t('pages.agent.workflow.run.restart')}</Button>
            </Popconfirm>
          )}
          <Button onClick={() => history.push(`/workflow/workflow/${id}`)}>{t('pages.agent.workflow.run.backEditor')}</Button>
        </Space>
      }
    >
      {!instance && canStart && (
        <Card title={t('pages.agent.workflow.run.sharedState')} style={{ marginBottom: 16 }}>
          <Form form={form} layout="vertical">
            {fields.map((field: any) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label || field.name}
                rules={field.required ? [{ required: true }] : []}
              >
                <Input placeholder={field.placeholder} />
              </Form.Item>
            ))}
            <Collapse
              ghost
              style={{ marginBottom: 12 }}
              items={[{
                key: 'business',
                label: t('pages.agent.workflow.run.businessIntegration'),
                children: <>
                  <p style={{ color: '#8c8c8c', fontSize: 12 }}>{t('pages.agent.workflow.run.businessIntegrationTip')}</p>
                  <Form.Item name="_businessType" label={t('pages.agent.workflow.run.businessType')}><Input placeholder={t('pages.agent.workflow.run.businessTypePlaceholder')} /></Form.Item>
                  <Form.Item name="_businessId" label={t('pages.agent.workflow.run.businessId')}><Input placeholder={t('pages.agent.workflow.run.businessIdPlaceholder')} /></Form.Item>
                  <Form.Item name="_idempotencyKey" label={t('pages.agent.workflow.run.idempotencyKey')}><Input placeholder={t('pages.agent.workflow.run.idempotencyKeyPlaceholder')} /></Form.Item>
                  <Form.Item name="_callbackUrl" label={t('pages.agent.workflow.run.callbackUrl')}><Input placeholder="https://workflow.example.com/callback" /></Form.Item>
                  <Form.Item name="_deadlineAt" label={t('pages.agent.workflow.run.deadlineAt')}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
                </>,
              }]}
            />
            <Button
              type="primary"
              loading={starting}
              onClick={start}
              disabled={workflow?.status !== 1}
            >
              {t('pages.agent.workflow.run.start')}
            </Button>
            {workflow?.status !== 1 && (
              <span style={{ marginLeft: 12, color: '#fa8c16' }}>{t('pages.agent.workflow.run.publishFirst')}</span>
            )}
          </Form>
        </Card>
      )}
      {!instance && !canStart && (
        <Card style={{ marginBottom: 16 }}>{t('pages.agent.workflow.run.startReadOnly')}</Card>
      )}
      {instance && (
        <>
          <Card
            title={t('pages.agent.workflow.run.status')}
            style={{ marginBottom: 16 }}
            extra={
              <Tag color={statusColor[instance.status]}>
                {t(`pages.agent.workflow.run.status.${instance.status}`)}
              </Tag>
            }
          >
            <Descriptions column={2}>
              <Descriptions.Item label={t('pages.agent.workflow.run.instanceId')}>{instance.id}</Descriptions.Item>
              <Descriptions.Item label={t('pages.agent.workflow.run.businessAssociation')}>{instance.businessType && instance.businessId ? `${instance.businessType} · ${instance.businessId}` : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('pages.agent.workflow.run.currentNode')}>
                {instance.currentNodeId || '-'}
              </Descriptions.Item>
                <Descriptions.Item label={t('pages.agent.workflow.run.error')}>
                  {instance.status === 'FAILED' ? instance.errorMessage || '-' : '-'}
                </Descriptions.Item>
            </Descriptions>
            {callbackDeliveries.length > 0 && (
              <Card size="small" title={t('pages.agent.workflow.run.callbackDelivery')} style={{ marginTop: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {callbackDeliveries.map((delivery) => (
                    <Space key={delivery.id} style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                      <span>{delivery.eventType} · {t('pages.agent.workflow.run.deliveryAttempt', { count: delivery.attemptCount || 0 })}</span>
                      <Space>
                        <Tag color={delivery.status === 'DELIVERED' ? 'success' : delivery.status === 'FAILED' ? 'error' : 'processing'}>{delivery.status}</Tag>
                        {delivery.responseStatus && <span>HTTP {delivery.responseStatus}</span>}
                        {delivery.status === 'FAILED' && (
                          <Button size="small" loading={acting} onClick={() => act(async () => {
                            await retryWorkflowCallback(instance.id, delivery.id)
                            load(instance.id)
                          })}>{t('pages.agent.workflow.run.retryDelivery')}</Button>
                        )}
                      </Space>
                      {delivery.errorMessage && <span style={{ color: '#ff4d4f', width: '100%' }}>{delivery.errorMessage}</span>}
                    </Space>
                  ))}
                </Space>
              </Card>
            )}
            <div
              style={{
                height: 520,
                minHeight: 420,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
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
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(undefined)}
                defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }}
              >
                <Background gap={16} size={1} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(node) => {
                    const d = (node.data as RunNodeData)?.log?.status
                    return runStatusColor[d] || nodeColor[(node.data as RunNodeData)?.def?.type] || '#999'
                  }}
                />
                <Controls showInteractive={false} />
                <Panel position="top-left">
                  <Card
                    size="small"
                    style={{ width: 300 }}
                    title={t('pages.agent.workflow.run.sharedState')}
                    extra={['RUNNING', 'WAITING_USER', 'FAILED'].includes(instance.status) ? <Button size="small" onClick={openVariablesEditor}>{t('pages.agent.workflow.run.edit')}</Button> : undefined}
                    styles={{ body: { maxHeight: 360, overflow: 'auto' } }}
                  >
                    {sharedStateKeys.length ? (
                      sharedStateKeys.map((k) => {
                        const value = publicVariables[k]
                        return (
                          <div key={k} style={{ marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: '#595959' }}>{k}</div>
                            <div style={{ fontSize: 12, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                              {value === undefined ? (
                                <span style={{ color: '#bfbfbf' }}>{t('pages.agent.workflow.run.notGenerated')}</span>
                              ) : (
                                <FormattedContent content={formatVarValue(value)} />
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <span style={{ color: '#8c8c8c' }}>{t('pages.agent.workflow.run.emptyState')}</span>
                    )}
                  </Card>
                </Panel>
                <Panel position="top-right">
                  <Card
                    size="small"
                    style={{ width: 320 }}
                    title={t('pages.agent.workflow.run.nodeDetail')}
                    styles={{ body: { maxHeight: 360, overflow: 'auto' } }}
                  >
                    {(() => {
                      const target = flowNodes.find((n) => n.id === detailNodeId)
                      const def = target?.data.def
                      const log = target?.data.log
                      if (!def) return <span style={{ color: '#8c8c8c' }}>{t('pages.agent.workflow.run.noNodeSelected')}</span>
                      const statusText = log?.status
                        ? t(`pages.agent.workflow.run.status.${log.status}`)
                        : t('pages.agent.workflow.run.status.PENDING')
                      const typeText = t(`pages.agent.workflow.run.node.${def.type}`)
                      const detail = [
                        [t('pages.agent.workflow.run.nodeName'), def.name || typeText || def.id],
                        [t('pages.agent.workflow.run.nodeType'), typeText || def.type],
                        [t('pages.agent.workflow.run.status'), statusText],
                      ]
                      return (
                        <Descriptions column={1} size="small" bordered>
                          {detail.map(([labelText, value]) => (
                            <Descriptions.Item key={labelText} label={labelText}>
                              {value}
                            </Descriptions.Item>
                          ))}
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
                      )
                    })()}
                  </Card>
                </Panel>
                {instance.status === 'WAITING_USER' && (
                  <Panel position="bottom-left">
                    <Card
                      size="small"
                      style={{ width: 340 }}
                      title={t('pages.agent.workflow.run.waiting')}
                    >
                      <Form form={answerForm} layout="vertical">
                        {(() => {
                          const node = instance.nodes?.find((item) => item.status === 'WAITING_USER')
                          const config = node?.interactionConfig ? JSON.parse(node.interactionConfig) : {}
                          return config.type === 'mcp_tool_approval' ? (
                            <>
                              <p>{config.question || t('pages.agent.workflow.run.confirmMcpToolCall')}</p>
                              {config.arguments && <FormattedContent content={config.arguments} />}
                              <Form.Item name="decision" rules={[{ required: true, message: t('pages.agent.workflow.run.selectDecision') }]}>
                                <Radio.Group>
                                  <Space direction="vertical">
                                    <Radio value="once">{t('pages.agent.workflow.run.mcpOnce')}</Radio>
                                    <Radio value="allow_10m">{t('pages.agent.workflow.run.mcpAllowTenMinutes')}</Radio>
                                    <Radio value="reject">{t('pages.agent.workflow.run.mcpReject')}</Radio>
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
                                  rules={question.required ? [{ required: true, message: t('pages.agent.workflow.run.answerRequired') }] : undefined}
                                >
                                  {question.options?.length ? (
                                    <Radio.Group>
                                      <Space direction="vertical">
                                        {question.options.map((option) => <Radio key={option} value={option}>{option}</Radio>)}
                                      </Space>
                                    </Radio.Group>
                                  ) : (
                                    <Input.TextArea autoSize={{ minRows: index === 0 ? 3 : 2, maxRows: 6 }} />
                                  )}
                                </Form.Item>
                              ))}
                            </>
                          )
                        })()}
                        <Button type="primary" loading={answering} onClick={answer}>
                          {t('pages.agent.workflow.run.submitAndContinue')}
                        </Button>
                      </Form>
                    </Card>
                  </Panel>
                )}
              </ReactFlow>
            </div>
            {instance.status === 'FAILED' && (
              <Space style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  loading={acting}
                  onClick={() =>
                    act(async () => {
                      await retryWorkflow(instance.id)
                      load(instance.id)
                      loadHistory()
                    })
                  }
                >
                  {t('pages.agent.workflow.run.retry')}
                </Button>
                <Button
                  danger
                  loading={acting}
                  onClick={() =>
                    act(async () => {
                      await terminateWorkflow(instance.id)
                      load(instance.id)
                      loadHistory()
                    })
                  }
                >
                  {t('pages.agent.workflow.run.terminate')}
                </Button>
              </Space>
            )}
            {['FAILED', 'COMPLETED', 'TERMINATED'].includes(instance.status) && !instance.businessType && !instance.businessId && !instance.idempotencyKey && (
              <Popconfirm title={t('pages.agent.workflow.run.replayConfirm')} onConfirm={() => act(async () => {
                const result = await replayWorkflow(instance.id)
                if (result.code !== 200 || !result.data) return
                message.success(t('pages.agent.workflow.run.replayed'))
                await load(result.data)
                await loadHistory()
              })}>
                <Button style={{ marginTop: 16, marginLeft: 8 }} loading={acting}>{t('pages.agent.workflow.run.replay')}</Button>
              </Popconfirm>
            )}
          </Card>
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
        <Input.TextArea
          value={variablesJson}
          onChange={(event) => setVariablesJson(event.target.value)}
          rows={12}
          style={{ fontFamily: 'Consolas, Monaco, monospace' }}
        />
      </Modal>
    </PageContainer>
  )
}
export default RunPage
