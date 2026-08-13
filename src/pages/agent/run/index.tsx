import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActionType, PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components'
import { useIntl } from '@umijs/max'
import type { Dayjs } from 'dayjs'
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
import {
  AgentRun,
  AgentRunSearchParams,
  AgentRunStatistics,
  AgentRunStatisticsParams,
} from '@/services/entity/Agent'
import JsonDisplay from '@/components/JsonDisplay'
import MarkdownText from '@/components/MarkdownText'
import AgentRunStepsTimeline from './AgentRunStepsTimeline'
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
  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'success', text: intl.formatMessage({ id: 'pages.agent.run.status.success' }) },
    1: { color: 'error', text: intl.formatMessage({ id: 'pages.agent.run.status.failed' }) },
    2: { color: 'warning', text: intl.formatMessage({ id: 'pages.agent.run.status.timeout' }) },
    3: { color: 'processing', text: intl.formatMessage({ id: 'pages.agent.run.status.queued' }) },
    4: { color: 'cyan', text: intl.formatMessage({ id: 'pages.agent.run.status.running' }) },
    5: { color: 'default', text: intl.formatMessage({ id: 'pages.agent.run.status.cancelled' }) },
  }
  const item = statusMap[status ?? -1]

  return item ? (
    <Tag color={item.color}>{item.text}</Tag>
  ) : (
    <Tag>{intl.formatMessage({ id: 'pages.agent.run.status.unknown' })}</Tag>
  )
}

const { RangePicker } = DatePicker

type AgentRunSearchFormParams = AgentRunSearchParams & {
  dateRange?: [Dayjs, Dayjs]
}

const AgentRunPage: React.FC = () => {
  const intl = useIntl()
  const ref = useRef<ActionType>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [run, setRun] = useState<AgentRun>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [statistics, setStatistics] = useState<AgentRunStatistics>()
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const agentDefinitionIdRef = useRef<string>()
  const detailRequestTokenRef = useRef(0)
  const statisticsRequestTokenRef = useRef(0)

  const loadStatistics = useCallback(
    async (
      selectedDateRange: [Dayjs, Dayjs] | null,
      agentDefinitionId = agentDefinitionIdRef.current,
    ) => {
      const requestToken = ++statisticsRequestTokenRef.current
      setStatisticsLoading(true)
      try {
        const params: AgentRunStatisticsParams = {}
        if (agentDefinitionId) {
          params.agentDefinitionId = agentDefinitionId
        }
        if (selectedDateRange) {
          params.startTime = selectedDateRange[0]?.valueOf()
          params.endTime = selectedDateRange[1]?.valueOf()
        }
        const { code, data } = await getAgentRunStatistics(params)
        if (requestToken !== statisticsRequestTokenRef.current) {
          return
        }
        if (code === 200) {
          setStatistics(data)
        }
      } catch {
        if (requestToken === statisticsRequestTokenRef.current) {
        }
      } finally {
        if (requestToken === statisticsRequestTokenRef.current) {
          setStatisticsLoading(false)
        }
      }
    },
    [intl],
  )

  useEffect(() => {
    void loadStatistics(dateRange)
  }, [dateRange, loadStatistics])

  const openDetail = async (record: AgentRun) => {
    if (!record.id) {
      message.error(intl.formatMessage({ id: 'pages.agent.run.missingId' }))
      return
    }

    const requestToken = ++detailRequestTokenRef.current
    setDrawerOpen(true)
    setRun(undefined)
    setDetailLoading(true)
    try {
      const { code, data } = await getAgentRunInfo(record.id)
      if (requestToken !== detailRequestTokenRef.current) {
        return
      }
      if (code === 200) {
        setRun(data)
      } else {
        setRun(undefined)
      }
    } catch {
      if (requestToken === detailRequestTokenRef.current) {
        setRun(undefined)
      }
    } finally {
      if (requestToken === detailRequestTokenRef.current) {
        setDetailLoading(false)
      }
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
      title: intl.formatMessage({ id: 'pages.agent.run.executionMode' }),
      dataIndex: 'executionMode',
      valueType: 'select',
      valueEnum: {
        STANDARD: { text: intl.formatMessage({ id: 'pages.agent.run.executionMode.standard' }) },
        DEEP: { text: intl.formatMessage({ id: 'pages.agent.run.executionMode.deep' }) },
      },
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
        extra={
          <RangePicker
            value={dateRange}
            onChange={(value) => {
              setDateRange(value && value[0] && value[1] ? [value[0], value[1]] : null)
            }}
          />
        }
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
        request={async (params: AgentRunSearchFormParams) => {
          const { dateRange: tableDateRange, ...rest } = params
          const queryParams: AgentRunSearchParams = { ...rest }
          if (tableDateRange) {
            // 设置为毫秒级时间戳
            queryParams.startTime = tableDateRange[0].valueOf()
            queryParams.endTime = tableDateRange[1].valueOf()
          }
          agentDefinitionIdRef.current = queryParams.agentDefinitionId
          void loadStatistics(dateRange, queryParams.agentDefinitionId)
          return getAgentRunList(queryParams)
        }}
        columns={columns}
      />
      <Drawer
        title={intl.formatMessage({ id: 'pages.agent.run.detail' })}
        width={760}
        className="agent-run-detail-drawer"
        open={drawerOpen}
        onClose={() => {
          detailRequestTokenRef.current += 1
          setDrawerOpen(false)
          setDetailLoading(false)
        }}
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
                    title: intl.formatMessage({ id: 'pages.agent.run.executionMode' }),
                    dataIndex: 'executionMode',
                    render: (value: React.ReactNode) => (
                      <Tag color={value === 'DEEP' ? 'purple' : 'blue'}>
                        {value === 'DEEP'
                          ? intl.formatMessage({ id: 'pages.agent.run.executionMode.deep' })
                          : intl.formatMessage({ id: 'pages.agent.run.executionMode.standard' })}
                      </Tag>
                    ),
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.externalRunId' }),
                    dataIndex: 'externalRunId',
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
              {run.executionMode === 'DEEP' && run.id && (
                <Card
                  title={intl.formatMessage({ id: 'pages.agent.run.steps' })}
                  size="small"
                  style={{ marginTop: 16 }}
                >
                  <AgentRunStepsTimeline runId={run.id} />
                </Card>
              )}
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
                <JsonDisplay content={run.inputContent} />
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
