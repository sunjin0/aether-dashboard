import React, { useEffect, useRef, useState } from 'react'
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components'
import { Button, Form, Input, message, Modal, Select } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { getTenantList, getWorkspaceList, saveWorkspace, disableWorkspace, TenantRecord, WorkspaceRecord } from '@/services/sys/TenantController'

const WorkspacePage: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const [form] = Form.useForm<WorkspaceRecord>()
  const [tenants, setTenants] = useState<TenantRecord[]>([])
  const [tenantId, setTenantId] = useState<string>()
  const [open, setOpen] = useState(false)
  useEffect(() => { getTenantList().then((result) => { const items = result.data || []; setTenants(items); setTenantId(items.find((item) => item.status === 1)?.id) }) }, [])
  const save = async () => { const value = await form.validateFields(); const result = await saveWorkspace({ ...value, id: form.getFieldValue('id'), tenantId: tenantId! }); if (result?.code === 200) { message.success('保存成功'); setOpen(false); form.resetFields(); actionRef.current?.reload() } }
  const edit = (record: WorkspaceRecord) => { form.setFieldsValue(record); setOpen(true) }
  return <PageContainer title="工作空间目录" extra={<Select style={{ width: 220 }} value={tenantId} onChange={(value) => { setTenantId(value); actionRef.current?.reload() }} options={tenants.filter((item) => item.status === 1).map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }))} placeholder="选择租户" />}>
    <ProTable<WorkspaceRecord> actionRef={actionRef} rowKey="id" request={async () => { if (!tenantId) return { data: [], success: true }; const result = await getWorkspaceList(tenantId); return { data: result.data || [], success: result.code === 200 } }} search={false} toolBarRender={() => [<Button key="add" type="primary" icon={<PlusOutlined />} disabled={!tenantId} onClick={() => setOpen(true)}>新增工作空间</Button>]}
      columns={[{ title: '编码', dataIndex: 'code' }, { title: '名称', dataIndex: 'name' }, { title: '状态', dataIndex: 'status', render: (_, record) => record.status === 1 ? '启用' : '停用' }, { title: '操作', valueType: 'option', render: (_, record) => [<Button key="edit" type="link" icon={<EditOutlined />} onClick={() => edit(record)}>编辑</Button>, <Button key="disable" type="link" disabled={record.status !== 1} onClick={async () => { const result = await disableWorkspace(record.id!); if (result?.code === 200) actionRef.current?.reload() }}>停用</Button>] }]} />
    <Modal open={open} title={form.getFieldValue('id') ? '编辑工作空间' : '新增工作空间'} onOk={save} onCancel={() => { setOpen(false); form.resetFields() }}><Form form={form} layout="vertical"><Form.Item name="id" hidden><Input /></Form.Item><Form.Item name="code" label="编码" rules={[{ required: true }]}><Input maxLength={64} /></Form.Item><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input maxLength={128} /></Form.Item></Form></Modal>
  </PageContainer>
}
export default WorkspacePage
