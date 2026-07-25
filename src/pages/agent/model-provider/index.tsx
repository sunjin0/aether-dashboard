import React, { useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { Button, message } from 'antd'
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports'
import ModelProviderForm from '@/pages/agent/model-provider/ModelProviderForm'
import {
  deleteModelProviderInfo,
  getModelProviderList,
  updateModelProviderStatus,
} from '@/services/agent/ModelProviderController'
import { getOptionList } from '@/services/sys/DictController'
import { ModelProvider, ModelProviderSearchParams } from '@/services/entity/Agent'
import TableActionMenu from '@/components/TableActionMenu'

const ModelProviderPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | undefined>(undefined)
  const ref = useRef<ActionType>()
  const permissionMap = useAccess()
  const path = history.location.pathname
  const write = permissionMap[path]
  const intl = useIntl()
  const format = (id: string, values?: Record<string, string>) =>
    intl.formatMessage({ id }, values)

  const handleDelete = async (record: ModelProvider) => {
    if (!record.id) {
      message.error(format('pages.agent.modelProvider.missingId'))
      return
    }

    const { code, message: msg } = await deleteModelProviderInfo(record.id)
    if (code === 200) {
      message.success(msg || format('pages.agent.modelProvider.deleteSuccess'))
      ref.current?.reload()
    } else {
      message.error(msg || format('pages.agent.modelProvider.deleteFailed'))
    }
  }

  const handleStatusChange = async (record: ModelProvider) => {
    if (!record.id) {
      message.error(format('pages.agent.modelProvider.missingId'))
      return
    }

    const nextStatus = record.status === 1 ? 0 : 1
    const { code, message: msg } = await updateModelProviderStatus(record.id, {
      status: nextStatus,
    })
    if (code === 200) {
      message.success(msg || format('pages.agent.modelProvider.operationSuccess'))
      ref.current?.reload()
    } else {
      message.error(msg || format('pages.agent.modelProvider.operationFailed'))
    }
  }

  const columns: any[] = [
    {
      title: format('pages.agent.modelProvider.name'),
      dataIndex: 'name',
      valueType: 'select',
      request: async () => getOptionList('Model_Provider_Name'),
      ellipsis: true,
    },
    {
      title: format('pages.agent.modelProvider.type'),
      dataIndex: 'type',
      valueType: 'select',
      request: async () => getOptionList('Model_Provider_Type'),
    },
    {
      title: format('pages.agent.modelProvider.apiBaseUrl'),
      dataIndex: 'apiBaseUrl',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.agent.modelProvider.defaultModel'),
      dataIndex: 'defaultModel',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: format('pages.common.status'),
      key: 'modelProviderStatus',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Status'),
    },
    {
      title: format('pages.common.sort.number'),
      dataIndex: 'sort',
      valueType: 'digit',
      hideInSearch: true,
    },
    // {
    //   title: '备注',
    //   dataIndex: 'remark',
    //   valueType: 'text',
    //   ellipsis: true,
    //   hideInSearch: true,
    // },
    {
      title: format('pages.common.createTime'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: format('pages.common.option'),
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 200,
      render: (_: any, record: ModelProvider) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'edit',
                label: format('pages.common.edit'),
                primary: true,
                onClick: () => {
                  setId(record.id)
                  setOpen(true)
                },
              },
              {
                key: 'status',
                label:
                  record.status === 1
                    ? format('pages.common.disabled')
                    : format('pages.common.enabled'),
                primary: true,
                confirm: { title: format('pages.agent.modelProvider.statusConfirm') },
                onClick: () => handleStatusChange(record),
              },
              {
                key: 'delete',
                label: format('pages.common.delete'),
                primary: true,
                danger: true,
                confirm: { title: format('pages.agent.modelProvider.deleteConfirm') },
                onClick: () => handleDelete(record),
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
        rowKey="id"
        request={async (params: ModelProviderSearchParams) =>
          getModelProviderList(params as ModelProviderSearchParams)
        }
        search={{
          labelWidth: 120,
          span: 6,
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
      <ModelProviderForm
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

export default ModelProviderPage
