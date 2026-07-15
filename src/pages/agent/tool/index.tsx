import React, { useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Card, Col, message, Popconfirm, Row, Spin, Statistic, Tag } from 'antd';
import { FormattedMessage, history, useAccess, useIntl } from '@@/exports';
import AgentToolForm from '@/pages/agent/tool/AgentToolForm';
import AgentToolTestModal from '@/pages/agent/tool/AgentToolTestModal';
import {
  deleteAgentToolInfo,
  getAgentToolInfo,
  getAgentToolList,
  getAgentToolStatistics,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';
import { getMcpServerList } from '@/services/agent/McpServerController';
import { getOptionList } from '@/services/sys/DictController';
import { AgentTool, AgentToolSearchParams, AgentToolStatistics } from '@/services/entity/Agent';

const toolTypeOptions = [
  { label: '信息库', value: 'knowledge' },
  { label: '运维', value: 'ops' },
  { label: '开发', value: 'dev' },
  { label: '通用', value: 'general' },
];

const toolTypeValueEnum = toolTypeOptions.reduce<Record<string, { text: string }>>(
  (valueEnum, item) => ({
    ...valueEnum,
    [item.value]: { text: item.label },
  }),
  {},
);

const formatRate = (value?: number) => `${(value ?? 0).toFixed(2)}%`;

const AgentToolPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const [testToolId, setTestToolId] = useState<string>();
  const [statistics, setStatistics] = useState<AgentToolStatistics>();
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const intl = useIntl();
  const path = history.location.pathname;
  const write = permissionMap[path];

  const loadStatistics = async (params: AgentToolSearchParams) => {
    setStatisticsLoading(true);
    try {
      const { code, data, message: msg } = await getAgentToolStatistics({
        toolType: params.toolType,
        mcpServerId: params.mcpServerId,
      });
      if (code === 200) {
        setStatistics(data);
      } else {
        setStatistics(undefined);
        message.error(msg || '加载工具统计失败');
      }
    } finally {
      setStatisticsLoading(false);
    }
  };

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
    // {
    //   title: intl.formatMessage({ id: 'pages.agent.tool.code' }),
    //   dataIndex: 'code',
    //   valueType: 'text',
    //   ellipsis: true,
    // },
    {
      title: '业务类型',
      dataIndex: 'toolType',
      valueType: 'select',
      valueEnum: toolTypeValueEnum,
      render: (_: any, record: AgentTool) => {
        const label =
          toolTypeOptions.find((item) => item.value === record.toolType)?.label || record.toolType;
        return label ? <Tag color="blue">{label}</Tag> : '-';
      },
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
      render: (_: any, record: AgentTool) => record.mcpServerName || record.mcpServerId || '-',
    },
    // {
    //   title: intl.formatMessage({ id: 'pages.agent.tool.mcpServer' }),
    //   dataIndex: 'mcpServerName',
    //   valueType: 'text',
    //   hideInSearch: true,
    //   ellipsis: true,
    // },
    // {
    //   title: intl.formatMessage({ id: 'pages.agent.tool.mcpToolName' }),
    //   dataIndex: 'mcpToolName',
    //   valueType: 'text',
    //   ellipsis: true,
    // },
    // {
    //   title: intl.formatMessage({ id: 'pages.agent.tool.mcpEndpoint' }),
    //   dataIndex: 'mcpBaseUrl',
    //   valueType: 'text',
    //   ellipsis: true,
    //   hideInSearch: true,
    // },
    {
      title: intl.formatMessage({ id: 'pages.common.status' }),
      key: 'toolStatus',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Status'),
    },
    {
      title: '调用次数',
      dataIndex: 'callCount',
      valueType: 'digit',
      hideInSearch: true,
      render: (_: any, record: AgentTool) => record.callCount ?? 0,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      valueType: 'digit',
      hideInSearch: true,
      render: (_: any, record: AgentTool) => formatRate(record.successRate),
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
      <Card style={{ marginBottom: 16 }}>
        <Spin spinning={statisticsLoading}>
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={12} md={6}>
              <Statistic title="工具总数" value={statistics?.totalCount ?? 0} />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic
                title="启用工具"
                value={statistics?.enabledCount ?? 0}
                valueStyle={{ color: '#3f8600' }}
                suffix={` / 禁用 ${statistics?.disabledCount ?? 0}`}
              />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic title="调用次数" value={statistics?.callCount ?? 0} />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic
                title="成功率"
                value={formatRate(statistics?.successRate)}
                valueStyle={{ color: '#1677ff' }}
              />
            </Col>
          </Row>
        </Spin>
      </Card>
      <ProTable
        actionRef={ref}
        rowKey="id"
        scroll={{ x: 1200 }}
        request={async (params: AgentToolSearchParams) => {
          const [listResult] = await Promise.all([getAgentToolList(params), loadStatistics(params)]);
          return listResult;
        }}
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
