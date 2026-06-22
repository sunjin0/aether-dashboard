import React, {useRef, useState} from "react";

import {ActionType, PageContainer, ProTable} from "@ant-design/pro-components";
import {request, useIntl} from "@umijs/max";
import {Button, message, Popconfirm} from "antd";
import MemberForm from "@/pages/user/member/MemberForm";
import {FormattedMessage} from "@@/plugin-locale";
import {PlusOutlined} from "@ant-design/icons";
import {history, useAccess} from "@@/exports";
import {getMemberList,deleteMemberInfo,MemberSearchParams} from "@/services/user/MemberController";
/**
*
*@description 页面
*@since 2025-07-23 10:46:11
*/
const Member: React.FC = () => {
const [open, setOpen] = useState(false);
const [id, setId] = useState(undefined);
const ref = useRef<ActionType>()
    const intl = useIntl()
    const permissionMap = useAccess();
    const path = history.location.pathname
    const write = permissionMap[path]
    const columns: any = [

        {
        title: '用户名',
        dataIndex: 'username',
        valueType: 'test',
        ellipsis: true,
        },
        {
        title: '密码',
        dataIndex: 'password',
        valueType: 'test',
        ellipsis: true,
        },
        {
        title: '昵称',
        dataIndex: 'nickname',
        valueType: 'test',
        ellipsis: true,
        },
        {
        title: '邮箱',
        dataIndex: 'email',
        valueType: 'test',
        ellipsis: true,
        },
        {
        title: '手机号',
        dataIndex: 'phone',
        valueType: 'test',
        ellipsis: true,
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
     await deleteMemberInfo(record)
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
                actionRef={ref}
                request={async (params) => getMemberList(params as MemberSearchParams)}
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
    );
    };

    export default Member;
