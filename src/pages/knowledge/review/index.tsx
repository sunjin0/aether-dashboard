import { PageContainer, ProTable } from '@ant-design/pro-components'
import { history, useIntl } from '@umijs/max'
import { Tabs, Tag } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import React, { useRef, useState } from 'react'
import { ActionType } from '@ant-design/pro-components'
import { getReviewTaskList } from '@/services/knowledge/ReviewController'
import { KnowledgeReviewTask, KnowledgeReviewTaskSearchParams } from '@/services/entity/Agent'
import { getAdminList } from '@/services/sys/AdminController';

const KnowledgeReviewPage: React.FC = () => {
  const [view, setView] = useState<KnowledgeReviewTaskSearchParams['view']>('available')
  const actionRef = useRef<ActionType>()
  const intl = useIntl()

  const labels: Record<string, { text: string; color: string }> = {
    pending: { text: intl.formatMessage({ id: 'pages.knowledge.review.status.pending' }), color: 'warning' },
    claimed: { text: intl.formatMessage({ id: 'pages.knowledge.review.status.claimed' }), color: 'processing' },
    approved: { text: intl.formatMessage({ id: 'pages.knowledge.review.status.approved' }), color: 'success' },
    rejected: { text: intl.formatMessage({ id: 'pages.knowledge.review.status.rejected' }), color: 'error' },
  }

  const views = [
    { key: 'available', label: intl.formatMessage({ id: 'pages.knowledge.review.view.available' }) },
    { key: 'submittedByMe', label: intl.formatMessage({ id: 'pages.knowledge.review.view.submittedByMe' }) },
    { key: 'reviewedByMe', label: intl.formatMessage({ id: 'pages.knowledge.review.view.reviewedByMe' }) },
    { key: 'all', label: intl.formatMessage({ id: 'pages.knowledge.review.view.all' }) },
  ]

  return (
    <PageContainer title={intl.formatMessage({ id: 'pages.knowledge.review.title' })}>
      <Tabs
        activeKey={view}
        items={views}
        onChange={(key) => {
          setView(key as KnowledgeReviewTaskSearchParams['view'])
          actionRef.current?.reload()
        }}
      />
      <ProTable<KnowledgeReviewTask>
        actionRef={actionRef}
        rowKey="id"
        params={{ view }}
        request={(params) => getReviewTaskList(params)}
        columns={[
          { title: intl.formatMessage({ id: 'pages.knowledge.review.documentTitle' }), dataIndex: 'documentTitle' },
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
              return data.map((item) => ({ label: item.username, value: item.id }))
            },
            hideInSearch: true
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
            dataIndex: 'claimantId',
            valueType: 'select',
            request: async () => {
              const { data } = await getAdminList({ current: 1, pageSize: 1000 })
              return data.map((item) => ({ label: item.username, value: item.id }))
            },
          },
          {
            title: intl.formatMessage({ id: 'pages.common.option' }),
            valueType: 'option',
            width: 100,
            render: (_, record) => (
              <TableActionMenu
                items={[
                  { key: 'view', label: intl.formatMessage({ id: 'pages.knowledge.review.viewAction' }), primary: true, onClick: () => history.push(`/knowledge/review/detail?id=${record.id}`) },
                ]}
              />
            ),
          },
        ]}
      />
    </PageContainer>
  )
}

export default KnowledgeReviewPage
