import { PageContainer } from '@ant-design/pro-components'
import { DiffEditor } from '@monaco-editor/react'
import { useIntl } from '@umijs/max'
import { Alert, Card, Col, Descriptions, Row, Space, Spin, Tag, Tooltip, Typography } from 'antd'
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

  const previousVersionContent = data?.version?.sourceVersionId ? '' : ''
  const hasDiff = previousVersionContent && data?.version?.content

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
              title={
                hasDiff
                  ? intl.formatMessage({ id: 'pages.knowledge.review.detail.contentDiff' })
                  : intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })
              }
              extra={
                <Typography.Text type="secondary">
                  {intl.formatMessage({ id: 'pages.knowledge.review.detail.readOnlyDuringReview' })}
                </Typography.Text>
              }
              styles={{ body: { padding: 0 } }}
            >
              {hasDiff ? (
                <DiffEditor
                  height="calc(100vh - 230px)"
                  language="markdown"
                  original={previousVersionContent}
                  modified={data?.version?.content || ''}
                  options={{
                    readOnly: true,
                    domReadOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    originalEditable: false,
                    fontSize: 13,
                    lineHeight: 22,
                  }}
                />
              ) : (
                <DiffEditor
                  height="calc(100vh - 230px)"
                  language="markdown"
                  original=""
                  modified={data?.version?.content || ''}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontSize: 13,
                    lineHeight: 22,
                    wordWrap: 'on',
                  }}
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
