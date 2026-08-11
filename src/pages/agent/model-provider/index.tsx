import React, { useEffect, useMemo, useState } from 'react'
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { PageContainer, ProTable } from '@ant-design/pro-components'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  List,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { useAccess, useIntl } from '@@/exports'
import dayjs from 'dayjs'
import ModelProviderForm from './ModelProviderForm'
import ModelCatalogForm from './ModelCatalogForm'
import {
  deleteModelCatalog,
  deleteModelProviderInfo,
  discoverProviderModels,
  getModelCatalog,
  getModelProviderList,
  ModelProviderConnectionTestResult,
  saveModelCatalogBatch,
  testModelProviderConnection,
  updateModelCatalogStatus,
  updateModelProviderStatus,
} from '@/services/agent/ModelProviderController'
import { ModelCatalog, ModelProvider } from '@/services/entity/Agent'
import './workbench.less'

const capabilities = ['CHAT', 'VIDEO', 'AUDIO', 'MULTIMODAL', 'EMBEDDING', 'RERANK']

const ModelProviderPage: React.FC = () => {
  const intl = useIntl()
  const text = (id: string, values?: Record<string, string>) => intl.formatMessage({ id }, values)
  const dateTime = (value?: string | number) =>
    value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
  const write = Boolean(useAccess()['/agent/model-provider'])
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  const [providerFormId, setProviderFormId] = useState<string>()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogId, setCatalogId] = useState<string>()
  const [catalogs, setCatalogs] = useState<ModelCatalog[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, ModelProviderConnectionTestResult>>(
    {},
  )
  const [testingId, setTestingId] = useState<string>()
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [savingDiscovered, setSavingDiscovered] = useState(false)
  const [discoveredModels, setDiscoveredModels] = useState<
    { label: string; value: string | number }[]
  >([])
  const [selectedDiscoveredNames, setSelectedDiscoveredNames] = useState<React.Key[]>([])
  const [discoveredCapabilities, setDiscoveredCapabilities] = useState<Record<string, string[]>>(
    {},
  )
  const selected = useMemo(
    () => providers.find((item) => item.id === selectedId),
    [providers, selectedId],
  ) as ModelProvider
  const existingNames = useMemo(() => new Set(catalogs.map((item) => item.name)), [catalogs])

  const loadProviders = async () => {
    setLoading(true)
    try {
      const result = await getModelProviderList({ current: 1, pageSize: 200 })
      const rows = result.data || []
      setProviders(rows)
      setSelectedId((current) =>
        current && rows.some((item) => item.id === current) ? current : rows[0]?.id,
      )
    } finally {
      setLoading(false)
    }
  }
  const loadCatalogs = async (providerId?: string) => {
    if (!providerId) {
      setCatalogs([])
      return
    }
    setCatalogLoading(true)
    try {
      const result = await getModelCatalog(providerId)
      setCatalogs(result.data || [])
    } finally {
      setCatalogLoading(false)
    }
  }
  useEffect(() => {
    loadProviders()
  }, [])
  useEffect(() => {
    loadCatalogs(selectedId)
  }, [selectedId])
  const testConnection = async (providerId?: string) => {
    if (!providerId) return
    setTestingId(providerId)
    try {
      const result = await testModelProviderConnection(providerId)
      if (result.data) setTestResults((current) => ({ ...current, [providerId]: result.data }))
    } finally {
      setTestingId(undefined)
    }
  }
  const openModelDiscovery = async () => {
    if (!selected?.id) return
    setDiscoverOpen(true)
    setDiscoveredModels([])
    setSelectedDiscoveredNames([])
    setDiscoveredCapabilities({})
    setDiscoverLoading(true)
    try {
      setDiscoveredModels(await discoverProviderModels(selected.id))
    } finally {
      setDiscoverLoading(false)
    }
  }
  const toggleDiscoveredModel = (value: React.Key) => {
    if (existingNames.has(String(value))) return
    setSelectedDiscoveredNames((keys) =>
      keys.includes(value) ? keys.filter((key) => key !== value) : [...keys, value],
    )
  }
  const saveDiscoveredModels = async () => {
    if (!selected?.id || !selectedDiscoveredNames.length) return
    const names = selectedDiscoveredNames.map(String).filter((name) => !existingNames.has(name))
    if (!names.length) {
      message.info(text('pages.agent.modelCatalog.noNewModels'))
      return
    }
    if (names.some((name) => !discoveredCapabilities[name]?.length)) {
      message.warning(text('pages.agent.modelCatalog.capabilityRequired'))
      return
    }
    setSavingDiscovered(true)
    try {
      await saveModelCatalogBatch(
        names.map(
          (name) =>
            ({
              providerId: selected.id,
              name,
              capabilities: discoveredCapabilities[name].join(','),
              status: 1,
            }) as ModelCatalog,
        ),
      )
      setDiscoverOpen(false)
      loadCatalogs(selected.id)
    } finally {
      setSavingDiscovered(false)
    }
  }

  const providerList = (
    <Card className="model-workbench-sidebar" bodyStyle={{ padding: 14 }}>
      <div className="model-workbench-sidebar-head">
        <div>
          <Typography.Text strong>{text('pages.agent.modelWorkbench.connections')}</Typography.Text>
          <Typography.Paragraph type="secondary">
            {text('pages.agent.modelWorkbench.connectionsHint')}
          </Typography.Paragraph>
        </div>
        {write && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setProviderFormId(undefined)
              setProviderOpen(true)
            }}
          >
            {text('pages.common.new')}
          </Button>
        )}
      </div>
      <Spin spinning={loading}>
        <List
          dataSource={providers}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={text('pages.agent.modelWorkbench.noConnections')}
              />
            ),
          }}
          renderItem={(provider) => {
            const test = provider.id ? testResults[provider.id] : undefined
            return (
              <List.Item
                className={provider.id === selectedId ? 'is-active' : ''}
                onClick={() => setSelectedId(provider.id)}
              >
                <List.Item.Meta
                  avatar={<ApiOutlined />}
                  title={
                    <Space size={6}>
                      <span>{provider.name}</span>
                      {provider.status === 1 ? (
                        <Tag color="success">{text('pages.common.enabled')}</Tag>
                      ) : (
                        <Tag>{text('pages.common.disabled')}</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div className="model-connection-meta">
                      <Typography.Text type="secondary">{provider.type || '-'}</Typography.Text>
                      <div className="model-connection-test">
                        {test && (
                          <Tag
                            color={test.success ? 'success' : 'error'}
                            icon={<ClockCircleOutlined />}
                          >
                            {test.success
                              ? text('pages.agent.modelWorkbench.requestTime', {
                                value: String(test.elapsedMs),
                              })
                              : text('pages.agent.modelWorkbench.testFailed')}
                          </Tag>
                        )}
                        <Button
                          type="link"
                          size="small"
                          loading={testingId === provider.id}
                          icon={<ExperimentOutlined />}
                          onClick={(event) => {
                            event.stopPropagation()
                            testConnection(provider.id)
                          }}
                        >
                          {text('pages.agent.modelWorkbench.testConnection')}
                        </Button>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )
          }}
        />
      </Spin>
    </Card>
  )
  const catalogActions = write && (
    <Space>
      <Button onClick={openModelDiscovery}>{text('pages.agent.modelCatalog.discover')}</Button>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setCatalogId(undefined)
          setCatalogOpen(true)
        }}
      >
        {text('pages.agent.modelCatalog.add')}
      </Button>
    </Space>
  )
  const catalogTable = (
    <Card extra={catalogActions}>
      <ProTable<ModelCatalog>
        rowKey="id"
        search={false}
        options={false}
        pagination={false}
        loading={catalogLoading}
        dataSource={catalogs}
        columns={[
          { title: text('pages.agent.modelCatalog.name'), dataIndex: 'name' },
          {
            title: text('pages.agent.modelCatalog.capabilities'),
            dataIndex: 'capabilities',
            render: (_, record) => (
              <Space wrap>
                {String(record.capabilities || '')
                  .split(',')
                  .filter(Boolean)
                  .map((item) => (
                    <Tag key={item} color="blue">
                      {text(`pages.agent.modelCatalog.capability.${item}`)}
                    </Tag>
                  ))}
              </Space>
            ),
          },
          {
            title: text('pages.agent.modelCatalog.contextWindow'),
            dataIndex: 'contextWindow',
            renderText: (value) => value || '-',
          },
          {
            title: text('pages.common.status'),
            dataIndex: 'status',
            render: (_, record) =>
              record.status === 1 ? (
                <Tag color="success">{text('pages.common.enabled')}</Tag>
              ) : (
                <Tag>{text('pages.common.disabled')}</Tag>
              ),
          },
          {
            title: text('pages.common.option'),
            valueType: 'option',
            hidden: !write,
            render: (_, record) => [
              <a key="edit" onClick={() => setCatalogId(record.id)}>
                {text('pages.common.edit')}
              </a>,
              <a
                key="status"
                onClick={async () => {
                  if (record.id) {
                    await updateModelCatalogStatus(record.id, record.status === 1 ? 0 : 1)
                    loadCatalogs(selected.id)
                  }
                }}
              >
                {record.status === 1 ? text('pages.common.disabled') : text('pages.common.enabled')}
              </a>,
              <Popconfirm
                key="delete"
                title={text('pages.agent.modelCatalog.deleteConfirm')}
                onConfirm={async () => {
                  if (record.id) {
                    await deleteModelCatalog(record.id)
                    loadCatalogs(selected.id)
                  }
                }}
              >
                <a>{text('pages.common.delete')}</a>
              </Popconfirm>,
            ],
          },
        ]}
      />
    </Card>
  )
  const discoveryCards = (
    <div className="model-discovery-grid">
      {discoveredModels.map((model) => {
        const name = String(model.value)
        const exists = existingNames.has(name)
        const checked = selectedDiscoveredNames.includes(model.value)
        return (
          <Card
            key={name}
            size="small"
            hoverable={!exists}
            className={`model-discovery-card${checked ? ' is-selected' : ''}${exists ? ' is-existing' : ''}`}
            onClick={() => toggleDiscoveredModel(model.value)}
          >
            <div className="model-discovery-card-head">
              <Typography.Text ellipsis={{ tooltip: model.label }}>{model.label}</Typography.Text>
              {exists ? (
                <Tag>{text('pages.agent.modelCatalog.alreadyAdded')}</Tag>
              ) : checked ? (
                <CheckCircleOutlined className="model-discovery-selected-icon" />
              ) : null}
            </div>
            <Typography.Text type="secondary">
              {exists
                ? text('pages.agent.modelCatalog.alreadyAddedHint')
                : checked
                  ? text('pages.agent.modelCatalog.selected')
                  : text('pages.agent.modelCatalog.clickToSelect')}
            </Typography.Text>
            {!exists && (
              <div
                className="model-discovery-capability"
                onClick={(event) => event.stopPropagation()}
              >
                <Select
                  mode="multiple"
                  value={discoveredCapabilities[name]}
                  placeholder={text('pages.agent.modelCatalog.capabilityPlaceholder')}
                  options={capabilities.map((value) => ({
                    label: text(`pages.agent.modelCatalog.capability.${value}`),
                    value,
                  }))}
                  onChange={(values) =>
                    setDiscoveredCapabilities((current) => ({ ...current, [name]: values }))
                  }
                />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )

  return (
    <PageContainer>
      <div className="model-workbench">
        {providerList}
        <section className="model-workbench-content">
          {!selected ? (
            <Card>
              <Empty description={text('pages.agent.modelWorkbench.selectConnection')} />
            </Card>
          ) : (
            <>
              <div className="model-workbench-title">
                <div className="model-workbench-identity">
                  <Typography.Text className="model-workbench-eyebrow">
                    {text('pages.agent.modelWorkbench.connectionInfo')}
                  </Typography.Text>
                  <div className="model-workbench-name">
                    <Typography.Title level={3} ellipsis={{ tooltip: selected.name }}>
                      {selected.name}
                    </Typography.Title>
                    {selected.status === 1 ? (
                      <Tag color="success">{text('pages.common.enabled')}</Tag>
                    ) : (
                      <Tag>{text('pages.common.disabled')}</Tag>
                    )}
                  </div>
                  <Typography.Text
                    className="model-workbench-url"
                    type="secondary"
                    ellipsis={{ tooltip: selected.apiBaseUrl }}
                  >
                    {selected.apiBaseUrl}
                  </Typography.Text>
                </div>
                <div className="model-workbench-summary">
                  <div>
                    <strong>{catalogs.length}</strong>
                    <span>{text('pages.agent.modelWorkbench.modelCount')}</span>
                  </div>
                  <div>
                    <strong>{catalogs.filter((item) => item.status === 1).length}</strong>
                    <span>{text('pages.agent.modelWorkbench.enabledModelCount')}</span>
                  </div>
                </div>
                {write && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => {
                      setProviderFormId(selected.id)
                      setProviderOpen(true)
                    }}
                  >
                    {text('pages.common.edit')}
                  </Button>
                )}
              </div>
              <Tabs
                className="model-workbench-tabs"
                items={[
                  {
                    key: 'connection',
                    label: text('pages.agent.modelWorkbench.connectionConfig'),
                    children: (
                      <Card
                        className="model-workbench-info-card"
                        title={text('pages.agent.modelWorkbench.connectionInfo')}
                      >
                        <Descriptions
                          bordered
                          size="small"
                          column={{ xs: 1, md: 2 }}
                          items={[
                            {
                              key: 'type',
                              label: text('pages.agent.modelProvider.type'),
                              children: selected.type || '-',
                            },
                            {
                              key: 'status',
                              label: text('pages.common.status'),
                              children:
                                selected.status === 1 ? (
                                  <Tag color="success">{text('pages.common.enabled')}</Tag>
                                ) : (
                                  <Tag>{text('pages.common.disabled')}</Tag>
                                ),
                            },
                            {
                              key: 'url',
                              label: text('pages.agent.modelProvider.apiBaseUrl'),
                              children: selected.apiBaseUrl || '-',
                              span: 2,
                            },
                            {
                              key: 'context',
                              label: text('pages.agent.modelCatalog.contextWindow'),
                              children: selected.contextWindow || '-',
                            },
                            {
                              key: 'sort',
                              label: text('pages.common.sort.number'),
                              children: selected.sort || '-',
                            },
                            {
                              key: 'remark',
                              label: text('pages.common.remark'),
                              children: selected.remark || '-',
                              span: 2,
                            },
                            {
                              key: 'created',
                              label: text('pages.common.createTime'),
                              children: dateTime(selected.createdAt),
                            },
                            {
                              key: 'updated',
                              label: text('pages.common.updateTime'),
                              children: dateTime(selected.updatedAt),
                            },
                          ]}
                        />
                        <Space className="model-workbench-config-actions">
                          {write && (
                            <Button
                              onClick={async () => {
                                if (selected.id) {
                                  await updateModelProviderStatus(selected.id, {
                                    status: selected.status === 1 ? 0 : 1,
                                  })
                                  loadProviders()
                                }
                              }}
                            >
                              {selected.status === 1
                                ? text('pages.common.disabled')
                                : text('pages.common.enabled')}
                            </Button>
                          )}
                          {write && (
                            <Popconfirm
                              title={text('pages.agent.modelProvider.deleteConfirm')}
                              onConfirm={async () => {
                                if (selected.id) {
                                  await deleteModelProviderInfo(selected.id)
                                  loadProviders()
                                }
                              }}
                            >
                              <Button danger icon={<DeleteOutlined />}>
                                {text('pages.common.delete')}
                              </Button>
                            </Popconfirm>
                          )}
                        </Space>
                      </Card>
                    ),
                  },
                  {
                    key: 'catalog',
                    label: text('pages.agent.modelCatalog.manage'),
                    children: catalogTable,
                  },
                ]}
              />
            </>
          )}
        </section>
      </div>
      <ModelProviderForm
        id={providerFormId}
        open={providerOpen}
        setOpen={setProviderOpen}
        onSuccess={(providerId) => {
          setProviderOpen(false)
          setProviderFormId(undefined)
          loadProviders().then(() => {
            if (providerId) setSelectedId(providerId)
          })
        }}
      />
      {selectedId && (
        <ModelCatalogForm
          id={catalogId}
          providerId={selectedId}
          open={catalogOpen || Boolean(catalogId)}
          setOpen={(visible) => {
            if (!visible) {
              setCatalogOpen(false)
              setCatalogId(undefined)
            }
          }}
          onSuccess={() => {
            setCatalogOpen(false)
            setCatalogId(undefined)
            loadCatalogs(selectedId)
          }}
        />
      )}
      <Modal
        open={discoverOpen}
        title={text('pages.agent.modelCatalog.discoverTitle')}
        width={760}
        okText={text('pages.agent.modelCatalog.saveSelected')}
        okButtonProps={{ disabled: !selectedDiscoveredNames.length }}
        confirmLoading={savingDiscovered}
        onCancel={() => setDiscoverOpen(false)}
        onOk={saveDiscoveredModels}
      >
        <Spin spinning={discoverLoading}>
          {discoveredModels.length ? (
            discoveryCards
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={text('pages.agent.modelCatalog.noRemoteModels')}
            />
          )}
        </Spin>
      </Modal>
    </PageContainer>
  )
}

export default ModelProviderPage
