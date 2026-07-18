import PreferenceForm from '@/pages/sys/admin-preference/PreferenceForm'
import {
  AdminPreference,
  AdminPreferenceSearchParams,
  confirmAdminPreference,
  deleteAdminPreference,
  getAdminPreferenceList,
  rejectAdminPreference,
  overrideAdminPreference,
} from '@/services/sys/AdminPreferenceController'
import { getAdminList } from '@/services/sys/AdminController'
import { PlusOutlined } from '@ant-design/icons'
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components'
import { history, useAccess } from '@@/exports'
import { Alert, Button, Input, message, Modal, Popconfirm, Tag } from 'antd'
import React, { useRef, useState } from 'react'
import { getSwitchStatus } from '@/pages/agent/knowledge-base/status'
import dayjs from 'dayjs'

const CATEGORY_MAP: Record<string, string> = {
  language: '语言',
  style: '表达风格',
  format: '输出格式',
  tech_stack: '技术栈',
  tool_strategy: '工具策略',
}

const SCOPE_MAP: Record<string, string> = {
  global: '全局',
  session: '会话',
  task_type: '任务类型',
}

const SOURCE_MAP: Record<string, { label: string; color: string }> = {
  explicit: { label: '手动', color: 'blue' },
  implicit: { label: '自动学习', color: 'orange' },
  manual_override: { label: '手动覆盖', color: 'purple' },
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

  const handleConfirm = async (record: AdminPreference) => {
    if (!record.id) return
    const response = await confirmAdminPreference(record.id)
    if (response.code === 200) {
      message.success(response.message || '确认成功')
      ref.current?.reload()
    } else message.error(response.message || '操作失败')
  }

  const handleReject = async (record: AdminPreference) => {
    if (!record.id) return
    const response = await rejectAdminPreference(record.id)
    if (response.code === 200) {
      message.success(response.message || '已拒绝')
      ref.current?.reload()
    } else message.error(response.message || '操作失败')
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
        ref.current?.reload()
      } else message.error(response.message || '操作失败')
    } finally {
      setOverrideLoading(false)
    }
  }

  const columns: any[] = [
    {
      title: '用户',
      dataIndex: 'adminId',
      ellipsis: true,
      valueType: 'select',
      request: async () => {
        const res = await getAdminList({ current: 1, pageSize: 100 })
        if (res.code === 200 && res.data) {
          return res.data.map((a) => ({ label: a.username || String(a.id), value: String(a.id) }))
        }
        return []
      },
      fieldProps: { showSearch: true, filterOption: false },
    },
    {
      title: '分类',
      dataIndex: 'category',
      valueType: 'select',
      fieldProps: {
        options: Object.entries(CATEGORY_MAP).map(([v, l]) => ({ label: l, value: v })),
      },
      render: (_: unknown, record: AdminPreference) =>
        CATEGORY_MAP[record.category || ''] || record.category,
    },
    {
      title: '键名',
      dataIndex: 'keyName',
      ellipsis: true,
      render: (_: unknown, record: AdminPreference) => (
        <code style={{ fontSize: 12 }}>{record.keyName}</code>
      ),
    },
    { title: '偏好值', dataIndex: 'value', ellipsis: true },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '作用域',
      dataIndex: 'scope',
      valueType: 'select',
      fieldProps: { options: Object.entries(SCOPE_MAP).map(([v, l]) => ({ label: l, value: v })) },
      render: (_: unknown, record: AdminPreference) => {
        const scope = record.scope || 'global'
        if (scope === 'task_type' && record.scopeDetail) {
          return `任务类型: ${record.scopeDetail}`
        }
        return SCOPE_MAP[scope] || scope
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      hideInSearch: true,
      render: (_: unknown, record: AdminPreference) => {
        const source = SOURCE_MAP[record.source || 'explicit']
        return <Tag color={source.color}>{source.label}</Tag>
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      hideInSearch: true,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => {
        const val = record.confidence ?? 0
        const color = val >= 0.7 ? 'green' : val >= 0.3 ? 'orange' : 'red'
        return <span style={{ color }}>{(val * 100).toFixed(0)}%</span>
      },
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '有效分数',
      dataIndex: 'effectiveScore',
      hideInSearch: true,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => record.effectiveScore?.toFixed(1) || '-',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      hideInSearch: true,
      sorter: true,
      render: (_: unknown, record: AdminPreference) =>
        record.lastUsedAt ? dayjs(record.lastUsedAt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { 0: { text: '禁用' }, 1: { text: '启用' } },
      render: (_: unknown, record: AdminPreference) => {
        const item = getSwitchStatus(record.status)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 400,
      render: (_: unknown, record: AdminPreference) =>
        write && [
          <Button
            key="edit"
            type="link"
            onClick={() => {
              setId(record.id)
              setOpen(true)
            }}
          >
            编辑
          </Button>,
          record.source === 'implicit' && record.status === 1 && (
            <Popconfirm
              key="confirm"
              title="确认该偏好是正确的？"
              onConfirm={() => handleConfirm(record)}
            >
              <Button type="link" style={{ color: '#52c41a' }}>
                确认
              </Button>
            </Popconfirm>
          ),
          record.source === 'implicit' && record.status === 1 && (
            <Popconfirm
              key="reject"
              title="拒绝后该偏好将被降低置信度，确认拒绝？"
              onConfirm={() => handleReject(record)}
            >
              <Button type="link" danger>
                拒绝
              </Button>
            </Popconfirm>
          ),
          record.status === 1 && (
            <Button
              key="override"
              type="link"
              onClick={() => {
                setOverrideId(record.id)
                setOverrideRecord(record)
                setOverrideValue(record.value || '')
              }}
            >
              覆盖
            </Button>
          ),
          <Popconfirm
            key="delete"
            title="确认删除该偏好？"
            onConfirm={async () => {
              if (!record.id) return
              const response = await deleteAdminPreference(record.id)
              if (response.code === 200) {
                message.success(response.message || '删除成功')
                ref.current?.reload()
              } else message.error(response.message || '删除失败')
            }}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>,
        ],
    },
  ]

  return (
    <PageContainer>
      <Alert
        showIcon
        type="info"
        message="系统会在聊天后自动提取长期偏好。启用的偏好会在后续聊天中作为上下文参考。"
        style={{ marginBottom: 16 }}
      />
      <ProTable<AdminPreference>
        actionRef={ref}
        rowKey="id"
        scroll={{ x: 1200 }}
        columns={columns}
        request={(params: AdminPreferenceSearchParams) => getAdminPreferenceList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="new"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined)
                setOpen(true)
              }}
            >
              新增偏好
            </Button>,
          ]
        }
      />
      <PreferenceForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
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
