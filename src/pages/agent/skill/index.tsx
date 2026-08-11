import React, { useEffect, useRef, useState } from 'react'
import { AppstoreOutlined, CheckCircleFilled, FileTextOutlined, LinkOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, Form, Input, List, message, Modal, Select, Space, Spin, Tag, Typography } from 'antd'
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports'
import SkillForm from '@/pages/agent/skill/SkillForm'
import SkillDetail from '@/pages/agent/skill/SkillDetail'
import SkillVersions from '@/pages/agent/skill/SkillVersions'
import SkillResources from '@/pages/agent/skill/SkillResources'
import {
  createNextSkillDraft,
  getSkillDetail,
  getSkillList,
  getSkillPublishCheck,
  getSkillStatistics,
  getSkillRoutingConfig,
  publishSkill,
  updateSkillRoutingConfig,
  updateSkillStatus,
} from '@/services/agent/SkillController'
import { getModelCatalogOptions } from '@/services/agent/ModelProviderController'
import { AgentSkill, AgentSkillDetail, AgentSkillSearchParams, AgentSkillStatistics } from '@/services/entity/Agent'
import { getOptionList } from '@/services/sys/DictController'
import TableActionMenu from '@/components/TableActionMenu'
import './index.less'
import { SystemIcon } from '@/components/SystemIconPicker'

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
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([])
  const [statistics, setStatistics] = useState<AgentSkillStatistics>()
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>()
  const [filterStatus, setFilterStatus] = useState<0 | 1 | 2>()
  const [routingConfigOpen, setRoutingConfigOpen] = useState(false)
  const [routingProviders, setRoutingProviders] = useState<{ label: string; value: string }[]>([])
  const [routingConfigLoading, setRoutingConfigLoading] = useState(false)
  const [routingForm] = Form.useForm<{ embeddingModelId?: string }>()

  useEffect(() => {
    getOptionList('Agent_Skill_Category')
      .then((options) => {
        setCategoryOptions(options.map((item) => ({ label: item.label, value: String(item.value) })))
        setCategoryNames(
          Object.fromEntries(options.map((item) => [String(item.value), item.label])),
        )
      })
      .catch(() => {
        // 字典加载失败时列表以原始分类展示
      })
  }, [])

  const reload = () => ref.current?.reload()
  const refreshPage = () => {
    reload()
    loadStatistics()
  }
  const loadStatistics = () => {
    setStatisticsLoading(true)
    getSkillStatistics().then(({ data }) => setStatistics(data)).finally(() => setStatisticsLoading(false))
  }
  useEffect(() => { loadStatistics() }, [])

  const openRoutingConfig = async () => {
    setRoutingConfigLoading(true)
    try {
      const [config, providers] = await Promise.all([getSkillRoutingConfig(), getModelCatalogOptions('EMBEDDING')])
      routingForm.setFieldsValue({ embeddingModelId: config.data?.embeddingModelId })
      setRoutingProviders((providers || []).map((item) => ({ label: item.label, value: String(item.value) })))
      setRoutingConfigOpen(true)
    } finally { setRoutingConfigLoading(false) }
  }
  const saveRoutingConfig = async () => {
    const values = await routingForm.validateFields()
    const { code } = await updateSkillRoutingConfig(values)
    if (code === 200) setRoutingConfigOpen(false)
  }

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
      // 列表数据可能落后于版本状态；先读取详情可避免让用户撞上无意义的 409。
      const { data: detail } = await getSkillDetail(record.id)
      if (detail?.draft) {
        setFormInitial(detail)
        setFormId(record.id)
        setFormOpen(true)
        return
      }
      const { code } = await createNextSkillDraft(record.id)
      if (code === 200) {
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
      const { data: check } = await getSkillPublishCheck(record.id)
      if (!check?.draftVersionId) {
        return
      }
      const blockers = check.blockers || []
      const warnings = check.warnings || []
      if (blockers.length) {
        return
      }
      Modal.confirm({
        title: format('pages.agent.skill.publishReady'),
        content: (
          <Space direction="vertical" size={8}>
            <Typography.Text>{format('pages.agent.skill.publishBudget', { count: String(check.estimatedTokens || 0) })}</Typography.Text>
            {warnings.length > 0 && <List size="small" header={format('pages.agent.skill.publishWarnings')} dataSource={warnings} renderItem={(item) => <List.Item>{item}</List.Item>} />}
          </Space>
        ),
        okText: format('pages.agent.skill.publish'),
        onOk: async () => {
          const { code } = await publishSkill(record.id as string, check.draftVersionId as string)
          if (code === 200) {
            reload()
            loadStatistics()
          }
        },
      })
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
      if (code === 200) {
        reload()
        loadStatistics()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const columns: any[] = [
    {
      title: format('pages.agent.skill.name'),
      dataIndex: 'name',
      valueType: 'text',
      width: 280,
      render: (_: unknown, record: AgentSkill) => (
        <div className="skill-name-cell">
          <span className="skill-icon"><SystemIcon name={record.icon} /></span>
          <div><strong>{record.name || '-'}</strong><small>{record.description || record.code || '-'}</small></div>
        </div>
      ),
    },
    {
      title: format('pages.agent.skill.assembly'),
      key: 'assembly',
      hideInSearch: true,
      width: 230,
      render: (_: unknown, record: AgentSkill) => (
        <div className="skill-assembly-cell">
          <span>{(record.category && categoryNames[record.category]) || record.category || format('pages.agent.skill.uncategorized')}</span>
          <Space size={[4, 4]} wrap>
            <Tag>{format('pages.agent.skill.toolCount', { count: String(record.toolCount || 0) })}</Tag>
            <Tag>{format('pages.agent.skill.knowledgeBaseCount', { count: String(record.knowledgeBaseCount || 0) })}</Tag>
            <Tag>{format('pages.agent.skill.resourceCount', { count: String(record.resourceCount || 0) })}</Tag>
          </Space>
        </div>
      ),
    },
    {
      title: format('pages.agent.skill.delivery'),
      key: 'delivery',
      hideInSearch: true,
      width: 280,
      render: (_: unknown, record: AgentSkill) => (
        <div className="skill-delivery-cell">
          <Space size={[4, 4]} wrap>
            {record.hasDraft ? <Tag color="orange">{format('pages.agent.skill.draftPending')}</Tag> : <Tag>{format('pages.agent.skill.noDraftPending')}</Tag>}
            {record.currentVersionNo ? <Tag color="blue">{format('pages.agent.skill.publishedVersion', { version: String(record.currentVersionNo) })}</Tag> : <Tag>{format('pages.agent.skill.unpublished')}</Tag>}
            {record.status === 2 && <Tag>{format('pages.agent.skill.deactivated')}</Tag>}
          </Space>
          <small>{format('pages.agent.skill.installedAgentCount', { count: String(record.installedAgentCount || 0) })}</small>
        </div>
      ),
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      width: 200,
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

  const changeFilter = (callback: () => void) => { callback(); window.setTimeout(reload, 0) }

  return (
    <PageContainer className="agent-skill-page" header={{ title: format('pages.agent.skill.manage'), breadcrumb: undefined }}>
      <section className="skill-lifecycle-hero">
        <div>
          <span className="skill-eyebrow">SKILL GOVERNANCE</span>
          <h2>把业务规范沉淀为可控的智能能力</h2>
          <p>Skill 的重点不是工具数量，而是将指令、知识、资源与权限以可审计版本交付给 Agent。</p>
          <ol><li>配置草稿</li><li>发布检查</li><li>冻结版本</li><li>安装到 Agent</li></ol>
        </div>
        {write && <Space><Button onClick={openRoutingConfig}>{format('pages.agent.skill.routingConfig')}</Button><Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => { setFormId(undefined); setFormInitial(null); setFormOpen(true) }}>{format('pages.agent.skill.createDraft')}</Button></Space>}
      </section>
      <Spin spinning={statisticsLoading}>
        <section className="skill-release-overview">
          <div className="skill-release-focus"><FileTextOutlined /><div><span>需要交付</span><strong>{statistics?.draftCount || 0}</strong><small>个草稿等待发布校验</small></div><Button type="link" onClick={() => changeFilter(() => setFilterStatus(0))}>查看草稿</Button></div>
          <div><CheckCircleFilled /><span>可用 Skill</span><strong>{statistics?.enabledCount || 0}</strong></div>
          <div><AppstoreOutlined /><span>已发布版本</span><strong>{statistics?.publishedCount || 0}</strong></div>
          <div><LinkOutlined /><span>覆盖 Agent</span><strong>{statistics?.boundAgentCount || 0}</strong></div>
        </section>
      </Spin>
      <main className="skill-table-panel">
        <div className="skill-filter-bar"><Input allowClear prefix={<SearchOutlined />} placeholder={format('pages.agent.skill.searchPlaceholder')} value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={reload} /><Select value={filterStatus} placeholder={format('pages.agent.skill.allDeliveryStatuses')} allowClear options={[{ label: format('pages.agent.skill.draftPending'), value: 0 }, { label: format('pages.common.enabled'), value: 1 }, { label: format('pages.common.disabled'), value: 2 }]} onChange={(value) => changeFilter(() => setFilterStatus(value as 0 | 1 | 2 | undefined))} /><Select value={filterCategory} placeholder={format('pages.agent.skill.allCategories')} allowClear options={categoryOptions} onChange={(value) => changeFilter(() => setFilterCategory(value))} /><Button icon={<ReloadOutlined />} onClick={refreshPage}>{format('pages.common.refresh')}</Button></div>
        <ProTable<AgentSkill>
          className="skill-center-table"
          actionRef={ref}
          rowKey="id"
          scroll={{ x: 1000 }}
          search={false}
          options={false}
          headerTitle={false}
          request={async (params: AgentSkillSearchParams) => getSkillList({ ...params, name: keyword || undefined, category: filterCategory, status: filterStatus })}
          columns={columns}
        />
      </main>
      <SkillForm
        id={formId}
        initialDetail={formInitial}
        open={formOpen}
        setOpen={setFormOpen}
        onSuccess={() => {
          setFormId(undefined)
          setFormInitial(null)
          reload()
          loadStatistics()
        }}
      />
      <SkillDetail id={detailId} open={detailOpen} setOpen={setDetailOpen} />
      <SkillVersions id={versionsId} open={versionsOpen} setOpen={setVersionsOpen} />
      <SkillResources id={resourcesId} open={resourcesOpen} setOpen={setResourcesOpen} />
      <Modal title={format('pages.agent.skill.routingConfig')} open={routingConfigOpen} onCancel={() => setRoutingConfigOpen(false)} onOk={saveRoutingConfig} confirmLoading={routingConfigLoading} destroyOnClose>
        <Form form={routingForm} layout="vertical">
          <Form.Item name="embeddingModelId" label={format('pages.agent.skill.routingProvider')} extra={format('pages.agent.skill.routingHint')}>
            <Select allowClear showSearch optionFilterProp="label" options={routingProviders} placeholder={format('pages.agent.skill.routingProviderPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default SkillPage
