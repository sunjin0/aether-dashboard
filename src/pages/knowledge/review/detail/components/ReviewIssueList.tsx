import {
  CheckOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useIntl } from '@umijs/max'
import { Button, Card, Empty, List, Segmented, Space, Tag, Tooltip, Typography } from 'antd'
import React from 'react'
import { AiReviewDiffIssue } from '@/services/entity/Agent'
import {
  issueTypeColor,
  issueTypeLabelKey,
  patchOperationLabelKey,
  severityColor,
  severityLabelKey,
} from '../constants'
import { ReviewIssueFilter } from '../types'

interface Props {
  issues: AiReviewDiffIssue[];
  filter: ReviewIssueFilter;
  activeId?: string;
  disabled?: boolean;
  busyId?: string;
  onFilter: (filter: ReviewIssueFilter) => void;
  onSelect: (issue: AiReviewDiffIssue) => void;
  onAccept: (issue: AiReviewDiffIssue) => void;
  onReject: (issue: AiReviewDiffIssue) => void;
  onUnaccept: (issue: AiReviewDiffIssue) => void;
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
  const activeIndex = issues.findIndex((issue) => issue.id === activeId)
  const activeIssue = activeIndex >= 0 ? issues[activeIndex] : undefined
  const filterOptions: { value: ReviewIssueFilter; label: string }[] = [
    {
      value: 'all',
      label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.all' }),
    },
    {
      value: 'pending',
      label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.pending' }),
    },
    {
      value: 'risk',
      label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.risk' }),
    },
    {
      value: 'accepted',
      label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.accepted' }),
    },
    {
      value: 'rejected',
      label: intl.formatMessage({ id: 'pages.knowledge.review.issueList.filter.rejected' }),
    },
  ]
  const localizedSeverity = (severity: string) =>
    intl.formatMessage({ id: severityLabelKey[severity] || severity })
  const localizedIssueType = (type?: string) =>
    type ? intl.formatMessage({ id: issueTypeLabelKey[type] || type }) : ''
  const localizedOperation = (patch: unknown) => {
    if (!patch) return ''
    if (typeof patch === 'string') {
      try {
        const parsed = JSON.parse(patch)
        return intl.formatMessage({ id: patchOperationLabelKey[parsed.operation] || parsed.operation })
      } catch {
        return ''
      }
    }
    const obj = patch as { operation?: string }
    return obj.operation
      ? intl.formatMessage({ id: patchOperationLabelKey[obj.operation] || obj.operation })
      : ''
  }

  const statusText: Record<string, string> = {
    accepted: intl.formatMessage({ id: 'pages.knowledge.review.issueList.status.accepted' }),
    rejected: intl.formatMessage({ id: 'pages.knowledge.review.issueList.status.rejected' }),
  }

  const actions = (issue: AiReviewDiffIssue) => {
    if (issue.handleStatus === 'accepted' && !issue.appliedChecksum) {
      return (
        <Button
          size="small"
          icon={<UndoOutlined />}
          disabled={disabled}
          loading={busyId === issue.id}
          onClick={() => onUnaccept(issue)}
        >
          {intl.formatMessage({ id: 'pages.knowledge.review.issueList.unaccept' })}
        </Button>
      )
    }
    if (issue.handleStatus !== 'pending') return null
    return (
      <Space size="small">
        {issue.suggestedPatch && (
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            disabled={disabled}
            loading={busyId === issue.id}
            onClick={() => onAccept(issue)}
          >
            {intl.formatMessage({ id: 'pages.knowledge.review.issueList.accept' })}
          </Button>
        )}
        <Button
          size="small"
          icon={<CloseOutlined />}
          disabled={disabled}
          onClick={() => onReject(issue)}
        >
          {intl.formatMessage({ id: 'pages.knowledge.review.issueList.reject' })}
        </Button>
      </Space>
    )
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <Typography.Text strong>
            {intl.formatMessage({ id: 'pages.knowledge.review.issueList.title' })}
          </Typography.Text>
          <Typography.Text type="secondary">{issues.length}</Typography.Text>
        </Space>
      }
      extra={
        <Segmented
          size="small"
          value={filter}
          options={filterOptions}
          onChange={(value) => onFilter(value as ReviewIssueFilter)}
        />
      }
      styles={{
        body: {
          padding: 0,
          height: 'calc(100vh - 250px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {issues.length === 0 ? (
        <Empty
          description={intl.formatMessage({ id: 'pages.knowledge.review.issueList.empty' })}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: 24 }}
        />
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <List
            size="small"
            dataSource={issues}
            renderItem={(issue) => {
              const selected = activeId === issue.id
              return (
                <List.Item
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    background: selected ? '#e6f4ff' : undefined,
                    borderLeft: selected ? '3px solid #1677ff' : '3px solid transparent',
                  }}
                  onClick={() => onSelect(issue)}
                >
                  <List.Item.Meta
                    title={
                      <Space size="small" wrap>
                        <Tag color={severityColor[issue.severity] || 'default'}>
                          {localizedSeverity(issue.severity)}
                        </Tag>
                        {issue.issueType && (
                          <Tag color={issueTypeColor[issue.issueType] || 'default'}>
                            {localizedIssueType(issue.issueType)}
                          </Tag>
                        )}
                        {issue.suggestedPatch && (
                          <Tag color="processing">{localizedOperation(issue.suggestedPatch)}</Tag>
                        )}
                        <Typography.Text style={{ fontWeight: 500 }}>
                          {issue.message}
                        </Typography.Text>
                      </Space>
                    }
                    description={
                      <Space size="small" wrap>
                        {issue.originalExcerpt && (
                          <Tooltip title={issue.originalExcerpt}>
                            <Typography.Text type="secondary" ellipsis style={{ maxWidth: 260 }}>
                              {issue.originalExcerpt}
                            </Typography.Text>
                          </Tooltip>
                        )}
                        {issue.handleStatus !== 'pending' && (
                          <Tag color={issue.handleStatus === 'accepted' ? 'success' : 'default'}>
                            {statusText[issue.handleStatus] || issue.handleStatus}
                          </Tag>
                        )}
                        {issue.handleStatus === 'pending' && !issue.suggestedPatch && (
                          <Typography.Text type="warning">
                            {intl.formatMessage({
                              id: 'pages.knowledge.review.issueList.noPatchTip',
                            })}
                          </Typography.Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )
            }}
          />
        </div>
      )}
      {activeIssue && (
        <div style={{ flex: 'none', padding: 12, borderTop: '1px solid #f0f0f0' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size="small" wrap>
              <Tag color={severityColor[activeIssue.severity] || 'default'}>
                {localizedSeverity(activeIssue.severity)}
              </Tag>
              {activeIssue.issueType && (
                <Tag color={issueTypeColor[activeIssue.issueType] || 'default'}>
                  {localizedIssueType(activeIssue.issueType)}
                </Tag>
              )}
              <Typography.Text strong>{activeIssue.message}</Typography.Text>
            </Space>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <Space size="small">
                <Button
                  size="small"
                  icon={<LeftOutlined />}
                  disabled={activeIndex <= 0}
                  onClick={() => onSelect(issues[activeIndex - 1])}
                >
                  {intl.formatMessage({ id: 'pages.knowledge.review.issueList.prev' })}
                </Button>
                <Typography.Text type="secondary">
                  {activeIndex + 1} / {issues.length}
                </Typography.Text>
                <Button
                  size="small"
                  icon={<RightOutlined />}
                  iconPosition="end"
                  disabled={activeIndex >= issues.length - 1}
                  onClick={() => onSelect(issues[activeIndex + 1])}
                >
                  {intl.formatMessage({ id: 'pages.knowledge.review.issueList.next' })}
                </Button>
              </Space>
              {actions(activeIssue)}
            </div>
          </Space>
        </div>
      )}
    </Card>
  )
}

export default ReviewIssueList
