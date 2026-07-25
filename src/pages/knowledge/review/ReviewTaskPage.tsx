import { PageContainer } from '@ant-design/pro-components'
import MDEditor from '@uiw/react-md-editor'
import { useIntl } from '@umijs/max'
import { Alert, Button, Card, Col, Descriptions, message, Row, Space, Spin, Tag, Tooltip, Typography } from 'antd'
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
  taskId: string
  onClose: () => void
  onSuccess: () => void
}

const ReviewTaskPage: React.FC<Props> = ({ taskId, onClose, onSuccess }) => {
  const intl = useIntl()
  const { data, loading, acting, comment, setComment, canDecide, act, getUserName } = useReviewTask({
    taskId,
    open: true,
    onSuccess,
  })

  const statusColor: Record<string, string> = {
    pending: 'warning',
    claimed: 'processing',
    approved: 'success',
    rejected: 'error',
  }

  const statusText: Record<string, string> = {
    pending: intl.formatMessage({ id: 'pages.knowledge.review.status.pending' }),
    claimed: intl.formatMessage({ id: 'pages.knowledge.review.status.claimed' }),
    approved: intl.formatMessage({ id: 'pages.knowledge.review.status.approved' }),
    rejected: intl.formatMessage({ id: 'pages.knowledge.review.status.rejected' }),
  }

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

  const title = data?.documentTitle || intl.formatMessage({ id: 'pages.knowledge.review.detail.title' })
  const issueList = (
    <div>
      {(data?.issues || []).length === 0 ? (
        <Typography.Text type="secondary">
          {intl.formatMessage({ id: 'pages.knowledge.review.detail.noAiReviewSummary' })}
        </Typography.Text>
      ) : (
        (data?.issues || []).map((item) => (
          <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Space size="small" wrap>
              <Tag color={severityColor[item.severity || ''] || 'default'}>
                {localizedSeverity(item.severity)}
              </Tag>
              {item.suggestedPatch && (
                <Tag color="processing">{localizedOperation(item.suggestedPatch)}</Tag>
              )}
              <Typography.Text strong>{item.title}</Typography.Text>
            </Space>
            {(item.description || item.originalExcerpt) && (
              <Tooltip title={item.originalExcerpt}>
                <Typography.Paragraph
                  type="secondary"
                  ellipsis={{ rows: 2 }}
                  style={{ margin: '4px 0 0', fontSize: 13 }}
                >
                  {item.description || item.originalExcerpt}
                </Typography.Paragraph>
              </Tooltip>
            )}
          </div>
        ))
      )}
    </div>
  )

  const [editedContent, setEditedContent] = useState<string>()
  const [mode, setMode] = useState<'preview' | 'edit'>('edit')
  const content = editedContent ?? data?.version?.content ?? ''

  const handleSaveDraft = async () => {
    if (!taskId || editedContent === undefined) return
    try {
      const res = await editReviewTaskContent(taskId, { content: editedContent, expectedChecksum: data?.version?.contentChecksum ?? '' })
      if (res.code === 200) {
        message.success(intl.formatMessage({ id: 'pages.knowledge.review.detail.saveDraftSuccess' }))
      }
    } catch { /* handled globally */ }
  }

  return (
    <PageContainer
      title={title}
      subTitle={data?.version?.versionNo ? `v${data.version.versionNo}` : undefined}
      tags={
        <Tag color={statusColor[data?.status || '']}>
          {statusText[data?.status || ''] || data?.status || '-'}
        </Tag>
      }
      onBack={onClose}
    >
      <Spin spinning={loading}>
        <Row gutter={16} align="stretch">
          <Col xs={24} lg={16}>
            <Card
              size="small"
              title={intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })}
              extra={
                <Space>
                  <Button.Group size="small">
                    <Button type={mode === 'preview' ? 'primary' : 'default'} onClick={() => setMode('preview')}>
                      {intl.formatMessage({ id: 'pages.knowledge.review.detail.preview' })}
                    </Button>
                    <Button type={mode === 'edit' ? 'primary' : 'default'} onClick={() => setMode('edit')}>
                      {intl.formatMessage({ id: 'pages.knowledge.review.detail.edit' })}
                    </Button>
                  </Button.Group>
                  <Button type="link" size="small" onClick={handleSaveDraft} disabled={editedContent === undefined}>
                    {intl.formatMessage({ id: 'pages.knowledge.review.detail.saveDraft' })}
                  </Button>
                </Space>
              }
              styles={{ body: { padding: mode === 'preview' ? 12 : 0 } }}
            >
              {mode === 'preview' ? (
                <div style={{ maxHeight: 'calc(100vh - 230px)', overflow: 'auto' }}>
                  <ReactMarkdown>{content || '-'}</ReactMarkdown>
                </div>
              ) : (
                <MDEditor
                  height="calc(100vh - 230px)"
                  value={content}
                  onChange={(value) => setEditedContent(value ?? '')}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {data?.aiReview?.summary && <Alert showIcon type="info" message={data.aiReview.summary} />}
              <Card size="small" title={intl.formatMessage({ id: 'pages.knowledge.review.detail.reviewInfo' })}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.knowledge.review.detail.submitter' })}>
                    {getUserName(data?.submitterId)}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.knowledge.review.detail.claimant' })}>
                    {getUserName(data?.reviewerId)}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pages.knowledge.review.detail.aiScore' })}>
                    {data?.aiReview?.score ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              <Card
                size="small"
                title={intl.formatMessage(
                  { id: 'pages.knowledge.review.detail.issueCount' },
                  { count: (data?.issues || []).length },
                )}
                styles={{ body: { maxHeight: 'calc(100vh - 500px)', overflow: 'auto' } }}
              >
                {issueList}
              </Card>
              <ReviewTaskActions
                status={data?.status}
                canDecide={canDecide}
                comment={comment}
                acting={acting}
                onCommentChange={setComment}
                onAct={act}
              />
              <Card size="small" title={intl.formatMessage({ id: 'pages.knowledge.review.detail.actionHistory' })}>
                <ReviewActionTimeline actionLogs={data?.actionLogs} getUserName={getUserName} />
              </Card>
            </Space>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  )
}

export default ReviewTaskPage
