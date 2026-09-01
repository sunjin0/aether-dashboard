import React, { useEffect, useRef, useState } from 'react'
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components'
import { Button, Form, Input, message, Modal, Select } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { getTenantList, getWorkspaceList, getProjectList, getApplicationList, saveProject, disableProject, TenantRecord, WorkspaceRecord, ProjectRecord, ApplicationRecord } from '@/services/sys/TenantController'

const ProjectPage: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const [form] = Form.useForm<ProjectRecord>()
  const [tenants, setTenants] = useState<TenantRecord[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([])
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [tenantId, setTenantId] = useState<string>()
  const [workspaceId, setWorkspaceId] = useState<string>()
  const [open, setOpen] = useState(false)
  useEffect(() => { getTenantList().then((result) => { const items = (result.data || []).filter((item) => item.status === 1); setTenants(items); setTenantId(items[0]?.id) }); getApplicationList().then((result) => setApplications((result.data || []).filter((item) => item.status === 1))) }, [])
  useEffect(() => { if (!tenantId) return; getWorkspaceList(tenantId).then((result) => { const items = (result.data || []).filter((item) => item.status === 1); setWorkspaces(items); setWorkspaceId(items[0]?.id) }) }, [tenantId])
  const save = async () => { const value = await form.validateFields(); const result = await saveProject({ ...value, id: form.getFieldValue('id'), workspaceId: workspaceId! }); if (result?.code === 200) { message.success('保存成功'); setOpen(false); form.resetFields(); actionRef.current?.reload() } }
  const edit = (record: ProjectRecord) => { form.setFieldsValue(record); setOpen(true) }
  return <PageContainer title="项目目录" extra={<div style={{ display: 'flex', gap: 8 }}><Select style={{ width: 220 }} value={tenantId} onChange={(value) => { setTenantId(value); setWorkspaceId(undefined) }} options={tenants.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }))} placeholder="选择租户" /><Select style={{ width: 260 }} value={workspaceId} onChange={setWorkspaceId} options={workspaces.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }))} placeholder="选择工作空间" /></div>}>
    <ProTable<ProjectRecord> actionRef={actionRef} rowKey="id" request={async () => { if (!workspaceId) return { data: [], success: true }; const result = await getProjectList(workspaceId); return { data: result.data || [], success: result.code === 200 } }} search={false} toolBarRender={() => [<Button key="add" type="primary" icon={<PlusOutlined />} disabled={!workspaceId} onClick={() => setOpen(true)}>新增项目</Button>]}
      columns={[{ title: '编码', dataIndex: 'code' }, { title: '名称', dataIndex: 'name' }, { title: '应用', dataIndex: 'applicationId', render: (_, record) => applications.find((item) => item.id === record.applicationId)?.name || '未绑定' }, { title: '状态', dataIndex: 'status', render: (_, record) => record.status === 1 ? '启用' : '停用' }, { title: '操作', valueType: 'option', render: (_, record) => [<Button key="edit" type="link" icon={<EditOutlined />} onClick={() => edit(record)}>编辑</Button>, <Button key="disable" type="link" disabled={record.status !== 1} onClick={async () => { const result = await disableProject(record.id!); if (result?.code === 200) actionRef.current?.reload() }}>停用</Button>] }]} />
    <Modal open={open} title={form.getFieldValue('id') ? '编辑项目' : '新增项目'} onOk={save} onCancel={() => { setOpen(false); form.resetFields() }}><Form form={form} layout="vertical"><Form.Item name="id" hidden><Input /></Form.Item><Form.Item name="code" label="编码" rules={[{ required: true }]}><Input maxLength={64} /></Form.Item><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input maxLength={128} /></Form.Item><Form.Item name="applicationId" label="业务应用"><Select allowClear options={applications.map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }))} placeholder="可选" /></Form.Item></Form></Modal>
  </PageContainer>
}
export default ProjectPage
