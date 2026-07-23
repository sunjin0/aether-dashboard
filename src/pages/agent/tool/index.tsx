import React, { useEffect, useRef, useState } from 'react';
import {
  ApiOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  CodeOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Input, message, Progress, Select, Spin, Switch, Tag } from 'antd';
import { history, useAccess, useIntl } from '@@/exports';
import AgentToolForm from '@/pages/agent/tool/AgentToolForm';
import AgentToolTestModal from '@/pages/agent/tool/AgentToolTestModal';
import {
  deleteAgentToolInfo,
  getAgentToolFacets,
  getAgentToolInfo,
  getAgentToolList,
  getAgentToolStatistics,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';
import {
  AgentTool,
  AgentToolFacets,
  AgentToolSearchParams,
  AgentToolStatistics,
} from '@/services/entity/Agent';
import './index.less';
import { getOptionList } from '@/services/sys/DictController';
import TableActionMenu from '@/components/TableActionMenu';
const toolTypesMap = [
  { value: 'knowledge', icon: <DatabaseOutlined /> },
  { value: 'ops', icon: <ToolOutlined /> },
  { value: 'dev', icon: <CodeOutlined /> },
  { value: 'general', icon: <AppstoreOutlined /> },
];
const rate = (value?: number) => {
  const result = value || 0;
  return result > 0 && result <= 1 ? result * 100 : result;
};
const timeText = (value?: string | number, locale?: string) => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'number') {
    const timestamp = value < 100000000000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString(locale, { hour12: false });
  }
  return value.replace('T', ' ').slice(0, 16);
};

const AgentToolPage: React.FC = () => {
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string>();
  const [testToolId, setTestToolId] = useState<string>();
  const [statistics, setStatistics] = useState<AgentToolStatistics>();
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [toolType, setToolType] = useState<string>();
  const [status, setStatus] = useState<number>();
  const [mcpServerId, setMcpServerId] = useState<string>();
  const [facets, setFacets] = useState<AgentToolFacets>({
    categories: [],
    statuses: [],
    sources: [],
  });
  const write = permissionMap[history.location.pathname];
  const format = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const refresh = () => ref.current?.reloadAndRest?.();
  const [toolTypes, setToolTypes] = useState<any>([]);
  useEffect(() => {
    getOptionList('Agent_Tool_Business_Type').then((res) => {
      res = res.map((item) => ({
        value: item.value,
        label: item.label,
        icon: toolTypesMap.find((type) => type.value === item.value)?.icon || <AppstoreOutlined />,
      }));
      setToolTypes(res);
    });
  }, []);
  const typeMeta = (type?: string) =>
    toolTypes.find((item: { value: string | undefined }) => item.value === type);

  const loadStatistics = async () => {
    setStatisticsLoading(true);
    try {
      const result = await getAgentToolStatistics({ toolType, mcpServerId });
      if (result.code === 200) setStatistics(result.data);
      else message.error(result.message || format('pages.agent.tool.loadStatisticsFailed'));
    } finally {
      setStatisticsLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [toolType, mcpServerId]);
  useEffect(() => {
    getAgentToolFacets().then(({ code, data, message: msg }) => {
      if (code === 200 && data) setFacets(data);
      else message.error(msg || format('pages.agent.tool.loadFacetsFailed'));
    });
  }, []);

  const changeFilter = (callback: () => void) => {
    callback();
    window.setTimeout(refresh, 0);
  };
  const handleDelete = async (record: AgentTool) => {
    if (!record.id) return;
    const result = await deleteAgentToolInfo(record.id);
    if (result.code === 200) {
      message.success(result.message || format('pages.agent.tool.deleteSuccess'));
      refresh();
      loadStatistics();
    } else message.error(result.message || format('pages.agent.tool.deleteFailed'));
  };
  const handleStatusChange = async (record: AgentTool) => {
    if (!record.id) return;
    const detail = await getAgentToolInfo(record.id);
    if (detail.code !== 200 || !detail.data) {
      message.error(detail.message || format('pages.agent.tool.getDetailFailed'));
      return;
    }
    const result = await updateAgentToolInfo({
      ...detail.data,
      status: record.status === 1 ? 0 : 1,
    });
    if (result.code === 200) {
      message.success(result.message || format('pages.agent.tool.operationSuccess'));
      refresh();
      loadStatistics();
    } else message.error(result.message || format('pages.agent.tool.operationFailed'));
  };

  const columns: any[] = [
    {
      title: format('pages.agent.tool.name'),
      dataIndex: 'name',
      width: 275,
      render: (_: unknown, record: AgentTool) => {
        const meta = typeMeta(record.toolType);
        return (
          <div className="tool-name-cell">
            <span className={`tool-icon tool-icon-${record.toolType || 'general'}`}>
              {meta?.icon || <AppstoreOutlined />}
            </span>
            <div>
              <strong>{record.name || '-'}</strong>
              <small>
                {record.description || record.code || format('pages.agent.tool.noDescription')}
              </small>
            </div>
          </div>
        );
      },
    },
    {
      title: format('pages.common.type'),
      dataIndex: 'toolType',
      width: 115,
      render: (_: unknown, record: AgentTool) => (
        <Tag className="tool-type-tag">
          {typeMeta(record.toolType)?.label ||
            record.toolType ||
            format('pages.agent.tool.general')}
        </Tag>
      ),
    },
    {
      title: format('pages.agent.tool.integrationStatus'),
      dataIndex: 'status',
      width: 120,
      render: (_: unknown, record: AgentTool) =>
        record.status === 1 ? (
          <span className="status-success">
            <CheckCircleFilled /> {format('pages.agent.tool.integrated')}
          </span>
        ) : (
          <span className="status-disabled">{format('pages.agent.tool.notIntegrated')}</span>
        ),
    },
    {
      title: format('pages.agent.tool.callCount'),
      dataIndex: 'callCount',
      width: 95,
      render: (_: unknown, record: AgentTool) => (record.callCount || 0).toLocaleString(),
    },
    {
      title: format('pages.agent.tool.successRate'),
      dataIndex: 'successRate',
      width: 130,
      render: (_: unknown, record: AgentTool) =>
        record.callCount ? (
          <div className="success-rate">
            <span>{rate(record.successRate).toFixed(1)}%</span>
            <Progress
              percent={Math.min(rate(record.successRate), 100)}
              showInfo={false}
              strokeColor="#18b65b"
              size="small"
            />
          </div>
        ) : (
          '-'
        ),
    },
    {
      title: format('pages.common.updateTime'),
      dataIndex: 'updatedAt',
      width: 150,
      render: (_: unknown, record: AgentTool) =>
        timeText(record.updatedAt || record.createdAt, intl.locale),
    },
    {
      title: format('pages.common.option'),
      key: 'option',
      width: 250,
      fixed: 'right',
      render: (_: unknown, record: AgentTool) =>
        write && (
          <TableActionMenu
            items={[
              {
                key: 'edit',
                label: format('pages.common.edit'),
                primary: true,
                onClick: () => {
                  setId(record.id);
                  setOpen(true);
                },
              },
              {
                key: 'test',
                label: format('pages.agent.tool.test'),
                primary: true,
                visible: !!record.id,
                onClick: () => setTestToolId(record.id),
              },
              {
                key: 'status',
                label:
                  record.status === 1
                    ? format('pages.common.disabled')
                    : format('pages.common.enabled'),
                confirm: {
                  title: format('pages.agent.tool.statusConfirm', {
                    action:
                      record.status === 1
                        ? format('pages.common.disabled')
                        : format('pages.common.enabled'),
                  }),
                },
                onClick: () => handleStatusChange(record),
              },
              {
                key: 'delete',
                label: format('pages.common.delete'),
                primary: true,
                danger: true,
                confirm: { title: intl.formatMessage({ id: 'pages.agent.tool.deleteConfirm' }) },
                onClick: () => handleDelete(record),
              },
            ]}
          />
        ),
    },
  ];

  return (
    <PageContainer
      className="agent-tool-page"
      header={{ title: format('pages.agent.tool.center'), breadcrumb: undefined }}
    >
      <Spin spinning={statisticsLoading}>
        <div className="tool-stat-grid">
          <div className="tool-stat-card">
            <i className="stat-icon stat-blue">
              <AppstoreOutlined />
            </i>
            <div>
              <span>{format('pages.agent.tool.total')}</span>
              <strong>{statistics?.totalCount || 0}</strong>
              <small>{format('pages.agent.tool.totalHint')}</small>
            </div>
          </div>
          <div className="tool-stat-card">
            <i className="stat-icon stat-green">
              <CheckCircleFilled />
            </i>
            <div>
              <span>{format('pages.agent.tool.available')}</span>
              <strong>{statistics?.enabledCount || 0}</strong>
              <small>
                {statistics?.totalCount
                  ? format('pages.agent.tool.availabilityRate', {
                      rate: (
                        ((statistics.enabledCount || 0) / statistics.totalCount) *
                        100
                      ).toFixed(0),
                    })
                  : format('pages.agent.tool.empty')}
              </small>
            </div>
          </div>
          <div className="tool-stat-card">
            <i className="stat-icon stat-orange">
              <ApiOutlined />
            </i>
            <div>
              <span>{format('pages.agent.tool.integratedServices')}</span>
              <strong>{facets.sources.length}</strong>
              <small>{format('pages.agent.tool.configuredMcpServices')}</small>
            </div>
          </div>
          <div className="tool-stat-card">
            <i className="stat-icon stat-purple">
              <FileTextOutlined />
            </i>
            <div>
              <span>{format('pages.agent.tool.totalCalls')}</span>
              <strong>{(statistics?.callCount || 0).toLocaleString()}</strong>
              <small>
                {format('pages.agent.tool.successRateValue', {
                  rate: rate(statistics?.successRate).toFixed(1),
                })}
              </small>
            </div>
          </div>
        </div>
      </Spin>
      <div className="tool-workspace">
        <aside className="tool-sidebar">
          <section>
            <h3>{format('pages.agent.tool.categories')}</h3>
            <button
              className={!toolType ? 'selected' : ''}
              onClick={() => changeFilter(() => setToolType(undefined))}
            >
              <AppstoreOutlined />
              {format('pages.agent.tool.allTools')} <em>{statistics?.totalCount || 0}</em>
            </button>
            {facets.categories.map((item) => (
              <button
                key={String(item.value)}
                className={toolType === String(item.value) ? 'selected' : ''}
                onClick={() => changeFilter(() => setToolType(String(item.value)))}
              >
                {typeMeta(String(item.value))?.icon || <AppstoreOutlined />}
                {item.label}
                <em>{item.count}</em>
              </button>
            ))}
          </section>
          <section>
            <h3>{format('pages.agent.tool.integrationStatus')}</h3>
            <button
              className={status === undefined ? 'selected' : ''}
              onClick={() => changeFilter(() => setStatus(undefined))}
            >
              <i className="status-dot blue" />
              {format('pages.agent.tool.all')}
            </button>
            {facets.statuses.map((item) => {
              const value = Number(item.value);
              return (
                <button
                  key={String(item.value)}
                  className={status === value ? 'selected' : ''}
                  onClick={() => changeFilter(() => setStatus(value))}
                >
                  <i className={`status-dot ${value === 1 ? 'green' : 'orange'}`} />
                  {item.label}
                  <em>{item.count}</em>
                </button>
              );
            })}
          </section>
          <section>
            <h3>{format('pages.agent.tool.source')}</h3>
            <button
              className={!mcpServerId ? 'selected' : ''}
              onClick={() => changeFilter(() => setMcpServerId(undefined))}
            >
              <GlobalOutlined />
              {format('pages.agent.tool.allSources')}
            </button>
            {facets.sources.slice(0, 5).map((source) => (
              <button
                key={String(source.value)}
                className={mcpServerId === String(source.value) ? 'selected' : ''}
                onClick={() => changeFilter(() => setMcpServerId(String(source.value)))}
              >
                <FolderOpenOutlined />
                {source.label}
                <em>{source.count}</em>
              </button>
            ))}
          </section>
        </aside>
        <main className="tool-table-panel">
          <div className="tool-filter-bar">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={format('pages.agent.tool.searchPlaceholder')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={refresh}
            />
            <Select
              value={status}
              placeholder={format('pages.agent.tool.allStatuses')}
              allowClear
              options={[
                { label: format('pages.agent.tool.integrated'), value: 1 },
                { label: format('pages.agent.tool.notIntegrated'), value: 0 },
              ]}
              onChange={(value) => changeFilter(() => setStatus(value))}
            />
            <Select
              value={mcpServerId}
              placeholder={format('pages.agent.tool.allSources')}
              allowClear
              options={facets.sources.map((source) => ({
                label: source.label,
                value: String(source.value),
              }))}
              onChange={(value) => changeFilter(() => setMcpServerId(value))}
            />
            {write && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setId(undefined);
                  setOpen(true);
                }}
              >
                {format('pages.agent.tool.add')}
              </Button>
            )}
          </div>
          <ProTable<AgentTool>
            className="tool-center-table"
            actionRef={ref}
            rowKey="id"
            search={false}
            options={false}
            headerTitle={false}
            scroll={{ x: 1100 }}
            columns={columns}
            request={(params: AgentToolSearchParams) =>
              getAgentToolList({
                ...params,
                name: keyword || undefined,
                toolType,
                status,
                mcpServerId,
              })
            }
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => format('pages.agent.tool.totalRecords', { total }),
            }}
          />
        </main>
      </div>
      <AgentToolForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined);
          refresh();
          loadStatistics();
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
