import { CheckOutlined, CloseOutlined, UndoOutlined } from '@ant-design/icons'
import { useIntl } from '@umijs/max'
import { Button, Card, Empty, List, Segmented, Space, Tag, Typography } from 'antd'
import React from 'react'
import { AiReviewDiffIssue } from '@/services/entity/Agent'
import { severityColor } from '../constants'
import { ReviewIssueFilter } from '../types'

interface Props {
  issues: AiReviewDiffIssue[]
  filter: ReviewIssueFilter
  activeId?: string
  disabled?: boolean
  busyId?: string
  onFilter: (filter: ReviewIssueFilter) => void
  onSelect: (issue: AiReviewDiffIssue) => void
  onAccept: (issue: AiReviewDiffIssue) => void
  onReject: (issue: AiReviewDiffIssue) => void
  onUnaccept: (issue: AiReviewDiffIssue) => void
}

const ReviewIssueList: React.FC<Props> = ({
  issues,
  filter,
  activeId,
  disabled,
  busyId,
  onFilter,
  onSelect,
  onAccept,
  onReject,
  onUnaccept,
}) => {
  const intl = useIntl()
  const filterOptions: { value: ReviewIssueFilter; label: string }[] = [
    { value: 'all', label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.all' }) },
    { value: 'pending', label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.pending' }) },
    { value: 'risk', label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.risk' }) },
    { value: 'accepted', label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.accepted' }) },
    { value: 'rejected', label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.rejected' }) },
  ]
  const handleStatusText: Record<string, string> = {
    pending: intl.formatMessage({ id: 'pages.knowledge.review.issueList.status.pending' }),
    accepted: intl.formatMessage({ id: 'pages.knowledge.review.issueList.status.accepted' }),
    rejected: intl.formatMessage({ id: 'pages.knowledge.review.issueList.status.rejected' }),
  }
  const handleStatusColor: Record<string, string> = {
    pending: 'default',
    accepted: 'success',
    rejected: 'default',
  }
  const title = (
    <Space>
      <span style={{ fontWeight: 600 }}>{intl.formatMessage({ id: 'pages.knowledge.review.issueList.title' })}</span>
      <span style={{ color: '#8c8c8c', fontSize: 12 }}>{intl.formatMessage({ id: 'pages.knowledge.review.issueList.count' }, { count: issues.length })}</span>
    </Space>
  )

  const renderActions = (issue: AiReviewDiffIssue) => {
    const canUnaccept = issue.handleStatus === 'accepted' && !issue.appliedChecksum
    if (canUnaccept) {
      return [
        <Button
          key="unaccept"
          size="small"
          icon={<UndoOutlined />}
          disabled={disabled}
          loading={busyId === issue.id}
          onClick={(e) => {
            e.stopPropagation()
            onUnaccept(issue)
          }}
        >
          {intl.formatMessage({ id: 'pages.knowledge.review.issueList.unaccept' })}
        </Button>,
      ]
    }
    if (issue.handleStatus !== 'pending') return undefined
    const canAccept = Boolean(issue.suggestedPatch)
    return [
      canAccept ? (
        <Button
          key="accept"
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          disabled={disabled}
          loading={busyId === issue.id}
          onClick={(e) => {
            e.stopPropagation()
            onAccept(issue)
          }}
        >
          {intl.formatMessage({ id: 'pages.knowledge.review.issueList.accept' })}
        </Button>
      ) : null,
      <Button
        key="reject"
        size="small"
        icon={<CloseOutlined />}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          onReject(issue)
        }}
      >
        {intl.formatMessage({ id: 'pages.knowledge.review.issueList.reject' })}
      </Button>,
    ]
  }

  const renderNoPatchTip = (issue: AiReviewDiffIssue) => {
    if (issue.handleStatus !== 'pending' || issue.suggestedPatch) return null
    return (
      <Typography.Text type="warning" style={{ fontSize: 12 }}>
        {intl.formatMessage({ id: 'pages.knowledge.review.issueList.noPatchTip' })}
      </Typography.Text>
    )
  }

  return (
    <Card
      size="small"
      title={title}
      extra={
        <Segmented
          size="small"
          value={filter}
          options={filterOptions}
          onChange={(value) => onFilter(value as ReviewIssueFilter)}
        />
      }
      styles={{ body: { padding: 0, maxHeight: 'min(560px, calc(100vh - 310px))', overflow: 'auto' } }}
    >
      {issues.length === 0 ? (
        <Empty description={intl.formatMessage({ id: 'pages.knowledge.review.issueList.empty' })} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
      ) : (
        <List
          size="small"
          dataSource={issues}
          renderItem={(issue) => {
            const isActive = activeId === issue.id
            return (
              <List.Item
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: isActive ? '#e6f4ff' : undefined,
                  transition: 'background 0.2s',
                  borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
                }}
                onClick={() => onSelect(issue)}
                actions={isActive ? renderActions(issue) : undefined}
              >
                <List.Item.Meta
                  title={
                    <Space size="small" wrap>
                      <Tag color={severityColor[issue.severity] || 'default'}>{issue.severity}</Tag>
                      <Typography.Text style={{ fontWeight: 500 }}>{issue.message}</Typography.Text>
                    </Space>
                  }
                  description={
                    <Space size="small" wrap>
                      {issue.originalExcerpt && (
                        <Typography.Text type="secondary" ellipsis style={{ maxWidth: 260 }}>
                          {issue.originalExcerpt}
                        </Typography.Text>
                      )}
                      {issue.blockId && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          · {issue.blockId}
                        </Typography.Text>
                      )}
                      {issue.handleStatus !== 'pending' && (
                        <Tag
                          color={handleStatusColor[issue.handleStatus] || 'default'}
                          style={{ fontSize: 12 }}
                        >
                          {handleStatusText[issue.handleStatus] || issue.handleStatus}
                        </Tag>
                      )}
                      {renderNoPatchTip(issue)}
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
        />
      )}
    </Card>
  )
}
export default ReviewIssueList
