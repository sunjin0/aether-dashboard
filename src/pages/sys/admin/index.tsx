import React, { useRef, useState } from 'react'

import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { history, request, useIntl } from '@umijs/max'
import { Button, message } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import FileImage from '@/components/FileImage'
import AdminForm from '@/pages/sys/admin/AdminForm'
import { useAccess } from '@@/exports'
import { getOptionList } from '@/services/sys/DictController'
import { deleteAdminInfo, getAdminList, getRoleOptions } from '@/services/sys/AdminController'
import { AdminSearchParams } from '@/services/entity/Sys'
import { PlusOutlined } from '@ant-design/icons'
import { FormattedMessage } from '@@/plugin-locale'
const Admin: React.FC = () => {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(undefined)
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'pages.sys.role.name' }),
      dataIndex: 'roleIds',
      valueType: 'select',
      request: async () => getRoleOptions(),
      fieldProps: {
        mode: 'multiple',
      },
      hideInSearch: true,
      key: 'roleIds',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.name' }),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.gender' }),
      dataIndex: 'sex',
      valueType: 'select',
      request: async () => getOptionList('Gender_Type', false),
      key: 'sex',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.avatar' }),
      dataIndex: 'avatar',
      render: (avatar: string) => (
        <FileImage value={avatar} width={40} height={40} alt={intl.formatMessage({ id: 'pages.common.avatar' })} preview />
      ),
      key: 'avatar',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.type' }),
      dataIndex: 'type',
      valueType: 'select',
      request: async () => getOptionList('System_Role', false),
      key: 'type',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.email' }),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.phone' }),
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      dataIndex: 'option',
      key: 'option',
      width: 200,
      fixed: 'right',
      valueType: 'option',
      render: (_: any, record: any, _a: any, action: any) =>
        write && (
          <TableActionMenu
            items={[
              { key: 'edit', label: intl.formatMessage({ id: 'pages.common.edit' }), primary: true, onClick: () => { setId(record.id); setOpen(true) } },
              { key: 'delete', label: intl.formatMessage({ id: 'pages.common.delete' }), primary: true, danger: true, confirm: { title: intl.formatMessage({ id: 'pages.confirm.delete' }) }, onClick: async () => { const { code, message: msg } = await deleteAdminInfo(record); if (code === 200) message.success(msg); else message.error(msg); action?.reload() } },
            ]}
          />
        ),
    },
  ]
  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey={'user'}
        toolBarRender={() =>
          write && [
            <Button
              key="button"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined)
                setOpen(true)
              }}
            >
              <FormattedMessage id="pages.common.new" />
            </Button>,
          ]
        }
        columns={columns}
        request={async (params: AdminSearchParams) => getAdminList(params)}
      />
      <AdminForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
        }}
      />
    </PageContainer>
  )
}

export default Admin
