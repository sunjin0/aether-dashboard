import React, { useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports';
import AgentToolForm from '@/pages/agent/tool/AgentToolForm';
import AgentToolTestModal from '@/pages/agent/tool/AgentToolTestModal';
import {
  deleteAgentToolInfo,
  getAgentToolInfo,
  getAgentToolList,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';
import { getMcpServerList } from '@/services/agent/McpServerController';
import { getOptionList } from '@/services/sys/DictController';
import { AgentTool, AgentToolSearchParams } from '@/services/entity/Agent';

const AgentToolPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const [testToolId, setTestToolId] = useState<string>();
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const intl = useIntl();
  const path = history.location.pathname;
  const write = permissionMap[path];

  const handleDelete = async (record: AgentTool) => {
    if (!record.id) {
      message.error(intl.formatMessage({ id: 'pages.agent.tool.missingId' }));
      return;
    }

    const { code, message: msg } = await deleteAgentToolInfo(record.id);
    if (code === 200) {
      message.success(msg || intl.formatMessage({ id: 'pages.agent.tool.deleteSuccess' }));
      ref.current?.reload();
    } else {
      message.error(msg || intl.formatMessage({ id: 'pages.agent.tool.deleteFailed' }));
    }
  };

  const handleStatusChange = async (record: AgentTool) => {
    if (!record.id) {
      message.error(intl.formatMessage({ id: 'pages.agent.tool.missingId' }));
      return;
    }

    const nextStatus = record.status === 1 ? 0 : 1;
    const detail = await getAgentToolInfo(record.id);
    if (detail.code !== 200 || !detail.data) {
      message.error(
        detail.message || intl.formatMessage({ id: 'pages.agent.tool.getDetailFailed' }),
      );
      return;
    }

    const { code, message: msg } = await updateAgentToolInfo({
      ...detail.data,
      status: nextStatus,
    });
    if (code === 200) {
      message.success(msg || intl.formatMessage({ id: 'pages.agent.tool.operationSuccess' }));
      ref.current?.reload();
    } else {
      message.error(msg || intl.formatMessage({ id: 'pages.agent.tool.operationFailed' }));
    }
  };

  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.name' }),
      dataIndex: 'name',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.code' }),
      dataIndex: 'code',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.mcpServer' }),
      dataIndex: 'mcpServerId',
      valueType: 'select',
      request: async () => {
        const { code, data } = await getMcpServerList({ current: 1, pageSize: 1000 });
        return code === 200
          ? (data || []).map((item) => ({ label: item.name, value: item.id }))
          : [];
      },
    },
    // {
    //   title: intl.formatMessage({ id: 'pages.agent.tool.mcpServer' }),
    //   dataIndex: 'mcpServerName',
    //   valueType: 'text',
    //   hideInSearch: true,
    //   ellipsis: true,
    // },
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.mcpToolName' }),
      dataIndex: 'mcpToolName',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.agent.tool.mcpEndpoint' }),
      dataIndex: 'mcpBaseUrl',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.status' }),
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Status'),
    },
    {
      title: intl.formatMessage({ id: 'pages.common.createTime' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.updateTime' }),
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      width: 300,
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
            <FormattedMessage id="pages.agent.tool.edit" />
          </Button>,
          <Button
            type="link"
            key="test"
            disabled={!record.id}
            onClick={() => setTestToolId(record.id)}
          >
            <FormattedMessage id="pages.agent.tool.test" />
          </Button>,
          <Popconfirm
            key="status"
            title={intl.formatMessage(
              { id: 'pages.agent.tool.statusConfirm' },
              {
                action: intl.formatMessage({
                  id: record.status === 1 ? 'pages.agent.tool.disable' : 'pages.agent.tool.enable',
                }),
              },
            )}
            onConfirm={() => handleStatusChange(record)}
          >
            <Button type="link" key="status-button">
              <FormattedMessage
                id={record.status === 1 ? 'pages.agent.tool.disable' : 'pages.agent.tool.enable'}
              />
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="delete"
            title={intl.formatMessage({ id: 'pages.agent.tool.deleteConfirm' })}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" key="delete-button">
              <FormattedMessage id="pages.common.delete" />
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
        scroll={{ x: 1600 }}
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
      <AgentToolTestModal
        toolId={testToolId}
        open={Boolean(testToolId)}
        onClose={() => setTestToolId(undefined)}
      />
    </PageContainer>
  );
};

export default AgentToolPage;
