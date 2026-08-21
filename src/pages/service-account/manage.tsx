import React, { useEffect, useRef, useState } from 'react'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
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
import { BarChartOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons'
import { useAccess } from '@@/exports'
import TableActionMenu from '@/components/TableActionMenu'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
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
  const write = Boolean(access[history.location.pathname])
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values)

  useEffect(() => {
    getAgentDefinitionOptions(1).then(setAgentOptions)
    getWorkflowList({ current: 1, pageSize: 100 }).then((result: any) => {
      setWorkflowOptions(
        (result.data || []).map((item: any) => ({ label: item.name, value: item.id })),
      )
    })
  }, [])

  const submit = async () => {
    const values = await form.validateFields()
    const result = await createServiceAccount({
      ...values,
      clientId: values.clientId?.trim() || undefined,
      allowedAgentIds: values.allowedAgentIds || [],
      allowedWorkflowIds: values.allowedWorkflowIds || [],
      maxAgentCallsPerHour: values.maxAgentCallsPerHour || 0,
      maxStartsPerHour: values.maxStartsPerHour || 0,
    })
    if (result.code !== 200) return
    setCreateOpen(false)
    form.resetFields()
    setSecret(result.data)
    actionRef.current?.reload()
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

  const submitEdit = async () => {
    const values = await editForm.validateFields()
    const result = await updateServiceAccount(editAccount!.id, {
      ...values,
      allowedAgentIds: values.allowedAgentIds || [],
      allowedWorkflowIds: values.allowedWorkflowIds || [],
      maxAgentCallsPerHour: values.maxAgentCallsPerHour || 0,
      maxStartsPerHour: values.maxStartsPerHour || 0,
    })
    if (result.code !== 200) return
    setEditAccount(undefined)
    actionRef.current?.reload()
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
                  editForm.setFieldsValue({
                    name: record.name,
                    description: record.description,
                    allowedAgentIds: record.allowedAgentIds,
                    allowedWorkflowIds: record.allowedWorkflowIds,
                    maxAgentCallsPerHour: record.maxAgentCallsPerHour,
                    maxStartsPerHour: record.maxStartsPerHour,
                  })
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
        request={async (params) => getServiceAccountList(params)}
        toolBarRender={() =>
          write
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
              <Button
                key="monitor"
                icon={<BarChartOutlined />}
                onClick={() => history.push('/service-account/monitor')}
              >
                {t('pages.serviceAccount.monitor')}
              </Button>,
            ]
            : []
        }
      />
      <Modal
        title={t('pages.serviceAccount.create')}
        open={createOpen}
        onCancel={() => {
          form.resetFields()
          setCreateOpen(false)
        }}
        afterClose={() => form.resetFields()}
        onOk={submit}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="name"
            label={t('pages.serviceAccount.name')}
            rules={[{ required: true, max: 128 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('pages.serviceAccount.description')}>
            <Input.TextArea rows={3} maxLength={1024} />
          </Form.Item>
          <Form.Item
            name="clientId"
            label={t('pages.serviceAccount.clientId')}
            extra={t('pages.serviceAccount.clientIdTip')}
            rules={[
              {
                pattern: /^[A-Za-z][A-Za-z0-9_-]{2,63}$/,
                message: t('pages.serviceAccount.clientIdInvalid'),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="allowedAgentIds"
            label={t('pages.serviceAccount.allowedAgents')}
            extra={t('pages.serviceAccount.allowedAgentsTip')}
          >
            <Select mode="multiple" options={agentOptions} />
          </Form.Item>
          <Form.Item
            name="allowedWorkflowIds"
            label={t('pages.serviceAccount.allowedWorkflows')}
            extra={t('pages.serviceAccount.allowedWorkflowsTip')}
          >
            <Select mode="multiple" options={workflowOptions} />
          </Form.Item>
          <Form.Item
            name="maxAgentCallsPerHour"
            label={t('pages.serviceAccount.maxAgentCalls')}
            extra={t('pages.serviceAccount.maxAgentCallsTip')}
          >
            <InputNumber min={0} max={100000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="maxStartsPerHour"
            label={t('pages.serviceAccount.maxStarts')}
            extra={t('pages.serviceAccount.maxStartsTip')}
          >
            <InputNumber min={0} max={100000} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={t('pages.common.edit')}
        open={Boolean(editAccount)}
        onCancel={() => setEditAccount(undefined)}
        onOk={submitEdit}
        okText={t('pages.common.confirm')}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('pages.serviceAccount.name')}
            rules={[{ required: true, max: 128 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('pages.serviceAccount.description')}>
            <Input.TextArea rows={3} maxLength={1024} />
          </Form.Item>
          <Form.Item
            name="allowedAgentIds"
            label={t('pages.serviceAccount.allowedAgents')}
            extra={t('pages.serviceAccount.allowedAgentsTip')}
          >
            <Select mode="multiple" options={agentOptions} />
          </Form.Item>
          <Form.Item
            name="allowedWorkflowIds"
            label={t('pages.serviceAccount.allowedWorkflows')}
            extra={t('pages.serviceAccount.allowedWorkflowsTip')}
          >
            <Select mode="multiple" options={workflowOptions} />
          </Form.Item>
          <Form.Item
            name="maxAgentCallsPerHour"
            label={t('pages.serviceAccount.maxAgentCalls')}
            extra={t('pages.serviceAccount.maxAgentCallsTip')}
          >
            <InputNumber min={0} max={100000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="maxStartsPerHour"
            label={t('pages.serviceAccount.maxStarts')}
            extra={t('pages.serviceAccount.maxStartsTip')}
          >
            <InputNumber min={0} max={100000} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
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
