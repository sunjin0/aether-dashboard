import { DrawerForm, PageContainer } from '@ant-design/pro-components';
import { Editor } from '@monaco-editor/react';
import { useIntl, useModel } from '@umijs/max';
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
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { KnowledgeReviewTaskDetail } from '@/services/entity/Agent';
import {
  approveReviewTask,
  claimReviewTask,
  getReviewTask,
  rejectReviewTask,
} from '@/services/knowledge/ReviewController';
import { getAdminList } from '@/services/sys/AdminController';
import { Admin } from '@/services/entity/Sys';

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
  const intl = useIntl();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { initialState } = useModel('@@initialState');
  const [data, setData] = useState<KnowledgeReviewTaskDetail>();
  const [comment, setComment] = useState('');
  const [versionContent, setVersionContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [claimedByCurrentUser, setClaimedByCurrentUser] = useState(false);
  const [userList, setUserList] = useState<Admin[]>([]);
  const canDecide =
    data?.status === 'claimed' &&
    (claimedByCurrentUser ||
      String(data.reviewerId || '') === String(initialState?.currentUser?.id || ''));
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
  };

  const load = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      setData((await getReviewTask(taskId)).data);
    } catch {
      // The global request error handler has already shown the failure.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    setClaimedByCurrentUser(false);
    setComment('');
    getAdminList({ current: 1, pageSize: 1000 }).then((res) => {
      if (!cancelled) setUserList(res.data);
    }).catch(() => {
      if (!cancelled) setUserList([]);
    });
    const loadTask = async () => {
      setLoading(true);
      try {
        const response = await getReviewTask(taskId);
        if (!cancelled) {
          setData(response.data);
          setVersionContent(response.data?.version?.content || '');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadTask().catch(() => {
      // The global request error handler has already shown the failure.
    });
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  const act = async (kind: 'claim' | 'approve' | 'reject') => {
    if (!taskId) return;
    if (kind === 'reject' && !comment.trim()) {
      messageApi.warning(
        intl.formatMessage({ id: 'pages.knowledge.review.detail.rejectionReasonRequired' }),
      );
      return;
    }
    setActing(true);
    try {
      const response =
        kind === 'claim'
          ? await claimReviewTask(taskId)
          : kind === 'approve'
            ? await approveReviewTask(taskId, comment)
            : await rejectReviewTask(taskId, comment);
      if (response.code === 200) {
        messageApi.success(
          intl.formatMessage({ id: 'pages.knowledge.review.detail.actionSuccess' }),
        );
        onSuccess();
        if (kind === 'claim') {
          setClaimedByCurrentUser(true);
          setData((current) => (current ? { ...current, status: 'claimed' } : current));
        } else if (kind === 'approve') onClose();
        else load();
      }
    } catch {
      // The global request error handler has already shown the failure.
    } finally {
      setActing(false);
    }
  };

  const renderActionLog = (item: NonNullable<KnowledgeReviewTaskDetail['actionLogs']>[number]) => {
    const action = item.action ? actionText[item.action] || item.action : '-';
    const time = item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '-';
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
    );
  };

  const title =
    data?.documentTitle || intl.formatMessage({ id: 'pages.knowledge.review.detail.title' });
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
                <Tag color={item.severity === 'critical' ? 'red' : 'orange'}>{item.severity}</Tag>
                {item.title}
              </Space>
            }
            description={item.description}
          />
        </List.Item>
      )}
    />
  );
  const actionTimeline = (
    <Timeline
      items={(data?.actionLogs || []).map((item) => ({ children: renderActionLog(item) }))}
    />
  );
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
            {canDecide && (
              <Input.TextArea
                rows={4}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={intl.formatMessage({
                  id: 'pages.knowledge.review.detail.rejectionReasonPlaceholder',
                })}
              />
            )}
            <Space>
              {data?.status === 'pending' && (
                <Button type="primary" loading={acting} onClick={() => act('claim')}>
                  {intl.formatMessage({ id: 'pages.knowledge.review.detail.claim' })}
                </Button>
              )}
              {canDecide && (
                <Button type="primary" loading={acting} onClick={() => act('approve')}>
                  {intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}
                </Button>
              )}
              {canDecide && (
                <Button
                  danger
                  disabled={acting}
                  onClick={() =>
                    modalApi.confirm({
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
  );

  if (presentation === 'page') {
    const handleBack = onClose;
    const statusColor: Record<string, string> = {
      pending: 'warning',
      claimed: 'processing',
      approved: 'success',
      rejected: 'error',
    };
    const statusText: Record<string, string> = {
      pending: intl.formatMessage({ id: 'pages.knowledge.review.status.pending' }),
      claimed: intl.formatMessage({ id: 'pages.knowledge.review.status.claimed' }),
      approved: intl.formatMessage({ id: 'pages.knowledge.review.status.approved' }),
      rejected: intl.formatMessage({ id: 'pages.knowledge.review.status.rejected' }),
    };
    return (
      <>
        {messageContextHolder}
        {modalContextHolder}
        <PageContainer
        title={title}
        subTitle={data?.version?.versionNo ? `v${data.version.versionNo}` : undefined}
        tags={
          <Tag color={statusColor[data?.status || '']}>
            {statusText[data?.status || ''] || data?.status || '-'}
          </Tag>
        }
        onBack={handleBack}
      >
        <Spin spinning={loading}>
          <Row gutter={16} align="stretch">
            <Col xs={24} lg={16}>
              <Card
                size="small"
                title={intl.formatMessage({ id: 'pages.knowledge.review.detail.versionContent' })}
                extra={
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.knowledge.review.detail.readOnlyDuringReview' })}
                  </Typography.Text>
                }
                styles={{ body: { padding: 0 } }}
              >
                <Editor
                  height="calc(100vh - 230px)"
                  language="markdown"
                  value={versionContent}
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
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card size="small" styles={{ body: { padding: '0 12px' } }}>
                <Tabs
                  defaultActiveKey="issues"
                  items={[
                    {
                      key: 'issues',
                      label: intl.formatMessage(
                        { id: 'pages.knowledge.review.detail.issueCount' },
                        { count: (data?.issues || []).length },
                      ),
                      children: (
                        <div style={{ maxHeight: 'calc(100vh - 430px)', overflow: 'auto' }}>
                          {issueList}
                        </div>
                      ),
                    },
                    {
                      key: 'summary',
                      label: intl.formatMessage({
                        id: 'pages.knowledge.review.detail.reviewInfo',
                      }),
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
                            <Descriptions.Item
                              label={intl.formatMessage({
                                id: 'pages.knowledge.review.detail.aiScore',
                              })}
                            >
                              {data?.aiReview?.score ?? '-'}
                            </Descriptions.Item>
                          </Descriptions>
                        </Space>
                      ),
                    },
                    {
                      key: 'history',
                      label: intl.formatMessage({
                        id: 'pages.knowledge.review.detail.actionHistory',
                      }),
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
                  title={intl.formatMessage({
                    id: 'pages.knowledge.review.detail.reviewActions',
                  })}
                  style={{ position: 'sticky', bottom: 16, marginTop: 16 }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {canDecide && (
                      <Input.TextArea
                        rows={3}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder={intl.formatMessage({
                          id: 'pages.knowledge.review.detail.rejectionReasonPlaceholder',
                        })}
                      />
                    )}
                    {data?.status === 'pending' ? (
                      <Button type="primary" block loading={acting} onClick={() => act('claim')}>
                        {intl.formatMessage({ id: 'pages.knowledge.review.detail.claim' })}
                      </Button>
                    ) : (
                      <Space wrap>
                        <Button type="primary" loading={acting} onClick={() => act('approve')}>
                          {intl.formatMessage({ id: 'pages.knowledge.review.detail.approve' })}
                        </Button>
                        <Button
                          danger
                          disabled={acting}
                          onClick={() =>
                            modalApi.confirm({
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
      </>
    );
  }

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}
      <DrawerForm
        title={title}
        open={open}
        onOpenChange={(nextOpen) => !nextOpen && onClose()}
        submitter={false}
      >
        {content}
      </DrawerForm>
    </>
  );
};

export default ReviewTaskDrawer;
