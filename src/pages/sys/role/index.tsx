import React, {useRef, useState} from "react";

import {ActionType, PageContainer, ProTable} from "@ant-design/pro-components";
import {Button, message, Popconfirm} from "antd";
import {useIntl} from "@umijs/max";
import RoleForm from "@/pages/sys/role/RoleForm";
import {PlusOutlined} from "@ant-design/icons";
import {FormattedMessage, history, useAccess} from "@@/exports";
import AuthorizationForm from "@/pages/sys/role/AuthorizationForm";
import {deleteRoleInfo, getRoleList} from "@/services/sys/RoleController";
import {RoleSearchParams} from "@/services/entity/Sys";

const Role: React.FC = () => {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [authorizationOpen, setAuthorizationOpen] = useState(false)
  const [id, setId] = useState(undefined)
  const ref = useRef<ActionType>()
  const permissionMap = useAccess();
  const path = history.location.pathname
  const write = permissionMap[path]
  const columns: any[] = [
    {
      title: intl.formatMessage({id: 'pages.common.name'}),
      dataIndex: 'name',
      valueType: 'text',
    },
    {
      title: intl.formatMessage({id: 'pages.common.description'}),
      dataIndex: 'description',
      valueType: 'text',
    },
    {
      title: intl.formatMessage({id: 'pages.common.createTime'}),
      dataIndex: 'createAt',
      valueType: 'dateTime',
      hideInSearch: true
    },
    {
      title: intl.formatMessage({id: 'pages.common.option'}),
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_: any, record: any) => write && [
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
        <Button
          type={'link'}
          key="auth"
          onClick={() => {
            setId(record.id)
            setAuthorizationOpen(true)
          }}
        >
          {intl.formatMessage({id: 'pages.sys.auth.role.resource'})}
        </Button>,
        <Popconfirm
          key={'delete'}
          title={intl.formatMessage({id: 'pages.confirm.delete'})}
          onConfirm={async () => {
            const {code, message: msg} = await deleteRoleInfo(record);
            if (code === 200) {
              message.success(msg)
            } else {
              message.error(msg)
            }
            ref.current?.reload()
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
        toolBarRender={() => write && [
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
        }}/>
      <AuthorizationForm
        id={id}
        open={authorizationOpen}
        setOpen={(open) => {
          if (!open)
            setId(undefined)
          setAuthorizationOpen(open)
        }}
        onSuccess={() => {
          setId(undefined)
        }}/>
    </PageContainer>
  );
};

export default Role;
