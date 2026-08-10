import { DrawerForm } from '@ant-design/pro-components'
import MDEditor from '@uiw/react-md-editor'
import { useIntl } from '@umijs/max'
import { Alert, Button, Descriptions, List, Space, Spin, Tag, Tooltip, Typography } from 'antd'
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useReviewTask } from '@/pages/knowledge/review/hooks/useReviewTask'
import ReviewActionTimeline from '@/pages/knowledge/review/components/ReviewActionTimeline'
import ReviewTaskActions from '@/pages/knowledge/review/components/ReviewTaskActions'
import { editReviewTaskContent } from '@/services/knowledge/ReviewController'
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
  const [editedContent, setEditedContent] = useState<string>()
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const content = editedContent ?? data?.version?.content ?? ''

  const handleSaveDraft = async () => {
    if (!taskId || editedContent === undefined) return
    try {
      await editReviewTaskContent(taskId, { content: editedContent, expectedChecksum: data?.version?.contentChecksum ?? '' })
    } catch { /* handled globally */ }
  }

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })}
              </Typography.Title>
              <Space>
                <Button.Group size="small">
                  <Button type={mode === 'preview' ? 'primary' : 'default'} onClick={() => setMode('preview')}>
                    {intl.formatMessage({ id: 'pages.knowledge.review.detail.preview' })}
                  </Button>
                  <Button type={mode === 'edit' ? 'primary' : 'default'} onClick={() => setMode('edit')}>
                    {intl.formatMessage({ id: 'pages.knowledge.review.detail.edit' })}
                  </Button>
                </Button.Group>
                {taskId && (
                  <Button type="link" size="small" onClick={handleSaveDraft} disabled={editedContent === undefined}>
                    {intl.formatMessage({ id: 'pages.knowledge.review.detail.saveDraft' })}
                  </Button>
                )}
              </Space>
            </div>
            {mode === 'preview' ? (
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, maxHeight: 400, overflow: 'auto' }}>
                <ReactMarkdown>{content || '-'}</ReactMarkdown>
              </div>
            ) : (
              <MDEditor
                height={300}
                value={content}
                onChange={(value) => setEditedContent(value ?? '')}
              />
            )}
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
