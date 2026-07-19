import { PageContainer } from '@ant-design/pro-components'
import { history, useLocation, useModel } from '@umijs/max'
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
  Tag,
  Timeline,
  Typography,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { KnowledgeReviewTaskDetail } from '@/services/entity/Agent'
import {
  approveReviewTask,
  claimReviewTask,
  getReviewTask,
  rejectReviewTask,
} from '@/services/knowledge/ReviewController'
export default () => {
  const location = useLocation()
  const { initialState } = useModel('@@initialState')
  const taskId = new URLSearchParams(location.search).get('id') || ''
  const [data, setData] = useState<KnowledgeReviewTaskDetail>()
  const [comment, setComment] = useState('')
  const canDecide =
    data?.status === 'claimed' &&
    String(data.claimantId || '') === String(initialState?.currentUser?.id || '')
  const load = async () => setData((await getReviewTask(taskId)).data)
  useEffect(() => {
    load()
  }, [taskId])
  const act = async (kind: 'claim' | 'approve' | 'reject') => {
    if (kind === 'reject' && !comment.trim()) {
      message.warning('拒绝时必须填写原因')
      return
    }
    const r =
      kind === 'claim'
        ? await claimReviewTask(taskId)
        : kind === 'approve'
          ? await approveReviewTask(taskId, comment)
          : await rejectReviewTask(taskId, comment)
    if (r.code === 200) {
      message.success('操作成功')
      if (kind === 'approve' && r.data) history.push(`/knowledge/index-job?id=${r.data}`)
      else load()
    }
  }
  return (
    <PageContainer
      title={data?.documentTitle || '审批详情'}
      onBack={() => history.back()}
      extra={
        <Space>
          {data?.status === 'pending' && (
            <Button type="primary" onClick={() => act('claim')}>
              认领
            </Button>
          )}
          {canDecide && (
            <>
              <Button type="primary" onClick={() => act('approve')}>
                通过
              </Button>
              <Button
                danger
                onClick={() => Modal.confirm({ title: '确认拒绝？', onOk: () => act('reject') })}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Row gutter={16}>
        <Col span={11}>
          <Card title="版本内容">
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {data?.version?.content || '-'}
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col span={7}>
          <Card title={`AI 审查 ${data?.aiReview?.score ?? '-'} 分`}>
            <Alert showIcon type="info" message={data?.aiReview?.summary || '暂无摘要'} />
            <List
              dataSource={data?.issues || []}
              renderItem={(x) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <>
                        <Tag color={x.severity === 'critical' ? 'red' : 'orange'}>{x.severity}</Tag>
                        {x.title}
                      </>
                    }
                    description={x.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="审批意见">
            <Input.TextArea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="拒绝时必填"
            />
            <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="提交人">{data?.submitterName}</Descriptions.Item>
              <Descriptions.Item label="认领人">{data?.claimantName || '-'}</Descriptions.Item>
            </Descriptions>
            <Timeline
              items={(data?.actionLogs || []).map((x) => ({
                children: `${x.operatorName || ''} ${x.action || ''} ${x.comment || ''}`,
              }))}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}



