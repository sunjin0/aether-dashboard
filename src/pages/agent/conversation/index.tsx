import React, { useRef, useState } from 'react'
import { ActionType, PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components'
import { Card, Col, Descriptions, Drawer, Empty, message, Row, Spin, Statistic, Tag } from 'antd'
import { history, useAccess, useIntl } from '@@/exports'
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

const AgentConversationPage: React.FC = () => {
  const intl = useIntl()
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
      }

      if (messageResult.code === 200) {
        setMessages(messageResult.data || [])
      } else {
        setMessages([])
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
      message.error(intl.formatMessage({ id: 'pages.agent.conversation.missingId' }))
      return
    }
    setCurrentId(record.id)
    setDrawerOpen(true)
    await loadDetail(record.id)
  }

  const handleCloseConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error(intl.formatMessage({ id: 'pages.agent.conversation.missingId' }))
      return
    }

    try {
      const { code } = await closeAgentConversation(record.id)
      if (code === 200) {
      ref.current?.reload()
      if (record.id === currentId) {
        await loadDetail(record.id)
      }
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    if (minutes > 0) {
      return intl.formatMessage(
        { id: 'pages.agent.conversation.durationMinutesSeconds' },
        { minutes, seconds },
      )
    }
    return intl.formatMessage({ id: 'pages.agent.conversation.durationSeconds' }, { seconds })
  }

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString(intl.locale)
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
      return intl.formatMessage(
        { id: 'pages.agent.conversation.latencySeconds' },
        { seconds: (ms / 1000).toFixed(1) },
      )
    }
    return intl.formatMessage(
      { id: 'pages.agent.conversation.latencyMilliseconds' },
      { milliseconds: ms },
    )
  }

  const lifecycleStatusMap: Record<number, { text: string; color: string }> = {
    0: {
      text: intl.formatMessage({ id: 'pages.agent.conversation.status.active' }),
      color: 'processing',
    },
    1: {
      text: intl.formatMessage({ id: 'pages.agent.conversation.status.closed' }),
      color: 'default',
    },
    2: {
      text: intl.formatMessage({ id: 'pages.agent.conversation.status.archived' }),
      color: 'warning',
    },
  }

  const handleDeleteConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error(intl.formatMessage({ id: 'pages.agent.conversation.missingId' }))
      return
    }

    try {
      const { code } = await deleteAgentConversation(record.id)
      if (code === 200) {
      ref.current?.reload()
      if (record.id === currentId) {
        setDrawerOpen(false)
        setCurrentId(undefined)
        setConversation(undefined)
        setMessages([])
      }
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'pages.agent.conversation.title' }),
      dataIndex: 'title',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.conversation.agentId' }),
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.status' }),
      key: 'agent-conversation-status',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Conversation_Status'),
    },
    {
      title: intl.formatMessage({ id: 'pages.common.createTime' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.updateTime' }),
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      width: 250,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentConversation) => (
        <TableActionMenu
          items={[
            {
              key: 'detail',
              label: intl.formatMessage({ id: 'pages.agent.conversation.viewDetail' }),
              primary: true,
              onClick: () => openDetail(record),
            },
            {
              key: 'close',
              label: intl.formatMessage({ id: 'pages.common.close' }),
              primary: true,
              visible: write && record.status === 0,
              confirm: {
                title: intl.formatMessage({ id: 'pages.agent.conversation.closeConfirm' }),
              },
              onClick: () => handleCloseConversation(record),
            },
            {
              key: 'delete',
              label: intl.formatMessage({ id: 'pages.common.delete' }),
              primary: true,
              danger: true,
              visible: !!write,
              confirm: {
                title: intl.formatMessage({ id: 'pages.agent.conversation.deleteConfirm' }),
              },
              onClick: () => handleDeleteConversation(record),
            },
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
        title={intl.formatMessage({ id: 'pages.agent.conversation.detail' })}
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
                { title: intl.formatMessage({ id: 'pages.common.id' }), dataIndex: 'id' },
                {
                  title: intl.formatMessage({ id: 'pages.agent.conversation.title' }),
                  dataIndex: 'title',
                },
                {
                  title: intl.formatMessage({ id: 'pages.agent.conversation.agentId' }),
                  dataIndex: 'agentDefinitionId',
                },
                {
                  title: intl.formatMessage({ id: 'pages.common.status' }),
                  key: 'con-status',
                  dataIndex: 'status',
                  valueEnum: {
                    0: {
                      text: intl.formatMessage({ id: 'pages.agent.conversation.status.active' }),
                      status: 'Processing',
                    },
                    1: {
                      text: intl.formatMessage({ id: 'pages.agent.conversation.status.closed' }),
                      status: 'Default',
                    },
                    2: {
                      text: intl.formatMessage({ id: 'pages.agent.conversation.status.archived' }),
                      status: 'Warning',
                    },
                  },
                },
                {
                  title: intl.formatMessage({ id: 'pages.common.createTime' }),
                  dataIndex: 'createdAt',
                  valueType: 'dateTime',
                },
                {
                  title: intl.formatMessage({ id: 'pages.common.updateTime' }),
                  dataIndex: 'updatedAt',
                  valueType: 'dateTime',
                },
              ]}
            />
          ) : (
            <Empty description={intl.formatMessage({ id: 'pages.agent.conversation.noDetail' })} />
          )}

          {lifecycle && (
            <Card
              title={intl.formatMessage({ id: 'pages.agent.conversation.lifecycle' })}
              style={{ marginTop: 16 }}
            >
              <Descriptions column={2}>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.common.createTime' })}>
                  {formatTimestamp(lifecycle.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.agent.conversation.lastActive' })}
                >
                  {formatTimestamp(lifecycle.lastActiveAt)}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'pages.common.status' })}>
                  <Tag color={lifecycleStatusMap[lifecycle.status]?.color}>
                    {lifecycleStatusMap[lifecycle.status]?.text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.agent.conversation.duration' })}
                >
                  {formatDuration(lifecycle.durationMs)}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.agent.conversation.userMessages' })}
                >
                  {intl.formatMessage(
                    { id: 'pages.agent.conversation.count' },
                    { count: lifecycle.totalUserMessages },
                  )}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.agent.conversation.assistantMessages' })}
                >
                  {intl.formatMessage(
                    { id: 'pages.agent.conversation.count' },
                    { count: lifecycle.totalAssistantMessages },
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {statistics && (
            <Card
              title={intl.formatMessage({ id: 'pages.agent.conversation.statistics' })}
              style={{ marginTop: 16 }}
            >
              <Row gutter={[24, 16]}>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.totalMessages' })}
                    value={statistics.totalMessages}
                    suffix={intl.formatMessage(
                      { id: 'pages.agent.conversation.count' },
                      { count: '' },
                    )}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.userMessages' })}
                    value={statistics.userMessages}
                    suffix={intl.formatMessage(
                      { id: 'pages.agent.conversation.count' },
                      { count: '' },
                    )}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.assistantMessages' })}
                    value={statistics.assistantMessages}
                    suffix={intl.formatMessage(
                      { id: 'pages.agent.conversation.count' },
                      { count: '' },
                    )}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.toolCalls' })}
                    value={statistics.toolMessages}
                    suffix={intl.formatMessage(
                      { id: 'pages.agent.conversation.count' },
                      { count: '' },
                    )}
                  />
                </Col>
              </Row>
              <Row gutter={[24, 16]} style={{ marginTop: 16 }}>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.inputTokens' })}
                    value={formatTokens(statistics.totalPromptTokens)}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.outputTokens' })}
                    value={formatTokens(statistics.totalCompletionTokens)}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.totalTokens' })}
                    value={formatTokens(statistics.totalTokens)}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={intl.formatMessage({ id: 'pages.agent.conversation.averageLatency' })}
                    value={formatLatency(statistics.avgLatencyMs)}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Card
            title={intl.formatMessage({ id: 'pages.agent.conversation.messageList' })}
            style={{ marginTop: 16 }}
          >
            {!messages.length ? (
              <Empty
                description={intl.formatMessage({ id: 'pages.agent.conversation.noMessages' })}
              />
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
