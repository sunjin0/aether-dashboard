import DocumentForm from '@/pages/agent/knowledge-base/DocumentForm'
import { getDocumentStatus, getIndexStatus } from '@/pages/agent/knowledge-base/status'
import { Document, DocumentSearchParams } from '@/services/entity/Agent'
import {
  deleteDocument,
  getDocumentPreviewUrl,
  getDocumentList,
  reindexDocument,
  uploadDocuments,
} from '@/services/knowledge/DocumentController'
import { getKnowledgeBaseOptions } from '@/services/knowledge/KnowledgeBaseController'
import {
  ActionType,
  PageContainer,
  ProFormInstance,
  ProFormSelect,
  ProTable,
} from '@ant-design/pro-components'
import { history, useAccess, useIntl, useLocation } from '@@/exports'
import { Button, message, Tag, Tabs } from 'antd'
import React, { useMemo, useRef, useState } from 'react'
import FileUploadModal from '@/components/FileUploadModal'
import TemporaryUrlPreviewModal from '@/components/TemporaryUrlPreviewModal'
import TableActionMenu from '@/components/TableActionMenu'
import { getKnowledgeBaseContext } from './query'

const KnowledgeDocumentPage: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const formRef = useRef<ProFormInstance>()
  const location = useLocation()
  const intl = useIntl()
  const knowledgeBase = getKnowledgeBaseContext(location.search)
  const [formOpen, setFormOpen] = useState(false)
  const [documentId, setDocumentId] = useState<string>()
  // 编辑时使用记录自身的知识库，避免“全部文档”查询下缺少筛选上下文。
  const [formKnowledgeBaseId, setFormKnowledgeBaseId] = useState<string>()
  const [reindexingId, setReindexingId] = useState<string>()
  const access = useAccess()
  const canWrite = access['/knowledge/document']
  const [reviewStatusTab, setReviewStatusTab] = useState<string>('all')

  const reviewStatusTabItems = useMemo(() => [
    {
      key: 'all',
      label: intl.formatMessage({ id: 'pages.knowledge.document.tabs.all' }),
    },
    {
      key: 'DRAFT',
      label: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.draft' }),
    },
    {
      key: 'AI_REVIEWING',
      label: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.aiReviewing' }),
    },
    {
      key: 'AI_REVIEWED',
      label: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.recommendationsPending' }),
    },
    {
      key: 'SUBMITTED',
      label: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.humanReviewing' }),
    },
    {
      key: 'APPROVED',
      label: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.approved' }),
    },
    {
      key: 'REJECTED',
      label: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.rejected' }),
    },
  ], [intl])

  const reload = () => actionRef.current?.reload()

  const reindex = async (record: Document) => {
    if (!record.id) return
    setReindexingId(record.id)
    try {
      const response = await reindexDocument(record.id)
      if (response.code === 200) {
        message.success(
          response.message || intl.formatMessage({ id: 'pages.knowledge.document.reindexQueued' }),
        )
        reload()
      } else {
        message.error(
          response.message || intl.formatMessage({ id: 'pages.knowledge.document.reindexFailed' }),
        )
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
      title: intl.formatMessage({ id: 'pages.knowledge.document.knowledgeBase' }),
      dataIndex: 'knowledgeBaseId',
      valueType: 'select',
      request: async () => getKnowledgeBaseOptions(),
      fieldProps: {
        showSearch: true,
        optionFilterProp: 'label',
        onChange: (value: string) => {
          formRef.current?.submit();
        },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.documentTitle' }),
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.file' }),
      dataIndex: 'originalFileName',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.publishedVersion' }),
      dataIndex: 'currentVersionNo',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus' }),
      dataIndex: 'reviewStatus',
      valueType: 'select',
      hideInSearch: true,
      valueEnum: {
        DRAFT: { text: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.draft' }) },
        AI_REVIEWING: {
          text: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.aiReviewing' }),
        },
        AI_REVIEWED: {
          text: intl.formatMessage({
            id: 'pages.knowledge.document.reviewStatus.recommendationsPending',
          }),
        },
        SUBMITTED: {
          text: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.humanReviewing' }),
        },
        APPROVED: {
          text: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.approved' }),
        },
        REJECTED: {
          text: intl.formatMessage({ id: 'pages.knowledge.document.reviewStatus.rejected' }),
        },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.chunkCount' }),
      dataIndex: 'chunkCount',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus' }),
      dataIndex: 'indexStatus',
      valueType: 'select',
      valueEnum: {
        0: { text: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus.notIndexed' }) },
        1: { text: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus.indexing' }) },
        2: { text: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus.completed' }) },
        3: { text: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus.failed' }) },
      },
      render: (_: unknown, record: Document) => {
        const item = getIndexStatus(record.indexStatus);
        return (
          <Tag color={record.indexStatus === 3 ? 'error' : item.color}>
            {record.indexStatus === 3
              ? intl.formatMessage({ id: 'pages.knowledge.document.indexStatus.failed' })
              : item.label}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.processingStatus' }),
      dataIndex: 'status',
      hideInSearch: true,
      render: (_: unknown, record: Document) => {
        const item = getDocumentStatus(record.status);
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.indexError' }),
      dataIndex: 'indexErrorMessage',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.updateTime' }),
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 300,
      render: (_: unknown, record: Document) => {
        if (!canWrite || !record.id) return [];
        const canReindex = record.reviewStatus === 'APPROVED' || record.indexStatus === 3;
        const canDelete = !['AI_REVIEWING', 'SUBMITTED'].includes(record.reviewStatus || '');
        return [
          record.originalFileName ? (
            <TemporaryUrlPreviewModal
              key="preview"
              title={
                record.originalFileName ||
                record.title ||
                intl.formatMessage({ id: 'pages.knowledge.document.filePreview' })
              }
              getUrl={() => getDocumentPreviewUrl(record.id!)}
              triggerText={intl.formatMessage({ id: 'pages.knowledge.document.preview' })}
            />
          ) : null,
          <TableActionMenu
            key="actions"
            items={[
              {
                key: 'edit',
                primary: true,
                label: intl.formatMessage({ id: 'pages.knowledge.document.edit' }),
                onClick: () => {
                  setDocumentId(record.id);
                  setFormKnowledgeBaseId(record.knowledgeBaseId);
                  setFormOpen(true);
                },
              },
              {
                key: 'workspace',
                label: intl.formatMessage({ id: 'pages.knowledge.document.reviewWorkspace' }),
                onClick: () => {
                  const returnTo = `${location.pathname}${location.search}`;
                  history.push(
                    `/knowledge/document/${record.id}/review?returnTo=${encodeURIComponent(returnTo)}`,
                  );
                },
              },
              {
                key: 'versions',
                label: intl.formatMessage({ id: 'pages.knowledge.document.versionHistory' }),
                onClick: () => history.push(`/knowledge/document/${record.id}/versions`),
              },
              {
                key: 'reindex',
                label: intl.formatMessage({ id: 'pages.knowledge.document.reindex' }),
                visible: canReindex,
                loading: reindexingId === record.id,
                onClick: () => reindex(record),
              },
              {
                key: 'delete',
                label: intl.formatMessage({ id: 'pages.common.delete' }),
                danger: true,
                visible: canDelete,
                confirm: {
                  title: intl.formatMessage({ id: 'pages.knowledge.document.deleteConfirm' }),
                },
                onClick: async () => {
                  const response = await deleteDocument(record.id!);
                  if (response.code === 200) {
                    message.success(
                      response.message ||
                        intl.formatMessage({ id: 'pages.knowledge.document.deleteSuccess' }),
                    );
                    reload();
                  } else
                    message.error(
                      response.message ||
                        intl.formatMessage({ id: 'pages.knowledge.document.deleteFailed' }),
                    );
                },
              },
            ]}
          />,
        ];
      },
    },
  ];

  return (
    <PageContainer
      title={intl.formatMessage({ id: 'pages.knowledge.document.title' })}
      extra={
        <Button onClick={() => history.push('/knowledge/base')}>
          {intl.formatMessage({ id: 'pages.knowledge.document.knowledgeBaseManagement' })}
        </Button>
      }
    >
      <Tabs
        activeKey={reviewStatusTab}
        onChange={(key) => {
          setReviewStatusTab(key)
          formRef.current?.setFieldsValue({ reviewStatus: undefined })
          formRef.current?.submit()
        }}
        items={reviewStatusTabItems}
      />
      <ProTable<Document>
        actionRef={actionRef}
        formRef={formRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1300 }}
        form={{ initialValues: { knowledgeBaseId: knowledgeBase.id || undefined } }}
        params={{ reviewStatus: reviewStatusTab === 'all' ? undefined : reviewStatusTab }}
        request={(params: DocumentSearchParams) => getDocumentList(params)}
        toolBarRender={() =>
          canWrite
            ? [
              <FileUploadModal
                key="upload"
                accept=".txt,.md,.pdf,.docx,.xlsx"
                allowedExtensions={['txt', 'md', 'pdf', 'docx', 'xlsx']}
                title={intl.formatMessage({ id: 'pages.knowledge.document.uploadTitle' })}
                initialValues={{ selectedKnowledgeBaseId: knowledgeBase.id || undefined }}
                extraFields={
                  <>
                    <ProFormSelect
                      name="selectedKnowledgeBaseId"
                      label={intl.formatMessage({ id: 'pages.knowledge.document.knowledgeBase' })}
                      placeholder={intl.formatMessage({
                        id: 'pages.knowledge.document.selectKnowledgeBase',
                      })}
                      rules={[
                        {
                          required: true,
                          message: intl.formatMessage({
                            id: 'pages.knowledge.document.selectKnowledgeBase',
                          }),
                        },
                      ]}
                        request={async () => getKnowledgeBaseOptions()}
                    />
                  </>
                }
                upload={async (files, values) => {
                  const response = await uploadDocuments(
                      values.selectedKnowledgeBaseId as string,
                      files,
                  )
                  const failed = (response.data || []).filter((item) => !item.success)
                  return {
                    code: response.code,
                    message: failed.length
                      ? `${files.length - failed.length}/${files.length} uploaded; ${failed.length} failed`
                      : response.message,
                  }
                }}
                onSuccess={reload}
              />,
            ]
            : []
        }
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
