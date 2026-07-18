import PreferenceForm from '@/pages/sys/admin-preference/PreferenceForm'
import {
  AdminPreference,
  AdminPreferenceSearchParams,
  deleteAdminPreference,
  getAdminPreferenceList,
  getAdminPreferenceStatistics,
  overrideAdminPreference,
} from '@/services/sys/AdminPreferenceController'
import { getAdminList } from '@/services/sys/AdminController'
import {
  AppstoreOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { history, useAccess } from '@@/exports'
import { Button, Input, message, Modal, Popconfirm, Select, Spin, Tag } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { getSwitchStatus } from '@/pages/agent/knowledge-base/status'
import dayjs from 'dayjs'
import './index.less'

const CATEGORY_MAP: Record<string, string> = {
  language: '语言',
  style: '表达风格',
  format: '输出格式',
  tech_stack: '技术栈',
  tool_strategy: '工具策略',
}

const SOURCE_MAP: Record<string, { label: string; color: string; className: string }> = {
  explicit: { label: '手动', color: 'blue', className: 'pref-source-explicit' },
  implicit: { label: '自动学习', color: 'orange', className: 'pref-source-implicit' },
  manual_override: { label: '手动覆盖', color: 'purple', className: 'pref-source-override' },
}

interface PrefStatistics {
  total: number
  enabled: number
  implicit: number
  explicit: number
}

const PreferencePage: React.FC = () => {
  const ref = useRef<ActionType>()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string>()
  const [overrideId, setOverrideId] = useState<string>()
  const [overrideRecord, setOverrideRecord] = useState<AdminPreference>()
  const [overrideValue, setOverrideValue] = useState('')
  const [overrideLoading, setOverrideLoading] = useState(false)
  const permissions = useAccess()
  const write = permissions[history.location.pathname]

  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<string>()
  const [status, setStatus] = useState<number>()
  const [adminId, setAdminId] = useState<string>()
  const [adminOptions, setAdminOptions] = useState<{ label: string; value: string }[]>([])
  const [statistics, setStatistics] = useState<PrefStatistics>({ total: 0, enabled: 0, implicit: 0, explicit: 0 })
  const [statisticsLoading, setStatisticsLoading] = useState(false)

  const refresh = () => ref.current?.reloadAndRest?.()

  useEffect(() => {
    getAdminList({ current: 1, pageSize: 100 }).then((res) => {
      if (res.code === 200 && res.data) {
        setAdminOptions(res.data.map((a) => ({ label: a.username || String(a.id), value: String(a.id) })))
      }
    })
  }, [])

  const loadStatistics = async () => {
    setStatisticsLoading(true)
    try {
      const res = await getAdminPreferenceStatistics()
      if (res.code === 200 && res.data) {
        setStatistics({
          total: res.data.total || 0,
          enabled: res.data.enabled || 0,
          implicit: res.data.implicit || 0,
          explicit: res.data.explicit || 0,
        })
      }
    } finally {
      setStatisticsLoading(false)
    }
  }

  useEffect(() => {
    loadStatistics()
  }, [])

  const changeFilter = (callback: () => void) => {
    callback()
    window.setTimeout(refresh, 0)
  }

  const handleOverride = async () => {
    if (!overrideId || !overrideValue.trim()) {
      message.warning('请输入新值')
      return
    }
    setOverrideLoading(true)
    try {
      const response = await overrideAdminPreference(overrideId, { value: overrideValue.trim() })
      if (response.code === 200) {
        message.success(response.message || '覆盖成功')
        setOverrideId(undefined)
        setOverrideRecord(undefined)
        setOverrideValue('')
        refresh()
      } else message.error(response.message || '操作失败')
    } finally {
      setOverrideLoading(false)
    }
  }

  const columns: any[] = [
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (_: unknown, record: AdminPreference) =>
        CATEGORY_MAP[record.category || ''] || record.category,
    },
    {
      title: '键名',
      dataIndex: 'keyName',
      width: 150,
      ellipsis: true,
      render: (_: unknown, record: AdminPreference) => (
        <span className="pref-key-cell">{record.keyName}</span>
      ),
    },
    { title: '偏好值', dataIndex: 'value', width: 150, ellipsis: true },
    {
      title: '描述',
      dataIndex: 'description',
      width: 180,
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      sorter: true,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      render: (_: unknown, record: AdminPreference) => {
        const source = SOURCE_MAP[record.source || 'explicit']
        return <Tag className={`pref-source-tag ${source.className}`}>{source.label}</Tag>
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      width: 90,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => {
        const val = record.confidence ?? 0
        const cls = val >= 0.7 ? 'pref-confidence-high' : val >= 0.3 ? 'pref-confidence-mid' : 'pref-confidence-low'
        return <span className={cls}>{(val * 100).toFixed(0)}%</span>
      },
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      width: 90,
      sorter: true,
    },
    {
      title: '有效分数',
      dataIndex: 'effectiveScore',
      width: 90,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => record.effectiveScore?.toFixed(1) || '-',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      width: 140,
      sorter: true,
      render: (_: unknown, record: AdminPreference) =>
        record.lastUsedAt ? dayjs(record.lastUsedAt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_: unknown, record: AdminPreference) => {
        const item = getSwitchStatus(record.status)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: '操作',
      key: 'option',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: AdminPreference) =>
        write && (
          <div className="pref-actions">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setId(record.id)
                setOpen(true)
              }}
            >
              编辑
            </Button>
            {record.status === 1 && (
              <Button
                type="link"
                onClick={() => {
                  setOverrideId(record.id)
                  setOverrideRecord(record)
                  setOverrideValue(record.value || '')
                }}
              >
                覆盖
              </Button>
            )}
            <Popconfirm
              title="确认删除该偏好？"
              onConfirm={async () => {
                if (!record.id) return
                const response = await deleteAdminPreference(record.id)
                if (response.code === 200) {
                  message.success(response.message || '删除成功')
                  refresh()
                } else message.error(response.message || '删除失败')
              }}
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        ),
    },
  ]

  return (
    <PageContainer className="admin-preference-page">
      <Spin spinning={statisticsLoading}>
        <div className="pref-stat-grid">
          <div className="pref-stat-card">
            <i className="pref-stat-icon blue">
              <AppstoreOutlined />
            </i>
            <div>
              <span>偏好总数</span>
              <strong>{statistics.total}</strong>
              <small>所有偏好记录</small>
            </div>
          </div>
          <div className="pref-stat-card">
            <i className="pref-stat-icon green">
              <CheckCircleFilled />
            </i>
            <div>
              <span>已启用</span>
              <strong>{statistics.enabled}</strong>
              <small>启用的偏好会在聊天中生效</small>
            </div>
          </div>
          <div className="pref-stat-card">
            <i className="pref-stat-icon orange">
              <ExperimentOutlined />
            </i>
            <div>
              <span>自动学习</span>
              <strong>{statistics.implicit}</strong>
              <small>系统自动提取的偏好</small>
            </div>
          </div>
          <div className="pref-stat-card">
            <i className="pref-stat-icon purple">
              <ThunderboltOutlined />
            </i>
            <div>
              <span>手动维护</span>
              <strong>{statistics.explicit}</strong>
              <small>用户主动创建的偏好</small>
            </div>
          </div>
        </div>
      </Spin>
      <div className="pref-workspace">
        <div className="pref-filter-bar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索键名或偏好值"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={refresh}
          />
          <Select
            allowClear
            placeholder="全部分类"
            value={category}
            options={Object.entries(CATEGORY_MAP).map(([v, l]) => ({ label: l, value: v }))}
            onChange={(v) => changeFilter(() => setCategory(v))}
          />
          <Select
            allowClear
            placeholder="全部状态"
            value={status}
            options={[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]}
            onChange={(v) => changeFilter(() => setStatus(v))}
          />
          <Select
            allowClear
            showSearch
            filterOption={false}
            placeholder="全部用户"
            value={adminId}
            options={adminOptions}
            onChange={(v) => changeFilter(() => setAdminId(v))}
          />
          {write && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setId(undefined)
                setOpen(true)
              }}
            >
              新增偏好
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
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </div>
      <PreferenceForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          refresh()
          loadStatistics()
        }}
      />
      <Modal
        title="覆盖偏好值"
        open={!!overrideId}
        onOk={handleOverride}
        onCancel={() => {
          setOverrideId(undefined)
          setOverrideRecord(undefined)
          setOverrideValue('')
        }}
        okText="确认覆盖"
        cancelText="取消"
        confirmLoading={overrideLoading}
        destroyOnClose
      >
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#666' }}>当前值：</span>
          <span>{overrideRecord?.value || '-'}</span>
        </div>
        <div>
          <span style={{ color: '#666', marginRight: 8 }}>新值：</span>
          <Input
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
            placeholder="请输入新的偏好值"
            onPressEnter={handleOverride}
          />
        </div>
      </Modal>
    </PageContainer>
  )
}

export default PreferencePage
