import PreferenceForm from '@/pages/sys/admin-preference/PreferenceForm';
import {
  AdminPreference,
  AdminPreferenceSearchParams,
  deleteAdminPreference,
  getAdminPreferenceList,
  getAdminPreferenceStatistics,
  overrideAdminPreference,
} from '@/services/sys/AdminPreferenceController';
import { getAdminList } from '@/services/sys/AdminController';
import {
  AppstoreOutlined,
  CheckCircleFilled,
  ExperimentOutlined,
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useIntl } from '@@/exports';
import { Button, Input, message, Modal, Select, Spin, Tag } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { getSwitchStatus } from '@/pages/agent/knowledge-base/status';
import dayjs from 'dayjs';
import TableActionMenu from '@/components/TableActionMenu';
import './index.less';

interface PrefStatistics {
  total: number;
  enabled: number;
  implicit: number;
  explicit: number;
}

const PreferencePage: React.FC = () => {
  const intl = useIntl();
  const format = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const categoryMap = Object.fromEntries(
    ['language', 'style', 'format', 'tech_stack', 'tool_strategy'].map((value) => [
      value,
      format(`pages.sys.preference.category.${value}`),
    ]),
  );
  const sourceMap: Record<string, { label: string; color: string; className: string }> = {
    explicit: {
      label: format('pages.sys.preference.source.explicit'),
      color: 'blue',
      className: 'pref-source-explicit',
    },
    implicit: {
      label: format('pages.sys.preference.source.implicit'),
      color: 'orange',
      className: 'pref-source-implicit',
    },
    manual_override: {
      label: format('pages.sys.preference.source.manualOverride'),
      color: 'purple',
      className: 'pref-source-override',
    },
  };
  const ref = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string>();
  const [overrideId, setOverrideId] = useState<string>();
  const [overrideRecord, setOverrideRecord] = useState<AdminPreference>();
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const permissions = useAccess();
  const write = permissions[history.location.pathname];

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>();
  const [status, setStatus] = useState<number>();
  const [adminId, setAdminId] = useState<string>();
  const [adminOptions, setAdminOptions] = useState<{ label: string; value: string }[]>([]);
  const [statistics, setStatistics] = useState<PrefStatistics>({
    total: 0,
    enabled: 0,
    implicit: 0,
    explicit: 0,
  });
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const refresh = () => ref.current?.reloadAndRest?.();

  useEffect(() => {
    getAdminList({ current: 1, pageSize: 100 }).then((res) => {
      if (res.code === 200 && res.data) {
        setAdminOptions(
          res.data.map((a) => ({ label: a.username || String(a.id), value: String(a.id) })),
        );
      }
    });
  }, []);

  const loadStatistics = async () => {
    setStatisticsLoading(true);
    try {
      const res = await getAdminPreferenceStatistics();
      if (res.code === 200 && res.data) {
        setStatistics({
          total: res.data.total || 0,
          enabled: res.data.enabled || 0,
          implicit: res.data.implicit || 0,
          explicit: res.data.explicit || 0,
        });
      }
    } finally {
      setStatisticsLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const changeFilter = (callback: () => void) => {
    callback();
    window.setTimeout(refresh, 0);
  };

  const handleOverride = async () => {
    if (!overrideId || !overrideValue.trim()) {
      message.warning(format('pages.sys.preference.enterNewValue'));
      return;
    }
    setOverrideLoading(true);
    try {
      const response = await overrideAdminPreference(overrideId, { value: overrideValue.trim() });
      if (response.code === 200) {
        message.success(response.message || format('pages.sys.preference.overrideSuccess'));
        setOverrideId(undefined);
        setOverrideRecord(undefined);
        setOverrideValue('');
        refresh();
      } else message.error(response.message || format('pages.sys.preference.operationFailed'));
    } finally {
      setOverrideLoading(false);
    }
  };

  const columns: any[] = [
    {
      title: format('pages.sys.preference.category'),
      dataIndex: 'category',
      width: 100,
      render: (_: unknown, record: AdminPreference) =>
        categoryMap[record.category || ''] || record.category,
    },
    {
      title: format('pages.sys.preference.keyName'),
      dataIndex: 'keyName',
      width: 150,
      ellipsis: true,
      render: (_: unknown, record: AdminPreference) => (
        <span className="pref-key-cell">{record.keyName}</span>
      ),
    },
    { title: format('pages.sys.preference.value'), dataIndex: 'value', width: 150, ellipsis: true },
    {
      title: format('pages.common.description'),
      dataIndex: 'description',
      width: 180,
      ellipsis: true,
    },
    {
      title: format('pages.sys.preference.priority'),
      dataIndex: 'priority',
      width: 80,
      sorter: true,
    },
    {
      title: format('pages.sys.preference.source'),
      dataIndex: 'source',
      width: 100,
      render: (_: unknown, record: AdminPreference) => {
        const source = sourceMap[record.source || 'explicit'];
        return <Tag className={`pref-source-tag ${source.className}`}>{source.label}</Tag>;
      },
    },
    {
      title: format('pages.sys.preference.confidence'),
      dataIndex: 'confidence',
      width: 90,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => {
        const val = record.confidence ?? 0;
        const cls =
          val >= 0.7
            ? 'pref-confidence-high'
            : val >= 0.3
              ? 'pref-confidence-mid'
              : 'pref-confidence-low';
        return <span className={cls}>{(val * 100).toFixed(0)}%</span>;
      },
    },
    {
      title: format('pages.sys.preference.usageCount'),
      dataIndex: 'usageCount',
      width: 90,
      sorter: true,
    },
    {
      title: format('pages.sys.preference.effectiveScore'),
      dataIndex: 'effectiveScore',
      width: 90,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => record.effectiveScore?.toFixed(1) || '-',
    },
    {
      title: format('pages.sys.preference.lastUsedAt'),
      dataIndex: 'lastUsedAt',
      width: 140,
      sorter: true,
      render: (_: unknown, record: AdminPreference) =>
        record.lastUsedAt ? dayjs(record.lastUsedAt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: format('pages.common.status'),
      dataIndex: 'status',
      width: 80,
      render: (_: unknown, record: AdminPreference) => {
        const item = getSwitchStatus(record.status);
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: format('pages.common.option'),
      key: 'option',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: AdminPreference) =>
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
                key: 'override',
                label: format('pages.sys.preference.override'),
                primary: true,
                visible: record.status === 1,
                onClick: () => {
                  setOverrideId(record.id);
                  setOverrideRecord(record);
                  setOverrideValue(record.value || '');
                },
              },
              {
                key: 'delete',
                label: format('pages.common.delete'),
                primary: true,
                danger: true,
                confirm: { title: format('pages.sys.preference.deleteConfirm') },
                onClick: async () => {
                  if (!record.id) return;
                  const response = await deleteAdminPreference(record.id);
                  if (response.code === 200) {
                    message.success(
                      response.message || format('pages.sys.preference.deleteSuccess'),
                    );
                    refresh();
                  } else
                    message.error(response.message || format('pages.sys.preference.deleteFailed'));
                },
              },
            ]}
          />
        ),
    },
  ];

  return (
    <PageContainer className="admin-preference-page">
      <Spin spinning={statisticsLoading}>
        <div className="pref-stat-grid">
          <div className="pref-stat-card">
            <i className="pref-stat-icon blue">
              <AppstoreOutlined />
            </i>
            <div>
              <span>{format('pages.sys.preference.total')}</span>
              <strong>{statistics.total}</strong>
              <small>{format('pages.sys.preference.totalHint')}</small>
            </div>
          </div>
          <div className="pref-stat-card">
            <i className="pref-stat-icon green">
              <CheckCircleFilled />
            </i>
            <div>
              <span>{format('pages.common.enabled')}</span>
              <strong>{statistics.enabled}</strong>
              <small>{format('pages.sys.preference.enabledHint')}</small>
            </div>
          </div>
          <div className="pref-stat-card">
            <i className="pref-stat-icon orange">
              <ExperimentOutlined />
            </i>
            <div>
              <span>{format('pages.sys.preference.source.implicit')}</span>
              <strong>{statistics.implicit}</strong>
              <small>{format('pages.sys.preference.implicitHint')}</small>
            </div>
          </div>
          <div className="pref-stat-card">
            <i className="pref-stat-icon purple">
              <ThunderboltOutlined />
            </i>
            <div>
              <span>{format('pages.sys.preference.manual')}</span>
              <strong>{statistics.explicit}</strong>
              <small>{format('pages.sys.preference.manualHint')}</small>
            </div>
          </div>
        </div>
      </Spin>
      <div className="pref-workspace">
        <div className="pref-filter-bar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={format('pages.sys.preference.searchPlaceholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={refresh}
          />
          <Select
            allowClear
            placeholder={format('pages.sys.preference.allCategories')}
            value={category}
            options={Object.entries(categoryMap).map(([v, l]) => ({ label: l, value: v }))}
            onChange={(v) => changeFilter(() => setCategory(v))}
          />
          <Select
            allowClear
            placeholder={format('pages.sys.preference.allStatuses')}
            value={status}
            options={[
              { label: format('pages.common.enabled'), value: 1 },
              { label: format('pages.common.disabled'), value: 0 },
            ]}
            onChange={(v) => changeFilter(() => setStatus(v))}
          />
          <Select
            allowClear
            showSearch
            filterOption={false}
            placeholder={format('pages.sys.preference.allUsers')}
            value={adminId}
            options={adminOptions}
            onChange={(v) => changeFilter(() => setAdminId(v))}
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
              {format('pages.sys.preference.new')}
            </Button>
          )}
        </div>
        <ProTable<AdminPreference>
          className="pref-center-table"
          actionRef={ref}
          rowKey="id"
          search={false}
          options={false}
          headerTitle={false}
          scroll={{ x: 1200 }}
          columns={columns}
          request={(params: AdminPreferenceSearchParams) =>
            getAdminPreferenceList({
              ...params,
              keyName: keyword || undefined,
              category,
              status,
              adminId,
            })
          }
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => format('pages.sys.preference.totalRecords', { total }),
          }}
        />
      </div>
      <PreferenceForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined);
          refresh();
          loadStatistics();
        }}
      />
      <Modal
        title={format('pages.sys.preference.overrideTitle')}
        open={!!overrideId}
        onOk={handleOverride}
        onCancel={() => {
          setOverrideId(undefined);
          setOverrideRecord(undefined);
          setOverrideValue('');
        }}
        okText={format('pages.sys.preference.confirmOverride')}
        cancelText={format('pages.sys.preference.cancel')}
        confirmLoading={overrideLoading}
        destroyOnClose
      >
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#666' }}>{format('pages.sys.preference.currentValue')}:</span>
          <span>{overrideRecord?.value || '-'}</span>
        </div>
        <div>
          <span style={{ color: '#666', marginRight: 8 }}>
            {format('pages.sys.preference.newValue')}:
          </span>
          <Input
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
            placeholder={format('pages.sys.preference.enterNewValue')}
            onPressEnter={handleOverride}
          />
        </div>
      </Modal>
    </PageContainer>
  );
};

export default PreferencePage;
