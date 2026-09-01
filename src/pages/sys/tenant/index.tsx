import React, { useRef, useState } from 'react'
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components'
import { Button, message, Modal, Form, Input } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { getTenantList, saveTenant, disableTenant, TenantRecord } from '@/services/sys/TenantController'

const TenantPage: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const [form] = Form.useForm<TenantRecord>()
  const [open, setOpen] = useState(false)
  const save = async () => {
    const value = await form.validateFields()
    const result = await saveTenant({ ...value, id: form.getFieldValue('id') })
    if (result?.code === 200) { message.success('保存成功'); setOpen(false); form.resetFields(); actionRef.current?.reload() }
  }
  return <PageContainer title="租户目录">
    <ProTable<TenantRecord> actionRef={actionRef} rowKey="id" request={async () => { const result = await getTenantList(); return { data: result.data || [], success: result.code === 200 } }} search={false}
      toolBarRender={() => [<Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增租户</Button>]}
      columns={[{ title: '编码', dataIndex: 'code' }, { title: '名称', dataIndex: 'name' }, { title: '状态', dataIndex: 'status', render: (_, record) => record.status === 1 ? '启用' : '停用' }, { title: '操作', valueType: 'option', render: (_, record) => [<Button key="edit" type="link" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setOpen(true) }}>编辑</Button>, <Button key="disable" type="link" disabled={record.status !== 1} onClick={async () => { const result = await disableTenant(record.id!); if (result?.code === 200) actionRef.current?.reload() }}>停用</Button>] }]} />
    <Modal open={open} title={form.getFieldValue('id') ? '编辑租户' : '新增租户'} onOk={save} onCancel={() => { setOpen(false); form.resetFields() }}><Form form={form} layout="vertical"><Form.Item name="id" hidden><Input /></Form.Item><Form.Item name="code" label="编码" rules={[{ required: true }]}><Input maxLength={64} /></Form.Item><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input maxLength={128} /></Form.Item></Form></Modal>
  </PageContainer>
}
export default TenantPage
