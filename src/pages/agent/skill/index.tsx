import React, { useEffect, useRef, useState } from 'react'
import { AppstoreOutlined, CheckCircleFilled, FileTextOutlined, LinkOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, Input, List, message, Modal, Select, Space, Spin, Tag, Typography } from 'antd'
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
  publishSkill,
  updateSkillStatus,
} from '@/services/agent/SkillController'
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
  const loadStatistics = () => {
    setStatisticsLoading(true)
    getSkillStatistics().then(({ data }) => setStatistics(data)).finally(() => setStatisticsLoading(false))
  }
  useEffect(() => { loadStatistics() }, [])

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
      // 列表数据可能落后于版本状态；先读取详情可避免让用户撞上无意义的 409。
      const { data: detail } = await getSkillDetail(record.id)
      if (detail?.draft) {
        message.info(format('pages.agent.skill.editableDraftOpened'))
        setFormInitial(detail)
        setFormId(record.id)
        setFormOpen(true)
        return
      }
      const { code } = await createNextSkillDraft(record.id, { skipErrorHandler: true })
      if (code === 200) {
        message.success(format('pages.agent.skill.nextDraftCreated'))
        reload()
      }
    } catch (error: any) {
      const errorCode = error?.info?.errorCode
      const errorMessage = error?.info?.errorMessage || error?.message || ''
      if (errorCode === 409 && errorMessage.includes('editable draft')) {
        message.info(format('pages.agent.skill.editableDraftOpened'))
        await handleEdit(record)
        return
      }
      message.error(errorMessage || format('pages.agent.skill.nextDraftFailed'))
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
        message.warning(format('pages.agent.skill.noDraftToPublish'))
        return
      }
      const blockers = check.blockers || []
      const warnings = check.warnings || []
      if (blockers.length) {
        Modal.error({
          title: format('pages.agent.skill.publishBlocked'),
          content: <List size="small" dataSource={blockers} renderItem={(item) => <List.Item>{item}</List.Item>} />,
        })
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
            message.success(format('pages.agent.skill.publishSuccess'))
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
      title: '能力装配',
      key: 'assembly',
      hideInSearch: true,
      width: 230,
      render: (_: unknown, record: AgentSkill) => (
        <div className="skill-assembly-cell">
          <span>{(record.category && categoryNames[record.category]) || record.category || '未分类'}</span>
          <Space size={[4, 4]} wrap>
            <Tag>工具 {record.toolCount || 0}</Tag>
            <Tag>知识库 {record.knowledgeBaseCount || 0}</Tag>
            <Tag>资源 {record.resourceCount || 0}</Tag>
          </Space>
        </div>
      ),
    },
    {
      title: '版本交付',
      key: 'delivery',
      hideInSearch: true,
      width: 280,
      render: (_: unknown, record: AgentSkill) => (
        <div className="skill-delivery-cell">
          <Space size={[4, 4]} wrap>
            {record.hasDraft ? <Tag color="orange">待发布草稿</Tag> : <Tag>无待发布草稿</Tag>}
            {record.currentVersionNo ? <Tag color="blue">已发布 v{record.currentVersionNo}</Tag> : <Tag>尚未发布</Tag>}
            {record.status === 2 && <Tag>已停用</Tag>}
          </Space>
          <small>已安装到 {record.installedAgentCount || 0} 个 Agent</small>
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
        {write && <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => { setFormId(undefined); setFormInitial(null); setFormOpen(true) }}>创建 Skill 草稿</Button>}
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
        <div className="skill-filter-bar"><Input allowClear prefix={<SearchOutlined />} placeholder={format('pages.agent.skill.searchPlaceholder')} value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={reload} /><Select value={filterStatus} placeholder="全部交付状态" allowClear options={[{ label: '待发布草稿', value: 0 }, { label: format('pages.common.enabled'), value: 1 }, { label: format('pages.common.disabled'), value: 2 }]} onChange={(value) => changeFilter(() => setFilterStatus(value as 0 | 1 | 2 | undefined))} /><Select value={filterCategory} placeholder={format('pages.agent.skill.allCategories')} allowClear options={categoryOptions} onChange={(value) => changeFilter(() => setFilterCategory(value))} /></div>
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
    </PageContainer>
  )
}

export default SkillPage
