import {
  BarChartOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useIntl } from '@umijs/max'
import { Button, Col, Popconfirm, Row, Space, Statistic, Tag, Typography } from 'antd'
import React from 'react'
import { AiReviewDiff } from '@/services/entity/Agent'

interface Props {
  diff: AiReviewDiff
  busy?: boolean
  batchCount?: number
  acceptedCount?: number
  onRerun: () => void
  onBatchAccept?: () => void
  onApplyAccepted?: () => void
  onSubmit?: () => void
}

const ReviewDiffToolbar: React.FC<Props> = ({
  diff,
  busy,
  batchCount = 0,
  acceptedCount = 0,
  onRerun,
  onBatchAccept,
  onApplyAccepted,
  onSubmit,
}) => {
  const intl = useIntl()
  const statusLabelMap: Record<string, string> = {
    success: 'AI review completed',
    failed: 'AI review failed',
    stale: 'AI review stale',
    pending: 'AI review pending',
    running: 'AI review running',
  }
  const statusColorMap: Record<string, string> = {
    success: 'success',
    failed: 'error',
    stale: 'warning',
    pending: 'processing',
    running: 'processing',
  }
  const status = diff.stale ? 'stale' : diff.reviewStatus
  return (
    <Row
      align="middle"
      justify="space-between"
      wrap
      style={{
        marginBottom: 12,
        padding: '12px 16px',
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
      }}
    >
      <Col>
        <Space size="middle">
          <Tag color={statusColorMap[status] || 'default'}>
            {statusLabelMap[status] || `AI review ${status}`}
          </Tag>
          <Statistic
            title={<Typography.Text type="secondary">Pending</Typography.Text>}
            value={diff.pendingCount}
            prefix={<BarChartOutlined />}
            valueStyle={{ fontSize: 16, fontWeight: 600 }}
          />
          <Statistic
            title={<Typography.Text type="secondary">Critical</Typography.Text>}
            value={diff.criticalPendingCount}
            valueStyle={{ fontSize: 16, fontWeight: 600, color: '#cf1322' }}
          />
          {acceptedCount > 0 && (
            <Statistic
              title={<Typography.Text type="secondary">Accepted</Typography.Text>}
              value={acceptedCount}
              valueStyle={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}
            />
          )}
        </Space>
      </Col>
      <Col style={{ marginTop: 4 }}>
        <Space>
          {onSubmit && (
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.submitConfirmTitle' })}
              description={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.submitConfirmDesc' })}
              onConfirm={onSubmit}
              okText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.submitOkText' })}
              cancelText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.cancelText' })}
            >
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={busy}
                disabled={busy}
              >
                {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.submitReview' })}
              </Button>
            </Popconfirm>
          )}
          {batchCount > 0 && onBatchAccept && (
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.batchAcceptTitle' })}
              description={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.batchAcceptDesc' }, { count: batchCount })}
              onConfirm={onBatchAccept}
              okText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.batchAcceptOkText' })}
              cancelText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.cancelText' })}
            >
              <Button
                icon={<CheckCircleOutlined />}
                loading={busy}
                disabled={busy}
              >
                {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.batchAcceptButton' }, { count: batchCount })}
              </Button>
            </Popconfirm>
          )}
          {acceptedCount > 0 && onApplyAccepted && (
            <Popconfirm
              title={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.applyTitle' })}
              description={
                <>
                  {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.applyDesc1' })}
                  <br />
                  {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.applyDesc2' })}
                </>
              }
              onConfirm={onApplyAccepted}
              okText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.applyOkText' })}
              cancelText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.cancelText' })}
            >
              <Button
                icon={<FileDoneOutlined />}
                loading={busy}
                disabled={busy}
              >
                {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.applyButton' }, { count: acceptedCount })}
              </Button>
            </Popconfirm>
          )}
          <Button icon={<ReloadOutlined />} loading={busy} onClick={onRerun}>
            {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.rerunButton' })}
          </Button>
        </Space>
      </Col>
    </Row>
  )
}
export default ReviewDiffToolbar
