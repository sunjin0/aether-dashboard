import React, { useEffect, useMemo, useState } from 'react'
import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components'
import { useIntl } from '@umijs/max'
import { Alert, Badge, Button, Card, Descriptions, Divider, Drawer, Empty, Form, Input, InputNumber, List, Modal, Progress, Select, Space, Statistic, Switch, Tabs, Tag, Timeline, Typography, message } from 'antd'
import { AppstoreOutlined, ArrowRightOutlined, AuditOutlined, CheckCircleFilled, ClockCircleOutlined, EyeOutlined, FileProtectOutlined, PlayCircleOutlined, SafetyCertificateOutlined, SendOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getSandboxAdminTask, getSandboxAudit, getSandboxMetrics, getSandboxTemplates, getSandboxTemplateVersions, publishSandboxTemplateVersion, setSandboxTemplateEnabled } from '@/services/agent/SandboxTaskController'
import type { SandboxTask } from '@/services/entity/Agent'
import './index.less'

type SandboxTemplate = { id?: string; code?: string; name?: string; description?: string; enabled?: boolean; riskLevel?: string; currentVersionId?: string }
type SandboxVersion = { id?: string; version?: number; published?: boolean; policyVersion?: string; publishedAt?: number; configSnapshot?: string }
type SandboxPolicyForm = { policyVersion: string; riskLevel: string; runtime: 'PYTHON' | 'NODE'; network: 'NONE'; scriptSlot: boolean; timeoutSeconds: number; maxOutputFiles: number; maxOutputMegabytes: number; outputFormats: string[]; advancedConfig?: string }
type SandboxMetrics = { windowStartAt?: number; pendingApproval?: number; queued?: number; running?: number; succeeded?: number; failed?: number; timedOut?: number; cancelled?: number; expired?: number; sensitiveHits?: number; terminalTasks?: number; averageQueueWaitMillis?: number; averageExecutionMillis?: number; totalWallMillis?: number; totalOutputBytes?: number; registeredRunners?: number; activeRunners?: number; staleRunners?: number; successRatePercent?: number; failureTypes?: Record<string, number>; unpinnedImageTaskCount?: number }

const stateColor: Record<string, string> = { PENDING_APPROVAL: 'gold', QUEUED: 'blue', CLAIMED: 'cyan', RUNNING: 'processing', SUCCEEDED: 'green', FAILED: 'red', TIMED_OUT: 'orange', CANCELLED: 'default', EXPIRED: 'default' }
const riskColor: Record<string, string> = { LOW: 'green', MEDIUM: 'orange', HIGH: 'red' }
const eventColor = (status?: string) => stateColor[status || ''] === 'processing' ? 'blue' : stateColor[status || ''] === 'green' ? 'green' : ['FAILED', 'TIMED_OUT'].includes(status || '') ? 'red' : stateColor[status || ''] === 'orange' ? 'orange' : 'gray'
const formatDate = (value?: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
const usageText = (usage: SandboxTask['resourceUsage'] | undefined, formatMessage: ReturnType<typeof useIntl>['formatMessage']) => {
  if (!usage) return '-'
  const seconds = usage.wallMillis === undefined ? '-' : formatMessage({ id: 'pages.agent.sandbox.second' }, { value: (usage.wallMillis / 1000).toFixed(1) })
  const output = usage.outputBytes === undefined ? '-' : `${(usage.outputBytes / 1024).toFixed(1)} KB`
  return `${seconds} / ${output}`
}
const versionBoundary = (snapshot: string | undefined, formatMessage: ReturnType<typeof useIntl>['formatMessage']) => {
  try {
    const config = JSON.parse(snapshot || '{}') as Record<string, unknown>
    return [config.runtime, config.network === 'NONE' ? formatMessage({ id: 'pages.agent.sandbox.noNetwork' }) : config.network, config.timeoutSeconds ? `${config.timeoutSeconds}s` : undefined, config.maxOutputFiles ? formatMessage({ id: 'pages.agent.sandbox.maxArtifacts' }, { count: String(config.maxOutputFiles) }) : undefined].filter(Boolean).map(String)
  } catch { return [] }
}
const formatConfigValue = (value: unknown, formatMessage: ReturnType<typeof useIntl>['formatMessage']) => Array.isArray(value) ? value.join('、') : typeof value === 'boolean' ? formatMessage({ id: value ? 'pages.agent.sandbox.boolean.true' : 'pages.agent.sandbox.boolean.false' }) : String(value ?? '-')
const formatBytes = (value: unknown) => typeof value === 'number' ? value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(value % (1024 * 1024) ? 1 : 0)} MB` : `${Math.ceil(value / 1024)} KB` : '-'
const formatDuration = (value?: number) => value === undefined ? '-' : value < 1000 ? `${value} ms` : value < 60 * 1000 ? `${(value / 1000).toFixed(1)} s` : `${(value / 60 / 1000).toFixed(1)} min`
const parseSnapshot = (snapshot?: string): Record<string, unknown> | undefined => {
  try { const value = JSON.parse(snapshot || '{}'); return value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, unknown> : undefined } catch { return undefined }
}
const FrozenConfigView: React.FC<{ snapshot?: string }> = ({ snapshot }) => {
  const intl = useIntl()
  const config = parseSnapshot(snapshot)
  if (!config) return <Alert type="error" showIcon message={intl.formatMessage({ id: 'pages.agent.sandbox.invalidSnapshot' })} description={intl.formatMessage({ id: 'pages.agent.sandbox.invalidSnapshotHint' })} />
  const rawJson = JSON.stringify(config, null, 2)
  const knownKeys = new Set(['runtime', 'executionMode', 'network', 'scriptSlot', 'readOnlyRoot', 'nonPrivileged', 'timeoutSeconds', 'maxOutputFiles', 'maxOutputBytes', 'maxInputFiles', 'maxInputBytes', 'inputFormats', 'outputFormats', 'dependencyPolicy', 'fixedCommand'])
  const advancedItems = Object.entries(config).filter(([key]) => !knownKeys.has(key)).map(([key, value]) => ({ key, label: key, children: formatConfigValue(value, intl.formatMessage) }))
  return <div className="sandbox-config-preview">
    <div className="sandbox-config-preview-head"><Typography.Text strong>{intl.formatMessage({ id: 'pages.agent.sandbox.frozenConfig' })}</Typography.Text><Typography.Text copyable={{ text: rawJson }} type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.copyRawJson' })}</Typography.Text></div>
    <section><Typography.Text className="sandbox-config-group-title">{intl.formatMessage({ id: 'pages.agent.sandbox.executionEnvironment' })}</Typography.Text><Descriptions size="small" colon={false} column={3} items={[{ key: 'runtime', label: intl.formatMessage({ id: 'pages.agent.sandbox.runtime' }), children: formatConfigValue(config.runtime, intl.formatMessage) }, { key: 'mode', label: intl.formatMessage({ id: 'pages.agent.sandbox.executionMode' }), children: config.executionMode === undefined ? intl.formatMessage({ id: 'pages.agent.sandbox.templateTask' }) : formatConfigValue(config.executionMode, intl.formatMessage) }, { key: 'network', label: intl.formatMessage({ id: 'pages.agent.sandbox.network' }), children: config.network === 'NONE' ? <Tag color="green">{intl.formatMessage({ id: 'pages.agent.sandbox.noNetwork' })}</Tag> : formatConfigValue(config.network, intl.formatMessage) }, { key: 'script', label: intl.formatMessage({ id: 'pages.agent.sandbox.scriptSlot' }), children: formatConfigValue(config.scriptSlot, intl.formatMessage) }, { key: 'root', label: intl.formatMessage({ id: 'pages.agent.sandbox.readOnlyRoot' }), children: formatConfigValue(config.readOnlyRoot, intl.formatMessage) }, { key: 'privileged', label: intl.formatMessage({ id: 'pages.agent.sandbox.nonPrivileged' }), children: formatConfigValue(config.nonPrivileged, intl.formatMessage) }]} /></section>
    <section><Typography.Text className="sandbox-config-group-title">{intl.formatMessage({ id: 'pages.agent.sandbox.resourceQuota' })}</Typography.Text><Descriptions size="small" colon={false} column={3} items={[{ key: 'timeout', label: intl.formatMessage({ id: 'pages.agent.sandbox.maxDuration' }), children: typeof config.timeoutSeconds === 'number' ? intl.formatMessage({ id: 'pages.agent.sandbox.second' }, { value: config.timeoutSeconds }) : '-' }, { key: 'outputCount', label: intl.formatMessage({ id: 'pages.agent.sandbox.maxOutputFiles' }), children: formatConfigValue(config.maxOutputFiles, intl.formatMessage) }, { key: 'outputBytes', label: intl.formatMessage({ id: 'pages.agent.sandbox.totalOutput' }), children: formatBytes(config.maxOutputBytes) }, { key: 'inputCount', label: intl.formatMessage({ id: 'pages.agent.sandbox.maxInputFiles' }), children: formatConfigValue(config.maxInputFiles, intl.formatMessage) }, { key: 'inputBytes', label: intl.formatMessage({ id: 'pages.agent.sandbox.totalInput' }), children: formatBytes(config.maxInputBytes) }, { key: 'dependency', label: intl.formatMessage({ id: 'pages.agent.sandbox.dependencyPolicy' }), children: config.dependencyPolicy === undefined ? intl.formatMessage({ id: 'pages.agent.sandbox.preinstalledDependencies' }) : formatConfigValue(config.dependencyPolicy, intl.formatMessage) }]} /></section>
    <section><Typography.Text className="sandbox-config-group-title">{intl.formatMessage({ id: 'pages.agent.sandbox.fileRules' })}</Typography.Text><Descriptions size="small" colon={false} column={1} items={[{ key: 'input', label: intl.formatMessage({ id: 'pages.agent.sandbox.allowedInput' }), children: <Space wrap>{Array.isArray(config.inputFormats) && config.inputFormats.length ? config.inputFormats.map((item) => <Tag key={String(item)}>{String(item)}</Tag>) : '-'}</Space> }, { key: 'output', label: intl.formatMessage({ id: 'pages.agent.sandbox.allowedOutput' }), children: <Space wrap>{Array.isArray(config.outputFormats) && config.outputFormats.length ? config.outputFormats.map((item) => <Tag color="blue" key={String(item)}>{String(item)}</Tag>) : '-'}</Space> }]} /></section>
    {!!config.fixedCommand && <section><Typography.Text className="sandbox-config-group-title">{intl.formatMessage({ id: 'pages.agent.sandbox.fixedCommand' })}</Typography.Text><Typography.Paragraph className="sandbox-config-command" copyable ellipsis={{ rows: 3, expandable: true, symbol: intl.formatMessage({ id: 'pages.agent.sandbox.expandCommand' }) }}><code>{String(config.fixedCommand)}</code></Typography.Paragraph></section>}
    {!!advancedItems.length && <section><Typography.Text className="sandbox-config-group-title">{intl.formatMessage({ id: 'pages.agent.sandbox.otherFrozenFields' })}</Typography.Text><Descriptions size="small" colon={false} column={2} items={advancedItems} /></section>}
  </div>
}

const SandboxAdminPage: React.FC = () => {
  const intl = useIntl()
  const stateText = Object.fromEntries(['PENDING_APPROVAL', 'QUEUED', 'CLAIMED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED', 'EXPIRED'].map((state) => [state, intl.formatMessage({ id: `pages.agent.sandbox.state.${state}` })])) as Record<string, string>
  const riskText = Object.fromEntries(['LOW', 'MEDIUM', 'HIGH'].map((risk) => [risk, intl.formatMessage({ id: `pages.agent.sandbox.risk.${risk}` })])) as Record<string, string>
  const approvalDecisionText = Object.fromEntries(['APPROVED', 'REJECTED'].map((decision) => [decision, intl.formatMessage({ id: `pages.agent.sandbox.decision.${decision}` })])) as Record<string, string>
  const getEventDisplay = (eventType?: string) => {
    const [title, description] = intl.formatMessage({ id: `pages.agent.sandbox.event.${eventType || 'fallback'}` }).split('|')
    return { title, description }
  }
  const getTaskLogDisplay = (task?: SandboxTask) => {
    const key = !task ? 'empty' : task.status === 'SUCCEEDED' ? 'succeeded' : task.status === 'FAILED' ? 'failed' : task.status === 'TIMED_OUT' ? 'timedOut' : task.status === 'CANCELLED' ? 'cancelled' : 'protected'
    const [title, description] = intl.formatMessage({ id: `pages.agent.sandbox.log.${key}` }).split('|')
    return { title, description }
  }
  const [templates, setTemplates] = useState<SandboxTemplate[]>([])
  const [versions, setVersions] = useState<SandboxVersion[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SandboxTemplate>()
  const [templateOpen, setTemplateOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [auditTask, setAuditTask] = useState<SandboxTask>()
  const [auditOpen, setAuditOpen] = useState(false)
  const [publishForm] = Form.useForm<SandboxPolicyForm>()
  const [metrics, setMetrics] = useState<SandboxMetrics>({})

  const loadTemplates = async () => {
    const result = await getSandboxTemplates()
    if (result.code === 200) setTemplates(result.data || [])
  }
  const loadMetrics = async () => {
    const result = await getSandboxMetrics()
    if (result.code === 200) setMetrics(result.data || {})
  }
  const refreshGovernance = () => { void loadTemplates(); void loadMetrics() }
  useEffect(() => { refreshGovernance() }, [])

  const delivery = useMemo(() => ({
    enabled: templates.filter((item) => item.enabled).length,
    needsRelease: templates.filter((item) => !item.currentVersionId).length,
    highRisk: templates.filter((item) => item.riskLevel === 'HIGH').length,
  }), [templates])

  const openTemplate = async (template: SandboxTemplate) => {
    setSelectedTemplate(template)
    setVersions([])
    setTemplateOpen(true)
    if (!template.id) return
    const result = await getSandboxTemplateVersions(template.id)
    if (result.code === 200) setVersions(result.data || [])
  }

  const openPublish = (template: SandboxTemplate) => {
    setSelectedTemplate(template)
    publishForm.setFieldsValue({ policyVersion: 'v1', riskLevel: template.riskLevel || 'LOW', runtime: 'PYTHON', network: 'NONE', scriptSlot: false, timeoutSeconds: 60, maxOutputFiles: 1, maxOutputMegabytes: 50, outputFormats: ['docx', 'xlsx', 'pdf'], advancedConfig: '' })
    setPublishOpen(true)
  }

  const publish = async () => {
    const values = await publishForm.validateFields()
    let advanced: Record<string, unknown> = {}
    if (values.advancedConfig?.trim()) {
      try { advanced = JSON.parse(values.advancedConfig) as Record<string, unknown> } catch { message.error(intl.formatMessage({ id: 'pages.agent.sandbox.invalidAdvancedConfig' })); return }
      if (!advanced || Array.isArray(advanced) || typeof advanced !== 'object') { message.error(intl.formatMessage({ id: 'pages.agent.sandbox.advancedConfigMustObject' })); return }
    }
    if (!selectedTemplate?.id) return
    const configSnapshot = JSON.stringify({ ...advanced, runtime: values.runtime, executionMode: 'SCRIPT', network: values.network, scriptSlot: values.scriptSlot, timeoutSeconds: values.timeoutSeconds, maxOutputFiles: values.maxOutputFiles, maxOutputBytes: values.maxOutputMegabytes * 1024 * 1024, outputFormats: values.outputFormats })
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.agent.sandbox.confirmPublish' }),
      content: <Space direction="vertical" size={4}><Typography.Text>{intl.formatMessage({ id: 'pages.agent.sandbox.publishConfirmHint' })}</Typography.Text><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.publishConfirmDetail' }, { policyVersion: values.policyVersion, riskLevel: riskText[values.riskLevel] || values.riskLevel })}</Typography.Text></Space>,
      okText: intl.formatMessage({ id: 'pages.agent.sandbox.publishAndFreeze' }),
      onOk: async () => {
        const result = await publishSandboxTemplateVersion(selectedTemplate.id as string, { policyVersion: values.policyVersion, riskLevel: values.riskLevel, configSnapshot })
        if (result.code === 200) {
          message.success(intl.formatMessage({ id: 'pages.agent.sandbox.publishSuccess' }))
          setPublishOpen(false)
          await loadTemplates()
          await openTemplate(selectedTemplate)
        }
      },
    })
  }

  const columns: ProColumns<SandboxTask>[] = [
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.task' }), dataIndex: 'id', width: 150, ellipsis: true, search: false },
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.templateAndVersion' }), dataIndex: 'templateCode', width: 170, render: (_, row) => <Space direction="vertical" size={0}><Typography.Text strong>{row.templateCode || '-'}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.runId ? `Run · ${row.runId}` : intl.formatMessage({ id: 'pages.agent.sandbox.scheduledTask' })}</Typography.Text></Space> },
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.status' }), dataIndex: 'status', width: 130, valueType: 'select', valueEnum: Object.keys(stateText).reduce((all, key) => ({ ...all, [key]: { text: stateText[key] } }), {}), render: (_, row) => <Tag color={stateColor[row.status || '']}>{stateText[row.status || ''] || row.status}</Tag> },
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.risk' }), dataIndex: 'riskLevel', width: 100, valueType: 'select', valueEnum: { LOW: { text: riskText.LOW }, MEDIUM: { text: riskText.MEDIUM }, HIGH: { text: riskText.HIGH } }, render: (_, row) => <Tag color={riskColor[row.riskLevel || '']}>{riskText[row.riskLevel || ''] || row.riskLevel}</Tag> },
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.requester' }), dataIndex: 'requesterUserId', width: 130, ellipsis: true },
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.createdAt' }), dataIndex: 'createdAt', width: 170, search: false, render: (_, row) => formatDate(row.createdAt) },
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.resourceUsage' }), dataIndex: 'resourceUsage', width: 150, search: false, render: (_, row) => usageText(row.resourceUsage, intl.formatMessage) },
    { title: intl.formatMessage({ id: 'pages.agent.sandbox.redactedLogSummary' }), dataIndex: 'logSummary', search: false, ellipsis: true },
    { title: intl.formatMessage({ id: 'pages.common.option' }), valueType: 'option', fixed: 'right', width: 150, render: (_, row) => <Button type="link" size="small" icon={<EyeOutlined />} onClick={async () => { if (!row.id) return; const result = await getSandboxAdminTask(row.id); if (result.code === 200) { setAuditTask(result.data); setAuditOpen(true) } }}>{intl.formatMessage({ id: 'pages.agent.sandbox.auditDetail' })}</Button> },
  ]
  const executionEvents = [...(auditTask?.events || [])].sort((left, right) => (left.sequence || 0) - (right.sequence || 0))

  return <PageContainer title={intl.formatMessage({ id: 'pages.agent.sandbox.title' })} className="sandbox-workbench">
    <div className="sandbox-lifecycle" aria-label={intl.formatMessage({ id: 'pages.agent.sandbox.lifecycle' })}>
      {[{ icon: <AppstoreOutlined />, title: intl.formatMessage({ id: 'pages.agent.sandbox.lifecycle.draft' }) }, { icon: <CheckCircleFilled />, title: intl.formatMessage({ id: 'pages.agent.sandbox.lifecycle.check' }) }, { icon: <FileProtectOutlined />, title: intl.formatMessage({ id: 'pages.agent.sandbox.lifecycle.frozen' }) }, { icon: <UsergroupAddOutlined />, title: intl.formatMessage({ id: 'pages.agent.sandbox.lifecycle.audit' }) }].map((item, index) => <React.Fragment key={item.title}><div className="sandbox-lifecycle-item"><span className={`sandbox-lifecycle-icon sandbox-lifecycle-icon-${index}`}>{item.icon}</span><Typography.Text strong>{item.title}</Typography.Text></div>{index < 3 && <ArrowRightOutlined className="sandbox-lifecycle-arrow" />}</React.Fragment>)}
    </div>
    <Alert className="sandbox-attention" showIcon type={delivery.needsRelease || delivery.highRisk ? 'warning' : 'success'} message={delivery.needsRelease || delivery.highRisk ? intl.formatMessage({ id: 'pages.agent.sandbox.attention' }, { pending: delivery.needsRelease, highRisk: delivery.highRisk }) : intl.formatMessage({ id: 'pages.agent.sandbox.allFrozen' })} action={<Button type="link" onClick={refreshGovernance}>{intl.formatMessage({ id: 'pages.agent.sandbox.refresh' })}</Button>} />
    <div className="sandbox-metrics">
      {[{ title: intl.formatMessage({ id: 'pages.agent.sandbox.metric.templates' }), value: templates.length, icon: <AppstoreOutlined />, tone: 'blue' }, { title: intl.formatMessage({ id: 'pages.agent.sandbox.metric.pending' }), value: delivery.needsRelease, icon: <CheckCircleFilled />, tone: 'green' }, { title: intl.formatMessage({ id: 'pages.agent.sandbox.metric.frozen' }), value: templates.filter((item) => item.currentVersionId).length, icon: <FileProtectOutlined />, tone: 'purple' }, { title: intl.formatMessage({ id: 'pages.agent.sandbox.metric.tasks' }), value: metrics.queued || 0, icon: <UsergroupAddOutlined />, tone: 'orange' }, { title: intl.formatMessage({ id: 'pages.agent.sandbox.metric.sensitive' }), value: metrics.sensitiveHits || 0, icon: <AuditOutlined />, tone: 'teal' }].map((item) => <Card key={item.title} className="sandbox-metric-card" bordered={false}><div className={`sandbox-metric-icon sandbox-metric-${item.tone}`}>{item.icon}</div><Statistic title={item.title} value={item.value} /><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.realtimeData' })}</Typography.Text></Card>)}
    </div>
    <Card className="sandbox-tabs-card" bodyStyle={{ paddingTop: 0 }}>
      <Tabs defaultActiveKey="configuration" items={[
        {
          key: 'operations',
          label: <Space><AuditOutlined />{intl.formatMessage({ id: 'pages.agent.sandbox.operations' })}</Space>,
          children: <div className="sandbox-operations">
            <Alert showIcon type={metrics.unpinnedImageTaskCount ? 'warning' : 'info'} message={metrics.unpinnedImageTaskCount ? intl.formatMessage({ id: 'pages.agent.sandbox.imageRiskFound' }, { count: metrics.unpinnedImageTaskCount }) : intl.formatMessage({ id: 'pages.agent.sandbox.operationsHint' })} description={intl.formatMessage({ id: 'pages.agent.sandbox.operationsWindow' }, { time: formatDate(metrics.windowStartAt) })} />
            <div className="sandbox-operations-grid">
              {[{ label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.successRate' }), value: metrics.successRatePercent, suffix: '%' }, { label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.queueWait' }), value: formatDuration(metrics.averageQueueWaitMillis) }, { label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.executionTime' }), value: formatDuration(metrics.averageExecutionMillis) }, { label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.terminal' }), value: metrics.terminalTasks || 0 }].map((item) => <Card key={item.label} size="small"><Statistic title={item.label} value={item.value ?? '-'} suffix={item.suffix} /></Card>)}
            </div>
            <Descriptions size="small" bordered column={3} items={[{ key: 'pending', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.pendingApproval' }), children: metrics.pendingApproval || 0 }, { key: 'queued', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.tasks' }), children: metrics.queued || 0 }, { key: 'running', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.running' }), children: metrics.running || 0 }, { key: 'timeout', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.timedOut' }), children: metrics.timedOut || 0 }, { key: 'cancelled', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.cancelled' }), children: metrics.cancelled || 0 }, { key: 'expired', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.expired' }), children: metrics.expired || 0 }, { key: 'activeRunners', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.activeRunners' }), children: <Tag color={metrics.staleRunners ? 'orange' : 'green'}>{metrics.activeRunners || 0}</Tag> }, { key: 'staleRunners', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.staleRunners' }), children: metrics.staleRunners || 0 }, { key: 'registeredRunners', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.registeredRunners' }), children: metrics.registeredRunners || 0 }, { key: 'wall', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.totalWall' }), children: formatDuration(metrics.totalWallMillis) }, { key: 'output', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.totalOutput' }), children: formatBytes(metrics.totalOutputBytes) }, { key: 'sensitive', label: intl.formatMessage({ id: 'pages.agent.sandbox.metric.sensitive' }), children: metrics.sensitiveHits || 0 }]} />
            <section className="sandbox-failure-types"><Typography.Text strong>{intl.formatMessage({ id: 'pages.agent.sandbox.failureTypes' })}</Typography.Text>{Object.keys(metrics.failureTypes || {}).length ? <List size="small" bordered dataSource={Object.entries(metrics.failureTypes || {})} renderItem={([code, count]) => <List.Item><Typography.Text code>{code}</Typography.Text><Tag color="red">{count}</Tag></List.Item>} /> : <Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.noFailureTypes' })}</Typography.Text>}</section>
          </div>,
        },
        {
          key: 'configuration',
          label: <Space><SafetyCertificateOutlined />{intl.formatMessage({ id: 'pages.agent.sandbox.templateConfig' })}<Tag>{templates.length}</Tag></Space>,
          children: <div className="sandbox-template-list"><div className="sandbox-template-list-head"><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.executionTemplate' })}</Typography.Text><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.versionDelivery' })}</Typography.Text><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.executionBoundary' })}</Typography.Text><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.common.option' })}</Typography.Text></div><List dataSource={templates} locale={{ emptyText: intl.formatMessage({ id: 'pages.agent.sandbox.emptyTemplates' }) }} renderItem={(template, index) => <List.Item className="sandbox-template-row"><div className={`sandbox-template-avatar sandbox-template-avatar-${index % 3}`}><AppstoreOutlined /></div><div className="sandbox-template-identity"><Space size={6}><Typography.Text strong>{template.name || template.code || intl.formatMessage({ id: 'pages.agent.sandbox.unnamedTemplate' })}</Typography.Text><Tag color={riskColor[template.riskLevel || '']}>{riskText[template.riskLevel || ''] || intl.formatMessage({ id: 'pages.agent.sandbox.riskUnset' })}</Tag></Space><Typography.Paragraph ellipsis={{ rows: 1 }} type="secondary">{template.description || intl.formatMessage({ id: 'pages.agent.sandbox.noDescription' })}</Typography.Paragraph><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.templateCode' }, { code: template.code || '-' })}</Typography.Text></div><div className="sandbox-template-delivery"><Typography.Text strong>{template.currentVersionId ? intl.formatMessage({ id: 'pages.agent.sandbox.frozenVersion' }) : intl.formatMessage({ id: 'pages.agent.sandbox.draft' })}</Typography.Text><br /><Tag color={template.currentVersionId ? 'blue' : 'orange'}>{template.currentVersionId ? intl.formatMessage({ id: 'pages.agent.sandbox.published' }) : intl.formatMessage({ id: 'pages.agent.sandbox.pendingPublication' })}</Tag></div><div className="sandbox-template-boundary"><Badge status={template.enabled ? 'success' : 'default'} text={template.enabled ? intl.formatMessage({ id: 'pages.agent.sandbox.enabled' }) : intl.formatMessage({ id: 'pages.agent.sandbox.disabled' })} /><br /><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.agent.sandbox.defaultBoundary' })}</Typography.Text></div><Space className="sandbox-template-actions"><Button onClick={() => void openTemplate(template)}>{intl.formatMessage({ id: 'pages.agent.sandbox.versionAndPolicy' })}</Button><Button type="primary" disabled={!template.id} onClick={() => openPublish(template)}>{intl.formatMessage({ id: 'pages.agent.sandbox.publishAndFreeze' })}</Button></Space></List.Item>} /></div>,
        },
        {
          key: 'audit',
          label: <Space><AuditOutlined />{intl.formatMessage({ id: 'pages.agent.sandbox.runningAudit' })}</Space>,
          children: <ProTable<SandboxTask> rowKey="id" scroll={{ x: 1000 }} headerTitle={intl.formatMessage({ id: 'pages.agent.sandbox.audit' })} columns={columns} search={{ labelWidth: 'auto' }} request={async (params) => { const result = await getSandboxAudit(params); return { data: result.data || [], success: result.code === 200, total: (result as any).count || 0 } }} toolBarRender={() => [<Button key="governance" icon={<AuditOutlined />} onClick={refreshGovernance}>{intl.formatMessage({ id: 'pages.agent.sandbox.refresh' })}</Button>]} />,
        },
      ]} />
    </Card>
    <Drawer className="sandbox-template-drawer" title={selectedTemplate ? intl.formatMessage({ id: 'pages.agent.sandbox.templatePolicyTitle' }, { name: selectedTemplate.name || selectedTemplate.code }) : intl.formatMessage({ id: 'pages.agent.sandbox.templatePolicy' })} open={templateOpen} onClose={() => { setTemplateOpen(false); setVersions([]) }} width={840} extra={<Button type="primary" icon={<SendOutlined />} onClick={() => { setTemplateOpen(false); if (selectedTemplate) openPublish(selectedTemplate) }}>{intl.formatMessage({ id: 'pages.agent.sandbox.publishNew' })}</Button>}>
      <div className="sandbox-drawer-hero"><div className="sandbox-template-avatar"><AppstoreOutlined /></div><div><Space size={8}><Typography.Title level={4}>{selectedTemplate?.name || selectedTemplate?.code || '-'}</Typography.Title><Tag color={riskColor[selectedTemplate?.riskLevel || '']}>{riskText[selectedTemplate?.riskLevel || ''] || intl.formatMessage({ id: 'pages.agent.sandbox.riskUnset' })}</Tag></Space><Typography.Paragraph type="secondary">{selectedTemplate?.description || intl.formatMessage({ id: 'pages.agent.sandbox.noDescription' })}</Typography.Paragraph></div></div>
      <Tabs defaultActiveKey="overview" items={[
        { key: 'overview', label: intl.formatMessage({ id: 'pages.agent.sandbox.overview' }), children: <><Descriptions className="sandbox-template-summary" size="small" column={2} bordered items={[{ key: 'code', label: intl.formatMessage({ id: 'pages.agent.sandbox.templateCode' }, { code: '' }).replace('：', '').replace(': ', ''), children: selectedTemplate?.code || '-' }, { key: 'enabled', label: intl.formatMessage({ id: 'pages.agent.sandbox.status' }), children: <Badge status={selectedTemplate?.enabled ? 'success' : 'default'} text={selectedTemplate?.enabled ? intl.formatMessage({ id: 'pages.agent.sandbox.enabled' }) : intl.formatMessage({ id: 'pages.agent.sandbox.disabled' })} /> }, { key: 'delivery', label: intl.formatMessage({ id: 'pages.agent.sandbox.deliveryStatus' }), children: selectedTemplate?.currentVersionId ? <Tag color="blue">{intl.formatMessage({ id: 'pages.agent.sandbox.frozenVersionAvailable' })}</Tag> : <Tag color="orange">{intl.formatMessage({ id: 'pages.agent.sandbox.pendingDraft' })}</Tag> }, { key: 'risk', label: intl.formatMessage({ id: 'pages.agent.sandbox.approvalLevel' }), children: <Tag color={riskColor[selectedTemplate?.riskLevel || '']}>{riskText[selectedTemplate?.riskLevel || '-'] || '-'}</Tag> }]} /></> },
        { key: 'versions', label: <Space>{intl.formatMessage({ id: 'pages.agent.sandbox.versions' })}<Tag>{versions.length}</Tag></Space>, children: <List className="sandbox-version-list" dataSource={versions} locale={{ emptyText: intl.formatMessage({ id: 'pages.agent.sandbox.noPublishedVersions' }) }} renderItem={(version) => <List.Item><Card size="small" style={{ width: '100%' }}><div className="sandbox-version-head"><Space><Typography.Text strong>v{version.version ?? '-'}</Typography.Text><Tag color={version.published ? 'green' : 'default'}>{version.published ? intl.formatMessage({ id: 'pages.agent.sandbox.published' }) : intl.formatMessage({ id: 'pages.agent.sandbox.draftShort' })}</Tag><Tag>{version.policyVersion || intl.formatMessage({ id: 'pages.agent.sandbox.unnamedPolicy' })}</Tag></Space><Typography.Text type="secondary">{formatDate(version.publishedAt)}</Typography.Text></div><Space wrap style={{ margin: '14px 0 8px' }}>{versionBoundary(version.configSnapshot, intl.formatMessage).map((item) => <Tag key={item} color="blue">{item}</Tag>)}</Space><FrozenConfigView snapshot={version.configSnapshot} /></Card></List.Item>} /> },
        { key: 'governance', label: intl.formatMessage({ id: 'pages.agent.sandbox.governance' }), children: <List size="small" bordered dataSource={[1, 2, 3, 4].map((index) => intl.formatMessage({ id: `pages.agent.sandbox.governanceItem.${index}` }))} renderItem={(item) => <List.Item><Space><SafetyCertificateOutlined style={{ color: '#1677ff' }} /><Typography.Text>{item}</Typography.Text></Space></List.Item>} /> },
      ]} />
    </Drawer>
    <Drawer title={intl.formatMessage({ id: 'pages.agent.sandbox.auditDetailTitle' }, { id: auditTask?.id || '' })} open={auditOpen} onClose={() => setAuditOpen(false)} width={860}>
      <Descriptions size="small" column={2} bordered items={[{ key: 'status', label: intl.formatMessage({ id: 'pages.agent.sandbox.status' }), children: <Tag color={stateColor[auditTask?.status || '']}>{stateText[auditTask?.status || ''] || auditTask?.status || '-'}</Tag> }, { key: 'template', label: intl.formatMessage({ id: 'pages.agent.sandbox.frozenVersion' }), children: auditTask?.templateCode || '-' }, { key: 'risk', label: intl.formatMessage({ id: 'pages.agent.sandbox.risk' }), children: riskText[auditTask?.riskLevel || ''] || auditTask?.riskLevel || '-' }, { key: 'usage', label: intl.formatMessage({ id: 'pages.agent.sandbox.resourceUsage' }), children: usageText(auditTask?.resourceUsage, intl.formatMessage) }]} />
      <Divider orientation="left">{intl.formatMessage({ id: 'pages.agent.sandbox.approvals' })}</Divider>
      <ProTable<any> rowKey={(row) => `${row.approverUserId}-${row.decidedAt}`} search={false} options={false} pagination={false} dataSource={auditTask?.approvals || []} columns={[{ title: intl.formatMessage({ id: 'pages.agent.sandbox.approvalDecision' }), dataIndex: 'decision', render: (_, row) => <Tag color={row.decision === 'APPROVED' ? 'green' : row.decision === 'REJECTED' ? 'red' : 'default'}>{approvalDecisionText[row.decision] || row.decision || '-'}</Tag> }, { title: intl.formatMessage({ id: 'pages.agent.sandbox.approver' }), dataIndex: 'approverName', render: (_, row) => row.approverName || row.approverUserId || '-' }, { title: intl.formatMessage({ id: 'pages.agent.sandbox.redactedReason' }), dataIndex: 'reason', ellipsis: true }, { title: intl.formatMessage({ id: 'pages.agent.sandbox.time' }), dataIndex: 'decidedAt', render: (_, row) => formatDate(row.decidedAt) }]} />
      <Divider orientation="left">{intl.formatMessage({ id: 'pages.agent.sandbox.executionRecords' })}</Divider>
      <Tabs className="sandbox-audit-tabs" defaultActiveKey="events" items={[
        { key: 'events', label: <Space>{intl.formatMessage({ id: 'pages.agent.sandbox.executionEvents' })}<Tag>{executionEvents.length}</Tag></Space>, children: executionEvents.length ? <Timeline items={executionEvents.map((event) => { const display = getEventDisplay(event.eventType); return { color: eventColor(event.status), children: <div className="sandbox-event-item"><div className="sandbox-event-head"><Space size={8}><Typography.Text strong>{display.title}</Typography.Text>{event.status && <Tag color={stateColor[event.status] || 'default'}>{stateText[event.status] || event.status}</Tag>}</Space><Typography.Text type="secondary">{formatDate(event.occurredAt)}</Typography.Text></div>{event.progress !== undefined && <Progress percent={event.progress} size="small" showInfo={event.progress > 0} />}<Typography.Paragraph className="sandbox-event-summary">{display.description}</Typography.Paragraph>{event.subjectSha256 && <Typography.Text className="sandbox-event-hash" copyable={{ text: event.subjectSha256 }}>{intl.formatMessage({ id: 'pages.agent.sandbox.sensitiveHash' }, { hash: event.subjectSha256 })}</Typography.Text>}</div> } })} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.formatMessage({ id: 'pages.agent.sandbox.noEvents' })} /> },
        { key: 'logs', label: intl.formatMessage({ id: 'pages.agent.sandbox.redactedLogs' }), children: <div className="sandbox-redacted-log"><Alert showIcon type={auditTask?.status === 'FAILED' || auditTask?.status === 'TIMED_OUT' ? 'error' : 'info'} message={getTaskLogDisplay(auditTask).title} description={getTaskLogDisplay(auditTask).description} /><Typography.Text className="sandbox-log-label">{intl.formatMessage({ id: 'pages.agent.sandbox.logPolicy' })}</Typography.Text><Typography.Paragraph className="sandbox-log-content">{intl.formatMessage({ id: 'pages.agent.sandbox.rawLogHint' })}</Typography.Paragraph>{executionEvents.some((event) => event.subjectSha256) && <><Typography.Text className="sandbox-log-label">{intl.formatMessage({ id: 'pages.agent.sandbox.sensitiveObjects' })}</Typography.Text><List size="small" bordered dataSource={executionEvents.filter((event) => event.subjectSha256)} renderItem={(event) => { const display = getEventDisplay(event.eventType); return <List.Item><Typography.Text copyable={{ text: event.subjectSha256 }}>{event.subjectSha256}</Typography.Text><Typography.Text type="secondary">{display.title}</Typography.Text></List.Item> }} /></>}</div> },
      ]} />
    </Drawer>
    <Modal title={intl.formatMessage({ id: 'pages.agent.sandbox.publishTemplateTitle' }, { code: selectedTemplate?.code || '' })} open={publishOpen} onCancel={() => setPublishOpen(false)} onOk={() => void publish()} okText={intl.formatMessage({ id: 'pages.agent.sandbox.publishAndFreeze' })} width={820}>
      <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={intl.formatMessage({ id: 'pages.agent.sandbox.publishImmutable' })} description={intl.formatMessage({ id: 'pages.agent.sandbox.publishImmutableHint' })} />
      <Form form={publishForm} layout="vertical">
        <Tabs items={[
          { key: 'policy', label: intl.formatMessage({ id: 'pages.agent.sandbox.policyTab' }), children: <><Form.Item name="policyVersion" label={intl.formatMessage({ id: 'pages.agent.sandbox.policyVersion' })} extra={intl.formatMessage({ id: 'pages.agent.sandbox.policyVersionHint' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.agent.sandbox.policyVersionRequired' }) }]}><Input maxLength={64} placeholder="2026.08-local-v1" /></Form.Item><Form.Item name="riskLevel" label={intl.formatMessage({ id: 'pages.agent.sandbox.approvalLevel' })} rules={[{ required: true }]}><Select options={[{ value: 'LOW', label: intl.formatMessage({ id: 'pages.agent.sandbox.risk.low' }) }, { value: 'MEDIUM', label: intl.formatMessage({ id: 'pages.agent.sandbox.risk.medium' }) }, { value: 'HIGH', label: intl.formatMessage({ id: 'pages.agent.sandbox.risk.high' }) }]} /></Form.Item></> },
          { key: 'boundary', label: intl.formatMessage({ id: 'pages.agent.sandbox.boundaryTab' }), children: <><Space size={16} style={{ width: '100%' }} align="start"><Form.Item name="runtime" label={intl.formatMessage({ id: 'pages.agent.sandbox.controlledRuntime' })} rules={[{ required: true }]} style={{ flex: 1 }}><Select options={[{ value: 'PYTHON', label: intl.formatMessage({ id: 'pages.agent.sandbox.runtime.python' }) }, { value: 'NODE', label: intl.formatMessage({ id: 'pages.agent.sandbox.runtime.node' }) }]} /></Form.Item><Form.Item name="network" label={intl.formatMessage({ id: 'pages.agent.sandbox.network' })} style={{ flex: 1 }}><Select disabled options={[{ value: 'NONE', label: intl.formatMessage({ id: 'pages.agent.sandbox.defaultNoNetwork' }) }]} /></Form.Item><Form.Item name="scriptSlot" label={intl.formatMessage({ id: 'pages.agent.sandbox.scriptSlot' })} valuePropName="checked" style={{ minWidth: 120 }}><Switch checkedChildren={intl.formatMessage({ id: 'pages.agent.sandbox.allow' })} unCheckedChildren={intl.formatMessage({ id: 'pages.agent.sandbox.disallow' })} /></Form.Item></Space><Space size={16} style={{ width: '100%' }} align="start"><Form.Item name="timeoutSeconds" label={intl.formatMessage({ id: 'pages.agent.sandbox.timeoutSeconds' })} rules={[{ required: true }]} style={{ flex: 1 }}><InputNumber min={1} max={3600} precision={0} style={{ width: '100%' }} /></Form.Item><Form.Item name="maxOutputFiles" label={intl.formatMessage({ id: 'pages.agent.sandbox.maxOutputFiles' })} rules={[{ required: true }]} style={{ flex: 1 }}><InputNumber min={1} max={100} precision={0} style={{ width: '100%' }} /></Form.Item><Form.Item name="maxOutputMegabytes" label={intl.formatMessage({ id: 'pages.agent.sandbox.maxOutputMegabytes' })} rules={[{ required: true }]} style={{ flex: 1 }}><InputNumber min={1} max={512} precision={0} style={{ width: '100%' }} /></Form.Item></Space><Form.Item name="outputFormats" label={intl.formatMessage({ id: 'pages.agent.sandbox.outputFormats' })} extra={intl.formatMessage({ id: 'pages.agent.sandbox.outputFormatsHint' })} rules={[{ required: true, message: intl.formatMessage({ id: 'pages.agent.sandbox.outputFormatsRequired' }) }]}><Select mode="tags" tokenSeparators={[',']} options={['docx', 'xlsx', 'pdf', 'csv', 'json', 'md', 'txt', 'zip', 'xml'].map((value) => ({ value }))} /></Form.Item></> },
          { key: 'advanced', label: intl.formatMessage({ id: 'pages.agent.sandbox.advancedTab' }), children: <><Alert showIcon type="info" message={intl.formatMessage({ id: 'pages.agent.sandbox.advancedAdminOnly' })} description={intl.formatMessage({ id: 'pages.agent.sandbox.advancedHint' })} style={{ marginBottom: 16 }} /><Form.Item name="advancedConfig" label={intl.formatMessage({ id: 'pages.agent.sandbox.supplementalConfig' })} extra={intl.formatMessage({ id: 'pages.agent.sandbox.supplementalConfigHint' })}><Input.TextArea rows={9} placeholder={'{\n  "readOnlyRoot": true,\n  "nonPrivileged": true\n}'} /></Form.Item></> },
          { key: 'check', label: intl.formatMessage({ id: 'pages.agent.sandbox.checkTab' }), children: <List size="small" bordered dataSource={[1, 2, 3, 4].map((index) => intl.formatMessage({ id: `pages.agent.sandbox.checkItem.${index}` }))} renderItem={(item, index) => <List.Item><Space><CheckCircleFilled style={{ color: index === 3 ? '#faad14' : '#52c41a' }} /><Typography.Text>{item}</Typography.Text></Space></List.Item>} /> },
        ]} />
      </Form>
    </Modal>
  </PageContainer>
}

export default SandboxAdminPage
