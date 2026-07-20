import React, { useRef, useState } from 'react'
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components'
import { Alert, Card, Drawer, Empty, message, Spin, Tag, Typography } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import {
  getAgentToolCallLogInfo,
  getAgentToolCallLogList,
} from '@/services/agent/ToolCallLogController'
import { getOptionList } from '@/services/sys/DictController'
import { AgentToolCallLog, AgentToolCallLogSearchParams } from '@/services/entity/Agent'
import JsonDisplay from '@/components/JsonDisplay'
import MarkdownText from '@/components/MarkdownText'
import './index.less'
import { useIntl } from '@umijs/max'

const { Text } = Typography

const renderStatusTag = (status: number | undefined, format: (id: string) => string) => {
  if (status === 0) {
    return <Tag color="success">{format('components.toolCallCard.status.success')}</Tag>
  }
  if (status === 1) {
    return <Tag color="error">{format('components.toolCallCard.status.failed')}</Tag>
  }
  if (status === 2) {
    return <Tag color="warning">{format('components.toolCallCard.status.timeout')}</Tag>
  }
  if (status === 3) {
    return <Tag color="purple">{format('components.toolCallCard.status.blocked')}</Tag>
  }
  return <Tag>{format('components.toolCallCard.status.unknown')}</Tag>
}

const AgentToolCallLogPage: React.FC = () => {
  const intl = useIntl()
  const format = (id: string) => intl.formatMessage({ id })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toolCallLog, setToolCallLog] = useState<AgentToolCallLog>()
  const [detailLoading, setDetailLoading] = useState(false)
  const detailRequestRef = useRef(0)

  const normalizeSearchParams = (
    params: Omit<AgentToolCallLogSearchParams, 'status'> & { status?: number | string | null },
  ): AgentToolCallLogSearchParams => {
    const { status, ...restParams } = params
    if (status === undefined || status === null || status === '') {
      return restParams
    }

    return {
      ...restParams,
      status: Number(status) as 0 | 1 | 2 | 3,
    }
  }

  const openDetail = async (record: AgentToolCallLog) => {
    if (!record.id) {
      message.error(format('pages.agent.toolCallLog.missingId'))
      return
    }

    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setToolCallLog(undefined)
    setDrawerOpen(true)
    setDetailLoading(true)
    try {
      const { code, data, message: msg } = await getAgentToolCallLogInfo(record.id)
      if (detailRequestRef.current !== requestId) {
        return
      }
      if (code === 200) {
        setToolCallLog(data)
      } else {
        setToolCallLog(undefined)
        message.error(msg || format('pages.agent.toolCallLog.loadDetailFailed'))
      }
    } catch {
      if (detailRequestRef.current === requestId) {
        setToolCallLog(undefined)
        message.error(format('pages.agent.toolCallLog.loadDetailFailed'))
      }
    } finally {
      if (detailRequestRef.current === requestId) {
        setDetailLoading(false)
      }
    }
  }

  const columns: any[] = [
    {
      title: format('pages.agent.toolCallLog.runId'),
      dataIndex: 'runId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.toolCallLog.toolId'),
      dataIndex: 'toolId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.toolCallLog.agentDefinitionId'),
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.toolCallLog.requestMethod'),
      dataIndex: 'requestMethod',
      valueType: 'select',
      request: async () => getOptionList('Agent_Http_Method'),
      width: 110,
    },
    {
      title: format('pages.agent.toolCallLog.httpStatus'),
      dataIndex: 'responseStatus',
      valueType: 'digit',
      hideInSearch: true,
      width: 120,
    },
    {
      title: format('pages.agent.toolCallLog.executionStatus'),
      key: 'toolCallStatus',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_ToolCall_Status'),
      render: (_: any, record: AgentToolCallLog) => renderStatusTag(record.status, format),
      width: 120,
    },
    {
      title: format('pages.agent.toolCallLog.latency'),
      dataIndex: 'latencyMs',
      valueType: 'digit',
      hideInSearch: true,
      width: 110,
    },
    {
      title: format('pages.common.createTime'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      width: 120,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentToolCallLog) => (
        <TableActionMenu
          items={[
            { key: 'detail', label: format('pages.agent.toolCallLog.viewDetail'), primary: true, onClick: () => openDetail(record) },
          ]}
        />
      ),
    },
  ]

  return (
    <PageContainer>
      <ProTable
        rowKey="id"
        request={async (params: AgentToolCallLogSearchParams) => {
          try {
            return await getAgentToolCallLogList(normalizeSearchParams(params))
          } catch {
            message.error(format('pages.agent.toolCallLog.loadListFailed'))
            return { data: [], total: 0, success: false }
          }
        }}
        search={{
          labelWidth: 120,
          span: 6,
        }}
        columns={columns}
        scroll={{ x: 1200 }}
      />
      <Drawer
        title={format('pages.agent.toolCallLog.detail')}
        width={820}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {toolCallLog ? (
            <>
              <ProDescriptions
                column={1}
                dataSource={toolCallLog}
                columns={[
                  { title: format('pages.common.id'), dataIndex: 'id' },
                  { title: format('pages.agent.toolCallLog.runId'), dataIndex: 'runId' },
                  { title: format('pages.agent.toolCallLog.toolId'), dataIndex: 'toolId' },
                  { title: format('pages.agent.toolCallLog.agentDefinitionId'), dataIndex: 'agentDefinitionId' },
                  { title: format('pages.agent.toolCallLog.requestMethod'), dataIndex: 'requestMethod' },
                  { title: format('pages.agent.toolCallLog.requestUrl'), dataIndex: 'requestUrl' },
                  { title: format('pages.agent.toolCallLog.httpStatus'), dataIndex: 'responseStatus' },
                  {
                    title: format('pages.agent.toolCallLog.executionStatus'),
                    dataIndex: 'status',
                    render: (_: any, record: AgentToolCallLog) => renderStatusTag(record.status, format),
                  },
                  { title: format('pages.agent.toolCallLog.latency'), dataIndex: 'latencyMs' },
                  { title: format('pages.common.createTime'), dataIndex: 'createdAt', valueType: 'dateTime' },
                  { title: format('pages.common.updateTime'), dataIndex: 'updatedAt', valueType: 'dateTime' },
                ]}
              />
              <Card
                title={format('pages.agent.toolCallLog.requestHeaders')}
                size="small"
                style={{ marginTop: 16 }}
                className="agent-tool-call-log-card"
              >
                <JsonDisplay content={toolCallLog.requestHeaders} />
              </Card>
              <Card
                title={format('pages.agent.toolCallLog.requestBody')}
                size="small"
                style={{ marginTop: 16 }}
                className="agent-tool-call-log-card"
              >
                <JsonDisplay content={toolCallLog.requestBody} />
              </Card>
              <Card
                title={format('pages.agent.toolCallLog.responseBody')}
                size="small"
                style={{ marginTop: 16 }}
                className="agent-tool-call-log-card"
              >
                <JsonDisplay content={toolCallLog.responseBody} />
              </Card>
              <Card
                title={format('pages.agent.toolCallLog.errorInformation')}
                size="small"
                style={{ marginTop: 16 }}
                className="agent-tool-call-log-card"
              >
                {toolCallLog.errorMsg ? (
                  <MarkdownText content={toolCallLog.errorMsg} error={true} />
                ) : (
                  <Text type="secondary">{format('pages.agent.toolCallLog.noErrorInformation')}</Text>
                )}
              </Card>
            </>
          ) : (
            <Empty description={format('pages.agent.toolCallLog.noDetail')} />
          )}
        </Spin>
      </Drawer>
    </PageContainer>
  )
}

export default AgentToolCallLogPage
