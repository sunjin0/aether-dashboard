import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components'
import { Button, Form, Input, Modal, Select, Space, Switch, Tag, message } from 'antd'
import React, { useRef, useState } from 'react'
import { getApplicationList, ApplicationRecord } from '@/services/agent/AgentApplicationController'
import { deleteSolution, getSolutionInstallations, getSolutionList, installSolution, rollbackSolution, saveSolution, SolutionInstallation, SolutionRecord, uninstallSolution } from '@/services/agent/SolutionController'

const SolutionPage: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const [editing, setEditing] = useState<SolutionRecord>()
  const [installing, setInstalling] = useState<SolutionRecord>()
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [installations, setInstallations] = useState<SolutionInstallation[]>([])
  const [selectedApplication, setSelectedApplication] = useState<string>()
  const [form] = Form.useForm()

  const columns: ProColumns<SolutionRecord>[] = [
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '版本', dataIndex: 'version' },
    { title: '状态', dataIndex: 'status', render: (_, row) => <Tag color={row.status === 1 ? 'green' : 'default'}>{row.status === 1 ? '启用' : '停用'}</Tag> },
    { title: '操作', valueType: 'option', render: (_, row) => <Space>
      <a onClick={() => { setInstalling(row); setSelectedApplication(undefined); setInstallations([]); getApplicationList().then(r => setApplications(r.data || [])) }}>安装</a>
      <Switch size="small" checked={row.status === 1} checkedChildren="启用" unCheckedChildren="停用" onChange={async checked => { await saveSolution({ id: row.id, status: checked ? 1 : 0 }); message.success(checked ? '已启用' : '已停用'); actionRef.current?.reload() }} />
      <a onClick={() => { setEditing(row); form.setFieldsValue(row) }}>编辑</a>
      <Button type="link" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: '确认删除此 Solution？', onOk: async () => { await deleteSolution(row.id); message.success('已删除'); actionRef.current?.reload() } })} />
    </Space> },
  ]

  return <PageContainer>
    <ProTable<SolutionRecord> rowKey="id" actionRef={actionRef} columns={columns} request={async params => { const r = await getSolutionList(params); return { data: r.data || [], total: r.total } }}
      toolBarRender={() => [<Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing({ status: 1 } as SolutionRecord); form.resetFields() }}>新建 Solution</Button>]} />
    <Modal title={editing?.id ? '编辑 Solution' : '新建 Solution'} open={!!editing} onCancel={() => setEditing(undefined)} onOk={async () => { await saveSolution({ ...editing, ...await form.validateFields() }); message.success('保存成功'); setEditing(undefined); actionRef.current?.reload() }}>
      <Form form={form} layout="vertical"><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="code" label="编码" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="version" label="版本" rules={[{ required: true }]}><Input placeholder="1.0.0" /></Form.Item><Form.Item name="manifestJson" label="Manifest JSON"><Input.TextArea rows={5} /></Form.Item></Form>
    </Modal>
    <Modal title={`安装：${installing?.name || ''}`} open={!!installing} onCancel={() => setInstalling(undefined)} footer={null}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select style={{ width: '100%' }} placeholder="选择目标 Application" value={selectedApplication} options={applications.filter(a => a.status === 1).map(a => ({ label: `${a.name} (${a.code})`, value: a.id }))} onChange={async id => { setSelectedApplication(id); const r = await getSolutionInstallations(id, true); setInstallations(r.data || []) }} />
        {selectedApplication && <Space wrap><Button type="primary" onClick={async () => { await installSolution(installing!.id, selectedApplication); message.success('安装成功'); const r = await getSolutionInstallations(selectedApplication, true); setInstallations(r.data || []) }}>安装/升级</Button><Button danger onClick={async () => { await uninstallSolution(installing!.id, selectedApplication); message.success('已卸载'); const r = await getSolutionInstallations(selectedApplication, true); setInstallations(r.data || []) }}>卸载</Button></Space>}
        {installations.map(item => <Space key={item.id}><span>{item.solutionVersion}</span><Tag color={item.status === 1 ? 'green' : 'default'}>{item.status === 1 ? '当前版本' : '历史版本'}</Tag>{item.status !== 1 && <Button type="link" onClick={async () => { await rollbackSolution(item.id); message.success('已回滚'); const r = await getSolutionInstallations(selectedApplication!, true); setInstallations(r.data || []) }}>回滚</Button>}</Space>)}
      </Space>
    </Modal>
  </PageContainer>
}
export default SolutionPage
