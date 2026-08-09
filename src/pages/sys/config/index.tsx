import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActionType, PageContainer, ProForm, ProFormDigit, ProFormText, ProFormTextArea, ProFormTreeSelect, ProTable } from '@ant-design/pro-components'
import { history, useAccess, useIntl } from '@@/exports'
import { Button, Form, message, Popconfirm, Space, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { Config } from '@/services/entity/Sys'
import DrawerForm from '@/components/DrawerForm'
import { addConfig, deleteConfig, getConfigInfo, getConfigTree, updateConfig } from '@/services/sys/ConfigController'

const { Text } = Typography
const CREATE_ID = '__new_config__'

const toParentTreeData = (items: Config[], excludedCodes: Set<string>, unnamed: string): DataNode[] =>
  items.filter((item) => !item.code || !excludedCodes.has(item.code)).map((item) => ({
    key: item.code || '', value: item.code || '', title: `${item.name || unnamed} (${item.code || '-'})`,
    children: toParentTreeData(item.children || [], excludedCodes, unnamed),
  }))

const descendants = (item?: Config, codes = new Set<string>()): Set<string> => {
  for (const child of item?.children || []) {
    if (child.code) codes.add(child.code)
    descendants(child, codes)
  }
  return codes
}

const countDescendants = (item?: Config): number =>
  (item?.children || []).reduce((total, child) => total + 1 + countDescendants(child), 0)

const ConfigPage: React.FC = () => {
  const [form] = Form.useForm<Config>()
  const [tree, setTree] = useState<Config[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Config>()
  const [createParent, setCreateParent] = useState<string>()
  const ref = useRef<ActionType>()
  const intl = useIntl()
  const format = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values)
  const permissionMap = useAccess()
  const write = permissionMap[history.location.pathname]
  const parentTree = useMemo(() => {
    const excluded = descendants(editing)
    if (editing?.code) excluded.add(editing.code)
    return toParentTreeData(tree, excluded, format('pages.sys.config.unnamed'))
  }, [tree, editing, intl])

  const reloadParentTree = async () => {
    const { data } = await getConfigTree()
    setTree(data || [])
  }

  useEffect(() => { reloadParentTree() }, [])

  const openCreate = (parent?: Config) => {
    setEditing(undefined)
    setCreateParent(parent?.code)
    setOpen(true)
  }

  const openEdit = (record: Config) => {
    setEditing(record)
    setCreateParent(undefined)
    setOpen(true)
  }

  const save = async (values: Config) => {
    const payload = { ...values, id: editing?.id, code: editing?.code || values.code?.trim() }
    const { code } = editing ? await updateConfig(payload) : await addConfig(payload)
    if (code === 200) {
      message.success(editing ? format('pages.sys.config.updateSuccess') : format('pages.sys.config.createSuccess'))
      await reloadParentTree()
      ref.current?.reload()
      return true
    }
    return false
  }

  const remove = async (record: Config) => {
    if (!record.id) return
    const { code } = await deleteConfig(record.id)
    if (code === 200) {
      message.success(format('pages.sys.config.deleteSuccess'))
      await reloadParentTree()
      ref.current?.reload()
    }
  }

  const columns: any[] = [
    { title: format('pages.sys.config.name'), dataIndex: 'name', width: 220, render: (value: string, record: Config) => <Space size={6}><span>{value}</span>{record.children?.length ? <Tag color="blue">{format('pages.sys.config.childCount', { count: record.children.length })}</Tag> : null}</Space> },
    { title: format('pages.sys.config.code'), dataIndex: 'code', width: 300, render: (value: string) => <Text code copyable>{value}</Text> },
    { title: format('pages.sys.config.value'), dataIndex: 'value', ellipsis: true, render: (value: string) => <Text ellipsis={{ tooltip: value }} style={{ maxWidth: 300 }}>{value}</Text> },
    { title: format('pages.sys.config.remark'), dataIndex: 'remark', ellipsis: true, render: (value: string) => <Text type="secondary" ellipsis={{ tooltip: value }} style={{ maxWidth: 260 }}>{value}</Text> },
    { title: format('pages.sys.config.sort'), dataIndex: 'sortNum', width: 80, align: 'center', hideInSearch: true },
    {
      title: format('pages.sys.config.actions'), key: 'option', width: 250, fixed: 'right', hideInSearch: true,
      render: (_: unknown, record: Config) => write && <Space>
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => openCreate(record)}>{format('pages.sys.config.newChild')}</Button>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>{format('pages.sys.config.edit')}</Button>
        <Popconfirm title={format('pages.sys.config.deleteTitle')} description={countDescendants(record) ? format('pages.sys.config.deleteWithChildren', { count: countDescendants(record) }) : format('pages.sys.config.deleteConfirm')} onConfirm={() => remove(record)} okButtonProps={{ danger: true }}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>{format('pages.sys.config.delete')}</Button>
        </Popconfirm>
      </Space>,
    },
  ]

  return <PageContainer>
    <ProTable<Config>
      rowKey="id"
      actionRef={ref}
      headerTitle={format('pages.sys.config.title')}
      request={async (params) => {
        const { data } = await getConfigTree(params as Partial<Config>)
        return { data: data || [], success: true }
      }}
      search={{ labelWidth: 'auto' }}
      pagination={false}
      columns={columns}
      expandable={{ defaultExpandAllRows: true, childrenColumnName: 'children' }}
      toolBarRender={() => [
        write && <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>{format('pages.sys.config.new')}</Button>,
      ]}
    />
    <DrawerForm
      id={editing?.id || CREATE_ID}
      open={open}
      setOpen={(visible) => { setOpen(visible); if (!visible) setEditing(undefined) }}
      form={form}
      request={async (id) => id === CREATE_ID
        ? { data: { parent: createParent, sortNum: 1, value: '', remark: '' }, success: true, code: 200 }
        : getConfigInfo(id)}
      onSuccess={save}
      drawerProps={{ title: editing ? format('pages.sys.config.editTitle') : format('pages.sys.config.createTitle')}}
    >
      <ProFormTreeSelect name="parent" label={format('pages.sys.config.parent')} placeholder={format('pages.sys.config.parentPlaceholder')} fieldProps={{ treeData: parentTree, treeDefaultExpandAll: true }} />
      <ProFormText name="code" label={format('pages.sys.config.code')} rules={[{ required: true, max: 255 }]} fieldProps={{ disabled: Boolean(editing) }} extra={format('pages.sys.config.codeHint')} />
      <ProFormText name="name" label={format('pages.sys.config.name')} rules={[{ required: true, max: 255 }]} />
      <ProFormTextArea name="value" label={format('pages.sys.config.value')} rules={[{ required: true, max: 255 }]} fieldProps={{ autoSize: { minRows: 3, maxRows: 8 }, maxLength: 255, showCount: true }} />
      <ProFormTextArea name="remark" label={format('pages.sys.config.remark')} rules={[{ required: true, max: 255 }]} fieldProps={{ autoSize: { minRows: 2, maxRows: 5 }, maxLength: 255, showCount: true }} />
      <ProFormDigit name="sortNum" label={format('pages.sys.config.sort')} min={0} fieldProps={{ precision: 0 }} />
    </DrawerForm>
  </PageContainer>
}

export default ConfigPage
