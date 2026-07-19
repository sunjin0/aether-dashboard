import { PageContainer, ProTable } from '@ant-design/pro-components'
import { history } from '@umijs/max'
import { Tabs, Tag } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import React, { useRef, useState } from 'react'
import { ActionType } from '@ant-design/pro-components'
import { getReviewTaskList } from '@/services/knowledge/ReviewController'
import { KnowledgeReviewTask, KnowledgeReviewTaskSearchParams } from '@/services/entity/Agent'

const labels: Record<string, { text: string; color: string }> = {
  pending: { text: '待认领', color: 'warning' },
  claimed: { text: '审批中', color: 'processing' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已拒绝', color: 'error' },
}

const views = [
  { key: 'available', label: '可审批' },
  { key: 'submittedByMe', label: '我提交的' },
  { key: 'reviewedByMe', label: '我已审批' },
  { key: 'all', label: '全部' },
]

const KnowledgeReviewPage: React.FC = () => {
  const [view, setView] = useState<KnowledgeReviewTaskSearchParams['view']>('available')
  const actionRef = useRef<ActionType>()

  return (
    <PageContainer title="审批中心">
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
          { title: '文档标题', dataIndex: 'documentTitle' },
          {
            title: '版本',
            dataIndex: 'versionNo',
            hideInSearch: true,
            render: (_, record) => `v${record.versionNo || '-'}`,
          },
          { title: '提交人', dataIndex: 'submitterName', hideInSearch: true },
          {
            title: '状态',
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
            title: '提交时间',
            dataIndex: 'submittedAt',
            valueType: 'dateTime',
            hideInSearch: true,
          },
          { title: '认领人', dataIndex: 'claimantName', hideInSearch: true },
          {
            title: '操作',
            valueType: 'option',
            width: 100,
            render: (_, record) => (
              <TableActionMenu
                items={[
                  { key: 'view', label: '查看', primary: true, onClick: () => history.push(`/knowledge/review/detail?id=${record.id}`) },
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
