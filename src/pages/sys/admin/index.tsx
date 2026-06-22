import React, {useRef, useState} from "react";

import {ActionType, PageContainer, ProTable} from "@ant-design/pro-components";
import {history, request, useIntl} from "@umijs/max";
import {Button, Image, message, Popconfirm} from "antd";
import AdminForm from "@/pages/sys/admin/AdminForm";
import {useAccess} from "@@/exports";
import {getOptionList} from "@/services/sys/DictController";
import {deleteAdminInfo, getAdminList, getRoleOptions} from "@/services/sys/AdminController";
import {AdminSearchParams} from "@/services/entity/Sys";
import {PlusOutlined} from "@ant-design/icons";
import {FormattedMessage} from "@@/plugin-locale";
const Admin: React.FC = () => {
  const intl = useIntl()
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(undefined);
  const ref = useRef<ActionType>()
  const permissionMap = useAccess();
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any[] = [
    {
      title: intl.formatMessage({id: 'pages.sys.role.name'}),
      dataIndex: 'roleIds',
      valueType: 'select',
      request: async () => getRoleOptions(),
      fieldProps: {
        mode: 'multiple'
      },
      hideInSearch: true,
      key: 'roleIds',
    },
    {
      title: intl.formatMessage({id: 'pages.common.name'}),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: intl.formatMessage({id: 'pages.common.gender'}),
      dataIndex: 'sex',
      valueType: 'select',
      request: async () => getOptionList("Gender_Type"),
      key: 'sex',
    },
    {
      title: intl.formatMessage({id: 'pages.common.avatar'}),
      dataIndex: 'avatar',
      render: (text: string) => <Image src={text} width={40} height={40} alt={""}/>,
      key: 'avatar',
      hideInSearch: true,

    },
    {
      title: intl.formatMessage({id: 'pages.common.type'}),
      dataIndex: 'type',
      valueType: 'select',
      request: async () =>getOptionList("System_Role"),
      key: 'type',
    },
    {
      title: intl.formatMessage({id: 'pages.common.email'}),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: intl.formatMessage({id: 'pages.common.phone'}),
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: intl.formatMessage({id: 'pages.common.option'}),
      dataIndex: 'option',
      key: 'option',
      valueType: 'option',
      render: (text: any, record: any, _: any, action: any) => write && [
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
            const {code, message: msg} = await deleteAdminInfo(record);
            if (code === 200) {
              message.success(msg)
            } else {
              message.error(msg)
            }
            action?.reload()
          }}
        >
          <Button type={'link'}
          >
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
        rowKey={'user'}
        toolBarRender={() => write&&[
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
  );
};

export default Admin;
