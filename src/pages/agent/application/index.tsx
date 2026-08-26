import React, { useRef, useState } from 'react'
import { PageContainer, ProTable, DrawerForm, ProFormText, ProFormTextArea, ProFormRadio, ProFormDigit } from '@ant-design/pro-components'
import { Button, Descriptions, Modal } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { AgentApplication, AgentApplicationUsage, createAgentApplication, getAgentApplicationList, getAgentApplicationUsage, updateAgentApplication } from '@/services/agent/AgentApplicationController'

export default function AgentApplicationPage() {
  const ref = useRef<any>(); const [open, setOpen] = useState(false); const [current, setCurrent] = useState<AgentApplication | undefined>(); const [usage, setUsage] = useState<AgentApplicationUsage>(); const [usageOpen, setUsageOpen] = useState(false)
  const submit = async (value: any) => { const result = current ? await updateAgentApplication(current.id, value) : await createAgentApplication(value); if (result.code === 200) { setOpen(false); ref.current?.reload(); return true }; return false }
  return <PageContainer header={{ title: '业务应用空间', subTitle: '隔离业务系统的 Agent、工作流、知识库与服务账号' }}>
    <ProTable<AgentApplication> actionRef={ref} rowKey="id" search={false} request={async () => { const r = await getAgentApplicationList({ current: 1, pageSize: 100 }); return { data: r.data || [], success: r.code === 200 } }}
      toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setOpen(true) }}>新建应用空间</Button>]}
      columns={[{ title: '编码', dataIndex: 'code' }, { title: '名称', dataIndex: 'name' }, { title: '说明', dataIndex: 'description', ellipsis: true }, { title: '应用配额', render: (_, r) => `Agent ${r.maxAgentCallsPerHour || 0}/h · 工作流 ${r.maxWorkflowStartsPerHour || 0}/h` }, { title: '状态', dataIndex: 'status', render: (_, r) => r.status === 1 ? '启用' : '停用' }, { title: '操作', valueType: 'option', render: (_, r) => [<a key="usage" onClick={async () => { const result = await getAgentApplicationUsage(r.id); if (result.code === 200) { setUsage(result.data); setUsageOpen(true) } }}>运行指标</a>, <a key="edit" onClick={() => { setCurrent(r); setOpen(true) }}>编辑</a>] }]} />
    <DrawerForm open={open} onOpenChange={setOpen} title={current ? '编辑应用空间' : '新建应用空间'} initialValues={current || { status: 1 }} onFinish={submit}>
      <ProFormText name="code" label="应用编码" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]{2,64}$/, message: '仅支持字母、数字、下划线和短横线' }]} />
      <ProFormText name="name" label="应用名称" rules={[{ required: true }]} /><ProFormTextArea name="description" label="说明" />
      <ProFormDigit name="maxAgentCallsPerHour" label="每小时 Agent 调用上限" min={0} max={100000} fieldProps={{ precision: 0 }} extra="0 表示不限制" />
      <ProFormDigit name="maxWorkflowStartsPerHour" label="每小时工作流启动上限" min={0} max={100000} fieldProps={{ precision: 0 }} extra="0 表示不限制" />
      <ProFormRadio name="status" label="状态" options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
    </DrawerForm>
    <Modal open={usageOpen} onCancel={() => setUsageOpen(false)} footer={null} title="应用空间运行指标"><Descriptions column={1} bordered items={[{ key: 'agent', label: 'Agent 运行', children: usage?.agentRuns || 0 }, { key: 'workflow', label: '工作流运行', children: usage?.workflowRuns || 0 }, { key: 'tokens', label: '累计 Token', children: usage?.totalTokens || 0 }, { key: 'callback', label: '回调失败', children: usage?.callbackFailed || 0 }]} /></Modal>
  </PageContainer>
}
