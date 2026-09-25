import React, { useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Alert, Button, message, Modal, Space } from 'antd'
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports'
import AgentDefinitionForm from '@/pages/agent/definition/AgentDefinitionForm'
import AgentToolBinding from '@/pages/agent/definition/AgentToolBinding'
import AgentKnowledgeBaseBinding from '@/pages/agent/definition/AgentKnowledgeBaseBinding'
import AgentSkillBinding from '@/pages/agent/definition/AgentSkillBinding'
import AgentWorkflowCapabilityBinding from '@/pages/agent/definition/AgentWorkflowCapabilityBinding'
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
import { useCreatorSearchColumn } from '@/components/CreatorSearchColumn'

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
  const creatorColumn = useCreatorSearchColumn<AgentDefinition>()

  // 工具绑定相关状态
  const [toolBindingVisible, setToolBindingVisible] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string>('')
  const [knowledgeBaseBindingVisible, setKnowledgeBaseBindingVisible] = useState(false)
  const [skillBindingVisible, setSkillBindingVisible] = useState(false)
  const [workflowCapabilityBindingVisible, setWorkflowCapabilityBindingVisible] = useState(false)
  const [nextStepsVisible, setNextStepsVisible] = useState(false)
  const [applications, setApplications] = useState<AgentApplication[]>([])
  const [applicationScopeId, setApplicationScopeId] = useState(
    () => new URLSearchParams(history?.location?.search || '').get('applicationId') || undefined,
  )
  const applicationOptions = applications.map((item) => ({ label: item.name, value: item.id }))
  const scopedApplication = applications.find((item) => item.id === applicationScopeId)

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
      title: format('pages.agent.application.title'),
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
                key: 'debug-chat',
                label: format('pages.agent.platform.debugAgent'),
                primary: true,
                onClick: () => {
                  if (record.id) {
                    history.push(`/agent/chat?agentId=${encodeURIComponent(record.id)}`)
                  }
                },
              },
              {
                key: 'runs',
                label: format('pages.agent.platform.viewRuns'),
                onClick: () => {
                  if (record.id) {
                    history.push(`/agent/run?agentDefinitionId=${encodeURIComponent(record.id)}`)
                  }
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
                key: 'workflow-capability',
                label: format('pages.agent.workflowCapability.binding.manage'),
                primary: true,
                onClick: () => {
                  setCurrentAgentId(record.id || '')
                  setWorkflowCapabilityBindingVisible(true)
                },
              },
              {
                key: 'evaluation',
                label: format('pages.agentEvaluation.entry.evaluate'),
                primary: true,
                onClick: () => {
                  if (record.id) {
                    history.push(`/evaluation/experiments?targetType=AGENT&targetId=${record.id}`)
                  }
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
      {applicationScopeId && (
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 12 }}
          message={format('pages.agent.platform.applicationScope', {
            name: scopedApplication?.name || format('pages.workflowUX.unknown'),
          })}
          action={
            <Button
              type="link"
              onClick={() => {
                setApplicationScopeId(undefined)
                history.replace('/agent/definition')
              }}
            >
              {format('pages.agent.platform.clearApplicationScope')}
            </Button>
          }
        />
      )}
      <ProTable
        actionRef={ref}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        scroll={{ x: 1400 }}
        request={async (params: AgentDefinitionSearchParams) =>
          getAgentDefinitionList({
            ...params,
            applicationId: applicationScopeId || params.applicationId,
          })
        }
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
        columns={[...(creatorColumn ? [creatorColumn] : []), ...columns]}
      />
      <AgentDefinitionForm
        id={id}
        open={open}
        setOpen={setOpen}
        applications={applications}
        initialApplicationId={applicationScopeId}
        onSuccess={(createdId) => {
          setId(undefined)
          ref.current?.reload()
          if (createdId) {
            setCurrentAgentId(createdId)
            setNextStepsVisible(true)
          }
        }}
      />

      <Modal
        title={format('pages.agent.platform.nextSteps')}
        open={nextStepsVisible}
        onCancel={() => {
          setNextStepsVisible(false)
          setCurrentAgentId('')
        }}
        footer={
          <Button
            onClick={() => {
              setNextStepsVisible(false)
              setCurrentAgentId('')
            }}
          >
            {format('pages.common.close')}
          </Button>
        }
      >
        <p>{format('pages.agent.platform.nextStepsTip')}</p>
        <Space wrap>
          <Button
            type="primary"
            onClick={() => {
              setNextStepsVisible(false)
              setToolBindingVisible(true)
            }}
          >
            {format('pages.agent.tool.bind')}
          </Button>
          <Button
            onClick={() => {
              setNextStepsVisible(false)
              setSkillBindingVisible(true)
            }}
          >
            {format('pages.agent.skill.manage')}
          </Button>
          <Button
            onClick={() => {
              setNextStepsVisible(false)
              setWorkflowCapabilityBindingVisible(true)
            }}
          >
            {format('pages.agent.workflowCapability.binding.manage')}
          </Button>
          <Button
            onClick={() => {
              setNextStepsVisible(false)
              setKnowledgeBaseBindingVisible(true)
            }}
          >
            {format('pages.agent.knowledgeBase.name')}
          </Button>
        </Space>
      </Modal>

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
      <AgentWorkflowCapabilityBinding
        agentId={currentAgentId}
        open={workflowCapabilityBindingVisible}
        setOpen={(visible) => {
          setWorkflowCapabilityBindingVisible(visible)
          if (!visible) setCurrentAgentId('')
        }}
      />
    </PageContainer>
  )
}

export default AgentDefinitionPage
