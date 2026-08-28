import React, { useEffect, useRef, useState } from 'react'
import { PageContainer, ProTable, ProFormDependency, ProFormRadio, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { Alert, Button, Modal, Popconfirm, Switch, Table, Tag, Typography, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useIntl } from '@umijs/max'
import JsonDisplay from '@/components/JsonDisplay'
import DrawerForm from '@/components/DrawerForm'
import { getAgentDefinitionList } from '@/services/agent/AgentDefinitionController'
import { AgentApplication, getAgentApplicationList } from '@/services/agent/AgentApplicationController'
import { getWorkflowList } from '@/services/workflow/WorkflowController'
import { AgentProductProfile, AgentProductProfileVersion, copyAgentProductProfile, createAgentProductProfile, deleteAgentProductProfile, getAgentProductProfileVersions, getAgentProductProfiles, publishAgentProductProfile, setAgentProductProfileEnabled, updateAgentProductProfile } from '@/services/agent/AgentProductProfileController'

const targetTypes = ['AGENT', 'WORKFLOW']

export default function AgentProductProfilePage() {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values)
  const ref = useRef<any>()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<AgentProductProfile>()
  const [apps, setApps] = useState<AgentApplication[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [workflows, setWorkflows] = useState<any[]>([])
  const [versions, setVersions] = useState<AgentProductProfileVersion[]>([])
  const [versionOpen, setVersionOpen] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const formRef = useRef<any>()

  useEffect(() => {
    getAgentApplicationList({ current: 1, pageSize: 100 }).then(r => setApps((r.data || []).filter(a => a.status === 1)))
    getAgentDefinitionList({ current: 1, pageSize: 100 } as any).then(r => setAgents(r.data || []))
    getWorkflowList({ current: 1, pageSize: 100 }).then((r: any) => setWorkflows(r.data || []))
  }, [])

  const submit = async (value: any) => {
    const payload = { ...value, workflowId: value.productType === 'WORKFLOW' ? value.workflowId : undefined, agentDefinitionId: value.productType === 'AGENT' ? value.agentDefinitionId : undefined, allowedContextKeys: value.productType === 'AGENT' ? value.allowedContextKeys : undefined }
    const result = current ? await updateAgentProductProfile(current.id, payload) : await createAgentProductProfile(payload)
    if (result.code !== 200) return false
    message.success(current ? t('pages.agent.product.updated') : t('pages.agent.product.saved'))
    setOpen(false)
    ref.current?.reload()
    return true
  }
  const targetName = (record: AgentProductProfile) => record.productType === 'WORKFLOW' ? workflows.find(item => item.id === record.workflowId)?.name || '-' : agents.find(item => item.id === record.agentDefinitionId)?.name || '-'
  const formatSnapshot = (snapshot?: string) => { try { return JSON.stringify(JSON.parse(snapshot || '{}'), null, 2) } catch { return snapshot || '-' } }
  const showVersions = async (record: AgentProductProfile) => {
    const result = await getAgentProductProfileVersions(record.id)
    if (result.code === 200) { setVersions(result.data || []); setVersionOpen(true) }
  }
  const openCreate = () => {
    setCurrent(undefined)
    setShowContext(false)
    setOpen(true)
  }
  const openEdit = (record: AgentProductProfile) => {
    setCurrent(record)
    setShowContext(Boolean(record.allowedContextKeys))
    setOpen(true)
  }
  const setContextTemplate = () => {
    setShowContext(true)
    formRef.current?.setFieldsValue({ allowedContextKeys: JSON.stringify({ customerId: { type: 'string', immutable: true }, channel: { type: 'string' } }, null, 2) })
  }

  return <PageContainer header={{ title: t('pages.agent.product.title'), subTitle: t('pages.agent.product.subtitle') }}>
    <ProTable<AgentProductProfile>
      actionRef={ref}
      rowKey="id"
      request={async params => {
        const result = await getAgentProductProfiles({ current: params.current, pageSize: params.pageSize, applicationId: params.applicationId, name: params.name, productType: params.productType, status: params.status })
        return { data: result.data || [], total: result.total, success: result.code === 200 }
      }}
      toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('pages.agent.product.create')}</Button>]}
      columns={[
        { title: t('pages.common.name'), dataIndex: 'name' },
        { title: t('pages.agent.product.application'), dataIndex: 'applicationId', valueType: 'select', fieldProps: { options: apps.map(a => ({ label: a.name, value: a.id })) }, render: value => apps.find(a => a.id === value)?.name || value },
        { title: t('pages.common.code'), dataIndex: 'code', search: false },
        { title: t('pages.agent.product.type'), dataIndex: 'productType', valueType: 'select', fieldProps: { options: targetTypes.map(value => ({ value, label: t(value === 'WORKFLOW' ? 'pages.agent.product.workflow' : 'pages.agent.product.agent') })) }, render: value => t(value === 'WORKFLOW' ? 'pages.agent.product.workflow' : 'pages.agent.product.agent') },
        { title: t('pages.agent.product.target'), search: false, render: (_, record) => targetName(record) },
        { title: t('pages.agent.product.version'), dataIndex: 'versionNo', search: false, render: value => `v${value}` },
        { title: t('pages.common.status'), dataIndex: 'status', valueType: 'select', fieldProps: { options: [{ value: 0, label: t('pages.agent.product.draft') }, { value: 1, label: t('pages.common.enabled') }, { value: 2, label: t('pages.agent.product.stopped') }] }, render: (_, record) => record.status === 0 ? <Tag>{t('pages.agent.product.draft')}</Tag> : <Switch checked={record.status === 1} checkedChildren={t('pages.common.enabled')} unCheckedChildren={t('pages.agent.product.stopped')} onChange={async enabled => { const result = await setAgentProductProfileEnabled(record.id, enabled); if (result.code === 200) { message.success(enabled ? t('pages.agent.product.started') : t('pages.agent.product.stoppedSuccess')); ref.current?.reload() } }} /> },
        { title: t('pages.common.option'), search: false, valueType: 'option', render: (_, record) => [
          record.status === 0 && <a key="edit" onClick={() => openEdit(record)}>{t('pages.common.edit')}</a>,
          record.status === 0 && <Popconfirm key="publish" title={t('pages.agent.product.publishConfirm')} description={t('pages.agent.product.publishTip')} onConfirm={async () => { const result = await publishAgentProductProfile(record.id); if (result.code === 200) { message.success(t('pages.agent.product.published', { version: result.data?.versionNo || record.versionNo })); ref.current?.reload() } }}><a>{t('pages.agent.product.publish')}</a></Popconfirm>,
          record.status === 1 && <a key="copy" onClick={async () => { const result = await copyAgentProductProfile(record.id); if (result.code === 200) { message.success(t('pages.agent.product.draftCreated')); ref.current?.reload() } }}>{t('pages.agent.product.copy')}</a>,
          record.status === 1 && <a key="versions" onClick={() => showVersions(record)}>{t('pages.agent.product.versions')}</a>,
          record.status !== 1 && <Popconfirm key="delete" title={t('pages.agent.product.deleteConfirm')} onConfirm={async () => { const result = await deleteAgentProductProfile(record.id); if (result.code === 200) ref.current?.reload() }}><a>{t('pages.common.delete')}</a></Popconfirm>,
        ] },
      ]}
    />
    <DrawerForm formRef={formRef} open={open} onOpenChange={setOpen} title={current ? t('pages.agent.product.edit') : t('pages.agent.product.create')} initialValues={current || { productType: 'AGENT', apiProtocolVersion: 'conversation-api-v1' }} onFinish={submit}>
      <Alert type="info" showIcon message={t('pages.agent.product.formTip')} />
      <ProFormText name="name" label={t('pages.agent.product.name')} extra={t('pages.agent.product.nameTip')} rules={[{ required: true }]} />
      <ProFormSelect name="applicationId" label={t('pages.agent.product.application')} options={apps.map(a => ({ label: a.name, value: a.id }))} rules={[{ required: true }]} />
      <ProFormRadio.Group name="productType" label={t('pages.agent.product.type')} options={targetTypes.map(value => ({ value, label: t(value === 'AGENT' ? 'pages.agent.product.agent' : 'pages.agent.product.workflow') }))} rules={[{ required: true }]} />
      <ProFormDependency name={['productType', 'applicationId']}>
        {({ productType, applicationId }) => productType === 'AGENT' ? <ProFormSelect name="agentDefinitionId" label={t('pages.agent.product.chooseAgent')} options={agents.filter(item => item.applicationId === applicationId && item.status === 1).map(item => ({ label: item.name, value: item.id }))} rules={[{ required: true }]} /> : productType === 'WORKFLOW' ? <ProFormSelect name="workflowId" label={t('pages.agent.product.chooseWorkflow')} options={workflows.filter(item => item.applicationId === applicationId && item.status === 1).map(item => ({ label: item.name, value: item.id }))} rules={[{ required: true }]} /> : null}
      </ProFormDependency>
      <ProFormDependency name={['productType']}>
        {({ productType }) => productType === 'AGENT' ? <>
          <ProFormText name="apiProtocolVersion" label={t('pages.agent.product.protocol')} initialValue="conversation-api-v1" disabled />
          {!showContext ? <Button type="link" onClick={setContextTemplate}>{t('pages.agent.product.addContext')}</Button> : <>
            <ProFormTextArea name="allowedContextKeys" label={t('pages.agent.product.contextKeys')} extra={t('pages.agent.product.contextKeysTip')} placeholder={'{"customerId":{"type":"string","immutable":true},"channel":{"type":"string"}}'} fieldProps={{ autoSize: { minRows: 3, maxRows: 8 } }} rules={[{ validator: async (_rule: any, value: string | undefined) => { if (!value?.trim()) return; try { const parsed = JSON.parse(value); if (!Array.isArray(parsed) && (typeof parsed !== 'object' || parsed === null)) throw new Error(); } catch { throw new Error(t('pages.agent.product.contextKeysInvalid')) } } }]} />
            <Button type="link" onClick={() => { formRef.current?.setFieldsValue({ allowedContextKeys: undefined }); setShowContext(false) }}>{t('pages.agent.product.removeContext')}</Button>
          </>}
        </> : null}
      </ProFormDependency>
    </DrawerForm>
    <Modal open={versionOpen} onCancel={() => setVersionOpen(false)} footer={null} title={t('pages.agent.product.versions')} width={900}>
      <Table rowKey="id" pagination={false} dataSource={versions} expandable={{ expandedRowRender: record => <JsonDisplay content={record.snapshot} />, rowExpandable: () => true }} columns={[{ title: t('pages.agent.product.version'), dataIndex: 'versionNo', render: value => `v${value}` }, { title: t('pages.agent.product.publishedAt'), dataIndex: 'publishedAt', render: value => value ? new Date(value).toLocaleString() : '-' }, { title: t('pages.agent.product.publishedBy'), dataIndex: 'publishedBy', render: value => value || '-' }, { title: t('pages.agent.product.snapshot'), dataIndex: 'snapshot', render: value => <Typography.Text type="secondary">{formatSnapshot(value).replace(/\s+/g, ' ').slice(0, 100)}</Typography.Text> }]} />
    </Modal>
  </PageContainer>
}
