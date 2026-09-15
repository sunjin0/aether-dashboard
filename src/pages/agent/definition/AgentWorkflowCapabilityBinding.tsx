import React, { useEffect, useState } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Empty, Input, Modal, Row, Spin, Switch, Tabs, Tag, Tooltip, Typography } from 'antd'
import { useIntl } from '@umijs/max'
import {
  AgentWorkflowCapabilityBinding as Binding,
  bindWorkflowCapabilityToAgent,
  getAgentDefinitionInfo,
  getAgentWorkflowCapabilityBindingList,
  getAvailableAgentWorkflowCapabilities,
  unbindWorkflowCapabilityFromAgent,
  updateWorkflowCapabilityBindingStatus,
} from '@/services/agent/AgentDefinitionController'

interface Props { agentId: string; open: boolean; setOpen: (open: boolean) => void }
const pageSize = 12

const AgentWorkflowCapabilityBinding: React.FC<Props> = ({ agentId, open, setOpen }) => {
  const intl = useIntl()
  const text = (id: string) => intl.formatMessage({ id })
  const [tab, setTab] = useState('bound')
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deepAgent, setDeepAgent] = useState(false)
  const load = async (nextTab = tab) => {
    if (!agentId) return
    setLoading(true)
    try {
      const result = nextTab === 'bound'
        ? await getAgentWorkflowCapabilityBindingList(agentId, { current: 1, pageSize, keyword: keyword || undefined })
        : await getAvailableAgentWorkflowCapabilities(agentId, { current: 1, pageSize, keyword: keyword || undefined })
      if (result.code === 200) setItems(result.data || [])
    } finally { setLoading(false) }
  }
  useEffect(() => {
    if (!open || !agentId) return undefined
    let cancelled = false
    setDeepAgent(false)
    // Deep 智能体的运行时不接入工作流，这里只提示并挡掉新绑定。
    getAgentDefinitionInfo(agentId)
      .then(result => { if (!cancelled && result.code === 200) setDeepAgent(result.data?.executionMode === 'DEEP') })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [open, agentId])
  useEffect(() => { if (open) { setTab('bound'); setKeyword(''); load('bound') } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentId])
  useEffect(() => { if (open) load(tab) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])
  const bound = tab === 'bound'
  const toggle = async (item: any) => {
    if (bound) {
      if (item.capabilityId) { await unbindWorkflowCapabilityFromAgent(agentId, item.capabilityId); load() }
    } else if (item.id && !deepAgent) {
      await bindWorkflowCapabilityToAgent(agentId, { capabilityId: item.id, priority: 0, status: 1 }); load()
    }
  }
  return <Modal title={text('pages.agent.workflowCapability.binding.title')} open={open} onCancel={() => setOpen(false)} footer={null} width="min(980px, calc(100vw - 24px))" destroyOnClose>
    <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'bound', label: text('pages.agent.definition.boundItems') }, { key: 'available', label: text('pages.agent.definition.availableItems') }]} />
    {deepAgent && <Alert showIcon type="warning" style={{ marginBottom: 12 }} message={text('pages.agent.workflowCapability.binding.deepUnsupported.title')} description={text('pages.agent.workflowCapability.binding.deepUnsupported.description')} />}
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}><Input allowClear value={keyword} onChange={event => setKeyword(event.target.value)} onPressEnter={() => load()} placeholder={text('pages.agent.workflowCapability.binding.search')} /><Button type="primary" onClick={() => load()}>{text('pages.common.search')}</Button></div>
    <Spin spinning={loading}><Row gutter={[12, 12]}>{items.length ? items.map((item: any) => <Col xs={24} sm={12} lg={8} key={item.id || item.capabilityId}><Card size="small" title={<Typography.Text ellipsis={{ tooltip: item.displayName }}>{item.displayName || item.capabilityCode}</Typography.Text>} extra={item.riskLevel && <Tag color={item.riskLevel === 'HIGH' ? 'red' : item.riskLevel === 'MEDIUM' ? 'orange' : 'green'}>{text(`pages.agent.workflowCapability.risk.${item.riskLevel}`)}</Tag>}><Typography.Paragraph ellipsis={{ rows: 2 }}>{item.description || item.capabilityCode}</Typography.Paragraph><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{bound ? <><Switch size="small" checked={item.status === 1} disabled={deepAgent} onChange={status => item.capabilityId && updateWorkflowCapabilityBindingStatus(agentId, item.capabilityId, status ? 1 : 0).then(() => load())} /><Tooltip title={text('pages.common.delete')}><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => toggle(item)} /></Tooltip></> : <Button size="small" type="primary" icon={<PlusOutlined />} disabled={deepAgent} onClick={() => toggle(item)}>{text('pages.agent.skill.install')}</Button>}</div></Card></Col>) : <Col span={24}><Empty description={text(bound ? 'pages.agent.definition.noBoundItems' : 'pages.agent.definition.noAvailableItems')} /></Col>}</Row></Spin>
  </Modal>
}
export default AgentWorkflowCapabilityBinding
