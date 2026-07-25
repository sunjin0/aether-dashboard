import React, { useEffect, useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, ProTable } from '@ant-design/pro-components'
import { Button, message, Modal, Space, Form, Select, InputNumber } from 'antd'
import {
  getAgentBoundTools,
  bindToolToAgent,
  unbindToolFromAgent,
  updateToolPriority,
} from '@/services/agent/AgentDefinitionController'
import { getAgentToolList } from '@/services/agent/ToolController'
import { AgentToolBinding, BindToolRequest, AgentTool } from '@/services/entity/Agent'
import { useIntl } from '@umijs/max'
import TableActionMenu from '@/components/TableActionMenu'

interface AgentToolBindingProps {
  agentId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AgentToolBinding: React.FC<AgentToolBindingProps> = ({ agentId, open, setOpen }) => {
  const actionRef = useRef<ActionType>()
  const intl = useIntl()
  const [bindModalVisible, setBindModalVisible] = useState(false)
  const [toolOptions, setToolOptions] = useState<{ label: string; value: string }[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    if (open && agentId) {
      actionRef.current?.reload()
    }
  }, [agentId, open])

  // 加载可用工具列表
  const loadToolOptions = async () => {
    const { data, code } = await getAgentToolList({
      current: 1,
      pageSize: 1000,
      status: 1,
    })

    if (code === 200 && data) {
      const options = data
        .filter((item) => item.id)
        .map((item) => ({
          label: `${item.name || item.id} (${item.code}) / ${item.mcpServerName || '-'} / ${item.mcpToolName || '-'}`,
          value: item.id as string,
        }))
      setToolOptions(options)
    }
  }

  const handleOpenBindModal = () => {
    loadToolOptions()
    form.resetFields()
    setBindModalVisible(true)
  }

  const handleBindTool = async () => {
    try {
      const values = await form.validateFields()

      const params: BindToolRequest = {
        toolId: values.toolId,
        priority: values.priority || 0,
        status: 1,
      }

      const { code, message: msg } = await bindToolToAgent(agentId, params)
      if (code === 200) {
        message.success(msg || intl.formatMessage({ id: 'pages.agent.definition.bindSuccess' }))
        setBindModalVisible(false)
        form.resetFields()
        actionRef.current?.reload()
      } else {
        message.error(msg || intl.formatMessage({ id: 'pages.agent.definition.bindFailed' }))
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.agent.definition.checkForm' }))
    }
  }

  const handleUnbind = async (toolId: string) => {
    const { code, message: msg } = await unbindToolFromAgent(agentId, toolId)
    if (code === 200) {
      message.success(msg || intl.formatMessage({ id: 'pages.agent.definition.unbindSuccess' }))
      actionRef.current?.reload()
    } else {
      message.error(msg || intl.formatMessage({ id: 'pages.agent.definition.unbindFailed' }))
    }
  }

  const handlePriorityChange = async (toolId: string, newPriority: number) => {
    const { code, message: msg } = await updateToolPriority(agentId, toolId, {
      priority: newPriority,
    })
    if (code === 200) {
      message.success(
        msg || intl.formatMessage({ id: 'pages.agent.definition.priorityUpdateSuccess' }),
      )
      actionRef.current?.reload()
    } else {
      message.error(
        msg || intl.formatMessage({ id: 'pages.agent.definition.priorityUpdateFailed' }),
      )
    }
  }

  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.name' }),
      dataIndex: 'toolName',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.code' }),
      dataIndex: 'toolCode',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.priority' }),
      dataIndex: 'priority',
      valueType: 'digit',
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.status' }),
      key: 'toolStatus',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: intl.formatMessage({ id: 'pages.common.disabled' }), status: 'Default' },
        1: { text: intl.formatMessage({ id: 'pages.common.enabled' }), status: 'Success' },
      },
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      width: 120,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentToolBinding) => (
        <TableActionMenu
          items={[
            {
              key: 'unbind',
              label: intl.formatMessage({ id: 'pages.agent.tool.unbind' }),
              danger: true,
              confirm: { title: intl.formatMessage({ id: 'pages.agent.tool.unbindConfirm' }) },
              onClick: () => {
                if (record.toolId) return handleUnbind(record.toolId)
              },
            },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <ProTable<AgentToolBinding>
        actionRef={actionRef}
        rowKey="toolId"
        request={async () => {
          if (!agentId) {
            return { data: [], total: 0, success: true }
          }
          const { data, code } = await getAgentBoundTools(agentId)
          return { data: data || [], total: (data || []).length, success: code === 200 }
        }}
        toolBarRender={() => [
          <Button key="bind" icon={<PlusOutlined />} type="primary" onClick={handleOpenBindModal}>
            {intl.formatMessage({ id: 'pages.agent.tool.bind' })}
          </Button>,
        ]}
        columns={columns}
        search={false}
        pagination={false}
      />

      <Modal
        title={intl.formatMessage({ id: 'pages.agent.tool.bind' })}
        open={bindModalVisible}
        onOk={handleBindTool}
        onCancel={() => {
          setBindModalVisible(false)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="toolId"
            label={intl.formatMessage({ id: 'pages.agent.tool.selectToBind' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.agent.tool.selectTool' }),
              },
            ]}
          >
            <Select
              placeholder={intl.formatMessage({ id: 'pages.agent.tool.selectToBindPlaceholder' })}
              options={toolOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="priority"
            label={intl.formatMessage({ id: 'pages.agent.tool.priority' })}
            initialValue={0}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.agent.definition.enterPriority' }),
              },
            ]}
          >
            <InputNumber
              min={0}
              max={999}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'pages.agent.tool.priorityHint' })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default AgentToolBinding
