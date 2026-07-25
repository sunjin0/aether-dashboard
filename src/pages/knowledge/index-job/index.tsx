import { KnowledgeIndexJob, KnowledgeIndexJobSearchParams } from '@/services/entity/Agent'
import { getIndexJobList, retryIndexJob } from '@/services/knowledge/IndexJobController'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { useAccess, useIntl } from '@@/exports'
import { Descriptions, message, Tag, Tabs, Tooltip } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import React, { useMemo, useRef, useState } from 'react'

/** 将任务起止时间转换为可快速识别的耗时文本。 */
const formatDuration = (
  startedAt?: number,
  finishedAt?: number,
  intl?: ReturnType<typeof useIntl>,
) => {
  if (!startedAt) return '-'
  const duration = (finishedAt || Date.now()) - startedAt
  if (duration < 1000) return `${duration} ms`
  if (duration < 60_000)
    return intl
      ? intl.formatMessage(
        { id: 'pages.knowledge.indexJob.duration.seconds' },
        { value: (duration / 1000).toFixed(1) },
      )
      : `${(duration / 1000).toFixed(1)} 秒`
  return intl
    ? intl.formatMessage(
      { id: 'pages.knowledge.indexJob.duration.minutes' },
      { minutes: Math.floor(duration / 60_000), seconds: Math.floor((duration % 60_000) / 1000) },
    )
    : `${Math.floor(duration / 60_000)} 分 ${Math.floor((duration % 60_000) / 1000)} 秒`
}

const IdText: React.FC<{ value?: string }> = ({ value }) => (
  <Tooltip title={value}>
    <span>{value || '-'}</span>
  </Tooltip>
)

const KnowledgeIndexJobPage: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const access = useAccess()
  const canRetry = access['/knowledge/document'] || access['/knowledge/index-job']
  const intl = useIntl()

  const statusLabels: Record<string, { text: string; color: string }> = {
    pending: {
      text: intl.formatMessage({ id: 'pages.knowledge.indexJob.status.pending' }),
      color: 'default',
    },
    running: {
      text: intl.formatMessage({ id: 'pages.knowledge.indexJob.status.running' }),
      color: 'processing',
    },
    success: {
      text: intl.formatMessage({ id: 'pages.knowledge.indexJob.status.success' }),
      color: 'success',
    },
    failed: {
      text: intl.formatMessage({ id: 'pages.knowledge.indexJob.status.failed' }),
      color: 'error',
    },
    cancelled: {
      text: intl.formatMessage({ id: 'pages.knowledge.indexJob.status.cancelled' }),
      color: 'default',
    },
  }

  const jobTypeLabels: Record<string, string> = {
    create: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.create' }),
    upload: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.upload' }),
    update: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.update' }),
    reindex: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.reindex' }),
    rollback: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.rollback' }),
    retry: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.retry' }),
  }

  const [statusTab, setStatusTab] = useState<string>('all')
  const [pollingInterval, setPollingInterval] = useState<number | undefined>(3000)
  const hasActiveRef = useRef(false)

  const statusTabItems = useMemo(() => [
    { key: 'all', label: intl.formatMessage({ id: 'pages.knowledge.indexJob.status.all' }) },
    { key: 'running', label: statusLabels.running.text },
    { key: 'success', label: statusLabels.success.text },
    { key: 'failed', label: statusLabels.failed.text },
  ], [intl, statusLabels])

  const handleRequest = async (params: KnowledgeIndexJobSearchParams) => {
    const result = await getIndexJobList(params)
    const hasActive = (result.data || []).some(
      (j) => j.status === 'running' || j.status === 'pending',
    )
    if (hasActive !== hasActiveRef.current) {
      hasActiveRef.current = hasActive
      setPollingInterval(hasActive ? 3000 : undefined)
    }
    return result
  }

  return (
    <PageContainer title={intl.formatMessage({ id: 'pages.knowledge.indexJob.title' })}>
      <Tabs
        activeKey={statusTab}
        onChange={(key) => {
          setStatusTab(key)
          actionRef.current?.reload()
        }}
        items={statusTabItems}
      />
      <ProTable<KnowledgeIndexJob>
        actionRef={actionRef}
        polling={pollingInterval}
        rowKey="id"
        scroll={{ x: 1800 }}
        request={handleRequest}
        params={{ status: statusTab === 'all' ? undefined : statusTab }}
        expandable={{
          expandedRowRender: (record) => (
            <Descriptions size="small" column={3} bordered>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.taskId' })}
                span={3}
              >
                {record.id || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.knowledgeBaseId' })}
              >
                {record.knowledgeBaseId || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.documentId' })}
              >
                {record.documentId || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.versionId' })}
              >
                {record.documentVersionId || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.createdAt' })}
              >
                {record.createdAt ? new Date(record.createdAt).toLocaleString(intl.locale) : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.startedAt' })}
              >
                {record.startedAt ? new Date(record.startedAt).toLocaleString(intl.locale) : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.finishedAt' })}
              >
                {record.finishedAt ? new Date(record.finishedAt).toLocaleString(intl.locale) : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.knowledge.indexJob.statistics' })}
                span={3}
              >
                {record.statistics
                  ? typeof record.statistics === 'string'
                    ? record.statistics
                    : JSON.stringify(record.statistics)
                  : '-'}
              </Descriptions.Item>
              {record.errorMessage && (
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'pages.knowledge.indexJob.errorInfo' })}
                  span={3}
                >
                  {record.errorMessage}
                </Descriptions.Item>
              )}
            </Descriptions>
          ),
        }}
        columns={[
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobTypeColumn' }),
            dataIndex: 'jobType',
            valueType: 'select',
            valueEnum: {
              create: {
                text: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.create' }),
              },
              upload: {
                text: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.upload' }),
              },
              update: {
                text: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.update' }),
              },
              reindex: {
                text: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.reindex' }),
              },
              rollback: {
                text: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.rollback' }),
              },
              retry: { text: intl.formatMessage({ id: 'pages.knowledge.indexJob.jobType.retry' }) },
            },
            render: (_, record) => (
              <Tag
                color={
                  record.jobType === 'reindex'
                    ? 'blue'
                    : record.jobType === 'retry'
                      ? 'orange'
                      : 'cyan'
                }
              >
                {jobTypeLabels[record.jobType || ''] || record.jobType || '-'}
              </Tag>
            ),
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.knowledgeBaseId' }),
            dataIndex: 'knowledgeBaseId',
            width: 170,
            ellipsis: true,
            render: (_, record) => <IdText value={record.knowledgeBaseId} />,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.documentId' }),
            dataIndex: 'documentId',
            width: 170,
            ellipsis: true,
            render: (_, record) => <IdText value={record.documentId} />,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.versionId' }),
            dataIndex: 'documentVersionId',
            width: 170,
            ellipsis: true,
            render: (_, record) => <IdText value={record.documentVersionId} />,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.statusColumn' }),
            dataIndex: 'status',
            valueType: 'select',
            valueEnum: Object.fromEntries(
              Object.entries(statusLabels).map(([key, value]) => [key, { text: value.text }]),
            ),
            render: (_, record) => {
              const status = statusLabels[record.status || 'pending']
              return <Tag color={status.color}>{status.text}</Tag>
            },
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.retryColumn' }),
            width: 100,
            hideInSearch: true,
            render: (_, record) => `${record.retryCount || 0}/${record.maxRetryCount || 0}`,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.startedAt' }),
            dataIndex: 'startedAt',
            valueType: 'dateTime',
            width: 170,
            hideInSearch: true,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.finishedAt' }),
            dataIndex: 'finishedAt',
            valueType: 'dateTime',
            width: 170,
            hideInSearch: true,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.durationColumn' }),
            width: 100,
            hideInSearch: true,
            render: (_, record) => formatDuration(record.startedAt, record.finishedAt, intl),
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.indexJob.errorInfoColumn' }),
            dataIndex: 'errorMessage',
            width: 220,
            ellipsis: true,
            hideInSearch: true,
          },
          {
            title: intl.formatMessage({ id: 'pages.common.option' }),
            valueType: 'option',
            width: 100,
            fixed: 'right',
            render: (_, record) =>
              canRetry && record.status === 'failed' ? (
                <TableActionMenu
                  items={[
                    {
                      key: 'retry',
                      label: intl.formatMessage({ id: 'pages.knowledge.indexJob.retry' }),
                      primary: true,
                      confirm: {
                        title: intl.formatMessage({ id: 'pages.knowledge.indexJob.retryConfirm' }),
                      },
                      onClick: async () => {
                        if (!record.id) return
                        const result = await retryIndexJob(record.id)
                        if (result.code === 200) {
                          message.success(
                            result.message ||
                              intl.formatMessage({ id: 'pages.knowledge.indexJob.retryQueued' }),
                          )
                          setStatusTab('running')
                          setPollingInterval(3000)
                          actionRef.current?.reload()
                        } else
                          message.error(
                            result.message ||
                              intl.formatMessage({ id: 'pages.knowledge.indexJob.retryFailed' }),
                          )
                      },
                    },
                  ]}
                />
              ) : null,
          },
        ]}
      />
    </PageContainer>
  )
}

export default KnowledgeIndexJobPage
