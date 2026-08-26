import React, { useEffect, useRef, useState } from 'react'
import { PageContainer, ProTable, DrawerForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { Button, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import { AgentApplication, getAgentApplicationList } from '@/services/agent/AgentApplicationController'
import { AgentProductProfile, createAgentProductProfile, getAgentProductProfiles, publishAgentProductProfile, updateAgentProductProfile } from '@/services/agent/AgentProductProfileController'

const types = [{ label: '智能客服', value: 'CUSTOMER_SERVICE' }, { label: '智能问答', value: 'KNOWLEDGE_QA' }, { label: '业务助手', value: 'BUSINESS_ASSISTANT' }]
export default function AgentProductProfilePage() {
 const ref = useRef<any>(); const [open, setOpen] = useState(false); const [current, setCurrent] = useState<AgentProductProfile>(); const [apps, setApps] = useState<AgentApplication[]>([]); const [agents, setAgents] = useState<any[]>([])
 useEffect(() => { getAgentApplicationList({ current: 1, pageSize: 100 }).then(r => setApps(r.data || [])); getAgentDefinitionOptions(1).then(setAgents) }, [])
 const submit = async (value: any) => { const r = current ? await updateAgentProductProfile(current.id, value) : await createAgentProductProfile(value); if (r.code === 200) { setOpen(false); ref.current?.reload(); return true }; return false }
 return <PageContainer header={{ title: 'Agent 产品发布', subTitle: '以产品契约交付智能客服、智能问答与业务助手' }}>
  <ProTable<AgentProductProfile> actionRef={ref} rowKey="id" search={false} request={async () => { const r = await getAgentProductProfiles(); return { data: r.data || [], success: r.code === 200 } }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setOpen(true) }}>新建产品</Button>]}
   columns={[{ title: '名称', dataIndex: 'name' }, { title: '类型', dataIndex: 'productType', valueEnum: { CUSTOMER_SERVICE: '智能客服', KNOWLEDGE_QA: '智能问答', BUSINESS_ASSISTANT: '业务助手' } }, { title: '版本', dataIndex: 'versionNo', render: (_, r) => r.status === 1 ? <Tag color="green">已发布 v{r.versionNo}</Tag> : <Tag>草稿</Tag> }, { title: '操作', valueType: 'option', render: (_, r) => [<a key="edit" onClick={() => { setCurrent(r); setOpen(true) }}>编辑</a>, r.status !== 1 && <a key="publish" onClick={async () => { const result = await publishAgentProductProfile(r.id); if (result.code === 200) ref.current?.reload() }}>发布</a>] }]} />
  <DrawerForm open={open} onOpenChange={setOpen} width={620} title={current ? '编辑产品契约' : '新建产品契约'} initialValues={current} onFinish={submit}>
   <ProFormText name="name" label="产品名称" rules={[{ required: true }]} /><ProFormSelect name="productType" label="产品类型" options={types} rules={[{ required: true }]} />
   <ProFormSelect name="applicationId" label="业务应用空间" options={apps.map(a => ({ label: a.name, value: a.id }))} rules={[{ required: true }]} /><ProFormSelect name="agentDefinitionId" label="Agent" options={agents} rules={[{ required: true }]} />
   <ProFormTextArea name="inputSchema" label="输入 JSON Schema" fieldProps={{ rows: 5 }} rules={[{ required: true }]} /><ProFormTextArea name="outputSchema" label="输出 JSON Schema" fieldProps={{ rows: 5 }} rules={[{ required: true }]} />
   <ProFormTextArea name="knowledgePolicy" label="知识策略（问答）" /><ProFormTextArea name="handoffPolicy" label="转人工策略（客服）" /><ProFormTextArea name="approvalPolicy" label="审批策略（业务助手）" />
  </DrawerForm>
 </PageContainer>
}
