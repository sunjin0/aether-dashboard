import { PageContainer, ProTable } from '@ant-design/pro-components'
import { history, useIntl, useLocation } from '@umijs/max'
import { Button, message, Modal, Space, Tabs, Tag } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import React, { useMemo, useRef, useState } from 'react'
import type { ActionType } from '@ant-design/pro-components'
import {
  approveReviewTask,
  claimReviewTask,
  getReviewTaskList,
  rejectReviewTask,
} from '@/services/knowledge/ReviewController'
import type { KnowledgeReviewTask, KnowledgeReviewTaskSearchParams } from '@/services/entity/Agent'
import { getAdminList } from '@/services/sys/AdminController'

const reviewViews: NonNullable<KnowledgeReviewTaskSearchParams['view']>[] = [
  'available',
  'submittedByMe',
  'reviewedByMe',
  'all',
]

const KnowledgeReviewPage: React.FC = () => {
  const location = useLocation()
  const initialView = useMemo(() => {
    const value = new URLSearchParams(location.search).get('view')
    return reviewViews.includes(value as NonNullable<KnowledgeReviewTaskSearchParams['view']>)
      ? (value as KnowledgeReviewTaskSearchParams['view'])
      : 'available'
  }, [location.search])
  const [view, setView] = useState<KnowledgeReviewTaskSearchParams['view']>(initialView)
  const actionRef = useRef<ActionType>()
  const intl = useIntl()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchActing, setBatchActing] = useState(false)

  const labels: Record<string, { text: string; color: string }> = {
    pending: {
      text: intl.formatMessage({ id: 'pages.knowledge.review.status.pending' }),
      color: 'warning',
    },
    claimed: {
      text: intl.formatMessage({ id: 'pages.knowledge.review.status.claimed' }),
      color: 'processing',
    },
    approved: {
      text: intl.formatMessage({ id: 'pages.knowledge.review.status.approved' }),
      color: 'success',
    },
    rejected: {
      text: intl.formatMessage({ id: 'pages.knowledge.review.status.rejected' }),
      color: 'error',
    },
  }

  const views = [
    {
      key: 'available',
      label: intl.formatMessage({ id: 'pages.knowledge.review.view.available' }),
    },
    {
      key: 'submittedByMe',
      label: intl.formatMessage({ id: 'pages.knowledge.review.view.submittedByMe' }),
    },
    {
      key: 'reviewedByMe',
      label: intl.formatMessage({ id: 'pages.knowledge.review.view.reviewedByMe' }),
    },
    { key: 'all', label: intl.formatMessage({ id: 'pages.knowledge.review.view.all' }) },
  ]

  const act = async (taskId: string, kind: 'claim' | 'approve' | 'reject') => {
    try {
      if (kind === 'claim') {
        await claimReviewTask(taskId)
      } else if (kind === 'approve') {
        await approveReviewTask(taskId)
      } else {
        await rejectReviewTask(taskId, '')
      }
      message.success(intl.formatMessage({ id: 'pages.knowledge.review.detail.actionSuccess' }))
      actionRef.current?.reload()
    } catch {
      // The global request error handler has already shown the failure.
    }
  }

  const handleBatchApprove = () => {
    if (selectedRowKeys.length === 0) return
    setBatchActing(true)
    const tasks = [...selectedRowKeys]
    setSelectedRowKeys([])
    Promise.all(tasks.map((id) => approveReviewTask(String(id)).catch(() => {}))).finally(() => {
      setBatchActing(false)
      actionRef.current?.reload()
      message.success(
        intl.formatMessage({ id: 'pages.knowledge.review.detail.actionSuccess' }),
      )
    })
  }

  const handleBatchReject = () => {
    if (selectedRowKeys.length === 0) return
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectConfirm' }),
      content: (
        <div>
          <p>{intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectionReasonRequired' })}</p>
        </div>
      ),
      onOk: () => {
        setBatchActing(true)
        const tasks = [...selectedRowKeys]
        setSelectedRowKeys([])
        Promise.all(tasks.map((id) => rejectReviewTask(String(id), '').catch(() => {}))).finally(() => {
          setBatchActing(false)
          actionRef.current?.reload()
        })
      },
    })
  }

  return (
    <PageContainer title={intl.formatMessage({ id: 'pages.knowledge.review.title' })}>
      <Tabs
        activeKey={view}
        items={views}
        onChange={(key) => {
          const nextView = key as KnowledgeReviewTaskSearchParams['view']
          setView(nextView)
          history.replace(`/knowledge/reviews?view=${nextView}`)
          actionRef.current?.reload()
        }}
      />
      <ProTable<KnowledgeReviewTask>
        actionRef={actionRef}
        rowKey="id"
        params={{ view }}
        request={(params) => getReviewTaskList(params)}
        polling={view === 'available' ? 30000 : undefined}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        tableAlertOptionRender={() => (
          <Space>
            <Button type="primary" size="small" loading={batchActing} onClick={handleBatchApprove}>
              {intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}
            </Button>
            <Button danger size="small" loading={batchActing} onClick={handleBatchReject}>
              {intl.formatMessage({ id: 'pages.knowledge.review.detail.reject' })}
            </Button>
          </Space>
        )}
        columns={[
          {
            title: intl.formatMessage({ id: 'pages.knowledge.review.documentTitle' }),
            dataIndex: 'documentTitle',
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.review.version' }),
            dataIndex: 'versionNo',
            hideInSearch: true,
            render: (_, record) => `v${record.versionNo || '-'}`,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.review.submitter' }),
            dataIndex: 'submitterId',
            valueType: 'select',
            request: async () => {
              const { data } = await getAdminList({ current: 1, pageSize: 1000 })
              return (data || []).map((item) => ({ label: item.username, value: item.id }))
            },
            hideInSearch: true,
          },
          {
            title: intl.formatMessage({ id: 'pages.common.status' }),
            dataIndex: 'status',
            valueType: 'select',
            valueEnum: Object.fromEntries(
              Object.entries(labels).map(([key, value]) => [key, { text: value.text }]),
            ),
            render: (_, record) => {
              const item = labels[record.status || 'pending']
              return <Tag color={item.color}>{item.text}</Tag>
            },
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.review.submittedAt' }),
            dataIndex: 'submittedAt',
            valueType: 'dateTime',
            hideInSearch: true,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.review.claimant' }),
            dataIndex: 'reviewerId',
            valueType: 'select',
            request: async () => {
              const { data } = await getAdminList({ current: 1, pageSize: 1000 })
              return (data || []).map((item) => ({ label: item.username, value: item.id }))
            },
          },
          {
            title: intl.formatMessage({ id: 'pages.common.option' }),
            valueType: 'option',
            width: 200,
            fixed: 'right',
            render: (_, record) => (
              <Space size="small">
                {record.status === 'pending' && (
                  <Button type="link" size="small" onClick={() => act(record.id!, 'claim')}>
                    {intl.formatMessage({ id: 'pages.knowledge.review.detail.claim' })}
                  </Button>
                )}
                {record.status === 'claimed' && (
                  <>
                    <Button type="primary" size="small" onClick={() => act(record.id!, 'approve')}>
                      {intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}
                    </Button>
                    <Button danger size="small" onClick={() => act(record.id!, 'reject')}>
                      {intl.formatMessage({ id: 'pages.knowledge.review.detail.reject' })}
                    </Button>
                  </>
                )}
                <TableActionMenu
                  items={[
                    {
                      key: 'view',
                      label: intl.formatMessage({ id: 'pages.knowledge.review.viewAction' }),
                      primary: true,
                      onClick: () => {
                        const returnTo = `/knowledge/reviews?view=${view}`
                        history.push(
                          `/knowledge/reviews/${record.id}?returnTo=${encodeURIComponent(returnTo)}`,
                        )
                      },
                    },
                  ]}
                />
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  )
}

export default KnowledgeReviewPage
