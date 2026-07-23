import { KnowledgeDocumentChunk, KnowledgeDocumentVersion } from '@/services/entity/Agent';
import { getDocumentVersionChunkList } from '@/services/knowledge/DocumentController';
import { ActionType, ProTable } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Drawer, Typography } from 'antd';
import React, { useEffect, useRef } from 'react';

interface DocumentChunkDrawerProps {
  version?: KnowledgeDocumentVersion;
  open: boolean;
  onClose: () => void;
}

/** 分块属于特定版本，在版本历史中使用二级抽屉查看，避免成为独立菜单。 */
const DocumentChunkDrawer: React.FC<DocumentChunkDrawerProps> = ({ version, open, onClose }) => {
  const actionRef = useRef<ActionType>();
  const intl = useIntl();

  /** 每次打开或切换版本时重新请求，确保内容与当前版本一致。 */
  useEffect(() => {
    if (open && version?.id) actionRef.current?.reload();
  }, [open, version?.id]);

  return (
    <Drawer
      title={`${intl.formatMessage({ id: 'pages.knowledge.document.chunks.title' })}${version?.versionNo != null ? ` - ${intl.formatMessage({ id: 'pages.knowledge.document.chunks.versionPrefix' })}${version.versionNo}` : ''}`}
      width="80vw"
      zIndex={1100}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <ProTable<KnowledgeDocumentChunk>
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={false}
        request={() =>
          version?.id
            ? getDocumentVersionChunkList(version.id)
            : Promise.resolve({ code: 200, data: [] })
        }
        columns={[
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.chunks.sequence' }),
            dataIndex: 'chunkNo',
            width: 90,
            valueType: 'digit',
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.chunks.content' }),
            dataIndex: 'content',
            copyable: true,
            render: (_, record) => (
              <Typography.Paragraph ellipsis={{ rows: 3, tooltip: record.content }}>
                {record.content || '-'}
              </Typography.Paragraph>
            ),
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.chunks.tokenCount' }),
            dataIndex: 'tokenCount',
            width: 120,
            valueType: 'digit',
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.chunks.createdAt' }),
            dataIndex: 'createdAt',
            width: 180,
            valueType: 'dateTime',
          },
        ]}
      />
    </Drawer>
  );
};

export default DocumentChunkDrawer;
