import { Button, Input, Modal, Space } from 'antd'
import React from 'react'
import { useIntl } from '@umijs/max'

interface Props {
  status?: string
  canDecide: boolean
  comment: string
  acting: boolean
  onCommentChange: (value: string) => void
  onAct: (kind: 'claim' | 'approve' | 'reject') => void
  showComment?: boolean
  prominent?: boolean
}

const ReviewTaskActions: React.FC<Props> = ({
  status,
  canDecide,
  comment,
  acting,
  onCommentChange,
  onAct,
  showComment = true,
  prominent = false,
}) => {
  const intl = useIntl()

  if (status !== 'pending' && !canDecide) return null

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {showComment && (
        <Input.TextArea
          rows={3}
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder={intl.formatMessage({
            id: canDecide
              ? 'pages.knowledge.review.detail.approvalCommentPlaceholder'
              : 'pages.knowledge.review.detail.rejectionReasonPlaceholder',
          })}
        />
      )}
      <Space>
        {status === 'pending' && (
          <Button type="primary" size={prominent ? 'large' : 'middle'} loading={acting} onClick={() => onAct('claim')}>
            {intl.formatMessage({ id: 'pages.knowledge.review.detail.claim' })}
          </Button>
        )}
        {canDecide && (
          <>
            <Button type="primary" size={prominent ? 'large' : 'middle'} loading={acting} onClick={() => onAct('approve')}>
              {intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}
            </Button>
            <Button
              danger
              size={prominent ? 'large' : 'middle'}
              disabled={acting}
              onClick={() =>
                Modal.confirm({
                  title: intl.formatMessage({
                    id: 'pages.knowledge.review.detail.rejectConfirm',
                  }),
                  onOk: () => onAct('reject'),
                })
              }
            >
              {intl.formatMessage({ id: 'pages.knowledge.review.detail.reject' })}
            </Button>
          </>
        )}
      </Space>
    </Space>
  )
}

export default ReviewTaskActions
