import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Dropdown, Empty, Modal, Radio, Select, Spin, Table } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import {
  ServiceAccountUsage,
  ServiceAccountUsageItem,
  getServiceAccountUsage,
} from '@/services/sys/ServiceAccountController';
import './monitor.less';

const RANGE_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
];

type MetricKey = 'tokens' | 'calls';
type RankingType = 'accounts' | 'agents' | 'workflows';

const formatNumber = (value?: number) => (value || 0).toLocaleString();

const formatCompact = (value?: number) => {
  const numeric = value || 0;
  if (numeric >= 1000000000) return `${(numeric / 1000000000).toFixed(2)}B`;
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}K`;
  return numeric.toLocaleString();
};

const formatToken = (value?: number) => {
  const numeric = value || 0;
  if (numeric >= 1000000000) return `${(numeric / 1000000000).toFixed(2)}B`;
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(2)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(2)}K`;
  return numeric.toLocaleString();
};

const rankClassName = (index: number) => {
  if (index === 0) return 'rank-badge rank-badge-gold';
  if (index === 1) return 'rank-badge rank-badge-silver';
  if (index === 2) return 'rank-badge rank-badge-bronze';
  return 'rank-number';
};

const getNiceMax = (value: number) => {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
};

const formatDelta = (value?: number, formatter: (value?: number) => string = formatNumber) => {
  const numeric = value || 0;
  if (numeric > 0) return `+${formatter(numeric)}`;
  if (numeric < 0) return formatter(numeric);
  return '0';
};

const formatGrowth = (value?: number) => {
  const numeric = value || 0;
  if (numeric > 0) return `+${numeric.toFixed(2)}%`;
  if (numeric < 0) return `${numeric.toFixed(2)}%`;
  return '0.00%';
};

const ServiceAccountMonitorPage: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [rangeDays, setRangeDays] = useState(7);
  const [accountMetric, setAccountMetric] = useState<MetricKey>('tokens');
  const [rankingType, setRankingType] = useState<RankingType>();
  const [selectedItem, setSelectedItem] = useState<ServiceAccountUsageItem>();
  const [usage, setUsage] = useState<ServiceAccountUsage>();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);

  const load = async (days = rangeDays) => {
    setLoading(true);
    try {
      const result = await getServiceAccountUsage(days);
      if (result.code === 200) {
        setUsage(result.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(rangeDays);
  }, [rangeDays]);

  const sortedAccounts = useMemo(() => {
    return [...(usage?.accounts || [])].sort((left, right) => {
      return (right[accountMetric] || 0) - (left[accountMetric] || 0);
    });
  }, [accountMetric, usage]);

  const topAccounts = sortedAccounts.slice(0, 8);
  const topAgents = (usage?.agents || []).slice(0, 8);
  const topWorkflows = (usage?.workflows || []).slice(0, 8);
  const accountMax = Math.max(1, ...topAccounts.map((item) => item[accountMetric] || 0));
  const workflowMax = Math.max(1, ...topWorkflows.map((item) => item.calls || 0));
  const agentMax = getNiceMax(Math.max(1, ...topAgents.map((item) => item.calls || 0)));
  const agentTicks = [agentMax, agentMax * 0.8, agentMax * 0.6, agentMax * 0.4, agentMax * 0.2, 0];
  const rankingData = rankingType ? usage?.[rankingType] || [] : [];
  const rankingTitle =
    rankingType === 'accounts'
      ? '服务账号排行'
      : rankingType === 'agents'
        ? 'Agent 调用排行'
        : '工作流启动排行';

  const changeRange = (days: number) => {
    setRangeDays(days);
    load(days);
  };

  const openRanking = (type: RankingType) => {
    setRankingType(type);
  };

  const openItem = (item: ServiceAccountUsageItem) => {
    setSelectedItem(item);
  };

  const rangeMenuItems = RANGE_OPTIONS.map((option) => ({
    key: String(option.value),
    label: option.label,
    onClick: () => changeRange(option.value),
  }));

  const rankingColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 72,
      render: (_: unknown, __: ServiceAccountUsageItem, index: number) => index + 1,
    },
    {
      title: '名称',
      dataIndex: 'name',
      render: (value: string, record: ServiceAccountUsageItem) => value || record.id,
    },
    {
      title: '调用次数',
      dataIndex: 'calls',
      width: 120,
      render: (value: number) => formatNumber(value),
    },
    {
      title: 'Token 消耗',
      dataIndex: 'tokens',
      width: 120,
      render: (value: number) => formatToken(value),
    },
    {
      title: '占比',
      dataIndex: 'percent',
      width: 100,
      render: (value: number) => `${(value || 0).toFixed(2)}%`,
    },
  ];

  const kpis = [
    {
      label: '服务账号数',
      value: formatNumber(usage?.serviceAccountCount),
      compare: '较上周',
      delta: usage?.serviceAccountDelta,
      growthRate: usage?.serviceAccountGrowthRate,
      formatter: formatNumber,
      icon: <UsergroupAddOutlined />,
      tone: 'blue',
    },
    {
      label: '调用次数',
      value: formatNumber(usage?.totalCalls),
      compare: '较上周',
      delta: usage?.totalCallsDelta,
      growthRate: usage?.totalCallsGrowthRate,
      formatter: formatNumber,
      icon: <ThunderboltOutlined />,
      tone: 'green',
    },
    {
      label: 'Token 消耗',
      value: formatToken(usage?.totalTokens),
      compare: '较上周',
      delta: usage?.totalTokensDelta,
      growthRate: usage?.totalTokensGrowthRate,
      formatter: formatToken,
      icon: <DatabaseOutlined />,
      tone: 'purple',
    },
    {
      label: '近 24 小时调用',
      value: formatNumber(usage?.last24HoursCalls),
      compare: '较昨日',
      delta: usage?.last24HoursCallsDelta,
      growthRate: usage?.last24HoursCallsGrowthRate,
      formatter: formatNumber,
      icon: <ClockCircleOutlined />,
      tone: 'orange',
    },
  ];

  const renderAccountRows = () => {
    if (!topAccounts.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    return (
      <div className="usage-account-list">
        <div className="usage-list-head">
          <span>服务账号</span>
          <span>{accountMetric === 'tokens' ? 'Token 消耗' : '调用次数'}</span>
        </div>
        {topAccounts.map((item, index) => {
          const value = item[accountMetric] || 0;
          const width = `${Math.max(2, Math.round((value / accountMax) * 100))}%`;
          return (
            <button
              className="usage-account-row"
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
            >
              <div className="usage-account-name">
                <span className={rankClassName(index)}>{index + 1}</span>
                <span className="usage-row-title">{item.name || item.id}</span>
              </div>
              <div className="usage-inline-bar">
                <span style={{ width }} />
              </div>
              <div className="usage-row-value">
                {accountMetric === 'tokens' ? formatToken(item.tokens) : formatNumber(item.calls)}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderAgentChart = () => {
    if (!topAgents.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    return (
      <div className="usage-agent-chart">
        <div className="usage-axis-label">调用次数</div>
        <div className="usage-chart-body">
          <div className="usage-y-axis">
            {agentTicks.map((tick) => (
              <span key={tick}>{tick >= 1000 ? `${Math.round(tick / 1000)}K` : tick}</span>
            ))}
          </div>
          <div className="usage-chart-grid">
            {agentTicks.map((tick) => (
              <div className="usage-grid-line" key={tick} />
            ))}
            <div className="usage-bars">
              {topAgents.map((item) => {
                const height = `${Math.max(6, Math.round(((item.calls || 0) / agentMax) * 100))}%`;
                return (
                  <button
                    className="usage-bar-column"
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                  >
                    <span className="usage-bar-value">{formatCompact(item.calls)}</span>
                    <div className="usage-bar" style={{ height }} />
                    <span className="usage-bar-name">{item.name || item.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="usage-chart-legend">
          <span />
          调用次数
        </div>
      </div>
    );
  };

  const renderWorkflowRows = () => {
    if (!topWorkflows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    return (
      <div className="usage-workflow-table">
        <div className="usage-workflow-head">
          <span>排名</span>
          <span>工作流</span>
          <span>启动次数</span>
          <span>占比</span>
        </div>
        {topWorkflows.map((item, index) => {
          const width = `${Math.max(2, Math.round(((item.calls || 0) / workflowMax) * 100))}%`;
          return (
            <button
              className="usage-workflow-row"
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
            >
              <span className={rankClassName(index)}>{index + 1}</span>
              <div className="usage-workflow-name">
                <span>{item.name || item.id}</span>
                <div className="usage-workflow-bar">
                  <span style={{ width }} />
                </div>
              </div>
              <span>{formatNumber(item.calls)}</span>
              <span>{(item.percent || 0).toFixed(2)}%</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <PageContainer
      className="service-account-monitor"
      title={t('pages.serviceAccount.monitor') || '使用监控'}
      extra={[
        <Select
          key="range"
          className="usage-range-select"
          value={rangeDays}
          options={RANGE_OPTIONS}
          onChange={changeRange}
        />,
        <Dropdown key="calendar" menu={{ items: rangeMenuItems }} trigger={['click']}>
          <Button className="usage-calendar" icon={<CalendarOutlined />} />
        </Dropdown>,
        <Button
          key="refresh"
          className="usage-refresh"
          icon={<ReloadOutlined />}
          onClick={() => load()}
          loading={loading}
        />,
      ]}
    >
      <Spin spinning={loading}>
        <div className="usage-metric-grid">
          {kpis.map((item) => (
            <div className="usage-metric-card" key={item.label}>
              <div className={`usage-metric-icon usage-metric-${item.tone}`}>{item.icon}</div>
              <div className="usage-metric-content">
                <div className="usage-metric-label">
                  {item.label}
                  <InfoCircleOutlined />
                </div>
                <div className="usage-metric-value">{item.value}</div>
                <div className="usage-metric-trend">
                  <span>{item.compare}</span>
                  <b className={(item.delta || 0) < 0 ? 'usage-trend-down' : undefined}>
                    {formatDelta(item.delta, item.formatter)}
                  </b>
                  {(item.growthRate || 0) >= 0 && <RiseOutlined />}
                  <b className={(item.growthRate || 0) < 0 ? 'usage-trend-down' : undefined}>
                    {formatGrowth(item.growthRate)}
                  </b>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="usage-panel-grid">
          <section className="usage-panel usage-panel-account">
            <div className="usage-panel-head">
              <h3>
                服务账号排行
                <InfoCircleOutlined />
              </h3>
              <button
                type="button"
                className="usage-view-all"
                onClick={() => openRanking('accounts')}
              >
                查看全部
              </button>
            </div>
            <Radio.Group
              className="usage-rank-tabs"
              value={accountMetric}
              onChange={(event) => setAccountMetric(event.target.value)}
            >
              <Radio.Button value="tokens">Token 消耗</Radio.Button>
              <Radio.Button value="calls">调用次数</Radio.Button>
            </Radio.Group>
            {renderAccountRows()}
            {!!usage?.accountTotal && (
              <button
                type="button"
                className="usage-panel-footer"
                onClick={() => openRanking('accounts')}
              >
                查看全部 {usage.accountTotal} 项
              </button>
            )}
          </section>

          <section className="usage-panel usage-panel-agent">
            <div className="usage-panel-head">
              <h3>
                Agent 调用排行
                <InfoCircleOutlined />
              </h3>
              <button
                type="button"
                className="usage-view-all"
                onClick={() => openRanking('agents')}
              >
                查看全部
              </button>
            </div>
            {renderAgentChart()}
          </section>

          <section className="usage-panel usage-panel-workflow">
            <div className="usage-panel-head">
              <h3>
                工作流启动排行
                <InfoCircleOutlined />
              </h3>
              <button
                type="button"
                className="usage-view-all"
                onClick={() => openRanking('workflows')}
              >
                查看全部
              </button>
            </div>
            {renderWorkflowRows()}
            {!!usage?.workflowTotal && (
              <button
                type="button"
                className="usage-panel-footer"
                onClick={() => openRanking('workflows')}
              >
                查看全部 {usage.workflowTotal} 项
              </button>
            )}
          </section>
        </div>

        <div className="usage-info-bar">
          <InfoCircleOutlined />
          统计数据每小时更新一次，可能存在最多 60 分钟的延迟。
        </div>
      </Spin>
      <Modal
        title={rankingTitle}
        open={!!rankingType}
        width={820}
        footer={null}
        onCancel={() => setRankingType(undefined)}
        destroyOnClose
      >
        <Table<ServiceAccountUsageItem>
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          columns={rankingColumns}
          dataSource={rankingData}
          onRow={(record) => ({
            onClick: () => openItem(record),
          })}
        />
      </Modal>
      <Modal
        title={selectedItem?.name || selectedItem?.id}
        open={!!selectedItem}
        footer={null}
        onCancel={() => setSelectedItem(undefined)}
        destroyOnClose
      >
        <div className="usage-detail-grid">
          <span>ID</span>
          <b>{selectedItem?.id}</b>
          <span>调用次数</span>
          <b>{formatNumber(selectedItem?.calls)}</b>
          <span>Token 消耗</span>
          <b>{formatToken(selectedItem?.tokens)}</b>
          <span>占比</span>
          <b>{(selectedItem?.percent || 0).toFixed(2)}%</b>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default ServiceAccountMonitorPage;
