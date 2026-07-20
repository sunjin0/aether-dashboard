import React, { useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, message, Modal } from 'antd'
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports'
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
  const intl = useIntl()
  const format = (id: string, values?: Record<string, string>) => intl.formatMessage({ id }, values)

  // 工具绑定相关状态
  const [toolBindingVisible, setToolBindingVisible] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string>('')
  const [knowledgeBaseBindingVisible, setKnowledgeBaseBindingVisible] = useState(false)

  const handleDelete = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error(format('pages.agent.definition.missingId'))
      return
    }

    const { code, message: msg } = await deleteAgentDefinitionInfo(record.id)
    if (code === 200) {
      message.success(msg || format('pages.agent.definition.deleteSuccess'))
      ref.current?.reload()
    } else {
      message.error(msg || format('pages.agent.definition.deleteFailed'))
    }
  }

  const handleCopy = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error(format('pages.agent.definition.missingId'))
      return
    }

    const { code, message: msg } = await copyAgentDefinitionInfo(record.id)
    if (code === 200) {
      message.success(msg || format('pages.agent.definition.copySuccess'))
      ref.current?.reload()
    } else {
      message.error(msg || format('pages.agent.definition.copyFailed'))
    }
  }

  const handleStatusChange = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error(format('pages.agent.definition.missingId'))
      return
    }

    const nextStatus = record.status === 1 ? 2 : 1
    const { code, message: msg } = await updateAgentDefinitionStatus(record.id, {
      status: nextStatus,
    })
    if (code === 200) {
      message.success(msg || format('pages.agent.definition.operationSuccess'))
      ref.current?.reload()
    } else {
      message.error(msg || format('pages.agent.definition.operationFailed'))
    }
  }

  const columns: any[] = [
    {
      title: format('pages.agent.definition.name'),
      dataIndex: 'name',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.definition.code'),
      dataIndex: 'code',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.definition.modelProvider'),
      dataIndex: 'modelProviderId',
      valueType: 'select',
      request: async () => getModelProviderList(),
      ellipsis: true,
    },
    {
      title: format('pages.agent.definition.model'),
      dataIndex: 'model',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.common.status'),
      key: 'definitionStatus',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Definition_Status'),
    },
    {
      title: format('pages.agent.definition.temperature'),
      dataIndex: 'temperature',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: format('pages.agent.definition.maxTokens'),
      dataIndex: 'maxTokens',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: format('pages.agent.definition.maxToolRounds'),
      dataIndex: 'maxToolRounds',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: format('pages.agent.definition.accessType'),
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
      title: format('pages.common.createTime'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      width: 250,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentDefinition) =>
        write && (
          <TableActionMenu
            items={[
              { key: 'edit', label: format('pages.common.edit'), primary: true, onClick: () => { setId(record.id); setOpen(true) } },
              { key: 'binding', label: format('pages.agent.tool.bind'), primary: true, onClick: () => { setCurrentAgentId(record.id || ''); setToolBindingVisible(true) } },
              { key: 'knowledge-base', label: format('pages.agent.knowledgeBase.name'), onClick: () => { setCurrentAgentId(record.id || ''); setKnowledgeBaseBindingVisible(true) } },
              { key: 'copy', label: format('pages.agent.definition.copy'), confirm: { title: format('pages.agent.definition.copyConfirm') }, onClick: () => handleCopy(record) },
              { key: 'status', label: record.status === 1 ? format('pages.common.disabled') : format('pages.common.enabled'), confirm: { title: format('pages.agent.definition.statusConfirm', { action: record.status === 1 ? format('pages.common.disabled') : format('pages.common.enabled') }) }, onClick: () => handleStatusChange(record) },
              { key: 'delete', label: format('pages.common.delete'), danger: true, confirm: { title: format('pages.agent.definition.deleteConfirm') }, onClick: () => handleDelete(record) },
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
        title={format('pages.agent.definition.toolBindingManagement')}
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
        title={format('pages.agent.definition.knowledgeBaseBindingManagement')}
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
