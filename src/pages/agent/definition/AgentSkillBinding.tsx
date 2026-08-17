import React, { useEffect, useState } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Input, Modal, Pagination, Popconfirm, Row, Select, Spin, Switch, Tabs, Tag, Tooltip, Typography } from 'antd'
import { getAgentSkillBindingList, getAvailableAgentSkills, getSkillVersions, installSkillToAgent, uninstallSkillFromAgent, updateSkillBinding } from '@/services/agent/SkillController'
import { getOptionList } from '@/services/sys/DictController'
import { AgentDefinitionSkillBinding, AgentSkill, AgentSkillVersion } from '@/services/entity/Agent'
import { useIntl } from '@umijs/max'
import './binding.less'

interface Props { agentId: string; open: boolean; setOpen: (open: boolean) => void }
interface Option { label: string; value: string }
const pageSize = 12

const AgentSkillBinding: React.FC<Props> = ({ agentId, open, setOpen }) => {
  const intl = useIntl()
  const format = (id: string) => intl.formatMessage({ id })
  const [tab, setTab] = useState('bound')
  const [items, setItems] = useState<(AgentDefinitionSkillBinding | AgentSkill)[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [field, setField] = useState<'name' | 'code' | 'description'>('name')
  const [category, setCategory] = useState<string>()
  const [categories, setCategories] = useState<Option[]>([])
  const categoryName = (value?: string) => categories.find((item) => item.value === value)?.label || value || format('pages.agent.skill.uncategorized')

  useEffect(() => { getOptionList('Agent_Skill_Category').then((options) => setCategories(options.map((item) => ({ label: item.label, value: String(item.value) })))).catch(() => undefined) }, [])
  const load = async (page = current, filters = { keyword, category }) => {
    if (!agentId) return
    setLoading(true)
    try {
      const response = tab === 'bound'
        ? await getAgentSkillBindingList(agentId, { current: page, pageSize, keyword: filters.keyword || undefined })
        : await getAvailableAgentSkills(agentId, { current: page, pageSize, category: filters.category, [field]: filters.keyword || undefined })
      if (response.code === 200) { setItems(response.data || []); setTotal(response.total || 0) }
    } finally { setLoading(false) }
  }
  useEffect(() => { if (open) { setTab('bound'); setCurrent(1); setKeyword(''); setCategory(undefined) } }, [open, agentId])
  useEffect(() => { if (open) load(1) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, open])
  const search = () => { setCurrent(1); load(1) }
  const reset = () => { setKeyword(''); setCategory(undefined); setCurrent(1); load(1, { keyword: '', category: undefined }) }
  const install = async (skill: AgentSkill) => {
    if (!skill.id) return
    const versions = await getSkillVersions(skill.id)
    const version = (versions.data || []).filter((item: AgentSkillVersion) => item.status === 1).sort((a, b) => (b.versionNo || 0) - (a.versionNo || 0))[0]
    if (version?.id && (await installSkillToAgent(agentId, { skillVersionId: version.id, priority: 0, status: 1 })).code === 200) { setTab('bound'); setCurrent(1) }
  }
  const card = (item: AgentDefinitionSkillBinding | AgentSkill) => {
    const bound = tab === 'bound'
    const binding = item as AgentDefinitionSkillBinding
    const skill = item as AgentSkill
    const name = bound ? binding.skillName : skill.name
    const description = bound ? binding.skillDescription : skill.description || skill.code
    const code = bound ? binding.skillCode : skill.code
    return <Col xs={24} sm={12} lg={8} key={item.id}><Card size="small" className={`binding-card ${bound ? 'binding-card-bound' : 'binding-card-available'}`}>
      <div className="binding-card-header"><Typography.Text strong ellipsis={{ tooltip: name }}>{name}</Typography.Text>{bound && <Tag color={binding.status === 1 ? 'success' : 'default'}>{format(binding.status === 1 ? 'pages.common.enabled' : 'pages.common.disabled')}</Tag>}</div>
      <Typography.Paragraph ellipsis={{ rows: 2, tooltip: description }} type="secondary" className="binding-card-description">{description}</Typography.Paragraph>
      <div className="binding-card-meta"><Tag title={code}>{code}</Tag><Tag color="purple">{categoryName(bound ? binding.category : skill.category)}</Tag>{bound && <Tag>v{binding.versionNo || '?'}</Tag>}</div>
      <div className="binding-card-actions">{bound ? <><div className="binding-state-control"><Switch size="small" checked={binding.status === 1} onChange={(checked) => binding.id && updateSkillBinding(agentId, binding.id, { status: checked ? 1 : 0 }).then(() => load())} /><span>{format(binding.status === 1 ? 'pages.common.enabled' : 'pages.common.disabled')}</span></div><Popconfirm title={format('pages.agent.skill.uninstallConfirm')} onConfirm={() => binding.id && uninstallSkillFromAgent(agentId, binding.id).then(() => load())}><Tooltip title={format('pages.common.delete')}><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm></> : <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => install(skill)}>{format('pages.agent.skill.install')}</Button>}</div>
    </Card></Col>
  }
  const empty = <Empty className="binding-empty" description={tab === 'bound' ? format('pages.agent.definition.noBoundSkills') : format('pages.agent.definition.noAvailableItems')}><Button type="primary" onClick={() => tab === 'bound' ? setTab('available') : reset()}>{format(tab === 'bound' ? 'pages.agent.definition.availableItems' : 'pages.common.refresh')}</Button></Empty>
  return <Modal className="binding-modal" title={format('pages.agent.skill.manage')} open={open} onCancel={() => setOpen(false)} footer={null} width="min(980px, calc(100vw - 24px))" destroyOnClose>
    <Tabs activeKey={tab} onChange={(key) => { setTab(key); setCurrent(1) }} items={[{ key: 'bound', label: format('pages.agent.definition.boundItems') }, { key: 'available', label: format('pages.agent.definition.availableItems') }]} />
    <div className="binding-search"><div className="binding-query-group"><Select value={field} onChange={setField} style={{ width: 110 }} options={[{ value: 'name', label: format('pages.common.name') }, { value: 'code', label: format('pages.common.code') }, { value: 'description', label: format('pages.common.description') }]} /><Input allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={search} placeholder={format(tab === 'bound' ? 'pages.agent.definition.searchBoundSkills' : 'pages.agent.definition.searchAvailableSkills')} /></div>{tab === 'available' && <Select className="binding-filter" allowClear value={category} onChange={setCategory} placeholder={format('pages.agent.skill.category')} options={categories} />}<div className="binding-search-actions"><Button type="primary" onClick={search}>{format('pages.common.search')}</Button><Button onClick={reset}>{format('pages.common.refresh')}</Button></div></div>
    <div className="binding-list"><Spin spinning={loading}>{items.length ? <Row gutter={[12, 12]}>{items.map(card)}</Row> : empty}</Spin></div>
    {total > pageSize && <Pagination size="small" current={current} pageSize={pageSize} total={total} showSizeChanger={false} className="binding-pagination" onChange={(page) => { setCurrent(page); load(page) }} />}
  </Modal>
}
export default AgentSkillBinding
