import { KnowledgeIndexJob, KnowledgeIndexJobSearchParams } from '@/services/entity/Agent';
import { getIndexJobList, retryIndexJob } from '@/services/knowledge/IndexJobController';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { useAccess } from '@@/exports';
import { Button, Descriptions, message, Popconfirm, Tag, Tooltip } from 'antd';
import React, { useRef } from 'react';

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '等待中', color: 'default' }, running: { text: '执行中', color: 'processing' },
  success: { text: '已完成', color: 'success' }, failed: { text: '失败', color: 'error' }, cancelled: { text: '已取消', color: 'default' },
};

/** 后端 KnowledgeIndexJob.jobType 的中文展示文案。 */
const jobTypeLabels: Record<string, string> = {
  create: '新建文本', upload: '上传文件', update: '编辑文档',
  reindex: '重建索引', rollback: '回滚版本', retry: '人工重试',
};

/** 将任务起止时间转换为可快速识别的耗时文本。 */
const formatDuration = (startedAt?: number, finishedAt?: number) => {
  if (!startedAt) return '-';
  const duration = (finishedAt || Date.now()) - startedAt;
  if (duration < 1000) return `${duration} ms`;
  if (duration < 60_000) return `${(duration / 1000).toFixed(1)} 秒`;
  return `${Math.floor(duration / 60_000)} 分 ${Math.floor((duration % 60_000) / 1000)} 秒`;
};

const IdText: React.FC<{ value?: string }> = ({ value }) => <Tooltip title={value}><span>{value || '-'}</span></Tooltip>;

const KnowledgeIndexJobPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const access = useAccess();
  const canRetry = access['/knowledge/document'] || access['/knowledge/index-job'];

  return (
    <PageContainer title="索引任务">
      <ProTable<KnowledgeIndexJob>
        actionRef={actionRef}
        rowKey="id"
        scroll={{ x: 1800 }}
        request={(params: KnowledgeIndexJobSearchParams) => getIndexJobList(params)}
        expandable={{
          expandedRowRender: (record) => (
            <Descriptions size="small" column={3} bordered>
              <Descriptions.Item label="任务 ID" span={3}>{record.id || '-'}</Descriptions.Item>
              <Descriptions.Item label="知识库 ID">{record.knowledgeBaseId || '-'}</Descriptions.Item>
              <Descriptions.Item label="文档 ID">{record.documentId || '-'}</Descriptions.Item>
              <Descriptions.Item label="文档版本 ID">{record.documentVersionId || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{record.createdAt ? new Date(record.createdAt).toLocaleString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{record.startedAt ? new Date(record.startedAt).toLocaleString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{record.finishedAt ? new Date(record.finishedAt).toLocaleString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="统计信息" span={3}>{record.statistics ? (typeof record.statistics === 'string' ? record.statistics : JSON.stringify(record.statistics)) : '-'}</Descriptions.Item>
              {record.errorMessage && <Descriptions.Item label="错误信息" span={3}>{record.errorMessage}</Descriptions.Item>}
            </Descriptions>
          ),
        }}
        columns={[

          { title: '任务类型', dataIndex: 'jobType', valueType: 'select', valueEnum: { create: { text: '新建文本' }, upload: { text: '上传文件' }, update: { text: '编辑文档' }, reindex: { text: '重建索引' }, rollback: { text: '回滚版本' }, retry: { text: '人工重试' } }, render: (_, record) => <Tag color={record.jobType === 'reindex' ? 'blue' : record.jobType === 'retry' ? 'orange' : 'cyan'}>{jobTypeLabels[record.jobType || ''] || record.jobType || '-'}</Tag> },
          { title: '知识库 ID', dataIndex: 'knowledgeBaseId', width: 170, ellipsis: true,  render: (_, record) => <IdText value={record.knowledgeBaseId} /> },
          { title: '文档 ID', dataIndex: 'documentId', width: 170, ellipsis: true, render: (_, record) => <IdText value={record.documentId} /> },
          { title: '版本 ID', dataIndex: 'documentVersionId', width: 170, ellipsis: true,  render: (_, record) => <IdText value={record.documentVersionId} /> },
          { title: '状态', dataIndex: 'status', valueType: 'select', valueEnum: Object.fromEntries(Object.entries(statusLabels).map(([key, value]) => [key, { text: value.text }])), render: (_, record) => { const status = statusLabels[record.status || 'pending']; return <Tag color={status.color}>{status.text}</Tag>; } },
          { title: '重试', width: 100, hideInSearch: true, render: (_, record) => `${record.retryCount || 0}/${record.maxRetryCount || 0}` },
          { title: '开始时间', dataIndex: 'startedAt', valueType: 'dateTime', width: 170, hideInSearch: true },
          { title: '完成时间', dataIndex: 'finishedAt', valueType: 'dateTime', width: 170, hideInSearch: true },
          { title: '耗时', width: 100, hideInSearch: true, render: (_, record) => formatDuration(record.startedAt, record.finishedAt) },
          { title: '错误信息', dataIndex: 'errorMessage', width: 220, ellipsis: true, hideInSearch: true },
          { title: '操作', valueType: 'option', fixed: 'right', render: (_, record) => canRetry && record.status === 'failed' ? <Popconfirm title="确认重试该索引任务？" onConfirm={async () => { if (!record.id) return; const result = await retryIndexJob(record.id); if (result.code === 200) { message.success(result.message || '重试任务已入队'); actionRef.current?.reload(); } else message.error(result.message || '重试失败'); }}><Button type="link">重试</Button></Popconfirm> : null },
        ]}
      />
    </PageContainer>
  );
};

export default KnowledgeIndexJobPage;
