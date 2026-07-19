import React, { useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, message, Modal } from 'antd'
import { FormattedMessage, history, useAccess } from '@@/exports'
import AgentDefinitionForm from '@/pages/agent/definition/AgentDefinitionForm'
import AgentToolBinding from '@/pages/agent/definition/AgentToolBinding'
import AgentKnowledgeBaseBinding from '@/pages/agent/definition/AgentKnowledgeBaseBinding'
import {
  copyAgentDefinitionInfo,
  deleteAgentDefinitionInfo,
  getAgentDefinitionList,
  updateAgentDefinitionStatus,
  getModelProviderList,
} from '@/services/agent/AgentDefinitionController'
import { getOptionList } from '@/services/sys/DictController'
import { AgentDefinition, AgentDefinitionSearchParams } from '@/services/entity/Agent'
import TableActionMenu from '@/components/TableActionMenu'

const AgentDefinitionPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | undefined>(undefined)
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]

  // 工具绑定相关状态
  const [toolBindingVisible, setToolBindingVisible] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string>('')
  const [knowledgeBaseBindingVisible, setKnowledgeBaseBindingVisible] = useState(false)

  const handleDelete = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error('缺少 Agent ID')
      return
    }

    const { code, message: msg } = await deleteAgentDefinitionInfo(record.id)
    if (code === 200) {
      message.success(msg || '删除成功')
      ref.current?.reload()
    } else {
      message.error(msg || '删除失败')
    }
  }

  const handleCopy = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error('缺少 Agent ID')
      return
    }

    const { code, message: msg } = await copyAgentDefinitionInfo(record.id)
    if (code === 200) {
      message.success(msg || '复制成功')
      ref.current?.reload()
    } else {
      message.error(msg || '复制失败')
    }
  }

  const handleStatusChange = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error('缺少 Agent ID')
      return
    }

    const nextStatus = record.status === 1 ? 2 : 1
    const { code, message: msg } = await updateAgentDefinitionStatus(record.id, {
      status: nextStatus,
    })
    if (code === 200) {
      message.success(msg || '操作成功')
      ref.current?.reload()
    } else {
      message.error(msg || '操作失败')
    }
  }

  const columns: any[] = [
    {
      title: 'Agent 名称',
      dataIndex: 'name',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: 'Agent 编码',
      dataIndex: 'code',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '模型供应商',
      dataIndex: 'modelProviderId',
      valueType: 'select',
      request: async () => getModelProviderList(),
      ellipsis: true,
    },
    {
      title: '模型名称',
      dataIndex: 'model',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'definitionStatus',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Definition_Status'),
    },
    {
      title: '温度参数',
      dataIndex: 'temperature',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '最大 token',
      dataIndex: 'maxTokens',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '最大轮次',
      dataIndex: 'maxToolRounds',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '访问类型',
      dataIndex: 'accessType',
      valueType: 'select',
      request: async () => getOptionList('Agent_Access_Type'),
    },
    // {
    //   title: '描述',
    //   dataIndex: 'description',
    //   valueType: 'text',
    //   ellipsis: true,
    //   hideInSearch: true,
    // },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 250,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentDefinition) =>
        write && (
          <TableActionMenu
            items={[
              { key: 'edit', label: '编辑', primary: true, onClick: () => { setId(record.id); setOpen(true) } },
              { key: 'binding', label: '绑定工具', primary: true, onClick: () => { setCurrentAgentId(record.id || ''); setToolBindingVisible(true) } },
              { key: 'knowledge-base', label: '知识库', primary: true, onClick: () => { setCurrentAgentId(record.id || ''); setKnowledgeBaseBindingVisible(true) } },
              { key: 'copy', label: '复制', confirm: { title: '确认复制该 Agent？' }, onClick: () => handleCopy(record) },
              { key: 'status', label: record.status === 1 ? '禁用' : '启用', confirm: { title: `确认${record.status === 1 ? '禁用' : '启用'}该 Agent？` }, onClick: () => handleStatusChange(record) },
              { key: 'delete', label: '删除', danger: true, confirm: { title: '确认删除该 Agent？' }, onClick: () => handleDelete(record) },
            ]}
          />
        ),
    },
  ]

  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        scroll={{ x: 1400 }}
        request={async (params: AgentDefinitionSearchParams) => getAgentDefinitionList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="button"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined)
                setOpen(true)
              }}
            >
              <FormattedMessage id="pages.common.new" />
            </Button>,
          ]
        }
        columns={columns}
      />
      <AgentDefinitionForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
        }}
      />

      <Modal
        title="工具绑定管理"
        open={toolBindingVisible}
        onCancel={() => {
          setToolBindingVisible(false)
          setCurrentAgentId('')
        }}
        footer={null}
        width={900}
      >
        <AgentToolBinding
          agentId={currentAgentId}
          open={toolBindingVisible}
          setOpen={setToolBindingVisible}
        />
      </Modal>
      <Modal
        title="知识库绑定管理"
        open={knowledgeBaseBindingVisible}
        onCancel={() => {
          setKnowledgeBaseBindingVisible(false)
          setCurrentAgentId('')
        }}
        footer={null}
        width={900}
        destroyOnClose
      >
        <AgentKnowledgeBaseBinding
          agentId={currentAgentId}
          open={knowledgeBaseBindingVisible}
          setOpen={setKnowledgeBaseBindingVisible}
        />
      </Modal>
    </PageContainer>
  )
}

export default AgentDefinitionPage
