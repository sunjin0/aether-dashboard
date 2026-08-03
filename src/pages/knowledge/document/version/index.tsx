import { getIndexStatus } from '@/pages/agent/knowledge-base/status'
import { KnowledgeDocumentVersion, Document } from '@/services/entity/Agent'
import {
  getDocument,
  getDocumentVersions,
  rollbackDocumentVersion,
} from '@/services/knowledge/DocumentController'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { history, useIntl, useParams } from '@umijs/max'
import { Button, message, Result, Spin, Tag } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import DocumentChunkDrawer from '../components/DocumentChunkDrawer'
import TableActionMenu from '@/components/TableActionMenu'
import VersionDiffModal from './components/VersionDiffModal'

const DocumentVersionPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>()
  const intl = useIntl()
  const actionRef = useRef<ActionType>()
  const [document, setDocument] = useState<Document>()
  const [loading, setLoading] = useState(true)
  const [chunkVersion, setChunkVersion] = useState<KnowledgeDocumentVersion>()
  const [diffVersion, setDiffVersion] = useState<KnowledgeDocumentVersion>()
  const [versions, setVersions] = useState<KnowledgeDocumentVersion[]>([])

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [docResp, verResp] = await Promise.all([
          getDocument(documentId),
          getDocumentVersions(documentId),
        ])
        if (!cancelled) {
          setDocument(docResp.data)
          setVersions(verResp.data || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [documentId])

  const currentVersionId = versions[0]?.id

  if (!documentId) {
    return (
      <Result
        status="404"
        title={intl.formatMessage({ id: 'pages.knowledge.document.version.notFound' })}
        extra={<Button onClick={() => history.push('/knowledge/document')}>{intl.formatMessage({ id: 'pages.knowledge.document.version.back' })}</Button>}
      />
    )
  }

  return (
    <PageContainer
      title={`${intl.formatMessage({ id: 'pages.knowledge.document.versionHistory' })}${document?.title ? ` - ${document.title}` : ''}`}
      onBack={() => history.push('/knowledge/document')}
    >
      <Spin spinning={loading}>
        <ProTable<KnowledgeDocumentVersion>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          pagination={false}
          dataSource={versions}
          columns={[
            {
              title: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.versionNumber' }),
              dataIndex: 'versionNo',
              width: 100,
              valueType: 'digit',
            },
            {
              title: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus' }),
              dataIndex: 'indexStatus',
              width: 120,
              render: (_, record) => {
                const status = getIndexStatus(record.indexStatus)
                return (
                  <Tag color={record.indexStatus === 3 ? 'error' : status.color}>
                    {record.indexStatus === 3
                      ? intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.indexStatus.failed' })
                      : status.label}
                  </Tag>
                )
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
              width: 350,
              render: (_, record) =>
                record.id ? (
                  <TableActionMenu
                    items={[
                      {
                        key: 'chunks',
                        label: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.viewChunks' }),
                        primary: true,
                        onClick: () => setChunkVersion(record),
                      },
                      {
                        key: 'diff',
                        label: intl.formatMessage({ id: 'pages.knowledge.document.version.diff' }),
                        visible: currentVersionId ? record.id !== currentVersionId : false,
                        primary: true,
                        onClick: () => setDiffVersion(record),
                      },
                      {
                        key: 'rollback',
                        label: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.rollback' }),
                        primary: true,
                        confirm: {
                          title: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory.rollbackConfirm' }),
                        },
                        onClick: async () => {
                          try {
                            const response = await rollbackDocumentVersion(record.id!)
                            if (response.code === 200) {
                              const verResp = await getDocumentVersions(documentId!)
                              setVersions(verResp.data || [])
                            }
                          } catch {
                            // API failures are displayed by the global request handler.
                          }
                        },
                      },
                    ]}
                  />
                ) : null,
            },
          ]}
        />
      </Spin>
      <DocumentChunkDrawer
        version={chunkVersion}
        open={Boolean(chunkVersion)}
        onClose={() => setChunkVersion(undefined)}
      />
      <VersionDiffModal
        versionId={diffVersion?.id}
        currentVersionId={currentVersionId}
        open={Boolean(diffVersion)}
        onClose={() => setDiffVersion(undefined)}
      />
    </PageContainer>
  )
}

export default DocumentVersionPage
