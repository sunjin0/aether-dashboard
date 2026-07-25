import { KnowledgeDocumentChunk, KnowledgeDocumentVersion } from '@/services/entity/Agent'
import { getDocumentVersionChunkList } from '@/services/knowledge/DocumentController'
import { ActionType, ProTable } from '@ant-design/pro-components'
import { useIntl } from '@umijs/max'
import { Drawer, Input, Typography } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

interface DocumentChunkDrawerProps {
  version?: KnowledgeDocumentVersion;
  open: boolean;
  onClose: () => void;
}

/** 分块属于特定版本，在版本历史中使用二级抽屉查看，避免成为独立菜单。 */
const DocumentChunkDrawer: React.FC<DocumentChunkDrawerProps> = ({ version, open, onClose }) => {
  const actionRef = useRef<ActionType>()
  const intl = useIntl()
  const [chunks, setChunks] = useState<KnowledgeDocumentChunk[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    if (!open || !version?.id) return
    let cancelled = false
    setLoading(true)
    getDocumentVersionChunkList(version.id).then((resp) => {
      if (!cancelled) setChunks(resp.data || [])
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, version?.id])

  const filteredChunks = useMemo(
    () =>
      searchText
        ? chunks.filter((c) => c.content?.toLowerCase().includes(searchText.toLowerCase()))
        : chunks,
    [chunks, searchText],
  )

  return (
    <Drawer
      title={`${intl.formatMessage({ id: 'pages.knowledge.document.chunks.title' })}${version?.versionNo != null ? ` - ${intl.formatMessage({ id: 'pages.knowledge.document.chunks.versionPrefix' })}${version.versionNo}` : ''}`}
      width="80vw"
      zIndex={1100}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Input.Search
        placeholder={intl.formatMessage({ id: 'pages.knowledge.document.chunks.searchPlaceholder' })}
        allowClear
        style={{ marginBottom: 16, width: 300 }}
        onSearch={setSearchText}
        onChange={(e) => !e.target.value && setSearchText('')}
      />
      <ProTable<KnowledgeDocumentChunk>
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={false}
        loading={loading}
        dataSource={filteredChunks}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '8px 0', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}>
              {record.content || '-'}
            </div>
          ),
          rowExpandable: (record) => Boolean(record.content),
        }}
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
              <Typography.Paragraph ellipsis={{ rows: 2, expandable: false }} style={{ margin: 0 }}>
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
  )
}

export default DocumentChunkDrawer
