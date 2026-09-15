import React, { useEffect, useRef, useState } from 'react'
import { useIntl } from '@umijs/max'
import {
  PageContainer,
  ProFormDependency,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components'
import { Alert, Button, Popconfirm, Space, Switch, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DrawerForm from '@/components/DrawerForm'
import {
  AgentWorkflowCapability,
  AgentWorkflowCapabilityRequest,
  createAgentWorkflowCapability,
  deleteAgentWorkflowCapability,
  getAgentWorkflowCapabilities,
  setAgentWorkflowCapabilityEnabled,
  updateAgentWorkflowCapability,
} from '@/services/agent/AgentWorkflowCapabilityController'
import { AgentApplication, getAgentApplicationList } from '@/services/agent/AgentApplicationController'
import {
  AgentWorkflow,
  getWorkflowList,
  getWorkflowVersions,
  WorkflowVersion,
} from '@/services/workflow/workflow/WorkflowController'
import { StructuredArrayField, StructuredObjectField, StructuredSchemaField, arrayToRows, objectToRows, schemaToRows, rowsToObject, rowsToSchema } from './StructuredJsonFields'

const actions = ['START', 'OBSERVE', 'STOP', 'PROVIDE_AGENT_INPUT', 'RESOLVE_MCP_APPROVAL', 'SIGNAL_EVENT', 'RETRY_NODE']
const risks = ['LOW', 'MEDIUM', 'HIGH']

const parseArray = (value?: string | string[]) => {
  if (Array.isArray(value)) return value
  if (!value?.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const toFormValues = (record?: AgentWorkflowCapability) => {
  if (!record) {
    return { enabled: true, allowedActions: ['START', 'OBSERVE'], riskLevel: 'LOW', agentWritableVariables: [], allowedEventTypes: [], policyJson: [], inputSchema: [], outputSchema: [] }
  }
  return {
    ...record,
    allowedActions: parseArray(record.allowedActions),
    agentWritableVariables: arrayToRows(record.agentWritableVariables),
    allowedEventTypes: arrayToRows(record.allowedEventTypes),
    policyJson: objectToRows(record.policyJson),
    inputSchema: schemaToRows(record.inputSchema),
    outputSchema: schemaToRows(record.outputSchema),
  }
}

const serializeArray = (value: unknown, fallback: string[] = []) => {
  if (Array.isArray(value)) return JSON.stringify(value)
  if (typeof value === 'string' && value.trim()) {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error('array')
    return JSON.stringify(parsed)
  }
  return JSON.stringify(fallback)
}

export default function AgentWorkflowCapabilityPage() {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values)
  const tableRef = useRef<any>()
  const formRef = useRef<any>()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<AgentWorkflowCapability>()
  const [applications, setApplications] = useState<AgentApplication[]>([])
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([])
  const [versions, setVersions] = useState<WorkflowVersion[]>([])

  useEffect(() => {
    Promise.all([
      getAgentApplicationList({ current: 1, pageSize: 100 }),
      getWorkflowList({ current: 1, pageSize: 100 }),
    ]).then(([applicationResult, workflowResult]) => {
      setApplications((applicationResult.data || []).filter(item => item.status === 1))
      setWorkflows((workflowResult.data || []).filter(item => item.status === 1 && item.publishedVersion))
    })
  }, [])

  const loadVersions = async (workflowId?: string) => {
    if (!workflowId) {
      setVersions([])
      return [] as WorkflowVersion[]
    }
    const result = await getWorkflowVersions(workflowId)
    const next = result.code === 200 ? result.data || [] : []
    setVersions(next)
    return next
  }

  const applyWorkflowSchemas = (versionId?: string, sourceVersions = versions, workflowId?: string) => {
    if (!versionId) return
    const version = sourceVersions.find(item => item.id === versionId)
    if (!version) return
    const workflow = workflows.find(item => item.id === workflowId)
    formRef.current?.setFieldsValue?.({
      inputSchema: schemaToRows(version.inputSchema || workflow?.publishedInputSchema || workflow?.inputSchema),
      outputSchema: schemaToRows(version.outputSchema || workflow?.publishedOutputSchema || workflow?.outputSchema),
    })
  }

  const openEditor = (record?: AgentWorkflowCapability) => {
    setCurrent(record)
    setVersions([])
    setOpen(true)
    if (record?.workflowId) loadVersions(record.workflowId)
  }

  useEffect(() => {
    if (!open) return
    // ProDrawerForm keeps the form instance alive between openings. Explicitly
    // reset and hydrate it so a new record never inherits the previous draft.
    formRef.current?.resetFields?.()
    formRef.current?.setFieldsValue?.(toFormValues(current))
  }, [open, current])

  const submit = async (value: any) => {
    let payload: AgentWorkflowCapabilityRequest
    try {
      payload = {
        ...value,
        enabled: Boolean(value.enabled),
        status: value.enabled ? 1 : 0,
        allowedActions: serializeArray(value.allowedActions, ['START', 'OBSERVE']),
        agentWritableVariables: serializeArray(value.agentWritableVariables),
        allowedEventTypes: serializeArray(value.allowedEventTypes),
        policyJson: value.policyJson?.length ? JSON.stringify(rowsToObject(value.policyJson)) : undefined,
        inputSchema: value.inputSchema?.length ? JSON.stringify(rowsToSchema(value.inputSchema)) : undefined,
        outputSchema: value.outputSchema?.length ? JSON.stringify(rowsToSchema(value.outputSchema)) : undefined,
      }
    } catch {
      message.error(t('pages.agent.workflowCapability.invalidJson'))
      return false
    }
    const result = current
      ? await updateAgentWorkflowCapability(current.id, payload)
      : await createAgentWorkflowCapability(payload)
    if (result.code !== 200) return false
    message.success(t(current ? 'pages.agent.workflowCapability.updated' : 'pages.agent.workflowCapability.created'))
    setOpen(false)
    tableRef.current?.reload()
    return true
  }

  const workflowName = (id?: string) => workflows.find(item => item.id === id)?.name || id || '-'
  const applicationName = (id?: string) => applications.find(item => item.id === id)?.name || id || '-'
  const versionLabel = (record: AgentWorkflowCapability) => {
    const workflow = workflows.find(item => item.id === record.workflowId)
    return workflow?.publishedVersion ? `v${workflow.publishedVersion}` : record.workflowVersionId
  }

  return (
    <PageContainer
      header={{
        title: t('pages.agent.workflowCapability.title'),
        subTitle: t('pages.agent.workflowCapability.subtitle'),
      }}
    >
      <ProTable<AgentWorkflowCapability>
        actionRef={tableRef}
        rowKey="id"
        request={async params => {
          const result = await getAgentWorkflowCapabilities({
            applicationId: params.applicationId,
            workflowId: params.workflowId,
          })
          return {
            data: result.data || [],
            total: (result.data || []).length,
            success: result.code === 200,
          }
        }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
            {t('pages.agent.workflowCapability.create')}
          </Button>,
        ]}
        columns={[
          { title: t('pages.agent.workflowCapability.name'), dataIndex: 'displayName' },
          { title: t('pages.common.code'), dataIndex: 'capabilityCode' },
          {
            title: t('pages.agent.workflowCapability.application'),
            dataIndex: 'applicationId',
            valueType: 'select',
            fieldProps: { options: applications.map(item => ({ label: item.name, value: item.id })) },
            render: value => applicationName(value as string),
          },
          {
            title: t('pages.agent.workflowCapability.workflow'),
            dataIndex: 'workflowId',
            valueType: 'select',
            fieldProps: { options: workflows.map(item => ({ label: item.name, value: item.id })) },
            render: (_, record) => <span>{workflowName(record.workflowId)} ({versionLabel(record)})</span>,
          },
          {
            title: t('pages.agent.workflowCapability.actions'),
            search: false,
            render: (_, record) => parseArray(record.allowedActions).map(action => <Tag key={action}>{t(`pages.agent.workflowCapability.action.${action}`)}</Tag>),
          },
          {
            title: t('pages.agent.workflowCapability.riskLevel'),
            dataIndex: 'riskLevel',
            valueType: 'select',
            fieldProps: { options: risks.map(value => ({ value, label: t(`pages.agent.workflowCapability.risk.${value}`) })) },
            render: (_, record) => {
              const risk = String(record.riskLevel || 'MEDIUM').toUpperCase()
              return <Tag color={risk === 'HIGH' ? 'red' : risk === 'MEDIUM' ? 'orange' : 'green'}>{t(`pages.agent.workflowCapability.risk.${risk}`)}</Tag>
            },
          },
          {
            title: t('pages.common.status'),
            dataIndex: 'enabled',
            valueType: 'select',
            fieldProps: { options: [{ value: true, label: t('pages.common.enabled') }, { value: false, label: t('pages.common.disabled') }] },
            render: (_, record) => <Switch checked={Boolean(record.enabled)} checkedChildren={t('pages.common.enabled')} unCheckedChildren={t('pages.common.disabled')} onChange={async enabled => {
              const result = await setAgentWorkflowCapabilityEnabled(record.id, enabled)
              if (result.code === 200) {
                message.success(t(enabled ? 'pages.agent.workflowCapability.enabled' : 'pages.agent.workflowCapability.disabled'))
                tableRef.current?.reload()
              }
            }} />,
          },
          {
            title: t('pages.common.option'),
            search: false,
            valueType: 'option',
            render: (_, record) => (
              <Space size={4}>
                <Button type="link" size="small" onClick={() => openEditor(record)}>{t('pages.common.edit')}</Button>
                <Popconfirm title={t('pages.agent.workflowCapability.deleteConfirm')} onConfirm={async () => {
                  const result = await deleteAgentWorkflowCapability(record.id)
                  if (result.code === 200) {
                    message.success(t('pages.agent.workflowCapability.deleted'))
                    tableRef.current?.reload()
                  }
                }}>
                  <Button type="link" size="small" danger>{t('pages.common.delete')}</Button>
                </Popconfirm>
                <Popconfirm title={t('pages.agent.workflowCapability.disableConfirm')} onConfirm={async () => {
                  const result = await setAgentWorkflowCapabilityEnabled(record.id, !record.enabled)
                  if (result.code === 200) tableRef.current?.reload()
                }}>
                  <Button type="link" size="small">{t(record.enabled ? 'pages.agent.workflowCapability.disable' : 'pages.agent.workflowCapability.enable')}</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <DrawerForm
        formRef={formRef}
        open={open}
        onOpenChange={setOpen}
        title={t(current ? 'pages.agent.workflowCapability.edit' : 'pages.agent.workflowCapability.create')}
        initialValues={toFormValues(current)}
        onFinish={submit}
        drawerProps={{ width: 680 }}
      >
        <Alert type="info" showIcon message={t('pages.agent.workflowCapability.formTip')} />
        <ProFormSelect name="applicationId" label={t('pages.agent.workflowCapability.application')} options={applications.map(item => ({ label: item.name, value: item.id }))} rules={[{ required: true }]} fieldProps={{ disabled: Boolean(current) }} />
        <ProFormDependency name={['applicationId']}>
          {({ applicationId }) => <ProFormSelect name="workflowId" label={t('pages.agent.workflowCapability.workflow')} options={workflows.filter(item => item.applicationId === applicationId).map(item => ({ label: item.name, value: item.id }))} rules={[{ required: true }]} fieldProps={{ onChange: async (value: string) => { formRef.current?.setFieldsValue?.({ workflowVersionId: undefined }); await loadVersions(value) } }} />}
        </ProFormDependency>
        <ProFormDependency name={['workflowId']}>
          {({ workflowId }) => {
            const workflow = workflows.find(item => item.id === workflowId)
            const published = versions.filter(item => !workflow?.publishedVersion || item.versionNo === workflow.publishedVersion)
            return <ProFormSelect name="workflowVersionId" label={t('pages.agent.workflowCapability.version')} options={published.map(item => ({ label: `v${item.versionNo}`, value: item.id }))} rules={[{ required: true }]} fieldProps={{ onChange: (value: string) => applyWorkflowSchemas(value, versions, workflowId) }} />
          }}
        </ProFormDependency>
        <ProFormText name="capabilityCode" label={t('pages.agent.workflowCapability.code')} rules={[{ required: true }, { pattern: /^[A-Za-z][A-Za-z0-9_-]{2,54}$/, message: t('pages.agent.workflowCapability.codeInvalid') }]} fieldProps={{ disabled: Boolean(current) }} />
        <ProFormText name="displayName" label={t('pages.agent.workflowCapability.name')} rules={[{ required: true }]} />
        <ProFormTextArea name="description" label={t('pages.common.description')} />
        <ProFormSelect name="allowedActions" label={t('pages.agent.workflowCapability.actions')} mode="multiple" options={actions.map(value => ({ value, label: t(`pages.agent.workflowCapability.action.${value}`) }))} rules={[{ required: true, type: 'array', min: 1 }]} />
        <ProFormRadio.Group name="riskLevel" label={t('pages.agent.workflowCapability.riskLevel')} options={risks.map(value => ({ value, label: t(`pages.agent.workflowCapability.risk.${value}`) }))} />
        <StructuredArrayField name="agentWritableVariables" label={t('pages.agent.workflowCapability.agentWritableVariables')} hint={t('pages.agent.workflowCapability.structuredHint')} structuredLabel={t('pages.agent.workflowCapability.structuredMode')} previewLabel={t('pages.agent.workflowCapability.previewMode')} />
        <StructuredArrayField name="allowedEventTypes" label={t('pages.agent.workflowCapability.allowedEventTypes')} hint={t('pages.agent.workflowCapability.structuredHint')} structuredLabel={t('pages.agent.workflowCapability.structuredMode')} previewLabel={t('pages.agent.workflowCapability.previewMode')} />
        <StructuredObjectField name="policyJson" label={t('pages.agent.workflowCapability.policyJson')} hint={t('pages.agent.workflowCapability.structuredHint')} structuredLabel={t('pages.agent.workflowCapability.structuredMode')} previewLabel={t('pages.agent.workflowCapability.previewMode')} />
        <StructuredSchemaField name="inputSchema" label={t('pages.agent.workflowCapability.inputSchema')} hint={t('pages.agent.workflowCapability.inheritedSchema')} structuredLabel={t('pages.agent.workflowCapability.structuredMode')} previewLabel={t('pages.agent.workflowCapability.previewMode')} />
        <StructuredSchemaField name="outputSchema" label={t('pages.agent.workflowCapability.outputSchema')} hint={t('pages.agent.workflowCapability.inheritedSchema')} structuredLabel={t('pages.agent.workflowCapability.structuredMode')} previewLabel={t('pages.agent.workflowCapability.previewMode')} />
        <ProFormRadio.Group name="enabled" label={t('pages.common.status')} options={[{ value: true, label: t('pages.common.enabled') }, { value: false, label: t('pages.common.disabled') }]} />
      </DrawerForm>
    </PageContainer>
  )
}
