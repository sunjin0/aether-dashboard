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
import { Button, Form, message, Modal, Select, Tag } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { getSwitchStatus } from '@/pages/agent/knowledge-base/status'
import TableActionMenu from '@/components/TableActionMenu'
import { useIntl } from '@umijs/max'

interface AgentKnowledgeBaseBindingProps {
  agentId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AgentKnowledgeBaseBinding: React.FC<AgentKnowledgeBaseBindingProps> = ({ agentId, open }) => {
  const intl = useIntl()
  const format = (id: string) => intl.formatMessage({ id })
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
      message.error(response.message || format('pages.agent.knowledgeBase.loadFailed'))
      return
    }
    setOptions(
      (response.data || [])
        .filter((item) => item.id && item.status === 1 && item.indexStatus === 2)
        .map((item) => ({
          label: `${item.name || item.id} (${item.scope === 'PLATFORM' ? format('pages.agent.knowledgeBase.platform') : format('pages.agent.knowledgeBase.agentOnly')})`,
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
      message.success(response.message || format('pages.agent.definition.bindSuccess'))
      setBindOpen(false)
      ref.current?.reload()
    } else message.error(response.message || format('pages.agent.definition.bindFailed'))
  }

  const columns: any[] = [
    { title: format('pages.agent.knowledgeBase.name'), dataIndex: 'knowledgeBaseName', ellipsis: true },
    {
      title: format('pages.agent.knowledgeBase.scope'),
      dataIndex: 'scope',
      valueType: 'select',
      valueEnum: { PLATFORM: { text: format('pages.agent.knowledgeBase.platform') }, AGENT: { text: format('pages.agent.knowledgeBase.agentOnly') } },
    },
    {
      title: format('pages.common.status'),
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { 0: { text: format('pages.common.disabled') }, 1: { text: format('pages.common.enabled') } },
      render: (_: unknown, record: KnowledgeBaseBinding) => {
        const item = getSwitchStatus(record.status)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 150,
      render: (_: unknown, record: KnowledgeBaseBinding) => (
        <TableActionMenu
          items={[
            { key: 'status', label: record.status === 1 ? format('pages.common.disabled') : format('pages.common.enabled'), confirm: { title: format('pages.agent.definition.bindingStatusConfirm') }, onClick: async () => { if (!record.id) return; const response = await updateKnowledgeBaseBindingStatus(record.id, { status: record.status === 1 ? 0 : 1 }); if (response.code === 200) { message.success(response.message || format('pages.agent.definition.operationSuccess')); ref.current?.reload() } else message.error(response.message || format('pages.agent.definition.operationFailed')) } },
            { key: 'delete', label: format('pages.agent.tool.unbind'), danger: true, confirm: { title: format('pages.agent.definition.unbindKnowledgeBaseConfirm') }, onClick: async () => { if (!record.id) return; const response = await deleteKnowledgeBaseBinding(record.id); if (response.code === 200) { message.success(response.message || format('pages.agent.definition.unbindSuccess')); ref.current?.reload() } else message.error(response.message || format('pages.agent.definition.unbindFailed')) } },
          ]}
        />
      ),
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
            {format('pages.agent.definition.bindExistingKnowledgeBase')}
          </Button>,
        ]}
      />
      <Modal
        title={format('pages.agent.definition.bindExistingKnowledgeBase')}
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
            label={format('pages.agent.knowledgeBase.name')}
            rules={[{ required: true, message: format('pages.agent.knowledgeBase.select') }]}
          >
            <Select
              showSearch
              options={options}
              optionFilterProp="label"
              placeholder={format('pages.agent.knowledgeBase.select')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default AgentKnowledgeBaseBinding
