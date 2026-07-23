import { getIndexStatus } from '@/pages/agent/knowledge-base/status';
import { KnowledgeDocumentVersion } from '@/services/entity/Agent';
import {
  getDocumentVersions,
  rollbackDocumentVersion,
} from '@/services/knowledge/DocumentController';
import { ActionType, ProTable } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Drawer, message, Tag } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import DocumentChunkDrawer from './DocumentChunkDrawer';
import TableActionMenu from '@/components/TableActionMenu';

interface DocumentVersionHistoryDrawerProps {
  documentId?: string;
  documentTitle?: string;
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
  onRollbackSuccess: () => void;
}

/** 文档版本是文档的从属资源，使用抽屉展示以保持主列表简洁。 */
const DocumentVersionHistoryDrawer: React.FC<DocumentVersionHistoryDrawerProps> = ({
  documentId,
  documentTitle,
  open,
  canWrite,
  onClose,
  onRollbackSuccess,
}) => {
  const actionRef = useRef<ActionType>();
  const [chunkVersion, setChunkVersion] = useState<KnowledgeDocumentVersion>();
  const intl = useIntl();

  /** 切换文档或重新打开抽屉时重新加载版本，避免展示上一份文档的数据。 */
  useEffect(() => {
    if (open && documentId) actionRef.current?.reload();
  }, [open, documentId]);

  return (
    <Drawer
      title={`${intl.formatMessage({ id: 'pages.knowledge.document.versionHistory' })}${documentTitle ? ` - ${documentTitle}` : ''}`}
      width={1000}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <ProTable<KnowledgeDocumentVersion>
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={false}
        request={() =>
          documentId ? getDocumentVersions(documentId) : Promise.resolve({ code: 200, data: [] })
        }
        columns={[
          {
            title: intl.formatMessage({
              id: 'pages.knowledge.document.versionHistory.versionNumber',
            }),
            dataIndex: 'versionNo',
            width: 100,
            valueType: 'digit',
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus' }),
            dataIndex: 'indexStatus',
            width: 120,
            render: (_, record) => {
              const status = getIndexStatus(record.indexStatus);
              return (
                <Tag color={record.indexStatus === 3 ? 'error' : status.color}>
                  {record.indexStatus === 3
                    ? intl.formatMessage({
                        id: 'pages.knowledge.document.versionHistory.indexStatus.failed',
                      })
                    : status.label}
                </Tag>
              );
            },
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.chunkCount' }),
            dataIndex: 'chunkCount',
            width: 100,
            valueType: 'digit',
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.indexedAt' }),
            dataIndex: 'indexedAt',
            valueType: 'dateTime',
            width: 180,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.createdAt' }),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            width: 180,
          },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.indexError' }),
            dataIndex: 'indexErrorMessage',
            ellipsis: true,
          },
          {
            title: intl.formatMessage({ id: 'pages.common.option' }),
            valueType: 'option',
            width: 180,
            render: (_, record) =>
              record.id ? (
                <TableActionMenu
                  items={[
                    {
                      key: 'chunks',
                      label: intl.formatMessage({
                        id: 'pages.knowledge.document.versionHistory.viewChunks',
                      }),
                      primary: true,
                      onClick: () => setChunkVersion(record),
                    },
                    {
                      key: 'rollback',
                      label: intl.formatMessage({
                        id: 'pages.knowledge.document.versionHistory.rollback',
                      }),
                      visible: !!canWrite,
                      confirm: {
                        title: intl.formatMessage({
                          id: 'pages.knowledge.document.versionHistory.rollbackConfirm',
                        }),
                      },
                      onClick: async () => {
                        const response = await rollbackDocumentVersion(record.id!);
                        if (response.code === 200) {
                          message.success(
                            response.message ||
                              intl.formatMessage({
                                id: 'pages.knowledge.document.versionHistory.rollbackQueued',
                              }),
                          );
                          actionRef.current?.reload();
                          onRollbackSuccess();
                        } else
                          message.error(
                            response.message ||
                              intl.formatMessage({
                                id: 'pages.knowledge.document.versionHistory.rollbackFailed',
                              }),
                          );
                      },
                    },
                  ]}
                />
              ) : null,
          },
        ]}
      />
      <DocumentChunkDrawer
        version={chunkVersion}
        open={Boolean(chunkVersion)}
        onClose={() => setChunkVersion(undefined)}
      />
    </Drawer>
  );
};

export default DocumentVersionHistoryDrawer;
