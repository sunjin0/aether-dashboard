import React, { useRef, useState } from 'react'

import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { request, useIntl } from '@umijs/max'
import { Button, message } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import MemberForm from '@/pages/user/member/MemberForm'
import { FormattedMessage } from '@@/plugin-locale'
import { PlusOutlined } from '@ant-design/icons'
import { history, useAccess } from '@@/exports'
import {
  getMemberList,
  deleteMemberInfo,
  MemberSearchParams,
} from '@/services/user/MemberController'
/**
 *
 *@description 页面
 *@since 2025-07-23 10:46:11
 */
const Member: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(undefined)
  const ref = useRef<ActionType>()
  const intl = useIntl()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any = [
    {
      title: intl.formatMessage({ id: 'pages.user.member.username' }),
      dataIndex: 'username',
      valueType: 'test',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.password' }),
      dataIndex: 'password',
      valueType: 'test',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.user.member.nickname' }),
      dataIndex: 'nickname',
      valueType: 'test',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.email' }),
      dataIndex: 'email',
      valueType: 'test',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.phone' }),
      dataIndex: 'phone',
      valueType: 'test',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 150,
      render: (_: any, record: Record<any, any>) =>
        write && (
          <TableActionMenu
            items={[
              { key: 'edit', label: intl.formatMessage({ id: 'pages.common.edit' }), primary: true, onClick: () => { setId(record.id); setOpen(true) } },
              { key: 'delete', label: intl.formatMessage({ id: 'pages.common.delete' }), danger: true, confirm: { title: intl.formatMessage({ id: 'pages.confirm.delete' }) }, onClick: async () => { await deleteMemberInfo(record); ref.current?.reload() } },
            ]}
          />
        ),
    },
  ]
  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        request={async (params) => getMemberList(params as MemberSearchParams)}
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
      />
      <MemberForm
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

export default Member
