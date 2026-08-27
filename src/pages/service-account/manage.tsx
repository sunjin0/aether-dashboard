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
  Modal,
  Space,
  Switch,
  Tag,
  message,
} from 'antd'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons'
import { useAccess } from '@@/exports'
import TableActionMenu from '@/components/TableActionMenu'
import DrawerForm from '@/components/DrawerForm'
import { getAgentApplicationList } from '@/services/agent/AgentApplicationController'
import { getAgentProductProfiles } from '@/services/agent/AgentProductProfileController'
import {
  ServiceAccount,
  ServiceAccountCreate,
  ServiceAccountSecret,
  ServiceAccountUpdate,
  createServiceAccount,
  deleteServiceAccount,
  getServiceAccountList,
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
  const [createOpen, setCreateOpen] = useState(false)
  const [secret, setSecret] = useState<ServiceAccountSecret>()
  const [editAccount, setEditAccount] = useState<ServiceAccount>()
  const [applicationOptions, setApplicationOptions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const write = Boolean(access[history.location.pathname])
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values)
  const applicationName = (id?: string) =>
    applicationOptions.find((item) => item.value === id)?.label || id || '-'
  useEffect(() => {
    getAgentApplicationList({ current: 1, pageSize: 100 }).then((result) =>
      setApplicationOptions(
        (result.data || [])
          .filter((item) => item.status === 1)
          .map((item) => ({ label: item.name, value: item.id })),
      ),
    )
  }, [])
  const loadProducts = async (applicationId?: string) => {
    if (!applicationId) {
      setProducts([])
      return
    }
    const result = await getAgentProductProfiles({ current: 1, pageSize: 100, status: 1, applicationId })
    setProducts(result.code === 200 ? result.data || [] : [])
  }
  const productOptions = () =>
    products
      .map((item) => ({
        label: `${item.name} · v${item.versionNo} (${item.productType === 'WORKFLOW' ? t('pages.agent.product.workflow') : t('pages.agent.product.agent')})`,
        value: item.id,
      }))
  const renderAccountFields = (accountForm: ReturnType<typeof Form.useForm<ServiceAccountCreate>>[0]) => (
    <>
      <ProFormSelect
        name="applicationId"
        label={t('pages.serviceAccount.application')}
        options={applicationOptions}
        rules={[{ required: true }]}
        fieldProps={{
          onChange: (applicationId: string) => {
            accountForm.setFieldsValue({ allowedProductIds: [] })
            loadProducts(applicationId)
          },
        }}
      />
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
        name="allowedProductIds"
        label={t('pages.serviceAccount.allowedProducts')}
        extra={t('pages.serviceAccount.allowedProductsTip')}
        options={productOptions()}
        fieldProps={{ mode: 'multiple' }}
        rules={[{ required: true, message: t('pages.serviceAccount.productsRequired') }]}
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
      allowedProductIds: values.allowedProductIds || [],
      maxAgentCallsPerHour: values.maxAgentCallsPerHour || 0,
      maxStartsPerHour: values.maxStartsPerHour || 0,
    })
    if (result.code !== 200) return false
    setSecret(result.data)
    actionRef.current?.reload()
    return true
  }
  const submitEdit = async (values: ServiceAccountUpdate) => {
    const result = await updateServiceAccount(editAccount!.id, {
      ...values,
      allowedProductIds: values.allowedProductIds || [],
      maxAgentCallsPerHour: values.maxAgentCallsPerHour || 0,
      maxStartsPerHour: values.maxStartsPerHour || 0,
    })
    if (result.code !== 200) return false
    actionRef.current?.reload()
    return true
  }
  const copySecret = async (value?: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    message.success(t('pages.serviceAccount.copied'))
  }
  const columns: any[] = [
    { title: t('pages.serviceAccount.name'), dataIndex: 'name', width: 180 },
    {
      title: t('pages.serviceAccount.application'),
      dataIndex: 'applicationId',
      width: 180,
      valueType: 'select',
      fieldProps: { options: applicationOptions },
      render: applicationName,
    },
    {
      title: t('pages.serviceAccount.clientId'),
      dataIndex: 'clientId',
      width: 180,
      copyable: true,
    },
    {
      title: t('pages.serviceAccount.description'),
      dataIndex: 'description',
      hideInTable: true,
      hideInSearch: true,
    },
    {
      title: t('pages.serviceAccount.allowedProducts'),
      dataIndex: 'allowedProductIds',
      hideInSearch: true,
      render: (ids: string[]) => (
        <Tag>{t('pages.serviceAccount.productCount', { count: ids?.length || 0 })}</Tag>
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
            if (result.code === 200) actionRef.current?.reload()
          }}
        />
      ),
    },
    {
      title: t('pages.common.option'),
      width: 280,
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
                  loadProducts(record.applicationId)
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
                  if (result.code === 200) actionRef.current?.reload()
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
        search={{ labelWidth: 120 }}
        columns={columns}
        request={getServiceAccountList}
        toolBarRender={() => [
          ...(write
            ? [
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields()
                  form.setFieldsValue({
                    allowedProductIds: [],
                    maxAgentCallsPerHour: 0,
                    maxStartsPerHour: 0,
                  })
                  setProducts([])
                  setCreateOpen(true)
                }}
              >
                {t('pages.serviceAccount.create')}
              </Button>,
            ]
            : []),
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
          data: { allowedProductIds: [], maxAgentCallsPerHour: 0, maxStartsPerHour: 0 },
        })}
        onSuccess={submit}
        drawerProps={{ title: t('pages.serviceAccount.create') }}
      >
        {renderAccountFields(form)}
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
            applicationId: editAccount?.applicationId,
            name: editAccount?.name,
            description: editAccount?.description,
            allowedProductIds: editAccount?.allowedProductIds || [],
            maxAgentCallsPerHour: editAccount?.maxAgentCallsPerHour || 0,
            maxStartsPerHour: editAccount?.maxStartsPerHour || 0,
          },
        })}
        onSuccess={submitEdit}
        drawerProps={{ title: t('pages.common.edit') }}
      >
        {renderAccountFields(editForm)}
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
    </PageContainer>
  )
}
export default ServiceAccountPage
