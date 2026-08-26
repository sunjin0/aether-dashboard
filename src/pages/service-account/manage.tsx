import React, { useEffect, useRef, useState } from 'react'
import {
  ActionType,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components'
import { history, useIntl } from '@umijs/max'
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from 'antd'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons'
import { useAccess } from '@@/exports'
import TableActionMenu from '@/components/TableActionMenu'
import DrawerForm from '@/components/DrawerForm'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import { getAgentApplicationList } from '@/services/agent/AgentApplicationController'
import { getWorkflowList, startExternalBusinessWorkflow } from '@/services/workflow/WorkflowController'
import {
  ServiceAccount,
  ServiceAccountCreate,
  ServiceAccountSecret,
  ServiceAccountUpdate,
  createServiceAccount,
  deleteServiceAccount,
  getServiceAccountList,
  issueServiceAccountToken,
  rotateServiceAccountSecret,
  setServiceAccountEnabled,
  updateServiceAccount,
} from '@/services/sys/ServiceAccountController'

const CREATE_ID = '__new_service_account__'

const ServiceAccountPage: React.FC = () => {
  const intl = useIntl()
  const access = useAccess()
  const actionRef = useRef<ActionType>()
  const [form] = Form.useForm<ServiceAccountCreate>()
  const [editForm] = Form.useForm<ServiceAccountUpdate>()
  const [testForm] = Form.useForm()
  const [createOpen, setCreateOpen] = useState(false)
  const [secret, setSecret] = useState<ServiceAccountSecret>()
  const [editAccount, setEditAccount] = useState<ServiceAccount>()
  const [testAccount, setTestAccount] = useState<ServiceAccount>()
  const [agentOptions, setAgentOptions] = useState<any[]>([])
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([])
  const [applicationOptions, setApplicationOptions] = useState<any[]>([])
  const [applicationFilter, setApplicationFilter] = useState<string>()
  const write = Boolean(access[history.location.pathname])
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values)

  useEffect(() => {
    getAgentDefinitionOptions(1).then(setAgentOptions)
    getAgentApplicationList({ current: 1, pageSize: 100 }).then((result) => setApplicationOptions((result.data || []).filter((item) => item.status === 1).map((item) => ({ label: item.name, value: item.id }))))
    getWorkflowList({ current: 1, pageSize: 100 }).then((result: any) => {
      setWorkflowOptions(
        (result.data || []).map((item: any) => ({ label: item.name, value: item.id })),
      )
    })
  }, [])

  const renderAccountFields = () => (
    <>
      <ProFormSelect name="applicationId" label="业务应用空间" options={applicationOptions} rules={[{ required: true }]} />
      <ProFormText
        name="name"
        label={t('pages.serviceAccount.name')}
        rules={[{ required: true, max: 128 }]}
      />
      <ProFormTextArea
        name="description"
        label={t('pages.serviceAccount.description')}
        fieldProps={{ rows: 3, maxLength: 1024 }}
      />
      <ProFormText
        name="clientId"
        label={t('pages.serviceAccount.clientId')}
        extra={t('pages.serviceAccount.clientIdTip')}
        rules={[
          {
            pattern: /^[A-Za-z][A-Za-z0-9_-]{2,63}$/,
            message: t('pages.serviceAccount.clientIdInvalid'),
          },
        ]}
        fieldProps={{ disabled: Boolean(editAccount) }}
      />
      <ProFormSelect
        name="allowedAgentIds"
        label={t('pages.serviceAccount.allowedAgents')}
        extra={t('pages.serviceAccount.allowedAgentsTip')}
        options={agentOptions}
        fieldProps={{ mode: 'multiple' }}
      />
      <ProFormSelect
        name="allowedWorkflowIds"
        label={t('pages.serviceAccount.allowedWorkflows')}
        extra={t('pages.serviceAccount.allowedWorkflowsTip')}
        options={workflowOptions}
        fieldProps={{ mode: 'multiple' }}
      />
      <ProFormDigit
        name="maxAgentCallsPerHour"
        label={t('pages.serviceAccount.maxAgentCalls')}
        extra={t('pages.serviceAccount.maxAgentCallsTip')}
        min={0}
        max={100000}
        fieldProps={{ precision: 0, style: { width: '100%' } }}
      />
      <ProFormDigit
        name="maxStartsPerHour"
        label={t('pages.serviceAccount.maxStarts')}
        extra={t('pages.serviceAccount.maxStartsTip')}
        min={0}
        max={100000}
        fieldProps={{ precision: 0, style: { width: '100%' } }}
      />
    </>
  )

  const submit = async (values: ServiceAccountCreate) => {
    const result = await createServiceAccount({
      ...values,
      clientId: values.clientId?.trim() || undefined,
      allowedAgentIds: values.allowedAgentIds || [],
      allowedWorkflowIds: values.allowedWorkflowIds || [],
      maxAgentCallsPerHour: values.maxAgentCallsPerHour || 0,
      maxStartsPerHour: values.maxStartsPerHour || 0,
    })
    if (result.code !== 200) return false
    setSecret(result.data)
    actionRef.current?.reload()
    return true
  }

  const formatTime = (value?: unknown) => {
    if (value === null || value === undefined || value === '') return '-'
    const numeric =
      typeof value === 'number' || /^\d+$/.test(String(value))
        ? Number(value)
        : Date.parse(String(value))
    if (!Number.isFinite(numeric)) return '-'
    const date = new Date(numeric)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
  }

  const copySecret = async (value?: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    message.success(t('pages.serviceAccount.copied'))
  }

  const runTest = async () => {
    const values = await testForm.validateFields()
    let variables: Record<string, unknown>
    try {
      variables = values.variables ? JSON.parse(values.variables) : {}
    } catch {
      return message.error(t('pages.serviceAccount.variablesInvalid'))
    }
    if (!variables || Array.isArray(variables) || typeof variables !== 'object')
      return message.error(t('pages.serviceAccount.variablesInvalid'))
    const tokenResult = await issueServiceAccountToken(testAccount!.clientId, values.clientSecret)
    if (tokenResult.code !== 200 || !tokenResult.data?.accessToken)
      return
    const result = await startExternalBusinessWorkflow(
      values.workflowId,
      {
        businessType: values.businessType,
        businessId: values.businessId,
        idempotencyKey: values.idempotencyKey,
        variables,
      },
      { Authorization: `Bearer ${tokenResult.data.accessToken}` },
    )
    if (result.code !== 200) return
    setTestAccount(undefined)
    testForm.resetFields()
    actionRef.current?.reload()
  }

  const submitEdit = async (values: ServiceAccountUpdate) => {
    const result = await updateServiceAccount(editAccount!.id, {
      ...values,
      allowedAgentIds: values.allowedAgentIds || [],
      allowedWorkflowIds: values.allowedWorkflowIds || [],
      maxAgentCallsPerHour: values.maxAgentCallsPerHour || 0,
      maxStartsPerHour: values.maxStartsPerHour || 0,
    })
    if (result.code !== 200) return false
    actionRef.current?.reload()
    return true
  }

  const columns: any[] = [
    { title: t('pages.serviceAccount.name'), dataIndex: 'name', width: 180 },
    {
      title: t('pages.serviceAccount.clientId'),
      dataIndex: 'clientId',
      width: 180,
      copyable: true,
    },
    {
      title: t('pages.serviceAccount.description'),
      dataIndex: 'description',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('pages.serviceAccount.allowedWorkflows'),
      dataIndex: 'allowedWorkflowIds',
      hideInSearch: true,
      render: (ids: string[]) =>
        !ids?.length ? (
          <Tag>{t('pages.serviceAccount.allWorkflows')}</Tag>
        ) : (
          <Tag>{t('pages.serviceAccount.workflowCount', { count: ids.length })}</Tag>
        ),
    },
    {
      title: t('pages.serviceAccount.allowedAgents'),
      dataIndex: 'allowedAgentIds',
      hideInSearch: true,
      render: (ids: string[]) =>
        !ids?.length ? (
          <Tag>{t('pages.serviceAccount.noAgents')}</Tag>
        ) : (
          <Tag>{t('pages.serviceAccount.agentCount', { count: ids.length })}</Tag>
        ),
    },
    {
      title: t('pages.serviceAccount.maxAgentCalls'),
      dataIndex: 'maxAgentCallsPerHour',
      width: 130,
      hideInSearch: true,
      render: (value: number) => value || t('pages.serviceAccount.unlimited'),
    },
    {
      title: t('pages.serviceAccount.maxStarts'),
      dataIndex: 'maxStartsPerHour',
      width: 130,
      hideInSearch: true,
      render: (value: number) => value || t('pages.serviceAccount.unlimited'),
    },
    {
      title: t('pages.serviceAccount.enabled'),
      dataIndex: 'enabled',
      width: 100,
      hideInSearch: true,
      render: (_: unknown, record: ServiceAccount) => (
        <Switch
          checked={Boolean(record.enabled)}
          disabled={!write}
          onChange={async (enabled) => {
            const result = await setServiceAccountEnabled(record.id, enabled)
            if (result.code === 200) {
              actionRef.current?.reload()
            }
          }}
        />
      ),
    },
    {
      title: t('pages.serviceAccount.lastUsedAt'),
      dataIndex: 'lastUsedAt',
      width: 180,
      hideInSearch: true,
      render: formatTime,
    },
    {
      title: t('pages.common.option'),
      width: 250,
      fixed: 'right',
      valueType: 'option',
      render: (_: unknown, record: ServiceAccount) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'edit',
                label: t('pages.common.edit'),
                primary: true,
                onClick: () => {
                  setEditAccount(record)
                },
              },
              {
                key: 'test',
                label: t('pages.serviceAccount.testCall'),
                onClick: () => {
                  setTestAccount(record)
                  testForm.setFieldsValue({
                    workflowId:
                      record.allowedWorkflowIds?.length === 1
                        ? record.allowedWorkflowIds[0]
                        : undefined,
                    businessType: 'TEST',
                    businessId: `test-${Date.now()}`,
                    idempotencyKey: `service-account-test-${record.id}-${Date.now()}`,
                    variables: '{\n  "message": "service account test"\n}',
                  })
                },
              },
              {
                key: 'rotate',
                label: t('pages.serviceAccount.rotateSecret'),
                primary: true,
                confirm: { title: t('pages.serviceAccount.rotateConfirm') },
                onClick: async () => {
                  const result = await rotateServiceAccountSecret(record.id)
                  if (result.code === 200) {
                    setSecret(result.data)
                    actionRef.current?.reload()
                  }
                },
              },
              {
                key: 'delete',
                label: t('pages.common.delete'),
                danger: true,
                confirm: { title: t('pages.serviceAccount.deleteConfirm') },
                onClick: async () => {
                  const result = await deleteServiceAccount(record.id)
                  if (result.code === 200) {
                    actionRef.current?.reload()
                  }
                },
              },
            ]}
          />
        ),
    },
  ]

  return (
    <PageContainer>
      <ProTable<ServiceAccount>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        columns={columns}
        request={async (params) => getServiceAccountList({ ...params, applicationId: applicationFilter })}
        toolBarRender={() => [
          <Select key="application" allowClear value={applicationFilter} placeholder="筛选业务应用空间" options={applicationOptions} style={{ width: 220 }} onChange={(value) => { setApplicationFilter(value); actionRef.current?.reload() }} />,
          ...(write
            ? [
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields()
                  form.setFieldsValue({
                    allowedAgentIds: [],
                    allowedWorkflowIds: [],
                    maxAgentCallsPerHour: 0,
                    maxStartsPerHour: 0,
                  })
                  setCreateOpen(true)
                }}
              >
                {t('pages.serviceAccount.create')}
              </Button>,
            ] : []),
        ]}
      />
      <DrawerForm
        id={createOpen ? CREATE_ID : ''}
        open={createOpen}
        setOpen={setCreateOpen}
        form={form}
        request={async () => ({
          code: 200,
          success: true,
          data: {
            allowedAgentIds: [],
            allowedWorkflowIds: [],
            maxAgentCallsPerHour: 0,
            maxStartsPerHour: 0,
          },
        })}
        onSuccess={submit}
        drawerProps={{ title: t('pages.serviceAccount.create'), width: 560 }}
      >
        {renderAccountFields()}
      </DrawerForm>
      <DrawerForm
        id={editAccount?.id || ''}
        open={Boolean(editAccount)}
        setOpen={(open) => {
          if (!open) setEditAccount(undefined)
        }}
        form={editForm}
        request={async () => ({
          code: 200,
          success: true,
          data: {
            name: editAccount?.name,
            description: editAccount?.description,
            allowedAgentIds: editAccount?.allowedAgentIds || [],
            allowedWorkflowIds: editAccount?.allowedWorkflowIds || [],
            maxAgentCallsPerHour: editAccount?.maxAgentCallsPerHour || 0,
            maxStartsPerHour: editAccount?.maxStartsPerHour || 0,
          },
        })}
        onSuccess={submitEdit}
        drawerProps={{ title: t('pages.common.edit'), width: 560 }}
      >
        {renderAccountFields()}
      </DrawerForm>
      <Modal
        title={t('pages.serviceAccount.secretTitle')}
        open={Boolean(secret)}
        footer={
          <Button type="primary" onClick={() => setSecret(undefined)}>
            {t('pages.common.confirm')}
          </Button>
        }
        closable={false}
      >
        <Alert
          type="warning"
          showIcon
          message={t('pages.serviceAccount.secretWarning')}
          style={{ marginBottom: 16 }}
        />
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('pages.serviceAccount.clientId')}>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={secret?.clientId} readOnly />
              <Button icon={<CopyOutlined />} onClick={() => copySecret(secret?.clientId)}>
                {t('pages.serviceAccount.copy')}
              </Button>
            </Space.Compact>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.serviceAccount.clientSecret')}>
            <Space.Compact style={{ width: '100%' }}>
              <Input.Password value={secret?.clientSecret} readOnly visibilityToggle />
              <Button icon={<CopyOutlined />} onClick={() => copySecret(secret?.clientSecret)}>
                {t('pages.serviceAccount.copy')}
              </Button>
            </Space.Compact>
          </Descriptions.Item>
        </Descriptions>
      </Modal>
      <Modal
        title={t('pages.serviceAccount.testCall')}
        open={Boolean(testAccount)}
        onCancel={() => {
          testForm.resetFields()
          setTestAccount(undefined)
        }}
        afterClose={() => testForm.resetFields()}
        onOk={runTest}
        okText={t('pages.serviceAccount.runTest')}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message={t('pages.serviceAccount.testCallTip')}
          style={{ marginBottom: 16 }}
        />
        <Form form={testForm} layout="vertical" preserve={false}>
          <Form.Item
            name="clientSecret"
            label={t('pages.serviceAccount.clientSecret')}
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="workflowId"
            label={t('pages.serviceAccount.workflow')}
            rules={[{ required: true }]}
          >
            <Select
              options={workflowOptions.filter(
                (item) =>
                  !testAccount?.allowedWorkflowIds?.length ||
                  testAccount.allowedWorkflowIds.includes(item.value),
              )}
            />
          </Form.Item>
          <Form.Item
            name="businessType"
            label={t('pages.serviceAccount.businessType')}
            rules={[{ required: true }]}
          >
            <Input placeholder="ORDER" />
          </Form.Item>
          <Form.Item
            name="businessId"
            label={t('pages.serviceAccount.businessId')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="idempotencyKey"
            label={t('pages.serviceAccount.idempotencyKey')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="variables" label={t('pages.serviceAccount.variables')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default ServiceAccountPage
