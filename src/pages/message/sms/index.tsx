import React, { useRef, useState } from 'react'

import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { request, useIntl, history } from '@umijs/max'
import { message, Tag } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import { useAccess } from '@@/exports'
import Model from '@/components/Model'
import { getOptionList } from '@/services/sys/DictController'
import { deleteSmsInfo, getSmsList } from '@/services/msg/SmsController'
import { SmsSearchParams } from '@/services/entity/Msg'

const Sms: React.FC = () => {
  const intl = useIntl()
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'pages.common.id' }),
      dataIndex: 'id',
      valueType: 'text',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.email' }),
      dataIndex: 'email',
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.type' }),
      dataIndex: 'type',
      valueType: 'select',
      request: async () => getOptionList('Message_Type'),
    },
    {
      title: intl.formatMessage({ id: 'pages.common.captcha' }),
      dataIndex: 'code',
      valueType: 'text',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.email.subject' }),
      dataIndex: 'subject',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.status' }),
      dataIndex: 'state',
      valueType: 'select',
      width: 80,
      render: (text: any, record: any, _: any, action: any) => {
        return (
          <Tag color={record.state === 1 ? 'gray' : 'green'}>
            {record.state === 1
              ? intl.formatMessage({ id: 'pages.common.unusable' })
              : intl.formatMessage({ id: 'pages.common.used' })}
          </Tag>
        )
      },
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.email.content' }),
      dataIndex: 'body',
      hideInTable: true,
    },

    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      fixed: 'right',
      render: (_: any, record: any, _a: any, action: any) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'preview',
                label: (
                  <Model
                    buttonText={intl.formatMessage({ id: 'pages.common.preview' })}
                    title={intl.formatMessage({ id: 'pages.email.content' })}
                    text={record.body}
                  />
                ),
                primary: true,
                onClick: () => {},
              },
              {
                key: 'delete',
                label: intl.formatMessage({ id: 'pages.common.delete' }),
                primary: true,
                danger: true,
                confirm: { title: intl.formatMessage({ id: 'pages.confirm.delete' }) },
                onClick: async () => {
                  const { code, message: msg } = await deleteSmsInfo(record)
                  if (code === 200) message.success(msg)
                  else message.error(msg)
                  action?.reload()
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
        actionRef={ref}
        rowKey={'user'}
        columns={columns}
        request={async (params: SmsSearchParams) => getSmsList(params)}
      />
    </PageContainer>
  )
}

export default Sms
