import KnowledgeBaseForm from '@/pages/knowledge/base/KnowledgeBaseForm'
import {
  deleteKnowledgeBase,
  getKnowledgeBaseList,
} from '@/services/knowledge/KnowledgeBaseController'
import { KnowledgeBase, KnowledgeBaseSearchParams } from '@/services/entity/Agent'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { history, useAccess } from '@@/exports'
import { Alert, Button, message, Popconfirm, Tag } from 'antd'
import React, { useRef, useState } from 'react'
import { getIndexStatus, getSwitchStatus } from '@/pages/agent/knowledge-base/status'

const KnowledgeBasePage: React.FC = () => {
  const ref = useRef<ActionType>()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string>()
  const permissions = useAccess()
  const write = permissions[history.location.pathname]

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      valueType: 'string',
      width: 200,
      copyable: true,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '范围',
      dataIndex: 'scope',
      valueType: 'select',
      valueEnum: { PLATFORM: { text: '平台级' }, AGENT: { text: 'Agent 专属' } },
    },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    {
      title: '可见范围',
      dataIndex: 'visibility',
      valueType: 'select',
      valueEnum: {
        platform: { text: '平台' },
        private: { text: '私有' },
        shared: { text: '共享' },
      },
    },
    { title: '描述', dataIndex: 'description', ellipsis: true, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { 0: { text: '禁用' }, 1: { text: '启用' } },
      render: (_: unknown, record: KnowledgeBase) => {
        const item = getSwitchStatus(record.status)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: '索引状态',
      dataIndex: 'indexStatus',
      valueType: 'select',
      valueEnum: { 0: { text: '未索引' }, 1: { text: '索引中' }, 2: { text: '已索引' } },
      render: (_: unknown, record: KnowledgeBase) => {
        const item = getIndexStatus(record.indexStatus)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime', hideInSearch: true },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', hideInSearch: true },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 250,
      render: (_: unknown, record: KnowledgeBase) =>
        write && [
          <Button
            key="documents"
            type="link"
            onClick={() =>
              history.push(
                `/knowledge/document?knowledgeBaseId=${record.id}&knowledgeBaseName=${encodeURIComponent(record.name || '')}`,
              )
            }
          >
            文档管理
          </Button>,
          <Button
            key="edit"
            type="link"
            onClick={() => {
              setId(record.id)
              setOpen(true)
            }}
          >
            编辑
          </Button>,
          <Popconfirm
            key="delete"
            title="确认删除该知识库？"
            onConfirm={async () => {
              if (!record.id) return
              const response = await deleteKnowledgeBase(record.id)
              if (response.code === 200) {
                message.success(response.message || '删除成功')
                ref.current?.reload()
              } else message.error(response.message || '删除失败')
            }}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>,
        ],
    },
  ]

  return (
    <PageContainer>
      <Alert
        showIcon
        type="info"
        message="已启用且已索引的知识库会自动参与关联 Agent 的回答。文档新增、编辑和重建索引会同步执行 Embedding，可能需要较长时间。"
        style={{ marginBottom: 16 }}
      />
      <ProTable<KnowledgeBase>
        actionRef={ref}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1300 }}
        request={(params: KnowledgeBaseSearchParams) => getKnowledgeBaseList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="new"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined)
                setOpen(true)
              }}
            >
              新增知识库
            </Button>,
          ]
        }
      />
      <KnowledgeBaseForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
        }}
      />
    </PageContainer>
  )
}

export default KnowledgeBasePage
