import React, { useEffect, useRef, useState } from 'react'
import {
  ApiOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  CodeOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import {
  Button,
  Input,
  message,
  Popconfirm,
  Progress,
  Select,
  Spin,
  Switch,
  Tag,
  Tooltip,
} from 'antd'
import { history, useAccess, useIntl } from '@@/exports'
import AgentToolForm from '@/pages/agent/tool/AgentToolForm'
import AgentToolTestModal from '@/pages/agent/tool/AgentToolTestModal'
import {
  deleteAgentToolInfo,
  getAgentToolFacets,
  getAgentToolInfo,
  getAgentToolList,
  getAgentToolStatistics,
  updateAgentToolInfo,
} from '@/services/agent/ToolController'
import {
  AgentTool,
  AgentToolFacets,
  AgentToolSearchParams,
  AgentToolStatistics,
} from '@/services/entity/Agent'
import './index.less'
import { getOptionList } from '@/services/sys/DictController'
const toolTypesMap = [
  { value: 'knowledge', icon: <DatabaseOutlined /> },
  { value: 'ops', icon: <ToolOutlined /> },
  { value: 'dev', icon: <CodeOutlined /> },
  { value: 'general', icon: <AppstoreOutlined /> },
]
const rate = (value?: number) => {
  const result = value || 0
  return result > 0 && result <= 1 ? result * 100 : result
}
const timeText = (value?: string | number) => {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'number') {
    const timestamp = value < 100000000000 ? value * 1000 : value
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
  }
  return value.replace('T', ' ').slice(0, 16)
}

const AgentToolPage: React.FC = () => {
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string>()
  const [testToolId, setTestToolId] = useState<string>()
  const [statistics, setStatistics] = useState<AgentToolStatistics>()
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [toolType, setToolType] = useState<string>()
  const [status, setStatus] = useState<number>()
  const [mcpServerId, setMcpServerId] = useState<string>()
  const [facets, setFacets] = useState<AgentToolFacets>({
    categories: [],
    statuses: [],
    sources: [],
  })
  const write = permissionMap[history.location.pathname]
  const refresh = () => ref.current?.reloadAndRest?.()
  const [toolTypes, setToolTypes] = useState<any>([])
  useEffect(() => {
    getOptionList('Agent_Tool_Business_Type').then((res) => {
      res = res.map((item) => ({
        value: item.value,
        label: item.label,
        icon: toolTypesMap.find((type) => type.value === item.value)?.icon || <AppstoreOutlined />,
      }))
      setToolTypes(res)
    })
  }, [])
  const typeMeta = (type?: string) =>
    toolTypes.find((item: { value: string | undefined }) => item.value === type)

  const loadStatistics = async () => {
    setStatisticsLoading(true)
    try {
      const result = await getAgentToolStatistics({ toolType, mcpServerId })
      if (result.code === 200) setStatistics(result.data)
      else message.error(result.message || '加载工具统计失败')
    } finally {
      setStatisticsLoading(false)
    }
  }

  useEffect(() => {
    loadStatistics()
  }, [toolType, mcpServerId])
  useEffect(() => {
    getAgentToolFacets().then(({ code, data, message: msg }) => {
      if (code === 200 && data) setFacets(data)
      else message.error(msg || '加载工具筛选项失败')
    })
  }, [])

  const changeFilter = (callback: () => void) => {
    callback()
    window.setTimeout(refresh, 0)
  }
  const handleDelete = async (record: AgentTool) => {
    if (!record.id) return
    const result = await deleteAgentToolInfo(record.id)
    if (result.code === 200) {
      message.success(result.message || '删除成功')
      refresh()
      loadStatistics()
    } else message.error(result.message || '删除失败')
  }
  const handleStatusChange = async (record: AgentTool) => {
    if (!record.id) return
    const detail = await getAgentToolInfo(record.id)
    if (detail.code !== 200 || !detail.data) {
      message.error(detail.message || '获取工具详情失败')
      return
    }
    const result = await updateAgentToolInfo({
      ...detail.data,
      status: record.status === 1 ? 0 : 1,
    })
    if (result.code === 200) {
      message.success(result.message || '操作成功')
      refresh()
      loadStatistics()
    } else message.error(result.message || '操作失败')
  }

  const columns: any[] = [
    {
      title: '工具名称',
      dataIndex: 'name',
      width: 275,
      render: (_: unknown, record: AgentTool) => {
        const meta = typeMeta(record.toolType)
        return (
          <div className="tool-name-cell">
            <span className={`tool-icon tool-icon-${record.toolType || 'general'}`}>
              {meta?.icon || <AppstoreOutlined />}
            </span>
            <div>
              <strong>{record.name || '-'}</strong>
              <small>{record.description || record.code || '暂无工具描述'}</small>
            </div>
          </div>
        )
      },
    },
    {
      title: '类型',
      dataIndex: 'toolType',
      width: 115,
      render: (_: unknown, record: AgentTool) => (
        <Tag className="tool-type-tag">
          {typeMeta(record.toolType)?.label || record.toolType || '通用工具'}
        </Tag>
      ),
    },
    {
      title: '集成状态',
      dataIndex: 'status',
      width: 120,
      render: (_: unknown, record: AgentTool) =>
        record.status === 1 ? (
          <span className="status-success">
            <CheckCircleFilled /> 已集成
          </span>
        ) : (
          <span className="status-disabled">未启用</span>
        ),
    },
    {
      title: '调用次数',
      dataIndex: 'callCount',
      width: 95,
      render: (_: unknown, record: AgentTool) => (record.callCount || 0).toLocaleString(),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      width: 130,
      render: (_: unknown, record: AgentTool) =>
        record.callCount ? (
          <div className="success-rate">
            <span>{rate(record.successRate).toFixed(1)}%</span>
            <Progress
              percent={Math.min(rate(record.successRate), 100)}
              showInfo={false}
              strokeColor="#18b65b"
              size="small"
            />
          </div>
        ) : (
          '-'
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 150,
      render: (_: unknown, record: AgentTool) => timeText(record.updatedAt || record.createdAt),
    },
    {
      title: '操作',
      key: 'option',
      width: 210,
      render: (_: unknown, record: AgentTool) =>
        write && (
          <div className="tool-actions">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setId(record.id)
                setOpen(true)
              }}
            >
              编辑
            </Button>
            <Button type="link" disabled={!record.id} onClick={() => setTestToolId(record.id)}>
              测试
            </Button>
            <Popconfirm
              title={record.status === 1 ? '确认禁用该工具？' : '确认启用该工具？'}
              onConfirm={() => handleStatusChange(record)}
            >
              <Button type="link">{record.status === 1 ? '禁用' : '启用'}</Button>
            </Popconfirm>
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.agent.tool.deleteConfirm' })}
              onConfirm={() => handleDelete(record)}
            >
              <Tooltip title="删除">
                <Button type="link" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </div>
        ),
    },
  ]

  return (
    <PageContainer
      className="agent-tool-page"
      header={{ title: '工具中心', breadcrumb: undefined }}
    >
      <Spin spinning={statisticsLoading}>
        <div className="tool-stat-grid">
          <div className="tool-stat-card">
            <i className="stat-icon stat-blue">
              <AppstoreOutlined />
            </i>
            <div>
              <span>工具总数</span>
              <strong>{statistics?.totalCount || 0}</strong>
              <small>当前筛选范围内的工具</small>
            </div>
          </div>
          <div className="tool-stat-card">
            <i className="stat-icon stat-green">
              <CheckCircleFilled />
            </i>
            <div>
              <span>可用工具</span>
              <strong>{statistics?.enabledCount || 0}</strong>
              <small>
                {statistics?.totalCount
                  ? `${(((statistics.enabledCount || 0) / statistics.totalCount) * 100).toFixed(0)}% 可用率`
                  : '暂无工具'}
              </small>
            </div>
          </div>
          <div className="tool-stat-card">
            <i className="stat-icon stat-orange">
              <ApiOutlined />
            </i>
            <div>
              <span>已集成服务</span>
              <strong>{facets.sources.length}</strong>
              <small>已配置 MCP 服务</small>
            </div>
          </div>
          <div className="tool-stat-card">
            <i className="stat-icon stat-purple">
              <FileTextOutlined />
            </i>
            <div>
              <span>调用总次数</span>
              <strong>{(statistics?.callCount || 0).toLocaleString()}</strong>
              <small>成功率 {rate(statistics?.successRate).toFixed(1)}%</small>
            </div>
          </div>
        </div>
      </Spin>
      <div className="tool-workspace">
        <aside className="tool-sidebar">
          <section>
            <h3>工具分类</h3>
            <button
              className={!toolType ? 'selected' : ''}
              onClick={() => changeFilter(() => setToolType(undefined))}
            >
              <AppstoreOutlined />
              全部工具 <em>{statistics?.totalCount || 0}</em>
            </button>
            {facets.categories.map((item) => (
              <button
                key={String(item.value)}
                className={toolType === String(item.value) ? 'selected' : ''}
                onClick={() => changeFilter(() => setToolType(String(item.value)))}
              >
                {typeMeta(String(item.value))?.icon || <AppstoreOutlined />}
                {item.label}
                <em>{item.count}</em>
              </button>
            ))}
          </section>
          <section>
            <h3>集成状态</h3>
            <button
              className={status === undefined ? 'selected' : ''}
              onClick={() => changeFilter(() => setStatus(undefined))}
            >
              <i className="status-dot blue" />
              全部
            </button>
            {facets.statuses.map((item) => {
              const value = Number(item.value)
              return (
                <button
                  key={String(item.value)}
                  className={status === value ? 'selected' : ''}
                  onClick={() => changeFilter(() => setStatus(value))}
                >
                  <i className={`status-dot ${value === 1 ? 'green' : 'orange'}`} />
                  {item.label}
                  <em>{item.count}</em>
                </button>
              )
            })}
          </section>
          <section>
            <h3>来源</h3>
            <button
              className={!mcpServerId ? 'selected' : ''}
              onClick={() => changeFilter(() => setMcpServerId(undefined))}
            >
              <GlobalOutlined />
              全部来源
            </button>
            {facets.sources.slice(0, 5).map((source) => (
              <button
                key={String(source.value)}
                className={mcpServerId === String(source.value) ? 'selected' : ''}
                onClick={() => changeFilter(() => setMcpServerId(String(source.value)))}
              >
                <FolderOpenOutlined />
                {source.label}
                <em>{source.count}</em>
              </button>
            ))}
          </section>
        </aside>
        <main className="tool-table-panel">
          <div className="tool-filter-bar">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索工具名称、类型或描述"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={refresh}
            />
            <Select
              value={status}
              placeholder="全部状态"
              allowClear
              options={[
                { label: '已集成', value: 1 },
                { label: '未集成', value: 0 },
              ]}
              onChange={(value) => changeFilter(() => setStatus(value))}
            />
            <Select
              value={mcpServerId}
              placeholder="全部来源"
              allowClear
              options={facets.sources.map((source) => ({
                label: source.label,
                value: String(source.value),
              }))}
              onChange={(value) => changeFilter(() => setMcpServerId(value))}
            />
            {write && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setId(undefined)
                  setOpen(true)
                }}
              >
                添加工具
              </Button>
            )}
          </div>
          <ProTable<AgentTool>
            className="tool-center-table"
            actionRef={ref}
            rowKey="id"
            search={false}
            options={false}
            headerTitle={false}
            scroll={{ x: 1100 }}
            columns={columns}
            request={(params: AgentToolSearchParams) =>
              getAgentToolList({
                ...params,
                name: keyword || undefined,
                toolType,
                status,
                mcpServerId,
              })
            }
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </main>
      </div>
      <AgentToolForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          refresh()
          loadStatistics()
        }}
      />
      <AgentToolTestModal
        toolId={testToolId}
        open={Boolean(testToolId)}
        onClose={() => setTestToolId(undefined)}
      />
    </PageContainer>
  )
}
export default AgentToolPage
