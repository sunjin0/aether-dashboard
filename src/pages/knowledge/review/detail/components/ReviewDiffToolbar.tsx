import {
  BarChartOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useIntl } from '@umijs/max'
import {
  Button,
  Col,
  Divider,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import React from 'react'
import { AiReviewDiff } from '@/services/entity/Agent'

interface Props {
  diff: AiReviewDiff;
  busy?: boolean;
  batchCount?: number;
  acceptedCount?: number;
  onRerun?: () => void;
  onBatchAccept?: () => void;
  onApplyAccepted?: () => void;
  onSubmit?: () => void;
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
    DRAFT: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.status.draft' }),
    AI_REVIEWING: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.status.aiReviewing' }),
    AI_REVIEWED: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.status.aiReviewed' }),
    SUBMITTED: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.status.submitted' }),
    APPROVED: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.status.approved' }),
    REJECTED: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.status.rejected' }),
  }
  const statusColorMap: Record<string, string> = {
    DRAFT: 'default',
    AI_REVIEWING: 'processing',
    AI_REVIEWED: 'success',
    SUBMITTED: 'processing',
    APPROVED: 'success',
    REJECTED: 'error',
  }
  const reviewStatus = diff.reviewStatus || ''
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
          {diff.stale && (
            <Tag color="warning">
              {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.status.stale' })}
            </Tag>
          )}
          <Tag color={statusColorMap[reviewStatus] || 'default'}>
            {statusLabelMap[reviewStatus] || reviewStatus || '-'}
          </Tag>
          <Statistic
            title={
              <Typography.Text type="secondary">
                {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.pending' })}
              </Typography.Text>
            }
            value={diff.pendingCount}
            prefix={<BarChartOutlined />}
            valueStyle={{ fontSize: 16, fontWeight: 600 }}
          />
          <Statistic
            title={
              <Typography.Text type="secondary">
                {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.critical' })}
              </Typography.Text>
            }
            value={diff.criticalPendingCount}
            valueStyle={{ fontSize: 16, fontWeight: 600, color: '#cf1322' }}
          />
          {acceptedCount > 0 && (
            <Statistic
              title={
                <Typography.Text type="secondary">
                  {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.accepted' })}
                </Typography.Text>
              }
              value={acceptedCount}
              valueStyle={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}
            />
          )}
        </Space>
      </Col>
      <Col style={{ marginTop: 4 }}>
        <Space size="small">
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
              cancelText={intl.formatMessage({
                id: 'pages.knowledge.review.diffToolbar.cancelText',
              })}
            >
              <Button type="primary" icon={<FileDoneOutlined />} loading={busy} disabled={busy}>
                保存 {acceptedCount} 项修改
              </Button>
            </Popconfirm>
          )}
          {batchCount > 0 && onBatchAccept && (
            <Popconfirm
              title={intl.formatMessage({
                id: 'pages.knowledge.review.diffToolbar.batchAcceptTitle',
              })}
              description={intl.formatMessage(
                { id: 'pages.knowledge.review.diffToolbar.batchAcceptDesc' },
                { count: batchCount },
              )}
              onConfirm={onBatchAccept}
              okText={intl.formatMessage({
                id: 'pages.knowledge.review.diffToolbar.batchAcceptOkText',
              })}
              cancelText={intl.formatMessage({
                id: 'pages.knowledge.review.diffToolbar.cancelText',
              })}
            >
              <Button icon={<CheckCircleOutlined />} loading={busy} disabled={busy}>
                {intl.formatMessage(
                  { id: 'pages.knowledge.review.diffToolbar.batchAcceptButton' },
                  { count: batchCount },
                )}
              </Button>
            </Popconfirm>
          )}
          {(onApplyAccepted || onBatchAccept) && onSubmit && <Divider type="vertical" />}
          {onSubmit && (
            <Button
              type={acceptedCount > 0 ? 'default' : 'primary'}
              icon={<SendOutlined />}
              loading={busy}
              onClick={onSubmit}
            >
              {intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.submitReview' })}
            </Button>
          )}
          {onRerun && (
            <Tooltip
              title={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.rerunButton' })}
            >
              <Button
                aria-label={intl.formatMessage({
                  id: 'pages.knowledge.review.diffToolbar.rerunButton',
                })}
                icon={<ReloadOutlined />}
                loading={busy}
                onClick={onRerun}
              />
            </Tooltip>
          )}
        </Space>
      </Col>
    </Row>
  )
}
export default ReviewDiffToolbar
