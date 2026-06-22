import React, {useRef, useState} from "react";

import {ActionType, PageContainer, ProTable} from "@ant-design/pro-components";
import {request, useIntl} from "@umijs/max";
import {Button, message, Popconfirm} from "antd";
import ResourceForm from "@/pages/sys/resource/ResourceForm";
import {FormattedMessage} from "@@/plugin-locale";
import {PlusOutlined} from "@ant-design/icons";
import {history, useAccess} from "@@/exports";
import {getOptionList} from "@/services/sys/DictController";
import {deleteResourceInfo, getResourceList} from "@/services/sys/ResourceController";
import {ResourceSearchParams} from "@/services/entity/Sys";

const Resource: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(undefined);
  const ref = useRef<ActionType>()
  const intl = useIntl()
  const permissionMap = useAccess();
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any = [

    {
      title: intl.formatMessage({id: 'pages.common.name.en'}),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: intl.formatMessage({id: 'pages.common.name.zh'}),
      dataIndex: 'nameCn',
      key: 'nameCn',
    },
    {
      title: intl.formatMessage({id: 'pages.sys.resource.menu.path'}),
      dataIndex: 'path',
      width: 200,
      key: 'path',
    },
    {
      title: intl.formatMessage({id: 'pages.common.type'}),
      dataIndex: 'type',
      valueType: 'select',
      request: async () => getOptionList("Resource_Type"),
      key: 'type',
    },
    {
      title: intl.formatMessage({id: 'pages.common.description'}),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: intl.formatMessage({id: 'pages.common.sort.number'}),
      dataIndex: 'sortNum',
      key: 'sortNum',
      hideInSearch: true,
    },
    {

      title: intl.formatMessage({id: 'pages.common.option'}),
      valueType: 'option',
      key: 'option',
      // 固定
      fixed: 'right',
      render: (text: any, record: Record<any, any>, _: any, action: any) =>write&& [
        <Button
          type={'link'}
          key="editable"
          onClick={() => {
            setId(record.id)
            setOpen(true)
          }}
        >
          {intl.formatMessage({id: 'pages.common.edit'})}
        </Button>,
        <Popconfirm
          key={'delete'}
          title={intl.formatMessage({id: 'pages.confirm.delete'})}
          onConfirm={async () => {
            const {code, message: msg} = await deleteResourceInfo(record);
            action?.reload()
            if (code === 200) {
              message.success(msg)
            } else {
              message.error(msg)
            }
          }}
        >
          <Button type={'link'}
                  key={'delete'}>
            {intl.formatMessage({id: 'pages.common.delete'})}
          </Button>
        </Popconfirm>
      ],
    }
  ]
  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        request={async (params:ResourceSearchParams) => getResourceList(params)}
        toolBarRender={() =>write&& [
          <Button
            key="button"
            icon={<PlusOutlined/>}
            type="primary"
            onClick={() => {
              setId(undefined)
              setOpen(true)
            }}
          >
            <FormattedMessage id="pages.common.new"/>
          </Button>,
        ]}
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
  );
};

export default Resource;
