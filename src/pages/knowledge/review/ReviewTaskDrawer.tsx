import { DrawerForm, PageContainer } from '@ant-design/pro-components'
import { Editor } from '@monaco-editor/react'
import { useIntl, useModel } from '@umijs/max'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  List,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Tabs,
  Timeline,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { KnowledgeReviewTaskDetail } from '@/services/entity/Agent'
import { updateDocumentDraft } from '@/services/knowledge/DocumentController'
import {
  approveReviewTask,
  claimReviewTask,
  getReviewTask,
  rejectReviewTask,
} from '@/services/knowledge/ReviewController'
import { getAdminList } from '@/services/sys/AdminController'
import { Admin } from '@/services/entity/Sys'

interface Props {
  taskId?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  presentation?: 'drawer' | 'page';
}

const ReviewTaskDrawer: React.FC<Props> = ({
  taskId,
  open,
  onClose,
  onSuccess,
  presentation = 'drawer',
}) => {
  const intl = useIntl()
  const { initialState } = useModel('@@initialState')
  const [data, setData] = useState<KnowledgeReviewTaskDetail>()
  const [comment, setComment] = useState('')
  const [versionContent, setVersionContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [claimedByCurrentUser, setClaimedByCurrentUser] = useState(false)
  const [userList, setUserList] = useState<Admin[]>([])
  const canDecide =
    data?.status === 'claimed' &&
    (claimedByCurrentUser ||
      String(data.reviewerId || '') === String(initialState?.currentUser?.id || ''))
  const hasUnsavedChanges = versionContent !== (data?.version?.content || '')

  const actionText: Record<string, string> = {
    SUBMITTED: intl.formatMessage({ id: 'pages.knowledge.review.action.submitted' }),
    CLAIMED: intl.formatMessage({ id: 'pages.knowledge.review.action.claimed' }),
    APPROVED: intl.formatMessage({ id: 'pages.knowledge.review.action.approved' }),
    REJECTED: intl.formatMessage({ id: 'pages.knowledge.review.action.rejected' }),
    DRAFT_CREATED: intl.formatMessage({ id: 'pages.knowledge.review.action.draftCreated' }),
    DRAFT_UPDATED: intl.formatMessage({ id: 'pages.knowledge.review.action.draftUpdated' }),
    AI_REVIEW_STARTED: intl.formatMessage({ id: 'pages.knowledge.review.action.aiReviewStarted' }),
    AI_REVIEW_COMPLETED: intl.formatMessage({
      id: 'pages.knowledge.review.action.aiReviewCompleted',
    }),
    AI_REVIEW_FAILED: intl.formatMessage({ id: 'pages.knowledge.review.action.aiReviewFailed' }),
  }

  const load = async () => {
    if (!taskId) return
    setLoading(true)
    try {
      setData((await getReviewTask(taskId)).data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !taskId) return
    let cancelled = false
    setClaimedByCurrentUser(false)
    setComment('')
    getAdminList({ current: 1, pageSize: 1000 }).then((res) => {
      if (!cancelled) setUserList(res.data)
    })
    const loadTask = async () => {
      setLoading(true)
      try {
        const response = await getReviewTask(taskId)
        if (!cancelled) {
          setData(response.data)
          setVersionContent(response.data?.version?.content || '')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadTask()
    return () => {
      cancelled = true
    }
  }, [open, taskId])

  const saveDraft = async (silent = false) => {
    if (!hasUnsavedChanges) return true
    if (!data?.version?.id || !data.version.contentChecksum) return false
    const updatedVersion = await updateDocumentDraft(
      data.version.id,
      versionContent,
      data.version.contentChecksum,
    )
    if (!updatedVersion.data) return false
    setData((current) => (current ? { ...current, version: updatedVersion.data } : current))
    if (!silent) message.success('修改已保存')
    return true
  }

  const act = async (kind: 'claim' | 'approve' | 'reject') => {
    if (!taskId) return
    if (kind === 'reject' && !comment.trim()) {
      message.warning(
        intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectionReasonRequired' }),
      )
      return
    }
    setActing(true)
    try {
      if (kind === 'approve' && !(await saveDraft(true))) return
      const response =
        kind === 'claim'
          ? await claimReviewTask(taskId)
          : kind === 'approve'
            ? await approveReviewTask(taskId, comment)
            : await rejectReviewTask(taskId, comment)
      if (response.code === 200) {
        message.success(intl.formatMessage({ id: 'pages.knowledge.review.detail.actionSuccess' }))
        onSuccess()
        if (kind === 'claim') {
          setClaimedByCurrentUser(true)
          setData((current) => (current ? { ...current, status: 'claimed' } : current))
        } else if (kind === 'approve') onClose()
        else load()
      }
    } finally {
      setActing(false)
    }
  }

  const renderActionLog = (item: NonNullable<KnowledgeReviewTaskDetail['actionLogs']>[number]) => {
    const action = item.action ? actionText[item.action] || item.action : '-'
    const time = item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '-'
    return (
      <Space direction="vertical" size={2}>
        <Space size="small" wrap>
          <Typography.Text strong>{action}</Typography.Text>
          <Typography.Text type="secondary">{time}</Typography.Text>
        </Space>
        <Typography.Text type="secondary">
          {[userList.find((user) => user.id === item.operatorId)?.username || '-', item.comment]
            .filter(Boolean)
            .join(' · ') || '-'}
        </Typography.Text>
      </Space>
    )
  }

  const title =
    data?.documentTitle || intl.formatMessage({ id: 'pages.knowledge.review.detail.title' })
  const issueList = (
    <List
      size="small"
      dataSource={data?.issues || []}
      locale={{
        emptyText: intl.formatMessage({
          id: 'pages.knowledge.review.detail.noAiReviewSummary',
        }),
      }}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={
              <Space>
                <Tag color={item.severity === 'critical' ? 'red' : 'orange'}>
                  {item.severity}
                </Tag>
                {item.title}
              </Space>
            }
            description={item.description}
          />
        </List.Item>
      )}
    />
  )
  const actionTimeline = (
    <Timeline
      items={(data?.actionLogs || []).map((item) => ({ children: renderActionLog(item) }))}
    />
  )
  const content = (
    <Spin spinning={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {data?.aiReview?.summary && <Alert showIcon type="info" message={data.aiReview.summary} />}
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'pages.knowledge.review.detail.submitter' })}
          >
            {userList.find((user) => user.id === data?.submitterId)?.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'pages.knowledge.review.detail.claimant' })}
          >
            {userList.find((user) => user.id === data?.reviewerId)?.username || '-'}
          </Descriptions.Item>
        </Descriptions>
        <Typography.Title level={5}>
          {intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })}
        </Typography.Title>
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
          <Editor
            height="360px"
            language="markdown"
            value={versionContent}
            onChange={(value) => setVersionContent(value || '')}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 13,
              lineHeight: 22,
              wordWrap: 'on',
            }}
          />
        </div>
        <Typography.Title level={5}>
          {intl.formatMessage(
            { id: 'pages.knowledge.review.detail.aiReviewScore' },
            { score: data?.aiReview?.score ?? '-' },
          )}
        </Typography.Title>
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6 }}>{issueList}</div>
        {(data?.status === 'pending' || canDecide) && (
          <>
            <Input.TextArea
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={intl.formatMessage({
                id: 'pages.knowledge.review.detail.rejectionReasonPlaceholder',
              })}
            />
            <Space>
              {data?.status === 'pending' && (
                <Button type="primary" onClick={() => act('claim')}>
                  {intl.formatMessage({ id: 'pages.knowledge.review.detail.claim' })}
                </Button>
              )}
              {canDecide && (
                <Button type="primary" onClick={() => act('approve')}>
                  {intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}
                </Button>
              )}
              {canDecide && (
                <Button
                  danger
                  onClick={() =>
                    Modal.confirm({
                      title: intl.formatMessage({
                        id: 'pages.knowledge.review.detail.rejectConfirm',
                      }),
                      onOk: () => act('reject'),
                    })
                  }
                >
                  {intl.formatMessage({ id: 'pages.knowledge.review.detail.reject' })}
                </Button>
              )}
            </Space>
          </>
        )}
        {actionTimeline}
      </Space>
    </Spin>
  )

  if (presentation === 'page') {
    const handleBack = () => {
      if (!hasUnsavedChanges) {
        onClose()
        return
      }
      Modal.confirm({
        title: '存在未保存的修改',
        content: '返回后当前正文修改将丢失，是否继续？',
        okText: '放弃修改',
        okButtonProps: { danger: true },
        cancelText: '继续编辑',
        onOk: onClose,
      })
    }
    const statusColor: Record<string, string> = {
      pending: 'warning',
      claimed: 'processing',
      approved: 'success',
      rejected: 'error',
    }
    return (
      <PageContainer
        title={title}
        subTitle={data?.version?.versionNo ? `v${data.version.versionNo}` : undefined}
        tags={<Tag color={statusColor[data?.status || '']}>{data?.status || '-'}</Tag>}
        onBack={handleBack}
      >
        <Spin spinning={loading}>
          <Row gutter={16} align="stretch">
            <Col xs={24} lg={16}>
              <Card
                size="small"
                title={intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })}
                extra={
                  hasUnsavedChanges ? (
                    <Tag color="warning">未保存</Tag>
                  ) : (
                    <Typography.Text type="secondary">已保存</Typography.Text>
                  )
                }
                styles={{ body: { padding: 0 } }}
              >
                <Editor
                  height="calc(100vh - 230px)"
                  language="markdown"
                  value={versionContent}
                  onChange={(value) => setVersionContent(value || '')}
                  options={{
                    readOnly: !canDecide,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontSize: 13,
                    lineHeight: 22,
                    wordWrap: 'on',
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card size="small" styles={{ body: { padding: '0 12px' } }}>
                <Tabs
                  defaultActiveKey="issues"
                  items={[
                    {
                      key: 'issues',
                      label: `问题 ${(data?.issues || []).length}`,
                      children: (
                        <div style={{ maxHeight: 'calc(100vh - 430px)', overflow: 'auto' }}>
                          {issueList}
                        </div>
                      ),
                    },
                    {
                      key: 'summary',
                      label: '审批信息',
                      children: (
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                          {data?.aiReview?.summary && (
                            <Alert showIcon type="info" message={data.aiReview.summary} />
                          )}
                          <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item
                              label={intl.formatMessage({
                                id: 'pages.knowledge.review.detail.submitter',
                              })}
                            >
                              {userList.find((user) => user.id === data?.submitterId)?.username ||
                                '-'}
                            </Descriptions.Item>
                            <Descriptions.Item
                              label={intl.formatMessage({
                                id: 'pages.knowledge.review.detail.claimant',
                              })}
                            >
                              {userList.find((user) => user.id === data?.reviewerId)?.username ||
                                '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="AI 评分">
                              {data?.aiReview?.score ?? '-'}
                            </Descriptions.Item>
                          </Descriptions>
                        </Space>
                      ),
                    },
                    {
                      key: 'history',
                      label: '操作记录',
                      children: (
                        <div style={{ maxHeight: 'calc(100vh - 430px)', overflow: 'auto' }}>
                          {actionTimeline}
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>
              {(data?.status === 'pending' || canDecide) && (
                <Card
                  size="small"
                  title="审批操作"
                  style={{ position: 'sticky', bottom: 16, marginTop: 16 }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Input.TextArea
                      rows={3}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder={intl.formatMessage({
                        id: 'pages.knowledge.review.detail.rejectionReasonPlaceholder',
                      })}
                    />
                    {data?.status === 'pending' ? (
                      <Button type="primary" block loading={acting} onClick={() => act('claim')}>
                        {intl.formatMessage({ id: 'pages.knowledge.review.detail.claim' })}
                      </Button>
                    ) : (
                      <Space wrap>
                        <Button
                          disabled={!hasUnsavedChanges}
                          loading={acting}
                          onClick={async () => {
                            setActing(true)
                            try {
                              await saveDraft()
                            } finally {
                              setActing(false)
                            }
                          }}
                        >
                          保存修改
                        </Button>
                        <Button type="primary" loading={acting} onClick={() => act('approve')}>
                          {intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}
                        </Button>
                        <Button
                          danger
                          disabled={acting}
                          onClick={() =>
                            Modal.confirm({
                              title: intl.formatMessage({
                                id: 'pages.knowledge.review.detail.rejectConfirm',
                              }),
                              onOk: () => act('reject'),
                            })
                          }
                        >
                          {intl.formatMessage({ id: 'pages.knowledge.review.detail.reject' })}
                        </Button>
                      </Space>
                    )}
                  </Space>
                </Card>
              )}
            </Col>
          </Row>
        </Spin>
      </PageContainer>
    )
  }

  return (
    <DrawerForm
      title={title}
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      submitter={false}
    >
      {content}
    </DrawerForm>
  )
}

export default ReviewTaskDrawer
