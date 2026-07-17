import DocumentForm from '@/pages/agent/knowledge-base/DocumentForm'
import { getDocumentStatus, getIndexStatus } from '@/pages/agent/knowledge-base/status'
import { Document, DocumentSearchParams } from '@/services/entity/Agent'
import {
  deleteDocument,
  getDocumentPreviewUrl,
  getDocumentList,
  reindexDocument,
  uploadDocument,
} from '@/services/knowledge/DocumentController'
import { getKnowledgeBaseList } from '@/services/knowledge/KnowledgeBaseController'
import {
  ActionType,
  PageContainer,
  ProFormInstance,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components'
import { history, useAccess, useLocation } from '@@/exports'
import { Button, message, Popconfirm, Tag } from 'antd'
import React, { useRef, useState } from 'react'
import FileUploadModal from '@/components/FileUploadModal'
import TemporaryUrlPreviewModal from '@/components/TemporaryUrlPreviewModal'
import DocumentVersionHistoryDrawer from './components/DocumentVersionHistoryDrawer'
import { getKnowledgeBaseContext } from './query'

const KnowledgeDocumentPage: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const formRef = useRef<ProFormInstance>()
  const location = useLocation()
  const knowledgeBase = getKnowledgeBaseContext(location.search)
  const [formOpen, setFormOpen] = useState(false)
  const [documentId, setDocumentId] = useState<string>()
  // 编辑时使用记录自身的知识库，避免“全部文档”查询下缺少筛选上下文。
  const [formKnowledgeBaseId, setFormKnowledgeBaseId] = useState<string>()
  const [reindexingId, setReindexingId] = useState<string>()
  const [versionDocument, setVersionDocument] = useState<Document>()
  const access = useAccess()
  const canManage = access['/knowledge/base']

  const reload = () => actionRef.current?.reload()

  const reindex = async (record: Document) => {
    if (!record.id) return
    setReindexingId(record.id)
    try {
      const response = await reindexDocument(record.id)
      if (response.code === 200) {
        message.success(response.message || '索引任务已入队，完成后文档才可用于聊天')
        reload()
      } else {
        message.error(response.message || '重建索引失败')
      }
    } finally {
      setReindexingId(undefined)
    }
  }

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 200,
      valueType: 'string',
      copyable: true,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '知识库',
      dataIndex: 'knowledgeBaseId',
      valueType: 'select',
      request: async () => {
        const response = await getKnowledgeBaseList({ current: 1, pageSize: 1000 })
        return (response.data || [])
          .filter((item) => item.id)
          .map((item) => ({ label: item.name || item.id, value: item.id }))
      },
      fieldProps: {
        showSearch: true,
        optionFilterProp: 'label',
        onChange: (value: string) => {
          formRef.current?.submit()
        },
      },
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '文件', dataIndex: 'originalFileName', ellipsis: true, hideInSearch: true },
    { title: '版本', dataIndex: 'currentVersionNo', valueType: 'digit', hideInSearch: true },
    { title: '分块数', dataIndex: 'chunkCount', valueType: 'digit', hideInSearch: true },
    {
      title: '索引状态',
      dataIndex: 'indexStatus',
      valueType: 'select',
      valueEnum: {
        0: { text: '未索引' },
        1: { text: '索引中' },
        2: { text: '已完成' },
        3: { text: '失败' },
      },
      render: (_: unknown, record: Document) => {
        const item = getIndexStatus(record.indexStatus)
        return <Tag color={record.indexStatus === 3 ? 'error' : item.color}>{record.indexStatus === 3 ? '失败' : item.label}</Tag>
      },
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      hideInSearch: true,
      render: (_: unknown, record: Document) => {
        const item = getDocumentStatus(record.status)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    { title: '索引错误', dataIndex: 'indexErrorMessage', hideInSearch: true, ellipsis: true },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', hideInSearch: true },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 500,
      render: (_: unknown, record: Document) => {
        if (!canManage || !record.id) return []
        return [
          record.originalFileName ? <TemporaryUrlPreviewModal key="preview" title={record.originalFileName || record.title || '文件预览'} getUrl={() => getDocumentPreviewUrl(record.id!)} /> : null,
          <Button key="versions" type="link" onClick={() => setVersionDocument(record)}>版本历史</Button>,
          <Button key="edit" type="link" onClick={() => { setDocumentId(record.id); setFormKnowledgeBaseId(record.knowledgeBaseId); setFormOpen(true) }}>编辑</Button>,
          <Button key="reindex" type="link" loading={reindexingId === record.id} onClick={() => reindex(record)}>重建索引</Button>,
          <Popconfirm
            key="delete"
            title="确认删除该文档？"
            onConfirm={async () => {
              const response = await deleteDocument(record.id!)
              if (response.code === 200) {
                message.success(response.message || '删除成功')
                reload()
              } else {
                message.error(response.message || '删除失败')
              }
            }}
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>,
        ]
      },
    },
  ]

  return (
    <PageContainer
      title="文档管理"
      extra={<Button onClick={() => history.push('/knowledge/base')}>知识库管理</Button>}
    >
      <ProTable<Document>
        actionRef={actionRef}
        formRef={formRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1300 }}
        form={{ initialValues: { knowledgeBaseId: knowledgeBase.id || undefined } }}
        request={(params: DocumentSearchParams) => getDocumentList(params)}
        toolBarRender={() =>
          canManage
            ? [
              <FileUploadModal
                key="upload"
                accept=".txt,.md,.pdf,.docx"
                allowedExtensions={['txt', 'md', 'pdf', 'docx']}
                title="上传知识库文件"
                extraFields={
                  <>
                    <ProFormSelect
                      name="selectedKnowledgeBaseId"
                      label="知识库"
                      placeholder="请选择知识库"
                      rules={[{ required: true, message: '请选择知识库' }]}
                      request={async () => {
                        const response = await getKnowledgeBaseList({
                          current: 1,
                          pageSize: 1000,
                        })
                        return (response.data || [])
                          .filter((item) => item.id)
                          .map((item) => ({ label: item.name || item.id, value: item.id }))
                      }}
                    />
                    <ProFormText
                      name="title"
                      label="标题"
                      placeholder="请输入标题"
                      rules={[{ required: true, message: '请输入标题' }]}
                    />
                  </>
                }
                upload={(file, values) =>
                  uploadDocument(values.selectedKnowledgeBaseId as string, file, values.title as string)
                }
                onSuccess={reload}
              />,
            ]
            : []
        }
      />
      <DocumentVersionHistoryDrawer
        documentId={versionDocument?.id}
        documentTitle={versionDocument?.title}
        open={Boolean(versionDocument)}
        canManage={canManage}
        onClose={() => setVersionDocument(undefined)}
        onRollbackSuccess={reload}
      />
      {formOpen && (
        <DocumentForm
          id={documentId}
          knowledgeBaseId={formKnowledgeBaseId}
          open={formOpen}
          setOpen={setFormOpen}
          onSuccess={() => {
            setDocumentId(undefined)
            setFormKnowledgeBaseId(undefined)
            reload()
          }}
        />
      )}
    </PageContainer>
  )
}

export default KnowledgeDocumentPage










