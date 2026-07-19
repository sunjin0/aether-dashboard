import React, { useRef, useState } from 'react'
import { ActionType, PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components'
import {
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  message,
  Row,
  Spin,
  Statistic,
  Tag,
} from 'antd'
import { history, useAccess } from '@@/exports'
import TableActionMenu from '@/components/TableActionMenu'
import {
  closeAgentConversation,
  deleteAgentConversation,
  getAgentConversationInfo,
  getAgentConversationList,
  getAgentConversationMessages,
  getConversationLifecycle,
  getConversationStatistics,
} from '@/services/agent/ConversationController'
import { getOptionList } from '@/services/sys/DictController'
import {
  AgentConversation,
  AgentConversationSearchParams,
  AgentMessage,
  ConversationLifecycle,
  MessageStatistics,
} from '@/services/entity/Agent'
import AgentMessageBubble from '@/components/AgentMessageBubble'

// ProDescriptions 不支持 request，保留用于详情展示
const statusValueEnum = {
  0: { text: '进行中', status: 'Processing' },
  1: { text: '关闭', status: 'Default' },
  2: { text: '归档', status: 'Warning' },
}

const AgentConversationPage: React.FC = () => {
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentId, setCurrentId] = useState<string>()
  const [conversation, setConversation] = useState<AgentConversation>()
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [lifecycle, setLifecycle] = useState<ConversationLifecycle>()
  const [statistics, setStatistics] = useState<MessageStatistics>()
  const [detailLoading, setDetailLoading] = useState(false)

  const loadDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const [detailResult, messageResult, lifecycleResult, statisticsResult] = await Promise.all([
        getAgentConversationInfo(id),
        getAgentConversationMessages(id, { current: 1, pageSize: 20 }),
        getConversationLifecycle(id),
        getConversationStatistics(id),
      ])

      if (detailResult.code === 200) {
        setConversation(detailResult.data)
      } else {
        setConversation(undefined)
        message.error(detailResult.message || '加载会话详情失败')
      }

      if (messageResult.code === 200) {
        setMessages(messageResult.data || [])
      } else {
        setMessages([])
        message.error(messageResult.message || '加载消息列表失败')
      }

      if (lifecycleResult.code === 200) {
        setLifecycle(lifecycleResult.data)
      } else {
        setLifecycle(undefined)
      }

      if (statisticsResult.code === 200) {
        setStatistics(statisticsResult.data)
      } else {
        setStatistics(undefined)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const openDetail = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID')
      return
    }
    setCurrentId(record.id)
    setDrawerOpen(true)
    await loadDetail(record.id)
  }

  const handleCloseConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID')
      return
    }

    const { code, message: msg } = await closeAgentConversation(record.id)
    if (code === 200) {
      message.success(msg || '关闭成功')
      ref.current?.reload()
      if (record.id === currentId) {
        await loadDetail(record.id)
      }
    } else {
      message.error(msg || '关闭失败')
    }
  }

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    if (minutes > 0) {
      return `${minutes} 分钟 ${seconds} 秒`
    }
    return `${seconds} 秒`
  }

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`
    }
    return tokens.toString()
  }

  const formatLatency = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)} 秒`
    }
    return `${ms} 毫秒`
  }

  const lifecycleStatusMap: Record<number, { text: string; color: string }> = {
    0: { text: '进行中', color: 'processing' },
    1: { text: '已关闭', color: 'default' },
    2: { text: '已归档', color: 'warning' },
  }

  const handleDeleteConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID')
      return
    }

    const { code, message: msg } = await deleteAgentConversation(record.id)
    if (code === 200) {
      message.success(msg || '删除成功')
      ref.current?.reload()
      if (record.id === currentId) {
        setDrawerOpen(false)
        setCurrentId(undefined)
        setConversation(undefined)
        setMessages([])
      }
    } else {
      message.error(msg || '删除失败')
    }
  }

  const columns: any[] = [
    {
      title: '会话标题',
      dataIndex: 'title',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: 'Agent ID',
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'agent-conversation-status',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Conversation_Status'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentConversation) => (
        <TableActionMenu
          items={[
            { key: 'detail', label: '查看详情', primary: true, onClick: () => openDetail(record) },
            { key: 'close', label: '关闭', visible: write && record.status === 0, confirm: { title: '确认关闭该会话？' }, onClick: () => handleCloseConversation(record) },
            { key: 'delete', label: '删除', danger: true, visible: !!write, confirm: { title: '确认删除该会话？' }, onClick: () => handleDeleteConversation(record) },
          ]}
        />
      ),
    },
  ]

  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: AgentConversationSearchParams) => getAgentConversationList(params)}
        columns={columns}
      />
      <Drawer
        title="会话详情"
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {conversation ? (
            <ProDescriptions
              column={1}
              dataSource={conversation}
              columns={[
                { title: 'ID', dataIndex: 'id' },
                { title: '标题', dataIndex: 'title' },
                { title: 'Agent ID', dataIndex: 'agentDefinitionId' },
                {
                  title: '状态',
                  key: 'con-status',
                  dataIndex: 'status',
                  valueEnum: statusValueEnum,
                },
                { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime' },
                { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime' },
              ]}
            />
          ) : (
            <Empty description="暂无会话详情" />
          )}

          {lifecycle && (
            <Card title="会话生命周期" style={{ marginTop: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="创建时间">
                  {formatTimestamp(lifecycle.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="最后活跃">
                  {formatTimestamp(lifecycle.lastActiveAt)}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={lifecycleStatusMap[lifecycle.status]?.color}>
                    {lifecycleStatusMap[lifecycle.status]?.text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="持续时间">
                  {formatDuration(lifecycle.durationMs)}
                </Descriptions.Item>
                <Descriptions.Item label="用户消息">
                  {lifecycle.totalUserMessages} 条
                </Descriptions.Item>
                <Descriptions.Item label="助手消息">
                  {lifecycle.totalAssistantMessages} 条
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {statistics && (
            <Card title="消息统计" style={{ marginTop: 16 }}>
              <Row gutter={[24, 16]}>
                <Col span={6}>
                  <Statistic title="总消息数" value={statistics.totalMessages} suffix="条" />
                </Col>
                <Col span={6}>
                  <Statistic title="用户消息" value={statistics.userMessages} suffix="条" />
                </Col>
                <Col span={6}>
                  <Statistic title="助手消息" value={statistics.assistantMessages} suffix="条" />
                </Col>
                <Col span={6}>
                  <Statistic title="工具调用" value={statistics.toolMessages} suffix="条" />
                </Col>
              </Row>
              <Row gutter={[24, 16]} style={{ marginTop: 16 }}>
                <Col span={6}>
                  <Statistic
                    title="输入 Token"
                    value={formatTokens(statistics.totalPromptTokens)}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="输出 Token"
                    value={formatTokens(statistics.totalCompletionTokens)}
                  />
                </Col>
                <Col span={6}>
                  <Statistic title="总 Token" value={formatTokens(statistics.totalTokens)} />
                </Col>
                <Col span={6}>
                  <Statistic title="平均延迟" value={formatLatency(statistics.avgLatencyMs)} />
                </Col>
              </Row>
            </Card>
          )}

          <Card title="消息列表" style={{ marginTop: 16 }}>
            {!messages.length ? (
              <Empty description="暂无消息" />
            ) : (
              <div className="agent-conversation-message-list">
                {messages.map((item, index) => (
                  <AgentMessageBubble
                    key={item.id || `${item.role}-${index}`}
                    agentMessage={item}
                    compact={true}
                  />
                ))}
              </div>
            )}
          </Card>
        </Spin>
      </Drawer>
    </PageContainer>
  )
}

export default AgentConversationPage
