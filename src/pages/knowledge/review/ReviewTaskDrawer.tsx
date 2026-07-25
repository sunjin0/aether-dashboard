import { DrawerForm } from '@ant-design/pro-components'
import { useIntl } from '@umijs/max'
import { Alert, Descriptions, List, Space, Spin, Tag, Tooltip, Typography } from 'antd'
import React from 'react'
import { useReviewTask } from '@/pages/knowledge/review/hooks/useReviewTask'
import ReviewActionTimeline from '@/pages/knowledge/review/components/ReviewActionTimeline'
import ReviewTaskActions from '@/pages/knowledge/review/components/ReviewTaskActions'
import {
  patchOperationLabelKey,
  severityColor,
  severityLabelKey,
} from '@/pages/knowledge/review/detail/constants'

interface Props {
  taskId?: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const ReviewTaskDrawer: React.FC<Props> = ({ taskId, open, onClose, onSuccess }) => {
  const intl = useIntl()
  const localizedSeverity = (severity?: string) =>
    severity ? intl.formatMessage({ id: severityLabelKey[severity] || severity }) : ''
  const localizedOperation = (patch: string | null | undefined) => {
    if (!patch) return ''
    try {
      const parsed = JSON.parse(patch)
      return intl.formatMessage({ id: patchOperationLabelKey[parsed.operation] || parsed.operation })
    } catch {
      return ''
    }
  }

  const { data, loading, acting, comment, setComment, canDecide, act, getUserName } = useReviewTask({
    taskId,
    open,
    onSuccess,
  })

  const title = data?.documentTitle || intl.formatMessage({ id: 'pages.knowledge.review.detail.title' })

  return (
    <>
      <DrawerForm
        title={title}
        open={open}
        onOpenChange={(nextOpen) => !nextOpen && onClose()}
        submitter={false}
      >
        <Spin spinning={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {data?.aiReview?.summary && <Alert showIcon type="info" message={data.aiReview.summary} />}
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.knowledge.review.detail.submitter' })}>
                {getUserName(data?.submitterId)}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.knowledge.review.detail.claimant' })}>
                {getUserName(data?.reviewerId)}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>
              {intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })}
            </Typography.Title>
            <Typography.Paragraph
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: 12,
                maxHeight: 360,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {data?.version?.content || '-'}
            </Typography.Paragraph>
            <Typography.Title level={5}>
              {intl.formatMessage(
                { id: 'pages.knowledge.review.detail.aiReviewScore' },
                { score: data?.aiReview?.score ?? '-' },
              )}
            </Typography.Title>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <List
                size="small"
                dataSource={data?.issues || []}
                locale={{
                  emptyText: intl.formatMessage({ id: 'pages.knowledge.review.detail.noAiReviewSummary' }),
                }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space size="small" wrap>
                          <Tag color={severityColor[item.severity || ''] || 'default'}>
                            {localizedSeverity(item.severity)}
                          </Tag>
                          {item.suggestedPatch && (
                            <Tag color="processing">{localizedOperation(item.suggestedPatch)}</Tag>
                          )}
                          {item.title}
                        </Space>
                      }
                      description={
                        <Space size="small" wrap>
                          {(item.description || item.originalExcerpt) && (
                            <Tooltip title={item.originalExcerpt}>
                              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
                                {item.description || item.originalExcerpt}
                              </Typography.Text>
                            </Tooltip>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
            <ReviewTaskActions
              status={data?.status}
              canDecide={canDecide}
              comment={comment}
              acting={acting}
              onCommentChange={setComment}
              onAct={act}
            />
            <ReviewActionTimeline actionLogs={data?.actionLogs} getUserName={getUserName} />
          </Space>
        </Spin>
      </DrawerForm>
    </>
  )
}

export default ReviewTaskDrawer
