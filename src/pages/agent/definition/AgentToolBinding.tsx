import React, { useEffect, useState } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Input, InputNumber, Modal, Pagination, Popconfirm, Row, Select, Spin, Switch, Tag, Tabs, Tooltip, Typography } from 'antd'
import { bindToolToAgent, getAgentToolBindingList, getAvailableAgentTools, unbindToolFromAgent, updateAgentToolBindingStatus, updateToolPriority } from '@/services/agent/AgentDefinitionController'
import { getOptionList } from '@/services/sys/DictController'
import { AgentTool, AgentToolBinding as AgentToolBindingEntity, AgentToolSearchParams } from '@/services/entity/Agent'
import { useIntl } from '@umijs/max'
import './binding.less'

interface Props { agentId: string; open: boolean; setOpen: (open: boolean) => void }
interface Option { label: string; value: string }
const pageSize = 12

const AgentToolBinding: React.FC<Props> = ({ agentId, open, setOpen }) => {
  const intl = useIntl()
  const format = (id: string) => intl.formatMessage({ id })
  const [tab, setTab] = useState('bound')
  const [items, setItems] = useState<(AgentToolBindingEntity | AgentTool)[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [queryField, setQueryField] = useState<'name' | 'code' | 'description'>('name')
  const [toolType, setToolType] = useState<string>()
  const [toolTypes, setToolTypes] = useState<Option[]>([])
  const typeName = (value?: string) => toolTypes.find((item) => item.value === value)?.label || value

  useEffect(() => {
    getOptionList('Agent_Tool_Business_Type').then((options) => setToolTypes(options.map((item) => ({ label: item.label, value: String(item.value) })))).catch(() => undefined)
  }, [])
  const load = async (page = current, filters = { keyword, toolType }) => {
    if (!agentId) return
    setLoading(true)
    try {
      const params: AgentToolSearchParams = { current: page, pageSize, toolType: filters.toolType, [queryField]: filters.keyword || undefined }
      const response = tab === 'bound'
        ? await getAgentToolBindingList(agentId, { current: page, pageSize, keyword: filters.keyword || undefined })
        : await getAvailableAgentTools(agentId, params)
      if (response.code === 200) { setItems(response.data || []); setTotal(response.total || 0) }
    } finally { setLoading(false) }
  }
  useEffect(() => { if (open) { setTab('bound'); setCurrent(1); setKeyword(''); setToolType(undefined) } }, [open, agentId])
  useEffect(() => { if (open) load(1) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, open])
  const search = () => { setCurrent(1); load(1) }
  const reset = () => { setKeyword(''); setToolType(undefined); setCurrent(1); load(1, { keyword: '', toolType: undefined }) }
  const install = async (tool: AgentTool) => {
    if (tool.id && (await bindToolToAgent(agentId, { toolId: tool.id, priority: 0, status: 1 })).code === 200) { setTab('bound'); setCurrent(1) }
  }
  const updatePriority = async (binding: AgentToolBindingEntity, priority: number | null) => {
    if (binding.toolId && priority !== null && priority !== binding.priority && (await updateToolPriority(agentId, binding.toolId, { priority })).code === 200) load()
  }
  const card = (item: AgentToolBindingEntity | AgentTool) => {
    const bound = tab === 'bound'
    const tool = item as AgentTool
    const binding = item as AgentToolBindingEntity
    const name = bound ? binding.toolName : tool.name
    const code = bound ? binding.toolCode : tool.code
    const description = bound ? binding.toolDescription : tool.description || tool.code
    return <Col xs={24} sm={12} lg={8} key={item.id}><Card size="small" className={`binding-card ${bound ? 'binding-card-bound' : 'binding-card-available'}`}>
      <div className="binding-card-header"><Typography.Text strong ellipsis={{ tooltip: name }}>{name}</Typography.Text>{bound && <Tag color={binding.status === 1 ? 'success' : 'default'}>{format(binding.status === 1 ? 'pages.common.enabled' : 'pages.common.disabled')}</Tag>}</div>
      <Typography.Paragraph ellipsis={{ rows: 2, tooltip: description }} type="secondary" className="binding-card-description">{description}</Typography.Paragraph>
      <div className="binding-card-meta"><Tag title={code}>{code}</Tag>{bound && binding.mcpServerName ? <Tooltip title={binding.mcpServerName}><Tag color="geekblue">MCP · {binding.mcpServerName}</Tag></Tooltip> : tool.toolType && <Tag color="blue">{typeName(tool.toolType)}</Tag>}</div>
      <div className="binding-card-actions">{bound ? <><div className="binding-state-control"><Switch size="small" checked={binding.status === 1} onChange={async (checked) => { if (binding.toolId && (await updateAgentToolBindingStatus(agentId, binding.toolId, { status: checked ? 1 : 0 })).code === 200) load() }} /><span>{format(binding.status === 1 ? 'pages.common.enabled' : 'pages.common.disabled')}</span><Typography.Text type="secondary">{format('pages.agent.tool.priority')}</Typography.Text><InputNumber size="small" min={0} max={999} defaultValue={binding.priority || 0} onPressEnter={(event) => updatePriority(binding, Number(event.currentTarget.value))} onBlur={(event) => updatePriority(binding, Number(event.target.value))} /></div><Popconfirm title={format('pages.agent.tool.unbindConfirm')} onConfirm={() => binding.toolId && unbindToolFromAgent(agentId, binding.toolId).then(() => load())}><Tooltip title={format('pages.common.delete')}><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm></> : <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => install(tool)}>{format('pages.agent.skill.install')}</Button>}</div>
    </Card></Col>
  }
  const empty = <Empty className="binding-empty" description={tab === 'bound' ? format('pages.agent.definition.noBoundTools') : format('pages.agent.definition.noAvailableItems')}><Button type="primary" onClick={() => tab === 'bound' ? setTab('available') : reset()}>{format(tab === 'bound' ? 'pages.agent.definition.availableItems' : 'pages.common.refresh')}</Button></Empty>
  return <Modal className="binding-modal" title={format('pages.agent.definition.toolBindingManagement')} open={open} onCancel={() => setOpen(false)} footer={null} width="min(980px, calc(100vw - 24px))" destroyOnClose>
    <Tabs activeKey={tab} onChange={(key) => { setTab(key); setCurrent(1) }} items={[{ key: 'bound', label: format('pages.agent.definition.boundItems') }, { key: 'available', label: format('pages.agent.definition.availableItems') }]} />
    <div className="binding-search"><div className="binding-query-group"><Select value={queryField} onChange={setQueryField} style={{ width: 110 }} options={[{ value: 'name', label: format('pages.common.name') }, { value: 'code', label: format('pages.common.code') }, { value: 'description', label: format('pages.common.description') }]} /><Input allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={search} placeholder={format(tab === 'bound' ? 'pages.agent.definition.searchBoundTools' : 'pages.agent.definition.searchAvailableTools')} /></div>{tab === 'available' && <Select className="binding-filter" allowClear value={toolType} onChange={setToolType} placeholder={format('pages.common.type')} options={toolTypes} />}<div className="binding-search-actions"><Button type="primary" onClick={search}>{format('pages.common.search')}</Button><Button onClick={reset}>{format('pages.common.refresh')}</Button></div></div>
    <div className="binding-list"><Spin spinning={loading}>{items.length ? <Row gutter={[12, 12]}>{items.map(card)}</Row> : empty}</Spin></div>
    {total > pageSize && <Pagination size="small" current={current} pageSize={pageSize} total={total} showSizeChanger={false} className="binding-pagination" onChange={(page) => { setCurrent(page); load(page) }} />}
  </Modal>
}
export default AgentToolBinding
