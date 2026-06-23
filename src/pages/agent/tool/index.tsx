import React, {useRef, useState} from 'react';
import {PlusOutlined} from '@ant-design/icons';
import {ActionType, PageContainer, ProTable} from '@ant-design/pro-components';
import {Button, message, Popconfirm} from 'antd';
import {FormattedMessage, history, useAccess} from '@@/exports';
import AgentToolForm from '@/pages/agent/tool/AgentToolForm';
import {
  deleteAgentToolInfo,
  getAgentToolInfo,
  getAgentToolList,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';
import {AgentTool, AgentToolSearchParams} from '@/services/entity/Agent';

const typeValueEnum = {
  http: {text: 'HTTP'},
};

const httpMethodValueEnum = {
  GET: {text: 'GET'},
  POST: {text: 'POST'},
};

const statusValueEnum = {
  0: {text: '禁用', status: 'Default'},
  1: {text: '启用', status: 'Success'},
};

const AgentToolPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const path = history.location.pathname;
  const write = permissionMap[path];

  const handleDelete = async (record: AgentTool) => {
    if (!record.id) {
      message.error('缺少工具 ID');
      return;
    }

    const {code, message: msg} = await deleteAgentToolInfo(record.id);
    if (code === 200) {
      message.success(msg || '删除成功');
      ref.current?.reload();
    } else {
      message.error(msg || '删除失败');
    }
  };

  const handleStatusChange = async (record: AgentTool) => {
    if (!record.id) {
      message.error('缺少工具 ID');
      return;
    }

    const nextStatus = record.status === 1 ? 0 : 1;
    const detail = await getAgentToolInfo(record.id);
    if (detail.code !== 200 || !detail.data) {
      message.error(detail.message || '获取工具详情失败');
      return;
    }

    const {code, message: msg} = await updateAgentToolInfo({
      ...detail.data,
      status: nextStatus,
    });
    if (code === 200) {
      message.success(msg || '操作成功');
      ref.current?.reload();
    } else {
      message.error(msg || '操作失败');
    }
  };

  const columns: any[] = [
    {
      title: '工具名称',
      dataIndex: 'name',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '工具编码',
      dataIndex: 'code',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '工具类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: typeValueEnum,
    },
    {
      title: 'HTTP 方法',
      dataIndex: 'httpMethod',
      valueType: 'select',
      valueEnum: httpMethodValueEnum,
    },
    {
      title: 'HTTP URL',
      dataIndex: 'httpUrl',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '超时时间(ms)',
      dataIndex: 'timeoutMs',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentTool) =>
        write && [
          <Button
            type="link"
            key="edit"
            onClick={() => {
              setId(record.id);
              setOpen(true);
            }}
          >
            编辑
          </Button>,
          <Popconfirm
            key="status"
            title={`确认${record.status === 1 ? '禁用' : '启用'}该工具？`}
            onConfirm={() => handleStatusChange(record)}
          >
            <Button type="link" key="status-button">
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>,
          <Popconfirm key="delete" title="确认删除该工具？" onConfirm={() => handleDelete(record)}>
            <Button type="link" key="delete-button">
              删除
            </Button>
          </Popconfirm>,
        ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: AgentToolSearchParams) => getAgentToolList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="button"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined);
                setOpen(true);
              }}
            >
              <FormattedMessage id="pages.common.new" />
            </Button>,
          ]
        }
        columns={columns}
      />
      <AgentToolForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined);
          ref.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default AgentToolPage;
