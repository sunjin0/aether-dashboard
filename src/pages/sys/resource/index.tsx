import React, { useRef, useState } from 'react'

import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { useIntl } from '@umijs/max'
import { Button, message } from 'antd'
import TableActionMenu from '@/components/TableActionMenu'
import ResourceForm from '@/pages/sys/resource/ResourceForm'
import { FormattedMessage } from '@@/plugin-locale'
import { PlusOutlined } from '@ant-design/icons'
import { history, useAccess } from '@@/exports'
import { getOptionList } from '@/services/sys/DictController'
import { deleteResourceInfo, getResourceList } from '@/services/sys/ResourceController'
import { ResourceSearchParams } from '@/services/entity/Sys'

const Resource: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(undefined)
  const ref = useRef<ActionType>()
  const intl = useIntl()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any = [
    {
      title: intl.formatMessage({ id: 'pages.common.name.en' }),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.name.zh' }),
      dataIndex: 'nameCn',
      key: 'nameCn',
    },
    {
      title: intl.formatMessage({ id: 'pages.sys.resource.menu.path' }),
      dataIndex: 'path',
      width: 200,
      key: 'path',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.type' }),
      dataIndex: 'type',
      valueType: 'select',
      request: async () => {
        try {
          return await getOptionList('Resource_Type', false)
        } catch {
          return []
        }
      },
      key: 'type',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.description' }),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: intl.formatMessage({ id: 'pages.common.sort.number' }),
      dataIndex: 'sortNum',
      key: 'sortNum',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      key: 'option',
      // 固定
      fixed: 'right',
      render: (_: any, record: Record<any, any>, _a: any, action: any) =>
        write && (
          <TableActionMenu
            items={[
              { key: 'edit', label: intl.formatMessage({ id: 'pages.common.edit' }), primary: true, onClick: () => { setId(record.id); setOpen(true) } },
              { key: 'delete', label: intl.formatMessage({ id: 'pages.common.delete' }), danger: true, confirm: { title: intl.formatMessage({ id: 'pages.confirm.delete' }) }, onClick: async () => { const { code, message: msg } = await deleteResourceInfo(record); action?.reload(); if (code === 200) message.success(msg); else message.error(msg) } },
            ]}
          />
        ),
    },
  ]
  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: ResourceSearchParams) => {
          try {
            return await getResourceList(params)
          } catch {
            message.error(
              intl.formatMessage({ id: 'pages.common.load.failed', defaultMessage: '加载失败' }),
            )
            return { data: [], total: 0, success: false }
          }
        }}
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
      <ResourceForm
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

export default Resource
