import React, { useEffect, useRef, useState } from 'react'
import { ActionType, PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components'
import { useIntl } from '@umijs/max'
import {
  Alert,
  Card,
  DatePicker,
  Drawer,
  Empty,
  message,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import {
  getAgentRunInfo,
  getAgentRunList,
  getAgentRunStatistics,
} from '@/services/agent/RunController'
import { getOptionList } from '@/services/sys/DictController'
import { AgentRun, AgentRunSearchParams, AgentRunStatistics } from '@/services/entity/Agent'
import JsonDisplay from '@/components/JsonDisplay'
import MarkdownText from '@/components/MarkdownText'
import './index.less'
import {
  ApiOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  DatabaseOutlined,
  FieldTimeOutlined,
  WarningOutlined,
} from '@ant-design/icons'

const { Text } = Typography

const renderStatusTag = (status: number | undefined, intl: ReturnType<typeof useIntl>) => {
  if (status === 0) {
    return (
      <Tag color="success">{intl.formatMessage({ id: 'pages.agent.run.status.success' })}</Tag>
    )
  }
  if (status === 1) {
    return <Tag color="error">{intl.formatMessage({ id: 'pages.agent.run.status.failed' })}</Tag>
  }
  if (status === 2) {
    return (
      <Tag color="warning">{intl.formatMessage({ id: 'pages.agent.run.status.timeout' })}</Tag>
    )
  }
  return <Tag>{intl.formatMessage({ id: 'pages.agent.run.status.unknown' })}</Tag>
}

const { RangePicker } = DatePicker

const AgentRunPage: React.FC = () => {
  const intl = useIntl()
  const ref = useRef<ActionType>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [run, setRun] = useState<AgentRun>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [statistics, setStatistics] = useState<AgentRunStatistics>()
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[any, any] | null>(null)

  const loadStatistics = async () => {
    setStatisticsLoading(true)
    try {
      const params: any = {}
      if (dateRange) {
        params.startTime = dateRange[0]?.valueOf()
        params.endTime = dateRange[1]?.valueOf()
      }
      const { code, data, message: msg } = await getAgentRunStatistics(params)
      if (code === 200) {
        setStatistics(data)
      } else {
        message.error(msg || intl.formatMessage({ id: 'pages.agent.run.loadStatisticsFailed' }))
      }
    } finally {
      setStatisticsLoading(false)
    }
  }

  useEffect(() => {
    loadStatistics()
  }, [dateRange])

  const openDetail = async (record: AgentRun) => {
    if (!record.id) {
      message.error(intl.formatMessage({ id: 'pages.agent.run.missingId' }))
      return
    }

    setDrawerOpen(true)
    setDetailLoading(true)
    try {
      const { code, data, message: msg } = await getAgentRunInfo(record.id)
      if (code === 200) {
        setRun(data)
      } else {
        setRun(undefined)
        message.error(msg || intl.formatMessage({ id: 'pages.agent.run.loadDetailFailed' }))
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'pages.agent.run.agentId' }),
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.run.conversationId' }),
      dataIndex: 'conversationId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.run.messageId' }),
      dataIndex: 'messageId',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.run.model' }),
      dataIndex: 'model',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.status' }),
      key: 'status',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Run_Status'),
      render: (_: any, record: AgentRun) => renderStatusTag(record.status, intl),
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.run.totalTokens' }),
      dataIndex: 'totalTokens',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.run.latency' }),
      dataIndex: 'latencyMs',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.run.dateRange' }),
      dataIndex: 'dateRange',
      valueType: 'dateRange',
      hideInTable: true,
      renderFormItem: () => <RangePicker />,
      fieldProps: {
        style: { width: '100%' },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.common.createTime' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      width: 120,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentRun) => (
        <TableActionMenu
          items={[
            {
              key: 'detail',
              label: intl.formatMessage({ id: 'pages.agent.run.viewDetail' }),
              primary: true,
              onClick: () => openDetail(record),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageContainer className="agent-run-page">
      <Card
        className="agent-run-statistics"
        title={intl.formatMessage({ id: 'pages.agent.run.statistics' })}
        style={{ marginBottom: 16 }}
      >
        <Spin spinning={statisticsLoading}>
          {statistics ? (
            <div className="agent-run-statistics-grid">
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-blue">
                  <ApiOutlined />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.totalCalls' })}
                  value={statistics.totalCalls || 0}
                />
              </div>
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-green">
                  <CheckCircleFilled />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.successCalls' })}
                  value={statistics.successCalls || 0}
                />
              </div>
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-red">
                  <CloseCircleFilled />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.failedCalls' })}
                  value={statistics.failedCalls || 0}
                />
              </div>
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-orange">
                  <ClockCircleOutlined />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.timeoutCalls' })}
                  value={statistics.timeoutCalls || 0}
                />
              </div>
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-purple">
                  <DatabaseOutlined />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.totalTokens' })}
                  value={statistics.totalTokens || 0}
                />
              </div>
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-cyan">
                  <FieldTimeOutlined />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.averageLatency' })}
                  value={statistics.avgLatencyMs || 0}
                />
              </div>
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-red">
                  <WarningOutlined />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.errorRate' })}
                  value={
                    statistics.errorRate ? `${(statistics.errorRate * 100).toFixed(2)}%` : '0%'
                  }
                />
              </div>
            </div>
          ) : (
            <Empty description={intl.formatMessage({ id: 'pages.agent.run.noStatistics' })} />
          )}
        </Spin>
      </Card>
      <ProTable
        className="agent-run-table"
        actionRef={ref}
        rowKey="id"
        search={{
          labelWidth: 120,
          span: 6,
        }}
        request={async (params: AgentRunSearchParams) => {
          const { dateRange, ...rest } = params as any
          const queryParams: AgentRunSearchParams = { ...rest }
          if (dateRange) {
            // 设置为毫秒级时间戳
            queryParams.startTime = new Date(dateRange[0]).getTime()
            queryParams.endTime = new Date(dateRange[1]).getTime()
          }
          return getAgentRunList(queryParams)
        }}
        columns={columns}
      />
      <Drawer
        title={intl.formatMessage({ id: 'pages.agent.run.detail' })}
        width={760}
        className="agent-run-detail-drawer"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {run ? (
            <>
              <ProDescriptions
                column={1}
                dataSource={run}
                columns={[
                  { title: intl.formatMessage({ id: 'pages.common.id' }), dataIndex: 'id' },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.agentId' }),
                    dataIndex: 'agentDefinitionId',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.userId' }),
                    dataIndex: 'userId',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.conversationId' }),
                    dataIndex: 'conversationId',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.messageId' }),
                    dataIndex: 'messageId',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.modelProviderId' }),
                    dataIndex: 'modelProviderId',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.model' }),
                    dataIndex: 'model',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.common.status' }),
                    dataIndex: 'status',
                    render: (_: any, record: AgentRun) => renderStatusTag(record.status, intl),
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
              <Card
                title={intl.formatMessage({ id: 'pages.agent.run.tokensAndLatency' })}
                size="small"
                style={{ marginTop: 16 }}
              >
                <ProDescriptions
                  column={2}
                  dataSource={run}
                  columns={[
                    {
                      title: intl.formatMessage({ id: 'pages.agent.run.inputTokens' }),
                      dataIndex: 'promptTokens',
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.agent.run.outputTokens' }),
                      dataIndex: 'completionTokens',
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.agent.run.totalTokens' }),
                      dataIndex: 'totalTokens',
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.agent.run.totalLatency' }),
                      dataIndex: 'latencyMs',
                    },
                  ]}
                />
              </Card>
              <Card
                title={intl.formatMessage({ id: 'pages.agent.run.inputSummary' })}
                size="small"
                style={{ marginTop: 16 }}
                className="agent-run-card"
              >
                <MarkdownText content={run.inputContent} />
              </Card>
              <Card
                title={intl.formatMessage({ id: 'pages.agent.run.outputSummary' })}
                size="small"
                style={{ marginTop: 16 }}
                className="agent-run-card"
              >
                <MarkdownText content={run.outputContent} />
              </Card>
              <Card
                title={intl.formatMessage({ id: 'pages.agent.run.errorInfo' })}
                size="small"
                style={{ marginTop: 16 }}
                className="agent-run-card"
              >
                {run.errorMsg ? (
                  <MarkdownText content={run.errorMsg} error={true} />
                ) : (
                  <Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.noErrorInfo' })}
                  </Text>
                )}
              </Card>
            </>
          ) : (
            <Empty description={intl.formatMessage({ id: 'pages.agent.run.noDetail' })} />
          )}
        </Spin>
      </Drawer>
    </PageContainer>
  )
}

export default AgentRunPage
