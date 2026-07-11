import React, {useEffect, useRef, useState} from 'react';
import {ActionType, PageContainer, ProDescriptions, ProTable} from '@ant-design/pro-components';
import {Alert, Button, Card, DatePicker, Drawer, Empty, message, Spin, Statistic, Tag, Typography} from 'antd';
import {getAgentRunInfo, getAgentRunList, getAgentRunStatistics} from '@/services/agent/RunController';
import {AgentRun, AgentRunSearchParams, AgentRunStatistics} from '@/services/entity/Agent';
import JsonDisplay from '@/components/JsonDisplay';
import MarkdownText from '@/components/MarkdownText';
import './index.less';

const {Text} = Typography;

const statusValueEnum = {
  0: {text: '成功', status: 'Success'},
  1: {text: '失败', status: 'Error'},
  2: {text: '超时', status: 'Warning'},
};

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
  return <Tag>未知</Tag>;
};

const {RangePicker} = DatePicker;

const AgentRunPage: React.FC = () => {
  const ref = useRef<ActionType>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [run, setRun] = useState<AgentRun>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [statistics, setStatistics] = useState<AgentRunStatistics>();
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const loadStatistics = async () => {
    setStatisticsLoading(true);
    try {
      const params: any = {};
      if (dateRange) {
        params.startTime = dateRange[0]?.valueOf();
        params.endTime = dateRange[1]?.valueOf();
      }
      const {code, data, message: msg} = await getAgentRunStatistics(params);
      if (code === 200) {
        setStatistics(data);
      } else {
        message.error(msg || '加载统计信息失败');
      }
    } finally {
      setStatisticsLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  const openDetail = async (record: AgentRun) => {
    if (!record.id) {
      message.error('缺少运行记录 ID');
      return;
    }

    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const {code, data, message: msg} = await getAgentRunInfo(record.id);
      if (code === 200) {
        setRun(data);
      } else {
        setRun(undefined);
        message.error(msg || '加载运行记录详情失败');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: any[] = [
    {
      title: 'Agent 定义 ID',
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '会话 ID',
      dataIndex: 'conversationId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '输出消息 ID',
      dataIndex: 'messageId',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '模型',
      dataIndex: 'model',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      render: (_: any, record: AgentRun) => renderStatusTag(record.status),
    },
    {
      title: '总 Token',
      dataIndex: 'totalTokens',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '耗时(ms)',
      dataIndex: 'latencyMs',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '时间范围',
      dataIndex: 'dateRange',
      valueType: 'dateRange',
      hideInTable: true,
      renderFormItem: () => <RangePicker />,
      fieldProps: {
        style: {width: '100%'},
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentRun) => [
        <Button type="link" key="detail" onClick={() => openDetail(record)}>
          查看详情
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer>
      <Alert
        className="agent-run-page-note"
        type="info"
        showIcon={true}
        message="运行记录为只读审计数据；统计接口已接入真实数据。"
      />
      <Card title="运行统计" style={{marginBottom: 16}}>
        <Spin spinning={statisticsLoading}>
          {statistics ? (
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 16}}>
              <Statistic title="总调用次数" value={statistics.totalCalls || 0} />
              <Statistic title="成功次数" value={statistics.successCalls || 0} valueStyle={{color: '#3f8600'}} />
              <Statistic title="失败次数" value={statistics.failedCalls || 0} valueStyle={{color: '#cf1322'}} />
              <Statistic title="超时次数" value={statistics.timeoutCalls || 0} valueStyle={{color: '#d4b106'}} />
              <Statistic title="总 Token" value={statistics.totalTokens || 0} />
              <Statistic title="平均耗时(ms)" value={statistics.avgLatencyMs || 0} />
              <Statistic title="错误率" value={statistics.errorRate ? `${(statistics.errorRate * 100).toFixed(2)}%` : '0%'} />
            </div>
          ) : (
            <Empty description="暂无统计数据" />
          )}
        </Spin>
      </Card>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: AgentRunSearchParams) => {
          const {dateRange, ...rest} = params as any;
          const queryParams: AgentRunSearchParams = {...rest};
          if (dateRange) {
            queryParams.startTime = dateRange[0]?.valueOf();
            queryParams.endTime = dateRange[1]?.valueOf();
          }
          return getAgentRunList(queryParams);
        }}
        columns={columns}
      />
      <Drawer
        title="运行记录详情"
        width={760}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {run ? (
            <>
              <ProDescriptions
                column={1}
                dataSource={run}
                columns={[
                  {title: 'ID', dataIndex: 'id'},
                  {title: 'Agent 定义 ID', dataIndex: 'agentDefinitionId'},
                  {title: '用户 ID', dataIndex: 'userId'},
                  {title: '会话 ID', dataIndex: 'conversationId'},
                  {title: '输出消息 ID', dataIndex: 'messageId'},
                  {title: '模型供应商 ID', dataIndex: 'modelProviderId'},
                  {title: '模型', dataIndex: 'model'},
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: (_: any, record: AgentRun) => renderStatusTag(record.status),
                  },
                  {title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime'},
                  {title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime'},
                ]}
              />
              <Card title="Token 与耗时" size="small" style={{marginTop: 16}}>
                <ProDescriptions
                  column={2}
                  dataSource={run}
                  columns={[
                    {title: '输入 Token', dataIndex: 'promptTokens'},
                    {title: '输出 Token', dataIndex: 'completionTokens'},
                    {title: '总 Token', dataIndex: 'totalTokens'},
                    {title: '总耗时(ms)', dataIndex: 'latencyMs'},
                  ]}
                />
              </Card>
              <Card title="输入内容摘要" size="small" style={{marginTop: 16}} className="agent-run-card">
                <JsonDisplay content={run.inputContent} />
              </Card>
              <Card title="输出内容摘要" size="small" style={{marginTop: 16}} className="agent-run-card">
                <JsonDisplay content={run.outputContent} />
              </Card>
              <Card title="错误信息" size="small" style={{marginTop: 16}} className="agent-run-card">
                {run.errorMsg ? (
                  <MarkdownText content={run.errorMsg} error={true} />
                ) : (
                  <Text type="secondary">暂无错误信息</Text>
                )}
              </Card>
            </>
          ) : (
            <Empty description="暂无运行记录详情" />
          )}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default AgentRunPage;
