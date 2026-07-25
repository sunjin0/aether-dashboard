import { Space, Timeline, Typography } from 'antd'
import dayjs from 'dayjs'
import React from 'react'
import { useIntl } from '@umijs/max'

interface ActionLog {
  action?: string
  operatorName?: string
  operatorId?: string
  comment?: string
  createdAt?: number
}

interface Props {
  actionLogs?: ActionLog[]
  getUserName?: (id?: string) => string
}

const actionTextMap: Record<string, string> = {
  SUBMITTED: 'pages.knowledge.review.action.submitted',
  CLAIMED: 'pages.knowledge.review.action.claimed',
  APPROVED: 'pages.knowledge.review.action.approved',
  REJECTED: 'pages.knowledge.review.action.rejected',
  DRAFT_CREATED: 'pages.knowledge.review.action.draftCreated',
  DRAFT_UPDATED: 'pages.knowledge.review.action.draftUpdated',
  AI_REVIEW_STARTED: 'pages.knowledge.review.action.aiReviewStarted',
  AI_REVIEW_COMPLETED: 'pages.knowledge.review.action.aiReviewCompleted',
  AI_REVIEW_FAILED: 'pages.knowledge.review.action.aiReviewFailed',
}

const ReviewActionTimeline: React.FC<Props> = ({ actionLogs, getUserName }) => {
  const intl = useIntl()

  if (!actionLogs?.length) return null

  return (
    <Timeline
      items={(actionLogs || []).map((item) => {
        const actionLabel = actionTextMap[item.action || '']
          ? intl.formatMessage({ id: actionTextMap[item.action!] })
          : item.action || '-'
        const time = item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '-'
        return {
          children: (
            <Space direction="vertical" size={2}>
              <Space size="small" wrap>
                <Typography.Text strong>{actionLabel}</Typography.Text>
                <Typography.Text type="secondary">{time}</Typography.Text>
              </Space>
              <Typography.Text type="secondary">
                {[
                  item.operatorName || (getUserName ? getUserName(item.operatorId) : item.operatorId) || '-',
                  item.comment,
                ]
                  .filter(Boolean)
                  .join(' · ') || '-'}
              </Typography.Text>
            </Space>
          ),
        }
      })}
    />
  )
}

export default ReviewActionTimeline
