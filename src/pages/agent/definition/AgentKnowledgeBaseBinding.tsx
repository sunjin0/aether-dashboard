import {
  addKnowledgeBaseBinding,
  deleteKnowledgeBaseBinding,
  getKnowledgeBaseBindingList,
  updateKnowledgeBaseBindingStatus,
} from '@/services/agent/KnowledgeBaseBindingController'
import { getKnowledgeBaseList } from '@/services/knowledge/KnowledgeBaseController'
import { KnowledgeBaseBinding } from '@/services/entity/Agent'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, ProTable } from '@ant-design/pro-components'
import { Button, Form, message, Modal, Popconfirm, Select, Tag } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { getSwitchStatus } from '@/pages/agent/knowledge-base/status'

interface AgentKnowledgeBaseBindingProps {
  agentId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AgentKnowledgeBaseBinding: React.FC<AgentKnowledgeBaseBindingProps> = ({ agentId, open }) => {
  const ref = useRef<ActionType>()
  const [bindOpen, setBindOpen] = useState(false)
  const [options, setOptions] = useState<{ label: string; value: string }[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    if (open && agentId) ref.current?.reload()
  }, [agentId, open])

  const openBindingForm = async () => {
    const response = await getKnowledgeBaseList({ current: 1, pageSize: 1000, status: 1 })
    if (response.code !== 200) {
      message.error(response.message || '加载知识库失败')
      return
    }
    setOptions(
      (response.data || [])
        .filter((item) => item.id && item.status === 1 && item.indexStatus === 2)
        .map((item) => ({
          label: `${item.name || item.id}（${item.scope === 'PLATFORM' ? '平台级' : 'Agent 专属'}）`,
          value: item.id as string,
        })),
    )
    form.resetFields()
    setBindOpen(true)
  }

  const bind = async () => {
    const values = await form.validateFields()
    const response = await addKnowledgeBaseBinding({
      agentDefinitionId: agentId,
      knowledgeBaseId: values.knowledgeBaseId,
      status: 1,
    })
    if (response.code === 200) {
      message.success(response.message || '绑定成功')
      setBindOpen(false)
      ref.current?.reload()
    } else message.error(response.message || '绑定失败')
  }

  const columns: any[] = [
    { title: '知识库名称', dataIndex: 'knowledgeBaseName', ellipsis: true },
    {
      title: '范围',
      dataIndex: 'scope',
      valueType: 'select',
      valueEnum: { PLATFORM: { text: '平台级' }, AGENT: { text: 'Agent 专属' } },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { 0: { text: '禁用' }, 1: { text: '启用' } },
      render: (_: unknown, record: KnowledgeBaseBinding) => {
        const item = getSwitchStatus(record.status)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 180,
      render: (_: unknown, record: KnowledgeBaseBinding) => [
        <Popconfirm
          key="status"
          title={`确认${record.status === 1 ? '禁用' : '启用'}该绑定？`}
          onConfirm={async () => {
            if (!record.id) return
            const response = await updateKnowledgeBaseBindingStatus(record.id, {
              status: record.status === 1 ? 0 : 1,
            })
            if (response.code === 200) {
              message.success(response.message || '操作成功')
              ref.current?.reload()
            } else message.error(response.message || '操作失败')
          }}
        >
          <Button type="link">{record.status === 1 ? '禁用' : '启用'}</Button>
        </Popconfirm>,
        <Popconfirm
          key="delete"
          title="确认解绑该知识库？"
          onConfirm={async () => {
            if (!record.id) return
            const response = await deleteKnowledgeBaseBinding(record.id)
            if (response.code === 200) {
              message.success(response.message || '解绑成功')
              ref.current?.reload()
            } else message.error(response.message || '解绑失败')
          }}
        >
          <Button type="link" danger>
            解绑
          </Button>
        </Popconfirm>,
      ],
    },
  ]

  return (
    <>
      <ProTable<KnowledgeBaseBinding>
        actionRef={ref}
        rowKey="id"
        search={false}
        columns={columns}
        pagination={{
          current: 1,
          pageSize: 20,
        }}
        request={(params) => getKnowledgeBaseBindingList({ ...params, agentDefinitionId: agentId })}
        toolBarRender={() => [
          <Button key="bind" icon={<PlusOutlined />} type="primary" onClick={openBindingForm}>
            绑定已有知识库
          </Button>,
        ]}
      />
      <Modal
        title="绑定已有知识库"
        open={bindOpen}
        onOk={bind}
        onCancel={() => {
          setBindOpen(false)
          form.resetFields()
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="knowledgeBaseId"
            label="知识库"
            rules={[{ required: true, message: '请选择知识库' }]}
          >
            <Select
              showSearch
              options={options}
              optionFilterProp="label"
              placeholder="请选择知识库"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default AgentKnowledgeBaseBinding
