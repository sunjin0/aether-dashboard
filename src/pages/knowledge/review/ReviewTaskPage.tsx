import { PageContainer } from '@ant-design/pro-components'
import '@mdxeditor/editor/style.css'
import {
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  type MDXEditorMethods,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor'
import { useIntl } from '@umijs/max'
import { Alert, Button, Card, Col, Descriptions, Row, Space, Spin, Tag, Tooltip, Typography } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { useReviewTask } from '@/pages/knowledge/review/hooks/useReviewTask'
import ReviewActionTimeline from '@/pages/knowledge/review/components/ReviewActionTimeline'
import ReviewTaskActions from '@/pages/knowledge/review/components/ReviewTaskActions'
import { editReviewTaskContent } from '@/services/knowledge/ReviewController'
import { getDocumentVersionPreviewUrl, recognizeDocumentVersionContent } from '@/services/knowledge/DocumentController'
import {
  patchOperationLabelKey,
  severityColor,
  severityLabelKey,
} from '@/pages/knowledge/review/detail/constants'
import './ReviewTaskPage.less'

interface Props {
  taskId: string
  onClose: () => void
  onSuccess: () => void
}

const markdownEditorPlugins = [
  headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
  listsPlugin(),
  quotePlugin(),
  linkPlugin(),
  imagePlugin(),
  tablePlugin(),
  thematicBreakPlugin(),
  codeBlockPlugin(),
  codeMirrorPlugin({ codeBlockLanguages: { txt: 'Plain text', js: 'JavaScript', ts: 'TypeScript', java: 'Java', json: 'JSON', bash: 'Bash' } }),
  markdownShortcutPlugin(),
  diffSourcePlugin({ viewMode: 'rich-text' }),
  toolbarPlugin({
    toolbarContents: () => (
      <DiffSourceToggleWrapper options={['rich-text', 'source']}>
        <UndoRedo />
        <BlockTypeSelect />
        <BoldItalicUnderlineToggles />
        <CodeToggle />
        <ListsToggle />
        <CreateLink />
        <InsertImage />
        <InsertTable />
        <InsertCodeBlock />
        <InsertThematicBreak />
      </DiffSourceToggleWrapper>
    ),
  }),
]

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
  const [originalFileUrl, setOriginalFileUrl] = useState('')
  const [originalPreviewLoading, setOriginalPreviewLoading] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [contentMode, setContentMode] = useState<'preview' | 'edit'>('preview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const markdownEditorRef = useRef<MDXEditorMethods>(null)
  const content = editedContent ?? data?.version?.content ?? ''

  useEffect(() => {
    setEditedContent(undefined)
    setOriginalFileUrl('')
    setContentMode('preview')
  }, [taskId])

  useEffect(() => {
    const versionId = data?.version?.id
    if (!versionId) return
    let active = true
    setOriginalPreviewLoading(true)
    getDocumentVersionPreviewUrl(versionId)
      .then(({ data: url }) => active && setOriginalFileUrl(url || ''))
      .catch(() => active && setOriginalFileUrl(''))
      .finally(() => active && setOriginalPreviewLoading(false))
    return () => { active = false }
  }, [data?.version?.id])

  useEffect(() => {
    markdownEditorRef.current?.setMarkdown(content)
  }, [content])

  const handleSaveDraft = async () => {
    if (!taskId || editedContent === undefined) return
    try {
      await editReviewTaskContent(taskId, { content: editedContent, expectedChecksum: data?.version?.contentChecksum ?? '' })
    } catch { /* handled globally */ }
  }

  const handleRecognizeFile = async () => {
    const versionId = data?.version?.id
    if (!versionId) return
    setRecognizing(true)
    try {
      const response = await recognizeDocumentVersionContent(versionId)
      setEditedContent(response.data || '')
      setContentMode('edit')
    } finally {
      setRecognizing(false)
    }
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
        {sidebarCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button onClick={() => setSidebarCollapsed(false)}>
              {intl.formatMessage({ id: 'pages.knowledge.review.detail.expandSidebar' })}
            </Button>
          </div>
        )}
        <Row gutter={16} align="stretch">
          <Col xs={24} lg={sidebarCollapsed ? 24 : 16}>
            <Row gutter={[12, 12]}>
              <Col xs={24} xl={12}>
                <Card size="small" title={intl.formatMessage({ id: 'pages.knowledge.review.detail.originalFile' })} styles={{ body: { padding: 0, height: 'calc(100vh - 230px)' } }}>
                  <Spin spinning={originalPreviewLoading}>
                    {originalFileUrl ? <iframe title={intl.formatMessage({ id: 'pages.knowledge.review.detail.originalFile' })} src={originalFileUrl} style={{ width: '100%', height: 'calc(100vh - 230px)', border: 0 }} /> : <div style={{ padding: 24 }}><Typography.Text type="secondary">{intl.formatMessage({ id: 'pages.knowledge.review.detail.originalFileUnavailable' })}</Typography.Text></div>}
                  </Spin>
                </Card>
              </Col>
              <Col xs={24} xl={12}>
                <Card size="small" title={intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })} extra={<Space><Button size="small" loading={recognizing} onClick={handleRecognizeFile}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.recognizeFile' })}</Button><Button.Group size="small"><Button type={contentMode === 'preview' ? 'primary' : 'default'} onClick={() => setContentMode('preview')}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.preview' })}</Button><Button type={contentMode === 'edit' ? 'primary' : 'default'} onClick={() => setContentMode('edit')}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.edit' })}</Button></Button.Group><Button type="link" size="small" onClick={handleSaveDraft} disabled={editedContent === undefined}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.saveDraft' })}</Button></Space>} styles={{ body: { padding: 0, height: 'calc(100vh - 230px)' } }}>
                  <MDXEditor ref={markdownEditorRef} markdown={content} readOnly={contentMode === 'preview'} className="knowledge-review-markdown-editor" contentEditableClassName="knowledge-review-markdown-content" plugins={markdownEditorPlugins} onChange={(value, initial) => { if (!initial) setEditedContent(value) }} />
                </Card>
              </Col>
            </Row>
          </Col>
          <Col xs={24} lg={sidebarCollapsed ? 0 : 8} style={sidebarCollapsed ? { display: 'none' } : undefined}>
            <Card
              size="small"
              className="knowledge-review-sidebar-card"
              title={intl.formatMessage({ id: 'pages.knowledge.review.detail.reviewPanel' })}
              extra={<Button type="link" size="small" onClick={() => setSidebarCollapsed(true)}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.collapseSidebar' })}</Button>}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {data?.aiReview?.summary && <Alert showIcon type="info" message={data.aiReview.summary} />}
              <Card size="small" type="inner" title={intl.formatMessage({ id: 'pages.knowledge.review.detail.reviewInfo' })}>
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
                type="inner"
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
              <Card size="small" type="inner" title={intl.formatMessage({ id: 'pages.knowledge.review.detail.actionHistory' })}>
                <ReviewActionTimeline actionLogs={data?.actionLogs} getUserName={getUserName} />
              </Card>
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  )
}

export default ReviewTaskPage
