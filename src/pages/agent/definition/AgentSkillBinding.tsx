import React, { useEffect, useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components'
import { Button, Form, InputNumber, Modal, Select, Tag } from 'antd'
import { useIntl } from '@umijs/max'
import TableActionMenu from '@/components/TableActionMenu'
import {
  getAgentSkillBindings,
  getSkillOptions,
  getSkillVersions,
  installSkillToAgent,
  uninstallSkillFromAgent,
  updateSkillBinding,
} from '@/services/agent/SkillController'
import {
  AgentDefinitionSkillBinding,
  AgentSkillVersion,
} from '@/services/entity/Agent'

interface AgentSkillBindingProps {
  agentId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AgentSkillBinding: React.FC<AgentSkillBindingProps> = ({ agentId, open }) => {
  const intl = useIntl()
  const format = (id: string, values?: Record<string, string>) =>
    intl.formatMessage({ id }, values)
  const ref = useRef<ActionType>()
  const [form] = Form.useForm()
  const [installOpen, setInstallOpen] = useState(false)
  const [skillOptions, setSkillOptions] = useState<{ label: string; value: string }[]>([])
  const [versionOptions, setVersionOptions] = useState<{ label: string; value: string }[]>([])
  const [versionMap, setVersionMap] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open) return
    ref.current?.reload()
    loadSkills()
  }, [open, agentId])

  const loadSkills = async () => {
    try {
      const options = await getSkillOptions()
      const installOptions: { label: string; value: string }[] = []
      options.forEach((item) => {
        const value = String(item.value)
        const name = item.label || value
        if (item.status === 1) {
          installOptions.push({ label: item.code ? `${name} (${item.code})` : name, value })
        }
      })
      setSkillOptions(installOptions)
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  /** 加载已安装绑定，并补齐技能名称与版本号展示信息 */
  const loadBindings = async () => {
    const { data } = await getAgentSkillBindings(agentId)
    const bindings = data || []
    const vMap: Record<string, number> = {}
    const skillIds = Array.from(new Set(bindings.map((item) => item.skillId).filter((id): id is string => Boolean(id))))
    await Promise.all(
      skillIds.map(async (skillId) => {
        try {
          const { data: versions } = await getSkillVersions(skillId)
          ;(versions || []).forEach((item) => {
            if (item.id && item.versionNo != null) vMap[item.id] = item.versionNo
          })
        } catch {
          // 单个技能版本加载失败不影响其余绑定展示
        }
      }),
    )
    setVersionMap(vMap)
    return { data: bindings, total: bindings.length, success: true }
  }

  const openInstallModal = () => {
    form.resetFields()
    setVersionOptions([])
    setInstallOpen(true)
  }

  const handleSkillChange = async (skillId: string) => {
    if (!skillId) {
      setVersionOptions([])
      return
    }
    try {
      const { data } = await getSkillVersions(skillId)
      const published = (data || []).filter((item: AgentSkillVersion) => item.status === 1)
      setVersionOptions(
        published.map((item) => ({
          label: `v${item.versionNo ?? '?'}${item.changeNote ? ` - ${item.changeNote}` : ''}`,
          value: item.id as string,
        })),
      )
    } catch {
      setVersionOptions([])
    }
  }

  const handleInstall = async () => {
    let values: { skillId: string; skillVersionId: string; priority?: number }
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    try {
      const { code } = await installSkillToAgent(agentId, {
        skillVersionId: values.skillVersionId,
        priority: values.priority || 0,
        status: 1,
      })
      if (code === 200) {
        setInstallOpen(false)
        form.resetFields()
        ref.current?.reload()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const handleStatusChange = async (record: AgentDefinitionSkillBinding) => {
    if (!record.id) return
    try {
      const { code } = await updateSkillBinding(agentId, record.id, {
        status: record.status === 1 ? 0 : 1,
      })
      if (code === 200) ref.current?.reload()
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  /** 发布新版本不会隐式影响生产 Agent；管理员在这里显式升级到该 Skill 最新发布版本。 */
  const handleUpgradeToLatest = async (record: AgentDefinitionSkillBinding) => {
    if (!record.id || !record.skillId) return
    try {
      const { data } = await getSkillVersions(record.skillId)
      const published = (data || []).filter((item: AgentSkillVersion) => item.status === 1 && item.id)
        .sort((left: AgentSkillVersion, right: AgentSkillVersion) => (right.versionNo || 0) - (left.versionNo || 0))
      const latest = published[0]
      if (!latest?.id || latest.id === record.skillVersionId) {
        Modal.info({ title: format('pages.agent.skill.upgradeNotNeeded'), content: format('pages.agent.skill.upgradeNotNeededHint') })
        return
      }
      Modal.confirm({
        title: format('pages.agent.skill.upgradeVersion'),
        content: format('pages.agent.skill.upgradeConfirm', { current: String(versionMap[record.skillVersionId || ''] || '?'), latest: String(latest.versionNo || '?') }),
        okText: format('pages.agent.skill.upgradeLatest'),
        onOk: async () => {
          const { code } = await updateSkillBinding(agentId, record.id as string, { skillVersionId: latest.id })
          if (code === 200) ref.current?.reload()
        },
      })
    } catch {
      // API failures are displayed by the global request handler.
    }
  }


  const handleUninstall = async (record: AgentDefinitionSkillBinding) => {
    if (!record.id) return
    try {
      const { code } = await uninstallSkillFromAgent(agentId, record.id)
      if (code === 200) ref.current?.reload()
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const columns: ProColumns[] = [
    {
      title: format('pages.agent.skill.name'),
      dataIndex: 'skillId',
      ellipsis: true,
      valueType: 'select',
      request: async () => {
        let options = await getSkillOptions()
        options = options.map((item) => ({
          label: item.label + (item.code ? ` (${item.code})` : ''),
          value: item.value,
        }))
        return options
      },
    },
    {
      title: format('pages.agent.skill.versionNo'),
      dataIndex: 'skillVersionId',
      width: 100,
      render: (value: React.ReactNode) => {
        const versionId = typeof value === 'string' ? value : undefined
        return versionId && versionMap[versionId] != null ? `v${versionMap[versionId]}` : '-'
      },
    },
    {
      title: format('pages.agent.tool.priority'),
      dataIndex: 'priority',
      width: 150,
    },
    {
      title: format('pages.common.status'),
      dataIndex: 'status',
      width: 110,
      render: (value: React.ReactNode) =>
        value === 1 ? (
          <Tag color="green">{format('pages.common.enabled')}</Tag>
        ) : (
          <Tag>{format('pages.common.disabled')}</Tag>
        ),
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 300,
      render: (_: unknown, record: AgentDefinitionSkillBinding) => (
        <TableActionMenu
          items={[
            {
              key: 'status',
              primary: true,
              label:
                record.status === 1
                  ? format('pages.common.disabled')
                  : format('pages.common.enabled'),
              confirm: { title: format('pages.agent.skill.bindingStatusConfirm') },
              onClick: () => handleStatusChange(record),
            },
            {
              key: 'uninstall',
              primary: true,
              label: format('pages.agent.skill.uninstall'),
              danger: true,
              confirm: { title: format('pages.agent.skill.uninstallConfirm') },
              onClick: () => handleUninstall(record),
            },
            {
              key: 'upgrade',
              primary: true,
              label: format('pages.agent.skill.upgradeLatest'),
              onClick: () => handleUpgradeToLatest(record),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <ProTable<AgentDefinitionSkillBinding>
        actionRef={ref}
        rowKey="id"
        search={false}
        columns={columns}
        pagination={{
          current: 1,
          pageSize: 20,
        }}
        request={loadBindings}
        toolBarRender={() => [
          <Button key="install" icon={<PlusOutlined />} type="primary" onClick={openInstallModal}>
            {format('pages.agent.skill.install')}
          </Button>,
        ]}
      />
      <Modal
        title={format('pages.agent.skill.install')}
        open={installOpen}
        onOk={handleInstall}
        onCancel={() => {
          setInstallOpen(false)
          form.resetFields()
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="skillId"
            label={format('pages.agent.skill.selectSkill')}
            rules={[{ required: true, message: format('pages.agent.skill.selectSkill') }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={skillOptions}
              placeholder={format('pages.agent.skill.selectSkillPlaceholder')}
              onChange={handleSkillChange}
            />
          </Form.Item>
          <Form.Item
            name="skillVersionId"
            label={format('pages.agent.skill.selectVersion')}
            rules={[{ required: true, message: format('pages.agent.skill.selectVersion') }]}
          >
            <Select
              options={versionOptions}
              placeholder={format('pages.agent.skill.selectVersionPlaceholder')}
            />
          </Form.Item>
          <Form.Item name="priority" label={format('pages.agent.tool.priority')} initialValue={0}>
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default AgentSkillBinding
