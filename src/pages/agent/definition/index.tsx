import React, { useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, message, Modal } from 'antd'
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports'
import AgentDefinitionForm from '@/pages/agent/definition/AgentDefinitionForm'
import AgentToolBinding from '@/pages/agent/definition/AgentToolBinding'
import AgentKnowledgeBaseBinding from '@/pages/agent/definition/AgentKnowledgeBaseBinding'
import AgentSkillBinding from '@/pages/agent/definition/AgentSkillBinding'
import {
  copyAgentDefinitionInfo,
  deleteAgentDefinitionInfo,
  getAgentDefinitionList,
  updateAgentDefinitionStatus,
} from '@/services/agent/AgentDefinitionController'
import { getModelCatalogOptions } from '@/services/agent/ModelProviderController'
import { AgentApplication, getAgentApplicationList } from '@/services/agent/AgentApplicationController'
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
  const format = (id: string, values?: Record<string, string>) =>
    intl.formatMessage({ id }, values)

  // 工具绑定相关状态
  const [toolBindingVisible, setToolBindingVisible] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string>('')
  const [knowledgeBaseBindingVisible, setKnowledgeBaseBindingVisible] = useState(false)
  const [skillBindingVisible, setSkillBindingVisible] = useState(false)
  const [applications, setApplications] = useState<AgentApplication[]>([])
  const applicationOptions = applications.map((item) => ({ label: item.name, value: item.id }))

  React.useEffect(() => {
    getAgentApplicationList({ current: 1, pageSize: 100 }).then(({ data }) => setApplications((data || []).filter((item) => item.status === 1)))
  }, [])

  const handleDelete = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error(format('pages.agent.definition.missingId'))
      return
    }

    try {
      const { code } = await deleteAgentDefinitionInfo(record.id)
      if (code === 200) {
      ref.current?.reload()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const handleCopy = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error(format('pages.agent.definition.missingId'))
      return
    }

    try {
      const { code } = await copyAgentDefinitionInfo(record.id)
      if (code === 200) {
      ref.current?.reload()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const handleStatusChange = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error(format('pages.agent.definition.missingId'))
      return
    }

    const nextStatus = record.status === 1 ? 2 : 1
    try {
      const { code } = await updateAgentDefinitionStatus(record.id, { status: nextStatus })
      if (code === 200) ref.current?.reload()
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const columns: any[] = [
    {
      title: '业务应用空间',
      dataIndex: 'applicationId',
      valueType: 'select',
      fieldProps: { options: applicationOptions },
      render: (value: string) => applications.find((item) => item.id === value)?.name || value,
    },
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
      dataIndex: 'modelId',
      valueType: 'select',
      request: async () => getModelCatalogOptions('CHAT,MULTIMODAL'),
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
      width: 350,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentDefinition) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'edit',
                label: format('pages.common.edit'),
                primary: true,
                onClick: () => {
                  setId(record.id)
                  setOpen(true)
                },
              },
              {
                key: 'binding',
                label: format('pages.agent.tool.bind'),
                primary: true,
                onClick: () => {
                  setCurrentAgentId(record.id || '')
                  setToolBindingVisible(true)
                },
              },
              {
                key: 'knowledge-base',
                label: format('pages.agent.knowledgeBase.name'),
                onClick: () => {
                  setCurrentAgentId(record.id || '')
                  setKnowledgeBaseBindingVisible(true)
                },
              },
              {
                key: 'skill',
                label: format('pages.agent.skill.manage'),
                primary: true,
                onClick: () => {
                  setCurrentAgentId(record.id || '')
                  setSkillBindingVisible(true)
                },
              },
              {
                key: 'copy',
                label: format('pages.agent.definition.copy'),
                confirm: { title: format('pages.agent.definition.copyConfirm') },
                onClick: () => handleCopy(record),
              },
              {
                key: 'status',
                label:
                  record.status === 1
                    ? format('pages.common.disabled')
                    : format('pages.common.enabled'),
                confirm: {
                  title: format('pages.agent.definition.statusConfirm', {
                    action:
                      record.status === 1
                        ? format('pages.common.disabled')
                        : format('pages.common.enabled'),
                  }),
                },
                onClick: () => handleStatusChange(record),
              },
              {
                key: 'delete',
                label: format('pages.common.delete'),
                danger: true,
                confirm: { title: format('pages.agent.definition.deleteConfirm') },
                onClick: () => handleDelete(record),
              },
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
        search={{
          labelWidth: 120,
        }}
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
        applications={applications}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
        }}
      />

      <AgentToolBinding
        agentId={currentAgentId}
        open={toolBindingVisible}
        setOpen={(visible) => {
          setToolBindingVisible(visible)
          if (!visible) setCurrentAgentId('')
        }}
      />
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
      <AgentSkillBinding
        agentId={currentAgentId}
        open={skillBindingVisible}
        setOpen={(visible) => {
          setSkillBindingVisible(visible)
          if (!visible) setCurrentAgentId('')
        }}
      />
    </PageContainer>
  )
}

export default AgentDefinitionPage
