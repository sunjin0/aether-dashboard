import React, { useRef, useState } from 'react'
import { history, useIntl } from '@umijs/max'
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components'
import { Button, Descriptions, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, message } from 'antd'
import { AppstoreOutlined, DownloadOutlined, HistoryOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import {
  AgentWorkflow,
  createWorkflow,
  createWorkflowSchedule,
  createWorkflowTemplate,
  deleteWorkflow,
  exportWorkflow,
  getWorkflowSchedules,
  getWorkflow,
  getWorkflowList,
  getWorkflowTemplates,
  getWorkflowVersionDiff,
  getWorkflowVersions,
  importWorkflow,
  instantiateWorkflowTemplate,
  offlineWorkflow,
  publishWorkflow,
  setWorkflowScheduleEnabled,
  updateWorkflow,
  WorkflowTemplate,
  WorkflowSchedule,
  WorkflowVersion,
  WorkflowVersionDiff,
} from '@/services/workflow/WorkflowController'
import TableActionMenu from '@/components/TableActionMenu'

const WorkflowPage: React.FC = () => {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values)
  const ref = useRef<ActionType>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AgentWorkflow>()
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [templateSource, setTemplateSource] = useState<AgentWorkflow>()
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionWorkflow, setVersionWorkflow] = useState<AgentWorkflow>()
  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [versionDiff, setVersionDiff] = useState<WorkflowVersionDiff>()
  const [compareVersions, setCompareVersions] = useState<number[]>([])
  const [schedulesOpen, setSchedulesOpen] = useState(false)
  const [scheduleWorkflow, setScheduleWorkflow] = useState<AgentWorkflow>()
  const [schedules, setSchedules] = useState<WorkflowSchedule[]>([])
  const importInput = useRef<HTMLInputElement>(null)
  const [form] = Form.useForm()
  const [templateForm] = Form.useForm()
  const [scheduleForm] = Form.useForm()
  const loadTemplates = async () => {
    const result = await getWorkflowTemplates()
    if (result.code === 200) setTemplates(result.data || [])
    else message.error(result.message || t('pages.agent.workflow.operationFailed'))
  }
  const showTemplates = async () => {
    await loadTemplates()
    setTemplatesOpen(true)
  }
  const showVersions = async (record: AgentWorkflow) => {
    if (!record.id) return
    const result = await getWorkflowVersions(record.id)
    if (result.code !== 200) { message.error(result.message || t('pages.agent.workflow.operationFailed')); return }
    setVersionWorkflow(record)
    setVersions(result.data || [])
    setCompareVersions([])
    setVersionDiff(undefined)
    setVersionsOpen(true)
  }
  const showSchedules = async (record: AgentWorkflow) => {
    if (!record.id) return
    const result = await getWorkflowSchedules({ workflowId: record.id })
    if (result.code !== 200) { message.error(result.message || t('pages.agent.workflow.operationFailed')); return }
    setScheduleWorkflow(record)
    setSchedules(result.data || [])
    scheduleForm.resetFields()
    setSchedulesOpen(true)
  }
  const createSchedule = async () => {
    if (!scheduleWorkflow?.id) return
    const values = await scheduleForm.validateFields()
    let variables: Record<string, unknown> = {}
    try {
      variables = values.variables ? JSON.parse(values.variables) : {}
      if (!variables || Array.isArray(variables) || typeof variables !== 'object') throw new Error('not an object')
    } catch { message.error(t('pages.agent.workflow.schedule.variablesInvalid')); return }
    const result = await createWorkflowSchedule({ ...values, workflowId: scheduleWorkflow.id, variables })
    if (result.code !== 200) { message.error(result.message || t('pages.agent.workflow.operationFailed')); return }
    message.success(t('pages.agent.workflow.schedule.created'))
    await showSchedules(scheduleWorkflow)
  }
  const toggleSchedule = async (schedule: WorkflowSchedule, enabled: boolean) => {
    if (!schedule.id) return
    const result = await setWorkflowScheduleEnabled(schedule.id, enabled)
    if (result.code !== 200) { message.error(result.message || t('pages.agent.workflow.operationFailed')); return }
    setSchedules((current) => current.map((item) => item.id === schedule.id ? { ...item, enabled } : item))
  }
  const compareVersion = async (selectedVersions: number[]) => {
    setCompareVersions(selectedVersions)
    if (selectedVersions.length !== 2 || !versionWorkflow?.id) { setVersionDiff(undefined); return }
    const [from, to] = [...selectedVersions].sort((a, b) => a - b)
    const result = await getWorkflowVersionDiff(versionWorkflow.id, from, to)
    if (result.code === 200) setVersionDiff(result.data)
    else message.error(result.message || t('pages.agent.workflow.operationFailed'))
  }
  const downloadWorkflow = async (record: AgentWorkflow) => {
    if (!record.id) return
    const result = await exportWorkflow(record.id)
    if (result.code !== 200 || !result.data) { message.error(result.message || t('pages.agent.workflow.operationFailed')); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' }))
    link.download = `${record.name || 'workflow'}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const uploadWorkflow = async (file?: File) => {
    if (!file) return
    try {
      const payload = JSON.parse(await file.text()) as AgentWorkflow
      const result = await importWorkflow(payload)
      if (result.code === 200 && result.data) {
        message.success(t('pages.agent.workflow.imported'))
        history.push(`/workflow/workflow/${result.data}`)
      } else message.error(result.message || t('pages.agent.workflow.operationFailed'))
    } catch {
      message.error(t('pages.agent.workflow.importInvalid'))
    } finally {
      if (importInput.current) importInput.current.value = ''
    }
  }
  const submit = async () => {
    const values = form.getFieldsValue()
    if (editing?.id) {
      const result = await updateWorkflow(editing.id, { ...editing, ...values })
      if (result.code === 200) {
        message.success(t('pages.agent.workflow.updated'))
        setOpen(false)
        setEditing(undefined)
        ref.current?.reload()
      } else message.error(result.message || t('pages.agent.workflow.operationFailed'))
      return
    }
    const result = await createWorkflow(values)
    if (result.code === 200 && result.data) {
      message.success('草稿已创建')
      setOpen(false)
      history.push(`/workflow/workflow/${result.data}`)
    } else message.error(result.message || '创建失败')
  }
  const openCreate = () => {
    setEditing(undefined)
    form.resetFields()
    setOpen(true)
  }
  const openEdit = async (record: AgentWorkflow) => {
    if (!record.id) return
    const result = await getWorkflow(record.id)
    if (result.code !== 200 || !result.data) {
      message.error(result.message || t('pages.agent.workflow.operationFailed'))
      return
    }
    setEditing(result.data)
    form.setFieldsValue({ name: result.data.name, description: result.data.description, maxConcurrentInstances: result.data.maxConcurrentInstances ?? 0 })
    setOpen(true)
  }
  const action = async (record: AgentWorkflow, fn: (id: string) => Promise<any>, text: string) => {
    if (!record.id) return
    const result = await fn(record.id)
    if (result.code === 200) {
      message.success(text)
      ref.current?.reload()
    } else message.error(result.message || '操作失败')
  }
  const createTemplate = async () => {
    if (!templateSource?.id) return
    const values = await templateForm.validateFields()
    const result = await createWorkflowTemplate(templateSource.id, values)
    if (result.code === 200) {
      message.success(t('pages.agent.workflow.templateCreated'))
      setTemplateSource(undefined)
      templateForm.resetFields()
      await loadTemplates()
    } else message.error(result.message || t('pages.agent.workflow.operationFailed'))
  }
  const instantiateTemplate = async (template: WorkflowTemplate) => {
    const result = await instantiateWorkflowTemplate(template.id, {
      name: `${template.name} ${t('pages.agent.workflow.copySuffix')}`,
      description: template.description || '',
    })
    if (result.code === 200 && result.data) {
      message.success(t('pages.agent.workflow.templateInstantiated'))
      setTemplatesOpen(false)
      history.push(`/workflow/workflow/${result.data}`)
    } else message.error(result.message || t('pages.agent.workflow.operationFailed'))
  }
  return (
    <PageContainer header={{ title: t('pages.agent.workflow.title'), subTitle: t('pages.agent.workflow.pageDescription'), breadcrumb: undefined }}>
      <ProTable<AgentWorkflow>
        actionRef={ref}
        rowKey="id"
        cardBordered
        search={{ labelWidth: 'auto', defaultCollapsed: false, span: 8 }}
        options={{ reload: true, density: true, setting: true }}
        tableStyle={{ minWidth: 900 }}
        toolBarRender={() => [
          <input
            key="import-file"
            ref={importInput}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(event) => uploadWorkflow(event.target.files?.[0])}
          />,
          <Button icon={<UploadOutlined />} onClick={() => importInput.current?.click()}>
            {t('pages.agent.workflow.import')}
          </Button>,
          <Button icon={<AppstoreOutlined />} onClick={showTemplates}>
            {t('pages.agent.workflow.templates')}
          </Button>,
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('pages.agent.workflow.new')}
          </Button>,
        ]}
        columns={[
          {
            title: t('pages.agent.workflow.name'),
            dataIndex: 'name',
            width: 260,
            render: (_, r) => (
              <a onClick={() => history.push(`/workflow/workflow/${r.id}`)}>{r.name}</a>
            ),
          },
          {
            title: t('pages.agent.workflow.description'),
            dataIndex: 'description',
            ellipsis: true,
            hideInSearch: true,
          },
          {
            title: t('pages.agent.workflow.status'),
            dataIndex: 'status',
            width: 180,
            valueType: 'select',
            valueEnum: {
              0: t('pages.agent.workflow.status.draft'),
              1: t('pages.agent.workflow.status.published', { version: 1 }),
              2: t('pages.agent.workflow.status.offline'),
            },
            render: (_, r) => (
              <Tag color={r.status === 1 ? 'green' : r.status === 2 ? 'default' : 'orange'}>
                {r.status === 1
                  ? t('pages.agent.workflow.status.published', {
                    version: r.publishedVersion ?? '-',
                  })
                  : r.status === 2
                    ? t('pages.agent.workflow.status.offline')
                    : t('pages.agent.workflow.status.draft')}
              </Tag>
            ),
          },
          {
            title: t('pages.agent.workflow.action'),
            width: 300,
            fixed: 'right',
            valueType: 'option',
            render: (_, r) => (
              <TableActionMenu
                items={[
                  {
                    key: 'edit',
                    label: t('pages.common.edit'),
                    primary: true,
                    onClick: () => openEdit(r),
                  },
                  {
                    key: 'design',
                    label: t('pages.agent.workflow.action.edit'),
                    primary: true,
                    onClick: () => history.push(`/workflow/workflow/${r.id}`),
                  },
                  {
                    key: 'template',
                    label: t('pages.agent.workflow.saveAsTemplate'),
                    onClick: () => {
                      setTemplateSource(r)
                      templateForm.setFieldsValue({
                        name: `${r.name || ''} ${t('pages.agent.workflow.templateSuffix')}`,
                        description: r.description,
                      })
                    },
                  },
                  {
                    key: 'versions',
                    label: <><HistoryOutlined /> {t('pages.agent.workflow.versions')}</>,
                    onClick: () => showVersions(r),
                  },
                  {
                    key: 'schedules',
                    label: t('pages.agent.workflow.schedule.manage'),
                    onClick: () => showSchedules(r),
                  },
                  {
                    key: 'export',
                    label: <><DownloadOutlined /> {t('pages.agent.workflow.export')}</>,
                    onClick: () => downloadWorkflow(r),
                  },
                  {
                    key: 'publish',
                    label: t('pages.agent.workflow.action.publish'),
                    visible: r.status !== 1,
                    onClick: () => action(r, publishWorkflow, t('pages.agent.workflow.action.publish')),
                  },
                  {
                    key: 'offline',
                    label: t('pages.agent.workflow.action.offline'),
                    visible: r.status === 1,
                    onClick: () => action(r, offlineWorkflow, t('pages.agent.workflow.status.offline')),
                  },
                  {
                    key: 'delete',
                    label: t('pages.agent.workflow.action.delete'),
                    danger: true,
                    confirm: { title: t('pages.agent.workflow.deleteConfirm') },
                    onClick: () => action(r, deleteWorkflow, t('pages.agent.workflow.deleted')),
                  },
                ]}
              />
            ),
          },
        ]}
        request={(params) =>
          getWorkflowList({ ...params, current: params.current, pageSize: params.pageSize })
        }
      />
      <Modal
        open={open}
        title={editing ? t('pages.common.edit') : t('pages.agent.workflow.new')}
        onCancel={() => { setOpen(false); setEditing(undefined) }}
        onOk={submit}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('pages.agent.workflow.name')}
            rules={[{ required: true }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label={t('pages.agent.workflow.description')}>
            <Input.TextArea maxLength={512} />
          </Form.Item>
          <Form.Item name="maxConcurrentInstances" label={t('pages.agent.workflow.maxConcurrentInstances')} initialValue={0} extra={t('pages.agent.workflow.maxConcurrentInstancesTip')}>
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={!!templateSource}
        title={t('pages.agent.workflow.saveAsTemplate')}
        onCancel={() => { setTemplateSource(undefined); templateForm.resetFields() }}
        onOk={createTemplate}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item name="name" label={t('pages.agent.workflow.name')} rules={[{ required: true }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label={t('pages.agent.workflow.description')}>
            <Input.TextArea maxLength={512} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={templatesOpen}
        title={t('pages.agent.workflow.templates')}
        footer={null}
        width={760}
        onCancel={() => setTemplatesOpen(false)}
      >
        <Table<WorkflowTemplate>
          rowKey="id"
          pagination={false}
          dataSource={templates}
          columns={[
            { title: t('pages.agent.workflow.name'), dataIndex: 'name' },
            { title: t('pages.agent.workflow.description'), dataIndex: 'description', ellipsis: true },
            {
              title: t('pages.agent.workflow.action'),
              width: 110,
              render: (_, template) => <a onClick={() => instantiateTemplate(template)}>{t('pages.agent.workflow.useTemplate')}</a>,
            },
          ]}
        />
      </Modal>
      <Modal
        open={versionsOpen}
        title={t('pages.agent.workflow.versions')}
        footer={<Button onClick={() => setVersionsOpen(false)}>{t('pages.common.close')}</Button>}
        width={820}
        onCancel={() => setVersionsOpen(false)}
      >
        <Select
          mode="multiple"
          maxCount={2}
          value={compareVersions as any}
          style={{ width: '100%', marginBottom: 16 }}
          placeholder={t('pages.agent.workflow.selectVersions')}
          options={versions.map((version) => ({ value: version.versionNo, label: `v${version.versionNo}` }))}
          onChange={(value) => compareVersion(value as number[])}
        />
        <Table<WorkflowVersion>
          rowKey="id"
          pagination={false}
          dataSource={versions}
          columns={[
            { title: t('pages.agent.workflow.version'), dataIndex: 'versionNo', render: (version) => `v${version}` },
            {
              title: t('pages.agent.workflow.publishedAt'),
              dataIndex: 'publishedAt',
              render: (value) => value ? new Date(Number(value)).toLocaleString() : '-',
            },
          ]}
        />
        {versionDiff && (
          <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
            <Descriptions.Item label={t('pages.agent.workflow.diff.addedNodes')}>{versionDiff.addedNodeIds.join(', ') || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.removedNodes')}>{versionDiff.removedNodeIds.join(', ') || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.changedNodes')}>{versionDiff.changedNodeIds.join(', ') || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.edges')}>{`${t('pages.agent.workflow.diff.added')}: ${versionDiff.addedEdgeIds.length}，${t('pages.agent.workflow.diff.removed')}: ${versionDiff.removedEdgeIds.length}`}</Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.inputSchema')}>{versionDiff.inputSchemaChanged ? t('pages.common.yes') : t('pages.common.no')}</Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.outputSchema')}>{versionDiff.outputSchemaChanged ? t('pages.common.yes') : t('pages.common.no')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        open={schedulesOpen}
        title={t('pages.agent.workflow.schedule.manage')}
        footer={null}
        width={900}
        onCancel={() => setSchedulesOpen(false)}
      >
        <Form form={scheduleForm} layout="vertical" onFinish={createSchedule}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="name" label={t('pages.agent.workflow.schedule.name')} rules={[{ required: true }]}>
              <Input maxLength={128} />
            </Form.Item>
            <Form.Item name="serviceAccountId" label={t('pages.agent.workflow.schedule.serviceAccount')} rules={[{ required: true }]}>
              <Input placeholder={t('pages.agent.workflow.schedule.serviceAccountTip')} />
            </Form.Item>
            <Form.Item name="cronExpression" label={t('pages.agent.workflow.schedule.cron')} rules={[{ required: true }]}>
              <Input placeholder="0 0 9 * * MON-FRI" />
            </Form.Item>
            <Form.Item name="businessType" label={t('pages.agent.workflow.schedule.businessType')} rules={[{ required: true }]}>
              <Input maxLength={64} />
            </Form.Item>
          </div>
          <Form.Item name="businessIdTemplate" label={t('pages.agent.workflow.schedule.businessId')} rules={[{ required: true }]}>
            <Input placeholder="daily-${scheduledAt}" />
          </Form.Item>
          <Form.Item name="variables" label={t('pages.agent.workflow.schedule.variables')} initialValue="{}">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit">{t('pages.agent.workflow.schedule.create')}</Button>
        </Form>
        <Table<WorkflowSchedule>
          style={{ marginTop: 20 }}
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={schedules}
          columns={[
            { title: t('pages.agent.workflow.schedule.name'), dataIndex: 'name' },
            { title: t('pages.agent.workflow.schedule.cron'), dataIndex: 'cronExpression' },
            { title: t('pages.agent.workflow.schedule.nextFireAt'), dataIndex: 'nextFireAt', render: (value) => value ? new Date(Number(value)).toLocaleString() : '-' },
            { title: t('pages.agent.workflow.schedule.lastError'), dataIndex: 'lastErrorMessage', ellipsis: true },
            { title: t('pages.agent.workflow.schedule.enabled'), dataIndex: 'enabled', width: 80, render: (_, schedule) => <Switch size="small" checked={!!schedule.enabled} onChange={(enabled) => toggleSchedule(schedule, enabled)} /> },
          ]}
        />
      </Modal>
    </PageContainer>
  )
}
export default WorkflowPage
