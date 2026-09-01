import McpServerForm from '@/pages/agent/mcp-server/McpServerForm'
import {
  deleteMcpServer,
  discoverMcpServerTools,
  getMcpServerList,
  importMcpServerTools,
  updateMcpServer,
} from '@/services/agent/McpServerController'
import { getAgentToolList } from '@/services/agent/ToolController'
import { getOptionList } from '@/services/sys/DictController'
import { McpServer, McpServerSearchParams, McpTool } from '@/services/entity/Agent'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports'
import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import React, { useRef, useState } from 'react'
import JsonDisplay from '@/components/JsonDisplay'
import TableActionMenu from '@/components/TableActionMenu'
import { putConnectorCredential, revokeConnectorCredential } from '@/services/agent/ConnectorCredentialController'

const McpServerPage: React.FC = () => {
  const intl = useIntl()
  const ref = useRef<ActionType>()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string>()
  const [discoverServer, setDiscoverServer] = useState<McpServer>()
  const [tools, setTools] = useState<McpTool[]>([])
  const [selectedTools, setSelectedTools] = useState<React.Key[]>([])
  const [importedToolNames, setImportedToolNames] = useState<string[]>([])
  const [schemaTool, setSchemaTool] = useState<McpTool>()
  const [toolKeyword, setToolKeyword] = useState('')
  const [discoveringServerId, setDiscoveringServerId] = useState<string>()
  const [importingTools, setImportingTools] = useState(false)
  const [credentialOpen, setCredentialOpen] = useState(false)
  const [credentialForm] = Form.useForm()
  const permissions = useAccess()
  const write = permissions[history.location.pathname]
  const format = (key: string) => intl.formatMessage({ id: key })

  const discover = async (server: McpServer) => {
    if (!server.id) return
    setDiscoveringServerId(server.id)
    try {
      const [{ code, data }, imported] = await Promise.all([
        discoverMcpServerTools(server.id),
        getAgentToolList({ current: 1, pageSize: 1000, mcpServerId: server.id }),
      ])
      if (code !== 200) return
      setTools(data || [])
      setImportedToolNames((imported.data || []).flatMap((tool) => tool.mcpToolName || []))
      setSelectedTools([])
      setToolKeyword('')
      setDiscoverServer(server)
    } finally {
      setDiscoveringServerId(undefined)
    }
  }

  const visibleTools = tools.filter((tool) => {
    const keyword = toolKeyword.trim().toLowerCase()
    return !keyword || `${tool.name} ${tool.description || ''}`.toLowerCase().includes(keyword)
  })

  const toggleTool = (tool: McpTool, checked: boolean) => {
    setSelectedTools((current) =>
      checked ? [...current, tool.name] : current.filter((name) => name !== tool.name),
    )
  }

  const selectableToolNames = visibleTools
    .filter((tool) => !importedToolNames.includes(tool.name))
    .map((tool) => tool.name)
  const allVisibleSelected =
    selectableToolNames.length > 0 &&
    selectableToolNames.every((name) => selectedTools.includes(name))
  const toggleAllVisibleTools = (checked: boolean) => {
    setSelectedTools((current) => {
      const visibleNames = new Set(selectableToolNames)
      return checked
        ? Array.from(new Set([...current, ...selectableToolNames]))
        : current.filter((name) => !visibleNames.has(name as string))
    })
  }

  const importTools = async () => {
    if (!discoverServer?.id) return
    if (!selectedTools.length) {
      message.warning(format('pages.agent.mcpServer.selectTools'))
      return
    }
    const toolNames = Array.from(new Set(selectedTools.map(String)))
    setImportingTools(true)
    try {
      const { code } = await importMcpServerTools(discoverServer.id, toolNames)
      if (code === 200) {
        setDiscoverServer(undefined)
        ref.current?.reload()
      }
    } finally {
      setImportingTools(false)
    }
  }

  const columns: any[] = [
    { title: format('pages.agent.mcpServer.name'), dataIndex: 'name', ellipsis: true },
    { title: format('pages.agent.mcpServer.code'), dataIndex: 'code', ellipsis: true },
    {
      title: format('pages.agent.mcpServer.transport'),
      dataIndex: 'transport',
      valueType: 'select',
      request: () => getOptionList('Agent_Mcp_Transport'),
    },
    {
      title: format('pages.agent.mcpServer.baseUrl'),
      dataIndex: 'baseUrl',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: format('pages.agent.mcpServer.authType'),
      dataIndex: 'authType',
      valueType: 'select',
      request: () => getOptionList('Agent_Mcp_Auth_Type'),
      hideInSearch: true,
    },
    {
      title: format('pages.agent.tool.timeout'),
      dataIndex: 'timeoutMs',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: format('pages.common.status'),
      key: 'McpServerStatus',
      dataIndex: 'status',
      valueType: 'select',
      request: () => getOptionList('Agent_Status'),
    },
    {
      title: format('pages.common.updateTime'),
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      fixed: 'right',
      width: 250,
      render: (_: unknown, record: McpServer) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'discover',
                label: format('pages.agent.mcpServer.discover'),
                primary: true,
                loading: discoveringServerId === record.id,
                onClick: async () => {
                  await discover(record)
                },
              },
              {
                key: 'edit',
                label: format('pages.agent.tool.edit'),
                primary: true,
                onClick: () => {
                  setId(record.id)
                  setOpen(true)
                },
              },
              {
                key: 'delete',
                label: format('pages.common.delete'),
                primary: true,
                danger: true,
                confirm: { title: format('pages.agent.mcpServer.deleteConfirm') },
                onClick: async () => {
                  if (!record.id) return
                  try {
                    const response = await deleteMcpServer(record.id)
                    if (response.code === 200) {
                    ref.current?.reload()
                    }
                  } catch {
                    // API failures are displayed by the global request handler.
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
      <ProTable<McpServer>
        actionRef={ref}
        rowKey="id"
        request={(params: McpServerSearchParams) => getMcpServerList(params)}
        columns={columns}
        toolBarRender={() =>
          write && [
            <Button key="credentials" onClick={() => { credentialForm.resetFields(); setCredentialOpen(true) }}>管理连接器凭据</Button>,
            <Button
              key="new"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined)
                setOpen(true)
              }}
            >
              <FormattedMessage id="pages.common.new" />
            </Button>,
          ]
        }
      />
      <Modal title="管理连接器凭据" open={credentialOpen} onCancel={() => setCredentialOpen(false)} onOk={async () => {
        const values = await credentialForm.validateFields()
        const credentialValues = Object.fromEntries(
          Object.entries({ endpoint: values.endpoint, token: values.token, datasourceUid: values.datasourceUid, namespace: values.namespace })
            .filter(([, value]) => value !== undefined && value !== ''),
        ) as Record<string, string>
        await putConnectorCredential(values.credentialRef, credentialValues)
        message.success('凭据已保存'); setCredentialOpen(false)
      }}>
        <Form form={credentialForm} layout="vertical">
          <Form.Item name="credentialRef" label="凭据引用" rules={[{ required: true }, { pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, message: '凭据引用格式无效' }]}><Input placeholder="例如 prometheus-prod" /></Form.Item>
          <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true }, { pattern: /^https:\/\/[^\s]+$/, message: 'Endpoint 必须使用 HTTPS' }]}><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="token" label="Token" rules={[{ required: true }]}><Input.Password autoComplete="new-password" /></Form.Item>
          <Form.Item name="datasourceUid" label="Grafana Datasource UID" rules={[{ max: 128 }]}><Input placeholder="Grafana 查询时使用" /></Form.Item>
          <Form.Item name="namespace" label="Kubernetes Namespace" rules={[{ max: 128 }]}><Input placeholder="Kubernetes 查询时使用" /></Form.Item>
          <Typography.Text type="secondary">凭据只提交到 Secret Provider，页面不会读取或显示已保存内容。</Typography.Text>
          <Button danger type="link" onClick={async () => { const ref = credentialForm.getFieldValue('credentialRef'); if (!ref) { message.warning('请先填写凭据引用'); return }; await revokeConnectorCredential(ref); message.success('凭据已撤销'); credentialForm.resetFields() }}>撤销此引用</Button>
        </Form>
      </Modal>
      <McpServerForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
        }}
      />
      <Modal
        title={format('pages.agent.mcpServer.discoverTitle')}
        open={Boolean(discoverServer)}
        onCancel={() => !importingTools && setDiscoverServer(undefined)}
        onOk={importTools}
        okText={format('pages.agent.mcpServer.import')}
        okButtonProps={{ disabled: !selectedTools.length || importingTools }}
        cancelButtonProps={{ disabled: importingTools }}
        confirmLoading={importingTools}
        closable={!importingTools}
        maskClosable={!importingTools}
        width="50%"
        // 工具卡片数量较多时让 Modal 主体承担滚动，避免 Spin 包装层未撑满高度而截断内容。
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' } }}
      >
        <Spin spinning={importingTools} style={{ height: '100%' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              minHeight: '100%',
            }}
          >
          <Space style={{ width: '100%', justifyContent: 'space-between', flex: 'none' }}>
            <Space>
              <Checkbox
                checked={allVisibleSelected}
                disabled={!selectableToolNames.length || importingTools}
                indeterminate={
                  !allVisibleSelected &&
                  selectableToolNames.some((name) => selectedTools.includes(name))
                }
                onChange={(event) => toggleAllVisibleTools(event.target.checked)}
              >
                {format('pages.agent.mcpServer.selectAll')}
              </Checkbox>
              <Input.Search
                allowClear
                placeholder={format('pages.agent.mcpServer.searchTools')}
                style={{ width: 320 }}
                value={toolKeyword}
                disabled={importingTools}
                onChange={(event) => setToolKeyword(event.target.value)}
              />
            </Space>
            <Typography.Text type="secondary">
              {intl.formatMessage(
                { id: 'pages.agent.mcpServer.selectedCount' },
                { count: selectedTools.length },
              )}
            </Typography.Text>
          </Space>
          {visibleTools.length ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 12,
              }}
            >
              {visibleTools.map((tool) => {
                const imported = importedToolNames.includes(tool.name)
                const selected = selectedTools.includes(tool.name)
                return (
                  <div
                    key={tool.name}
                    role="checkbox"
                    aria-label={tool.name}
                    aria-checked={selected}
                    aria-disabled={imported}
                    tabIndex={imported ? -1 : 0}
                    onClick={() => !imported && !importingTools && toggleTool(tool, !selected)}
                    onKeyDown={(event) => {
                      if (!imported && !importingTools && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault()
                        toggleTool(tool, !selected)
                      }
                    }}
                    style={{
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 16,
                      background: selected ? '#f6ffed' : '#fff',
                      cursor: imported || importingTools ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Space align="start" style={{ width: '100%' }}>
                      <Checkbox
                        checked={selected}
                        disabled={imported || importingTools}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => toggleTool(tool, event.target.checked)}
                      />
                      <Space direction="vertical" size={8} style={{ flex: 1, minWidth: 0 }}>
                        <Space>
                          <Typography.Text strong>{tool.name}</Typography.Text>
                          {imported && (
                            <Tag color="success">{format('pages.agent.mcpServer.imported')}</Tag>
                          )}
                        </Space>
                        <Typography.Paragraph
                          ellipsis={{ rows: 2 }}
                          type="secondary"
                          style={{ margin: 0 }}
                        >
                          {tool.description || format('pages.agent.mcpServer.noDescription')}
                        </Typography.Paragraph>
                        <Button
                          type="link"
                          style={{ padding: 0, textAlign: 'left' }}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (!importingTools) setSchemaTool(tool)
                          }}
                          disabled={importingTools}
                        >
                          {format('pages.agent.mcpServer.viewSchema')}
                        </Button>
                      </Space>
                    </Space>
                  </div>
                )
              })}
            </div>
          ) : (
            <Empty description={format('pages.agent.mcpServer.noTools')} />
          )}
          </div>
        </Spin>
      </Modal>
      <Drawer
        title={schemaTool?.name}
        open={Boolean(schemaTool)}
        onClose={() => setSchemaTool(undefined)}
        width={720}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>{format('pages.agent.tool.inputSchema')}</Typography.Text>
            <JsonDisplay
              content={
                typeof schemaTool?.inputSchema === 'string'
                  ? schemaTool.inputSchema
                  : JSON.stringify(schemaTool?.inputSchema)
              }
            />
          </div>
          <div>
            <Typography.Text strong>{format('pages.agent.tool.outputSchema')}</Typography.Text>
            <JsonDisplay
              content={
                typeof schemaTool?.outputSchema === 'string'
                  ? schemaTool.outputSchema
                  : JSON.stringify(schemaTool?.outputSchema)
              }
            />
          </div>
        </Space>
      </Drawer>
    </PageContainer>
  )
}

export default McpServerPage
