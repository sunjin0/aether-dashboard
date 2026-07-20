import { PageContainer } from '@ant-design/pro-components'
import { history, useIntl, useLocation, useModel } from '@umijs/max'
import { Alert, Button, Card, Col, Descriptions, Input, List, message, Modal, Row, Space, Tag, Timeline, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { KnowledgeReviewTaskDetail } from '@/services/entity/Agent'
import { approveReviewTask, claimReviewTask, getReviewTask, rejectReviewTask } from '@/services/knowledge/ReviewController'
import DiffWorkspace from './detail/DiffWorkspace'

export default () => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const intl = useIntl()
  const { initialState } = useModel('@@initialState')
  const taskId = params.get('id') || ''
  const [data, setData] = useState<KnowledgeReviewTaskDetail>()
  const [comment, setComment] = useState('')
  const canDecide = data?.status === 'claimed' && String(data.claimantId || '') === String(initialState?.currentUser?.id || '')
  const load = async () => setData((await getReviewTask(taskId)).data)
  useEffect(() => { load() }, [taskId])

  if (data?.aiReview?.id) {
    return (
      <DiffWorkspace
        reviewId={data.aiReview.id}
        documentVersionId={data.documentVersionId}
        versionReviewStatus={data.version?.reviewStatus}
      />
    )
  }

  const act = async (kind: 'claim' | 'approve' | 'reject') => {
    if (kind === 'reject' && !comment.trim()) { message.warning(intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectionReasonRequired' })); return }
    const response = kind === 'claim' ? await claimReviewTask(taskId) : kind === 'approve' ? await approveReviewTask(taskId, comment) : await rejectReviewTask(taskId, comment)
    if (response.code === 200) { message.success(intl.formatMessage({ id: 'pages.knowledge.review.detail.actionSuccess' })); if (kind === 'approve' && response.data) history.push(`/knowledge/index-job?id=${response.data}`); else load() }
  }
  return <PageContainer title={data?.documentTitle || intl.formatMessage({ id: 'pages.knowledge.review.detail.title' })} onBack={() => history.back()} extra={<Space>{data?.status === 'pending' && <Button type="primary" onClick={() => act('claim')}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.claim' })}</Button>}{canDecide && <><Button type="primary" onClick={() => act('approve')}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}</Button><Button danger onClick={() => Modal.confirm({ title: intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectConfirm' }), onOk: () => act('reject') })}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.reject' })}</Button></>}</Space>}>
    <Row gutter={16}><Col span={11}><Card title={intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })}><Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{data?.version?.content || '-'}</Typography.Paragraph></Card></Col><Col span={7}><Card title={intl.formatMessage({ id: 'pages.knowledge.review.detail.aiReviewScore' }, { score: data?.aiReview?.score ?? '-' })} extra={data?.aiReview?.id && <Button type="link" onClick={() => history.push(`/knowledge/review/detail?id=${data.aiReview?.id}&mode=diff`)}>{intl.formatMessage({ id: 'pages.knowledge.review.detail.viewDiff' })}</Button>}><Alert showIcon type="info" message={data?.aiReview?.summary || intl.formatMessage({ id: 'pages.knowledge.review.detail.noAiReviewSummary' })} /><List dataSource={data?.issues || []} renderItem={(item) => <List.Item><List.Item.Meta title={<><Tag color={item.severity === 'critical' ? 'red' : 'orange'}>{item.severity}</Tag>{item.title}</>} description={item.description} /></List.Item>} /></Card></Col><Col span={6}><Card title={intl.formatMessage({ id: 'pages.knowledge.review.detail.reviewComment' })}><Input.TextArea rows={5} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectionReasonPlaceholder' })} /><Descriptions column={1} size="small" style={{ marginTop: 16 }}><Descriptions.Item label={intl.formatMessage({ id: 'pages.knowledge.review.detail.submitter' })}>{data?.submitterName}</Descriptions.Item><Descriptions.Item label={intl.formatMessage({ id: 'pages.knowledge.review.detail.claimant' })}>{data?.claimantName || '-'}</Descriptions.Item></Descriptions><Timeline items={(data?.actionLogs || []).map((item) => ({ children: `${item.operatorName || ''} ${item.action || ''} ${item.comment || ''}` }))} /></Card></Col></Row>
  </PageContainer>
}
