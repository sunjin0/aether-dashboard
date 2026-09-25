import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActionType, PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components'
import { history, useIntl } from '@umijs/max'
import type { Dayjs } from 'dayjs'
import {
  Alert,
  Button,
  Card,
  Collapse,
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
  getAgentRunPlan,
  getAgentRunStatistics,
  pauseAgentRun,
  resumeAgentRun,
  downloadToolAuditCsv,
} from '@/services/agent/RunController'
import { downloadBlob } from '@/utils/desktop'
import { getOptionList } from '@/services/sys/DictController'
import {
  AgentRun,
  AgentRunSearchParams,
  AgentRunStatistics,
  AgentRunStatisticsParams,
  AgentRunPlan,
} from '@/services/entity/Agent'
import JsonDisplay from '@/components/JsonDisplay'
import MarkdownText from '@/components/MarkdownText'
import AgentRunInputModules from './AgentRunInputModules'
import AgentRunStepsTimeline from './AgentRunStepsTimeline'
import './index.less'
import { useCreatorSearchColumn } from '@/components/CreatorSearchColumn'
import {
  ApiOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  DatabaseOutlined,
  FieldTimeOutlined,
  WarningOutlined,
  DownloadOutlined,
} from '@ant-design/icons'

const { Text } = Typography

const renderStatusTag = (status: number | undefined, executionMode: AgentRun['executionMode'], intl: ReturnType<typeof useIntl>) => {
  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'success', text: intl.formatMessage({ id: 'pages.agent.run.status.success' }) },
    1: { color: 'error', text: intl.formatMessage({ id: 'pages.agent.run.status.failed' }) },
    2: { color: 'warning', text: intl.formatMessage({ id: 'pages.agent.run.status.timeout' }) },
    3: executionMode === 'STANDARD'
      ? { color: 'warning', text: intl.formatMessage({ id: 'pages.agent.run.status.waitingUser' }) }
      : { color: 'processing', text: intl.formatMessage({ id: 'pages.agent.run.status.queued' }) },
    4: { color: 'cyan', text: intl.formatMessage({ id: 'pages.agent.run.status.running' }) },
    5: { color: 'default', text: intl.formatMessage({ id: 'pages.agent.run.status.cancelled' }) },
    6: { color: 'gold', text: intl.formatMessage({ id: 'pages.agent.run.status.paused' }) },
  }
  const item = statusMap[status ?? -1]

  return item ? (
    <Tag color={item.color}>{item.text}</Tag>
  ) : (
    <Tag>{intl.formatMessage({ id: 'pages.agent.run.status.unknown' })}</Tag>
  )
}

const renderPlanStepStatus = (status: string | undefined, intl: ReturnType<typeof useIntl>) => {
  const statusMap: Record<string, { color: string; text: string }> = {
    PENDING: { color: 'default', text: intl.formatMessage({ id: 'pages.agent.run.plan.stepStatus.pending' }) },
    RUNNING: { color: 'processing', text: intl.formatMessage({ id: 'pages.agent.run.plan.stepStatus.running' }) },
    COMPLETED: { color: 'success', text: intl.formatMessage({ id: 'pages.agent.run.plan.stepStatus.completed' }) },
    FAILED: { color: 'error', text: intl.formatMessage({ id: 'pages.agent.run.plan.stepStatus.failed' }) },
    CANCELLED: { color: 'default', text: intl.formatMessage({ id: 'pages.agent.run.plan.stepStatus.cancelled' }) },
  }
  const item = statusMap[(status || '').toUpperCase()]

  return <Tag color={item?.color}>{item?.text || status}</Tag>
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
  const [plan, setPlan] = useState<AgentRunPlan>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [statistics, setStatistics] = useState<AgentRunStatistics>()
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [agentScopeId, setAgentScopeId] = useState(
    () => new URLSearchParams(history?.location?.search || '').get('agentDefinitionId') || undefined,
  )
  const agentDefinitionIdRef = useRef<string>()
  const detailRequestTokenRef = useRef(0)
  const statisticsRequestTokenRef = useRef(0)
  const creatorColumn = useCreatorSearchColumn<AgentRun>()

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
    setPlan(undefined)
    setDetailLoading(true)
    try {
      const { code, data } = await getAgentRunInfo(record.id)
      if (requestToken !== detailRequestTokenRef.current) {
        return
      }
      if (code === 200) {
        setRun(data)
        if (data.executionMode === 'DEEP') {
          const planResponse = await getAgentRunPlan(record.id)
          if (requestToken === detailRequestTokenRef.current && planResponse.code === 200) setPlan(planResponse.data)
        }
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
      hideInSearch: Boolean(agentScopeId),
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
      render: (_: any, record: AgentRun) => renderStatusTag(record.status, record.executionMode, intl),
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

  // 暂停/继续按钮挂在「执行计划」卡片右上角：脱离计划单独成卡时既无标题也无定位意义。
  const renderRunActions = () => {
    if (!run || run.executionMode !== 'DEEP' || !run.id) {
      return null
    }
    const runId = run.id
    const applyStatus = (status: NonNullable<AgentRun['status']>) =>
      setRun((prev) => (prev ? { ...prev, status } : prev))

    if (run.status === 6) {
      return (
        <Button
          type="primary"
          size="small"
          onClick={async () => {
            try {
              await resumeAgentRun(runId)
              message.success(intl.formatMessage({ id: 'pages.agent.run.action.resumed' }))
              applyStatus(3)
            } catch (e) {
              message.error(intl.formatMessage({ id: 'pages.agent.run.action.failed' }))
            }
          }}
        >
          {intl.formatMessage({ id: 'pages.agent.run.action.resume' })}
        </Button>
      )
    }

    if (run.status !== 3 && run.status !== 4) {
      return null
    }

    return (
      <Button
        size="small"
        onClick={async () => {
          try {
            await pauseAgentRun(runId)
            message.success(intl.formatMessage({ id: 'pages.agent.run.action.paused' }))
            applyStatus(6)
          } catch (e) {
            message.error(intl.formatMessage({ id: 'pages.agent.run.action.failed' }))
          }
        }}
      >
        {intl.formatMessage({ id: 'pages.agent.run.action.pause' })}
      </Button>
    )
  }

  return (
    <PageContainer className="agent-run-page">
      {agentScopeId && (
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: 'pages.agent.platform.agentRunScope',
          }, { id: agentScopeId })}
          action={
            <Button
              type="link"
              onClick={() => {
                setAgentScopeId(undefined)
                history.replace('/agent/run')
                ref.current?.reload()
              }}
            >
              {intl.formatMessage({ id: 'pages.agent.platform.clearAgentRunScope' })}
            </Button>
          }
        />
      )}
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
                <i className="run-stat-icon run-stat-blue">
                  <DatabaseOutlined />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.cachedPromptTokens' })}
                  value={statistics.totalCachedPromptTokens || 0}
                />
              </div>
              <div className="agent-run-stat-card">
                <i className="run-stat-icon run-stat-green">
                  <DatabaseOutlined />
                </i>
                <Statistic
                  title={intl.formatMessage({ id: 'pages.agent.run.promptCacheHitRate' })}
                  value={Number.isFinite(statistics.promptCacheHitRate) ? statistics.promptCacheHitRate : 0}
                  precision={2}
                  suffix="%"
                />
                <span className="agent-run-stat-hint">
                  {intl.formatMessage({ id: 'pages.agent.run.cacheObservedCalls' }, {
                    observed: statistics.cacheObservedCallCount || 0,
                    total: (statistics.cacheObservedCallCount || 0) + (statistics.cacheUnobservedCallCount || 0),
                  })}
                </span>
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
          const queryParams: AgentRunSearchParams = {
            ...rest,
            agentDefinitionId: agentScopeId || rest.agentDefinitionId,
          }
          if (tableDateRange) {
            // 设置为毫秒级时间戳
            queryParams.startTime = tableDateRange[0].valueOf()
            queryParams.endTime = tableDateRange[1].valueOf()
          }
          agentDefinitionIdRef.current = queryParams.agentDefinitionId
          void loadStatistics(dateRange, queryParams.agentDefinitionId)
          return getAgentRunList(queryParams)
        }}
        columns={[...(creatorColumn ? [creatorColumn] : []), ...columns]}
        toolBarRender={() => [
          <Button key="export-audit" icon={<DownloadOutlined />} onClick={async () => {
            const blob = await downloadToolAuditCsv(dateRange ? { startTime: dateRange[0].valueOf(), endTime: dateRange[1].valueOf() } : undefined)
            await downloadBlob(blob, 'tool-audit.csv')
          }}>{intl.formatMessage({ id: 'pages.agent.run.exportAudit' })}</Button>,
        ]}
      />
      <Drawer
        title={intl.formatMessage({ id: 'pages.agent.run.detail' })}
        width="min(1000px, 100vw)"
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
            <div className="agent-run-detail-body">
              <Card
                className="agent-run-card"
                title={intl.formatMessage({ id: 'pages.agent.run.section.keyInfo' })}
                size="small"
              >
                <ProDescriptions
                  column={{ xs: 1, sm: 2 }}
                  dataSource={run}
                  columns={[
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
                      title: intl.formatMessage({ id: 'pages.common.status' }),
                      dataIndex: 'status',
                      render: (_: any, record: AgentRun) =>
                        renderStatusTag(record.status, record.executionMode, intl),
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.agent.run.model' }),
                      dataIndex: 'model',
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.agent.run.totalLatency' }),
                      dataIndex: 'latencyMs',
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
                <Collapse
                  ghost
                  size="small"
                  className="agent-run-identifiers"
                  items={[
                    {
                      key: 'identifiers',
                      label: intl.formatMessage({ id: 'pages.agent.run.section.identifiers' }),
                      children: (
                        <ProDescriptions
                          column={{ xs: 1, sm: 2 }}
                          dataSource={run}
                          columns={[
                            { title: intl.formatMessage({ id: 'pages.common.id' }), dataIndex: 'id' },
                            {
                              title: intl.formatMessage({ id: 'pages.agent.run.agentId' }),
                              dataIndex: 'agentDefinitionId',
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
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              </Card>
              {run.executionMode === 'DEEP' && run.id && (
                <Card
                  className="agent-run-card"
                  title={intl.formatMessage({ id: 'pages.agent.run.plan.title' })}
                  size="small"
                  extra={renderRunActions()}
                >
                  {plan?.versions?.length ? (
                    plan.versions
                      .slice()
                      .reverse()
                      .map((version) => (
                        <div className="agent-run-plan-version" key={version.version}>
                          <div className="agent-run-plan-version-head">
                            <Tag color="blue">
                              {intl.formatMessage(
                                { id: 'pages.agent.run.plan.version' },
                                { version: version.version },
                              )}
                            </Tag>
                            {(version.summary || version.reason) && (
                              <Text type="secondary">{version.summary || version.reason}</Text>
                            )}
                          </div>
                          {version.steps?.map((step) => (
                            <div className="agent-run-plan-step" key={step.id || step.stepKey}>
                              {renderPlanStepStatus(step.status, intl)}
                              <span className="agent-run-plan-step-title">
                                {step.sequence}. {step.title}
                              </span>
                              {step.resultSummary && (
                                <Text type="secondary" className="agent-run-plan-step-result">
                                  {step.resultSummary}
                                </Text>
                              )}
                            </div>
                          ))}
                        </div>
                      ))
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={intl.formatMessage({ id: 'pages.agent.run.plan.empty' })}
                    />
                  )}
                </Card>
              )}
              {run.executionMode === 'DEEP' && run.id && (
                <Card
                  className="agent-run-card"
                  title={intl.formatMessage({ id: 'pages.agent.run.steps' })}
                  size="small"
                >
                  <AgentRunStepsTimeline runId={run.id} />
                </Card>
              )}
              <Card
                className="agent-run-card"
                title={intl.formatMessage({ id: 'pages.agent.run.tokensAndLatency' })}
                size="small"
              >
                <ProDescriptions
                  column={{ xs: 1, sm: 2, md: 4 }}
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
                className="agent-run-card"
                title={intl.formatMessage({ id: 'pages.agent.run.inputSummary' })}
                size="small"
              >
                <AgentRunInputModules content={run.inputContent} model={run.model} />
              </Card>
              <Card
                className="agent-run-card"
                title={intl.formatMessage({ id: 'pages.agent.run.outputSummary' })}
                size="small"
              >
                <MarkdownText content={run.outputContent} />
              </Card>
              <Card
                className="agent-run-card"
                title={intl.formatMessage({ id: 'pages.agent.run.rawResponse' })}
                size="small"
              >
                {run.rawResponse ? (
                  <JsonDisplay content={run.rawResponse} />
                ) : (
                  <Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.noRawResponse' })}
                  </Text>
                )}
              </Card>
              {run.errorMsg && (
                <Card
                  className="agent-run-card"
                  title={intl.formatMessage({ id: 'pages.agent.run.errorInfo' })}
                  size="small"
                >
                  <MarkdownText content={run.errorMsg} error={true} />
                </Card>
              )}
            </div>
          ) : (
            <Empty description={intl.formatMessage({ id: 'pages.agent.run.noDetail' })} />
          )}
        </Spin>
      </Drawer>
    </PageContainer>
  )
}

export default AgentRunPage
