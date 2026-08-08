import React, { useEffect, useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, message, Tag } from 'antd'
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports'
import SkillForm from '@/pages/agent/skill/SkillForm'
import SkillDetail from '@/pages/agent/skill/SkillDetail'
import SkillVersions from '@/pages/agent/skill/SkillVersions'
import SkillResources from '@/pages/agent/skill/SkillResources'
import {
  createNextSkillDraft,
  getSkillDetail,
  getSkillList,
  publishSkill,
  updateSkillStatus,
} from '@/services/agent/SkillController'
import { AgentSkill, AgentSkillDetail, AgentSkillSearchParams } from '@/services/entity/Agent'
import { getOptionList } from '@/services/sys/DictController'
import TableActionMenu from '@/components/TableActionMenu'

const SkillPage: React.FC = () => {
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const intl = useIntl()
  const format = (id: string, values?: Record<string, string>) =>
    intl.formatMessage({ id }, values)

  const [formOpen, setFormOpen] = useState(false)
  const [formId, setFormId] = useState<string | undefined>(undefined)
  const [formInitial, setFormInitial] = useState<AgentSkillDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | undefined>(undefined)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsId, setVersionsId] = useState<string | undefined>(undefined)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [resourcesId, setResourcesId] = useState<string | undefined>(undefined)
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({})

  useEffect(() => {
    getOptionList('Agent_Skill_Category')
      .then((options) => {
        setCategoryNames(
          Object.fromEntries(options.map((item) => [String(item.value), item.label])),
        )
      })
      .catch(() => {
        // 字典加载失败时列表以原始分类展示
      })
  }, [])

  const reload = () => ref.current?.reload()

  /** 打开编辑：无草稿时先基于最新发布版本创建草稿 */
  const handleEdit = async (record: AgentSkill) => {
    if (!record.id) {
      message.error(format('pages.agent.skill.missingId'))
      return
    }
    try {
      const { data } = await getSkillDetail(record.id)
      if (!data?.draft) {
        await createNextSkillDraft(record.id)
        message.success(format('pages.agent.skill.nextDraftCreated'))
        setFormInitial(null)
      } else {
        setFormInitial(data)
      }
      setFormId(record.id)
      setFormOpen(true)
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  /** 新建草稿：基于最新发布版本续版 */
  const handleCreateNextDraft = async (record: AgentSkill) => {
    if (!record.id) {
      message.error(format('pages.agent.skill.missingId'))
      return
    }
    try {
      const { code } = await createNextSkillDraft(record.id)
      if (code === 200) {
        message.success(format('pages.agent.skill.nextDraftCreated'))
        reload()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const handlePublish = async (record: AgentSkill) => {
    if (!record.id) {
      message.error(format('pages.agent.skill.missingId'))
      return
    }
    try {
      const { data } = await getSkillDetail(record.id)
      if (!data?.draft?.id) {
        message.warning(format('pages.agent.skill.noDraftToPublish'))
        return
      }
      const { code } = await publishSkill(record.id, data.draft.id)
      if (code === 200) {
        message.success(format('pages.agent.skill.publishSuccess'))
        reload()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const handleStatusChange = async (record: AgentSkill) => {
    if (!record.id) {
      message.error(format('pages.agent.skill.missingId'))
      return
    }
    const nextStatus = record.status === 1 ? 2 : 1
    try {
      const { code } = await updateSkillStatus(record.id, { status: nextStatus })
      if (code === 200) reload()
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const columns: any[] = [
    {
      title: format('pages.agent.skill.name'),
      dataIndex: 'name',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.skill.code'),
      dataIndex: 'code',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.skill.category'),
      dataIndex: 'category',
      valueType: 'select',
      request: async () => getOptionList('Agent_Skill_Category'),
      ellipsis: true,
      render: (_: unknown, record: AgentSkill) =>
        (record.category && categoryNames[record.category]) || record.category || '-',
    },
    {
      title: format('pages.common.status'),
      key: 'skillStatus',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: format('pages.agent.skill.draftStatus'), status: 'Warning' },
        1: { text: format('pages.common.enabled'), status: 'Success' },
        2: { text: format('pages.common.disabled'), status: 'Default' },
      },
      render: (_: unknown, record: AgentSkill) => {
        if (record.status === 1) {
          return <Tag color="green">{format('pages.common.enabled')}</Tag>
        }
        if (record.status === 0) {
          return <Tag color="orange">{format('pages.agent.skill.draftStatus')}</Tag>
        }
        return <Tag>{format('pages.common.disabled')}</Tag>
      },
    },
    {
      title: format('pages.common.createTime'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      width: 300,
      key: 'option',
      fixed: 'right',
      render: (_: unknown, record: AgentSkill) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'edit',
                label: format('pages.agent.skill.editDraft'),
                primary: true,
                onClick: () => handleEdit(record),
              },
              {
                key: 'next-draft',
                label: format('pages.agent.skill.nextDraft'),
                onClick: () => handleCreateNextDraft(record),
              },
              {
                key: 'publish',
                label: format('pages.agent.skill.publish'),
                primary: true,
                confirm: { title: format('pages.agent.skill.publishConfirm') },
                onClick: () => handlePublish(record),
              },
              {
                key: 'versions',
                label: format('pages.agent.skill.versions'),
                onClick: () => {
                  setVersionsId(record.id)
                  setVersionsOpen(true)
                },
              },
              {
                key: 'resources',
                label: format('pages.agent.skill.resourceManage'),
                onClick: () => {
                  setResourcesId(record.id)
                  setResourcesOpen(true)
                },
              },
              {
                key: 'detail',
                label: format('pages.agent.skill.detail'),
                onClick: () => {
                  setDetailId(record.id)
                  setDetailOpen(true)
                },
              },
              {
                key: 'status',
                label:
                  record.status === 1
                    ? format('pages.common.disabled')
                    : format('pages.common.enabled'),
                confirm: {
                  title: format('pages.agent.skill.statusConfirm', {
                    action:
                      record.status === 1
                        ? format('pages.common.disabled')
                        : format('pages.common.enabled'),
                  }),
                },
                onClick: () => handleStatusChange(record),
              },
            ]}
          />
        ),
    },
  ]

  return (
    <PageContainer>
      <ProTable<AgentSkill>
        actionRef={ref}
        rowKey="id"
        scroll={{ x: 1000 }}
        request={async (params: AgentSkillSearchParams) => getSkillList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="button"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setFormId(undefined)
                setFormInitial(null)
                setFormOpen(true)
              }}
            >
              <FormattedMessage id="pages.common.new" />
            </Button>,
          ]
        }
        columns={columns}
      />
      <SkillForm
        id={formId}
        initialDetail={formInitial}
        open={formOpen}
        setOpen={setFormOpen}
        onSuccess={() => {
          setFormId(undefined)
          setFormInitial(null)
          reload()
        }}
      />
      <SkillDetail id={detailId} open={detailOpen} setOpen={setDetailOpen} />
      <SkillVersions id={versionsId} open={versionsOpen} setOpen={setVersionsOpen} />
      <SkillResources id={resourcesId} open={resourcesOpen} setOpen={setResourcesOpen} />
    </PageContainer>
  )
}

export default SkillPage
