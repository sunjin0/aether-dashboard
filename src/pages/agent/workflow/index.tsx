import React, { useRef, useState } from 'react'
import { history, useIntl } from '@umijs/max'
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components'
import { Button, Form, Input, Modal, Tag, message } from 'antd'
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons'
import {
  AgentWorkflow,
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  getWorkflowList,
  offlineWorkflow,
  publishWorkflow,
  updateWorkflow,
} from '@/services/agent/WorkflowController'
import TableActionMenu from '@/components/TableActionMenu'

const WorkflowPage: React.FC = () => {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values)
  const ref = useRef<ActionType>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AgentWorkflow>()
  const [form] = Form.useForm()
  const submit = async () => {
    const values = form.getFieldsValue()
    if (editing?.id) {
      const result = await updateWorkflow(editing.id, { ...editing, ...values })
      if (result.code === 200) {
        message.success(t('pages.agent.workflow.updated'))
        setOpen(false)
        setEditing(undefined)
        ref.current?.reload()
      } else message.error(result.message || t('pages.agent.workflow.operationFailed'))
      return
    }
    const result = await createWorkflow(values)
    if (result.code === 200 && result.data) {
      message.success('草稿已创建')
      setOpen(false)
      history.push(`/agent/workflow/${result.data}`)
    } else message.error(result.message || '创建失败')
  }
  const openCreate = () => {
    setEditing(undefined)
    form.resetFields()
    setOpen(true)
  }
  const openEdit = async (record: AgentWorkflow) => {
    if (!record.id) return
    const result = await getWorkflow(record.id)
    if (result.code !== 200 || !result.data) {
      message.error(result.message || t('pages.agent.workflow.operationFailed'))
      return
    }
    setEditing(result.data)
    form.setFieldsValue({ name: result.data.name, description: result.data.description })
    setOpen(true)
  }
  const action = async (record: AgentWorkflow, fn: (id: string) => Promise<any>, text: string) => {
    if (!record.id) return
    const result = await fn(record.id)
    if (result.code === 200) {
      message.success(text)
      ref.current?.reload()
    } else message.error(result.message || '操作失败')
  }
  return (
    <PageContainer header={{ title: t('pages.agent.workflow.title'), breadcrumb: undefined }}>
      <ProTable<AgentWorkflow>
        actionRef={ref}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        options={{ reload: true }}
        toolBarRender={() => [
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('pages.agent.workflow.new')}
          </Button>,
        ]}
        columns={[
          {
            title: t('pages.agent.workflow.name'),
            dataIndex: 'name',
            render: (_, r) => (
              <a onClick={() => history.push(`/agent/workflow/${r.id}`)}>{r.name}</a>
            ),
          },
          {
            title: t('pages.agent.workflow.description'),
            dataIndex: 'description',
            ellipsis: true,
            hideInSearch: true,
          },
          {
            title: t('pages.agent.workflow.status'),
            dataIndex: 'status',
            valueType: 'select',
            valueEnum: {
              0: t('pages.agent.workflow.status.draft'),
              1: t('pages.agent.workflow.status.published', { version: 1 }),
              2: t('pages.agent.workflow.status.offline'),
            },
            render: (_, r) => (
              <Tag color={r.status === 1 ? 'green' : r.status === 2 ? 'default' : 'orange'}>
                {r.status === 1
                  ? t('pages.agent.workflow.status.published', {
                    version: r.publishedVersion ?? '-',
                  })
                  : r.status === 2
                    ? t('pages.agent.workflow.status.offline')
                    : t('pages.agent.workflow.status.draft')}
              </Tag>
            ),
          },
          {
            title: t('pages.agent.workflow.action'),
            width: 300,
            fixed: 'right',
            valueType: 'option',
            render: (_, r) => (
              <TableActionMenu
                items={[
                  {
                    key: 'edit',
                    label: t('pages.common.edit'),
                    primary: true,
                    onClick: () => openEdit(r),
                  },
                  {
                    key: 'design',
                    label: t('pages.agent.workflow.action.edit'),
                    primary: true,
                    onClick: () => history.push(`/agent/workflow/${r.id}`),
                  },
                  {
                    key: 'start',
                    label: <><PlayCircleOutlined /> {t('pages.agent.workflow.action.start')}</>,
                    primary: true,
                    onClick: () => history.push(`/agent/workflow/${r.id}/run`),
                  },
                  {
                    key: 'publish',
                    label: t('pages.agent.workflow.action.publish'),
                    visible: r.status !== 1,
                    onClick: () => action(r, publishWorkflow, t('pages.agent.workflow.action.publish')),
                  },
                  {
                    key: 'offline',
                    label: t('pages.agent.workflow.action.offline'),
                    visible: r.status === 1,
                    onClick: () => action(r, offlineWorkflow, t('pages.agent.workflow.status.offline')),
                  },
                  {
                    key: 'delete',
                    label: t('pages.agent.workflow.action.delete'),
                    danger: true,
                    confirm: { title: t('pages.agent.workflow.deleteConfirm') },
                    onClick: () => action(r, deleteWorkflow, t('pages.agent.workflow.deleted')),
                  },
                ]}
              />
            ),
          },
        ]}
        request={(params) =>
          getWorkflowList({ ...params, current: params.current, pageSize: params.pageSize })
        }
      />
      <Modal
        open={open}
        title={editing ? t('pages.common.edit') : t('pages.agent.workflow.new')}
        onCancel={() => { setOpen(false); setEditing(undefined) }}
        onOk={submit}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('pages.agent.workflow.name')}
            rules={[{ required: true }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label={t('pages.agent.workflow.description')}>
            <Input.TextArea maxLength={512} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
export default WorkflowPage
