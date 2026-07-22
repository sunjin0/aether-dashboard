import { DrawerForm } from '@ant-design/pro-components'
import { Editor } from '@monaco-editor/react'
import { useIntl, useModel } from '@umijs/max'
import { Alert, Button, Descriptions, Input, List, message, Modal, Space, Spin, Tag, Timeline, Typography } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { KnowledgeReviewTaskDetail } from '@/services/entity/Agent'
import { updateDocumentDraft } from '@/services/knowledge/DocumentController'
import { approveReviewTask, claimReviewTask, getReviewTask, rejectReviewTask } from '@/services/knowledge/ReviewController'
import { getAdminList } from '@/services/sys/AdminController'
import { Admin } from '@/services/entity/Sys'

interface Props {
  taskId?: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const ReviewTaskDrawer: React.FC<Props> = ({ taskId, open, onClose, onSuccess }) => {
  const intl = useIntl()
  const { initialState } = useModel('@@initialState')
  const [data, setData] = useState<KnowledgeReviewTaskDetail>()
  const [comment, setComment] = useState('')
  const [versionContent, setVersionContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [claimedByCurrentUser, setClaimedByCurrentUser] = useState(false)
  const [userList, setUserList] = useState<Admin[]>([])
  const canDecide =
    data?.status === 'claimed' &&
    (claimedByCurrentUser ||
      String(data.reviewerId || '') === String(initialState?.currentUser?.id || ''))

  const actionText: Record<string, string> = {
    SUBMITTED: intl.formatMessage({ id: 'pages.knowledge.review.action.submitted' }),
    CLAIMED: intl.formatMessage({ id: 'pages.knowledge.review.action.claimed' }),
    APPROVED: intl.formatMessage({ id: 'pages.knowledge.review.action.approved' }),
    REJECTED: intl.formatMessage({ id: 'pages.knowledge.review.action.rejected' }),
    DRAFT_CREATED: intl.formatMessage({ id: 'pages.knowledge.review.action.draftCreated' }),
    DRAFT_UPDATED: intl.formatMessage({ id: 'pages.knowledge.review.action.draftUpdated' }),
    AI_REVIEW_STARTED: intl.formatMessage({ id: 'pages.knowledge.review.action.aiReviewStarted' }),
    AI_REVIEW_COMPLETED: intl.formatMessage({ id: 'pages.knowledge.review.action.aiReviewCompleted' }),
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

  const act = async (kind: 'claim' | 'approve' | 'reject') => {
    if (!taskId) return
    if (kind === 'reject' && !comment.trim()) {
      message.warning(intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectionReasonRequired' }))
      return
    }
    if (kind === 'approve' && data?.version?.id && data.version.contentChecksum && versionContent !== (data.version.content || '')) {
      const updatedVersion = await updateDocumentDraft(data.version.id, versionContent, data.version.contentChecksum)
      if (updatedVersion.data) {
        setData((current) => current ? { ...current, version: updatedVersion.data } : current)
      }
    }
    const response = kind === 'claim'
      ? await claimReviewTask(taskId)
      : kind === 'approve'
        ? await approveReviewTask(taskId, comment)
        : await rejectReviewTask(taskId, comment)
    if (response.code === 200) {
      message.success(intl.formatMessage({ id: 'pages.knowledge.review.detail.actionSuccess' }))
      onSuccess()
      if (kind === 'claim') {
        setClaimedByCurrentUser(true)
        setData((current) => current ? { ...current, status: 'claimed' } : current)
      } else if (kind === 'approve') onClose()
      else load()
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
          {[userList.find((user) => user.id === item.operatorId)?.username || '-', item.comment].filter(Boolean).join(' · ') || '-'}
        </Typography.Text>
      </Space>
    )
  }

  return (
    <DrawerForm
      title={
        data?.documentTitle || intl.formatMessage({ id: 'pages.knowledge.review.detail.title' })
      }
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      submitter={false}
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {data?.aiReview?.summary && (
            <Alert showIcon type="info" message={data.aiReview.summary} />
          )}
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
          <List
            size="small"
            bordered
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
          <Timeline
            items={(data?.actionLogs || []).map((item) => ({ children: renderActionLog(item) }))}
          />
        </Space>
      </Spin>
    </DrawerForm>
  )
}

export default ReviewTaskDrawer
