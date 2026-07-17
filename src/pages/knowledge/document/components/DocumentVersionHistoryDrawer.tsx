import { getIndexStatus } from '@/pages/agent/knowledge-base/status'
import { KnowledgeDocumentVersion } from '@/services/entity/Agent'
import {
  getDocumentVersions,
  rollbackDocumentVersion,
} from '@/services/knowledge/DocumentController'
import { ActionType, ProTable } from '@ant-design/pro-components'
import { Button, Drawer, message, Popconfirm, Tag } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import DocumentChunkDrawer from './DocumentChunkDrawer'

interface DocumentVersionHistoryDrawerProps {
  documentId?: string;
  documentTitle?: string;
  open: boolean;
  canManage: boolean;
  onClose: () => void;
  onRollbackSuccess: () => void;
}

/** 文档版本是文档的从属资源，使用抽屉展示以保持主列表简洁。 */
const DocumentVersionHistoryDrawer: React.FC<DocumentVersionHistoryDrawerProps> = ({
  documentId,
  documentTitle,
  open,
  canManage,
  onClose,
  onRollbackSuccess,
}) => {
  const actionRef = useRef<ActionType>()
  const [chunkVersion, setChunkVersion] = useState<KnowledgeDocumentVersion>()

  /** 切换文档或重新打开抽屉时重新加载版本，避免展示上一份文档的数据。 */
  useEffect(() => {
    if (open && documentId) actionRef.current?.reload()
  }, [open, documentId])

  return (
    <Drawer
      title={`版本历史${documentTitle ? ` - ${documentTitle}` : ''}`}
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
          { title: '版本号', dataIndex: 'versionNo', width: 100, valueType: 'digit' },
          {
            title: '索引状态',
            dataIndex: 'indexStatus',
            width: 120,
            render: (_, record) => {
              const status = getIndexStatus(record.indexStatus)
              return (
                <Tag color={record.indexStatus === 3 ? 'error' : status.color}>
                  {record.indexStatus === 3 ? '失败' : status.label}
                </Tag>
              )
            },
          },
          { title: '分块数', dataIndex: 'chunkCount', width: 100, valueType: 'digit' },
          { title: '索引完成时间', dataIndex: 'indexedAt', valueType: 'dateTime', width: 180 },
          { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime', width: 180 },
          { title: '索引错误', dataIndex: 'indexErrorMessage', ellipsis: true },
          {
            title: '操作',
            valueType: 'option',
            width: 220,
            render: (_, record) =>
              record.id
                ? [
                  <Button key="chunks" type="link" onClick={() => setChunkVersion(record)}>
                      查看分块
                  </Button>,
                  canManage ? (
                    <Popconfirm
                      key="rollback"
                      title="确认以该版本创建新的最新版本并重新索引？"
                      onConfirm={async () => {
                        const response = await rollbackDocumentVersion(record.id!)
                        if (response.code === 200) {
                          message.success(response.message || '回滚任务已入队')
                          actionRef.current?.reload()
                          onRollbackSuccess()
                        } else message.error(response.message || '回滚失败')
                      }}
                    >
                      <Button type="link">回滚到此版本</Button>
                    </Popconfirm>
                  ) : null,
                ].filter(Boolean)
                : null,
          },
        ]}
      />
      <DocumentChunkDrawer
        version={chunkVersion}
        open={Boolean(chunkVersion)}
        onClose={() => setChunkVersion(undefined)}
      />
    </Drawer>
  )
}

export default DocumentVersionHistoryDrawer
