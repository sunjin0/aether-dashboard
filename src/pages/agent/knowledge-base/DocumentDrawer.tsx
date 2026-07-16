import DocumentForm from '@/pages/agent/knowledge-base/DocumentForm';
import { deleteDocument, getDocumentList, reindexDocument } from '@/services/knowledge/DocumentController';
import { Document, DocumentSearchParams, KnowledgeBase } from '@/services/entity/Agent';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, message, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getDocumentStatus } from './status';

interface DocumentDrawerProps {
  knowledgeBase?: KnowledgeBase;
  write: boolean;
  onClose: () => void;
}

const DocumentDrawer: React.FC<DocumentDrawerProps> = ({ knowledgeBase, write, onClose }) => {
  const ref = useRef<ActionType>();
  const [formOpen, setFormOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string>();
  const [reindexingId, setReindexingId] = useState<string>();
  const knowledgeBaseId = knowledgeBase?.id || '';

  const reindex = async (record: Document) => {
    if (!record.id) return;
    setReindexingId(record.id);
    try {
      const response = await reindexDocument(record.id);
      if (response.code === 200) {
        message.success(response.message || '索引重建成功');
        ref.current?.reload();
      } else message.error(response.message || '索引重建失败');
    } finally {
      setReindexingId(undefined);
    }
  };

  const columns: any[] = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '分块数', dataIndex: 'chunkCount', valueType: 'digit', hideInSearch: true },
    {
      title: '处理状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { 0: { text: '未处理' }, 1: { text: '处理中' }, 2: { text: '已完成' } },
      render: (_: unknown, record: Document) => {
        const item = getDocumentStatus(record.status);
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    { title: '来源 URL', dataIndex: 'sourceUrl', hideInSearch: true, ellipsis: true },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', hideInSearch: true },
    {
      title: '操作', valueType: 'option', key: 'option', fixed: 'right', width: 260,
      render: (_: unknown, record: Document) => write && [
        <Button key="edit" type="link" onClick={() => { setDocumentId(record.id); setFormOpen(true); }}>编辑</Button>,
        <Button key="reindex" type="link" loading={reindexingId === record.id} onClick={() => reindex(record)}>重建索引</Button>,
        <Popconfirm
          key="delete"
          title="确认删除该文档？"
          onConfirm={async () => {
            if (!record.id) return;
            const response = await deleteDocument(record.id);
            if (response.code === 200) {
              message.success(response.message || '删除成功');
              ref.current?.reload();
            } else message.error(response.message || '删除失败');
          }}
        >
          <Button type="link" danger>删除</Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <Drawer
      title={`${knowledgeBase?.name || ''} - 文档管理`}
      open={Boolean(knowledgeBase)}
      onClose={onClose}
      width="85%"
      destroyOnClose
    >
      <ProTable<Document>
        actionRef={ref}
        rowKey="id"
        columns={columns}
        request={(params: DocumentSearchParams) => getDocumentList({ ...params, knowledgeBaseId })}
        toolBarRender={() =>
          write
            ? [
                <Button key="new" icon={<PlusOutlined />} type="primary" onClick={() => { setDocumentId(undefined); setFormOpen(true); }}>
                  新增文档
                </Button>,
              ]
            : []
        }
      />
      {knowledgeBaseId && (
        <DocumentForm
          id={documentId}
          knowledgeBaseId={knowledgeBaseId}
          open={formOpen}
          setOpen={setFormOpen}
          onSuccess={() => { setDocumentId(undefined); ref.current?.reload(); }}
        />
      )}
    </Drawer>
  );
};

export default DocumentDrawer;
