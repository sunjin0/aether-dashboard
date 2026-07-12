import React, {useRef, useState} from 'react';
import {PageContainer, ProDescriptions, ProTable} from '@ant-design/pro-components';
import {Alert, Button, Card, Drawer, Empty, message, Spin, Tag, Typography} from 'antd';
import {
  getAgentToolCallLogInfo,
  getAgentToolCallLogList,
} from '@/services/agent/ToolCallLogController';
import {getOptionList} from '@/services/sys/DictController';
import {AgentToolCallLog, AgentToolCallLogSearchParams} from '@/services/entity/Agent';
import JsonDisplay from '@/components/JsonDisplay';
import MarkdownText from '@/components/MarkdownText';
import './index.less';

const {Text} = Typography;

const renderStatusTag = (status?: number) => {
  if (status === 0) {
    return <Tag color="success">成功</Tag>;
  }
  if (status === 1) {
    return <Tag color="error">失败</Tag>;
  }
  if (status === 2) {
    return <Tag color="warning">超时</Tag>;
  }
  if (status === 3) {
    return <Tag color="purple">安全拦截</Tag>;
  }
  return <Tag>未知</Tag>;
};

const AgentToolCallLogPage: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toolCallLog, setToolCallLog] = useState<AgentToolCallLog>();
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequestRef = useRef(0);

  const normalizeSearchParams = (
    params: Omit<AgentToolCallLogSearchParams, 'status'> & {status?: number | string | null},
  ): AgentToolCallLogSearchParams => {
    const {status, ...restParams} = params;
    if (status === undefined || status === null || status === '') {
      return restParams;
    }

    return {
      ...restParams,
      status: Number(status) as 0 | 1 | 2 | 3,
    };
  };

  const openDetail = async (record: AgentToolCallLog) => {
    if (!record.id) {
      message.error('缺少工具调用日志 ID');
      return;
    }

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setToolCallLog(undefined);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const {code, data, message: msg} = await getAgentToolCallLogInfo(record.id);
      if (detailRequestRef.current !== requestId) {
        return;
      }
      if (code === 200) {
        setToolCallLog(data);
      } else {
        setToolCallLog(undefined);
        message.error(msg || '加载工具调用日志详情失败');
      }
    } catch {
      if (detailRequestRef.current === requestId) {
        setToolCallLog(undefined);
        message.error('加载工具调用日志详情失败');
      }
    } finally {
      if (detailRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const columns: any[] = [
    {
      title: '运行记录 ID',
      dataIndex: 'runId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '工具 ID',
      dataIndex: 'toolId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: 'Agent 定义 ID',
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '请求方法',
      dataIndex: 'requestMethod',
      valueType: 'select',
      request: async () => getOptionList('Agent_Http_Method'),
      width: 110,
    },
    {
      title: 'HTTP 状态码',
      dataIndex: 'responseStatus',
      valueType: 'digit',
      hideInSearch: true,
      width: 120,
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_ToolCall_Status'),
      render: (_: any, record: AgentToolCallLog) => renderStatusTag(record.status),
      width: 120,
    },
    {
      title: '耗时(ms)',
      dataIndex: 'latencyMs',
      valueType: 'digit',
      hideInSearch: true,
      width: 110,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentToolCallLog) => [
        <Button type="link" key="detail" onClick={() => openDetail(record)}>
          查看详情
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer>
      <Alert
        className="agent-tool-call-log-page-note"
        type="info"
        showIcon={true}
        message="工具调用日志依赖 V0.5 工具调用闭环，当前环境可能暂无真实数据。"
      />
      <ProTable
        rowKey="id"
        request={async (params: AgentToolCallLogSearchParams) => {
          try {
            return await getAgentToolCallLogList(normalizeSearchParams(params));
          } catch {
            message.error('加载工具调用日志列表失败');
            return {data: [], total: 0, success: false};
          }
        }}
        columns={columns}
        scroll={{x: 1200}}
      />
      <Drawer
        title="工具调用日志详情"
        width={820}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {toolCallLog ? (
            <>
              <ProDescriptions
                column={1}
                dataSource={toolCallLog}
                columns={[
                  {title: 'ID', dataIndex: 'id'},
                  {title: '运行记录 ID', dataIndex: 'runId'},
                  {title: '工具 ID', dataIndex: 'toolId'},
                  {title: 'Agent 定义 ID', dataIndex: 'agentDefinitionId'},
                  {title: '请求方法', dataIndex: 'requestMethod'},
                  {title: '请求 URL', dataIndex: 'requestUrl'},
                  {title: 'HTTP 状态码', dataIndex: 'responseStatus'},
                  {
                    title: '执行状态',
                    dataIndex: 'status',
                    render: (_: any, record: AgentToolCallLog) => renderStatusTag(record.status),
                  },
                  {title: '耗时(ms)', dataIndex: 'latencyMs'},
                  {title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime'},
                  {title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime'},
                ]}
              />
              <Card title="请求头" size="small" style={{marginTop: 16}} className="agent-tool-call-log-card">
                <JsonDisplay content={toolCallLog.requestHeaders} />
              </Card>
              <Card title="请求体" size="small" style={{marginTop: 16}} className="agent-tool-call-log-card">
                <JsonDisplay content={toolCallLog.requestBody} />
              </Card>
              <Card title="响应体" size="small" style={{marginTop: 16}} className="agent-tool-call-log-card">
                <JsonDisplay content={toolCallLog.responseBody} />
              </Card>
              <Card title="错误信息" size="small" style={{marginTop: 16}} className="agent-tool-call-log-card">
                {toolCallLog.errorMsg ? (
                  <MarkdownText content={toolCallLog.errorMsg} error={true} />
                ) : (
                  <Text type="secondary">暂无错误信息</Text>
                )}
              </Card>
            </>
          ) : (
            <Empty description="暂无工具调用日志详情" />
          )}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default AgentToolCallLogPage;
