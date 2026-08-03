import React, { useRef, useState } from 'react'

import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, message } from 'antd'
import { useIntl } from '@umijs/max'
import RoleForm from '@/pages/sys/role/RoleForm'
import { PlusOutlined } from '@ant-design/icons'
import { FormattedMessage, history, useAccess } from '@@/exports'
import AuthorizationForm from '@/pages/sys/role/AuthorizationForm'
import { deleteRoleInfo, getRoleList } from '@/services/sys/RoleController'
import { RoleSearchParams } from '@/services/entity/Sys'
import TableActionMenu from '@/components/TableActionMenu'

const Role: React.FC = () => {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [authorizationOpen, setAuthorizationOpen] = useState(false)
  const [id, setId] = useState(undefined)
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'pages.common.name' }),
      dataIndex: 'name',
      valueType: 'text',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.description' }),
      dataIndex: 'description',
      valueType: 'text',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.createTime' }),
      dataIndex: 'createAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      width: 200,
      render: (_: any, record: any) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'edit',
                label: intl.formatMessage({ id: 'pages.common.edit' }),
                primary: true,
                onClick: () => {
                  setId(record.id)
                  setOpen(true)
                },
              },
              {
                key: 'auth',
                label: intl.formatMessage({ id: 'pages.sys.auth.role.resource' }),
                primary: true,
                onClick: () => {
                  setId(record.id)
                  setAuthorizationOpen(true)
                },
              },
              {
                key: 'delete',
                label: intl.formatMessage({ id: 'pages.common.delete' }),
                primary: true,
                danger: true,
                confirm: { title: intl.formatMessage({ id: 'pages.confirm.delete' }) },
                onClick: async () => {
                  try {
                    const { code } = await deleteRoleInfo(record)
                    if (code === 200) ref.current?.reload()
                  } catch {
                    // API failures are displayed by the global request handler.
                  }
                },
              },
            ]}
          />
        ),
    },
  ]
  return (
    <PageContainer>
      <ProTable
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
        actionRef={ref}
        request={async (params: RoleSearchParams) => getRoleList(params)}
        columns={columns}
        rowKey="id"
      />
      <RoleForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
        }}
      />
      <AuthorizationForm
        id={id}
        open={authorizationOpen}
        setOpen={(open) => {
          if (!open) setId(undefined)
          setAuthorizationOpen(open)
        }}
        onSuccess={() => {
          setId(undefined)
        }}
      />
    </PageContainer>
  )
}

export default Role
