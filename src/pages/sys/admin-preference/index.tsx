import PreferenceForm from '@/pages/sys/admin-preference/PreferenceForm';
import {
  AdminPreference,
  AdminPreferenceSearchParams,
  deleteAdminPreference,
  getAdminPreferenceList,
  updateAdminPreferenceStatus,
} from '@/services/sys/AdminPreferenceController';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@@/exports';
import { Alert, Button, message, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getSwitchStatus } from '@/pages/agent/knowledge-base/status';

const PreferencePage: React.FC = () => {
  const ref = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string>();
  const permissions = useAccess();
  const write = permissions[history.location.pathname];

  const updateStatus = async (record: AdminPreference) => {
    if (!record.id) return;
    const response = await updateAdminPreferenceStatus(record.id, { status: record.status === 1 ? 0 : 1 });
    if (response.code === 200) {
      message.success(response.message || '操作成功');
      ref.current?.reload();
    } else message.error(response.message || '操作失败');
  };

  const columns: any[] = [
    { title: '分类', dataIndex: 'category', ellipsis: true },
    { title: '偏好内容', dataIndex: 'content', ellipsis: true },
    {
      title: '置信度',
      dataIndex: 'confidence',
      valueType: 'digit',
      hideInSearch: true,
      render: (_: unknown, record: AdminPreference) => record.confidence?.toFixed(2) || '-',
    },
    { title: '来源会话', dataIndex: 'sourceConversationId', hideInSearch: true, ellipsis: true },
    { title: '来源消息', dataIndex: 'sourceMessageId', hideInSearch: true, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: { 0: { text: '禁用' }, 1: { text: '启用' } },
      render: (_: unknown, record: AdminPreference) => {
        const item = getSwitchStatus(record.status);
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', hideInSearch: true },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 220,
      render: (_: unknown, record: UserPreference) =>
        write && [
          <Button key="edit" type="link" onClick={() => { setId(record.id); setOpen(true); }}>
            编辑
          </Button>,
          <Popconfirm
            key="status"
            title={`确认${record.status === 1 ? '禁用' : '启用'}该偏好？`}
            onConfirm={() => updateStatus(record)}
          >
            <Button type="link">{record.status === 1 ? '禁用' : '启用'}</Button>
          </Popconfirm>,
          <Popconfirm
            key="delete"
            title="确认删除该偏好？"
            onConfirm={async () => {
              if (!record.id) return;
              const response = await deleteAdminPreference(record.id);
              if (response.code === 200) {
                message.success(response.message || '删除成功');
                ref.current?.reload();
              } else message.error(response.message || '删除失败');
            }}
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>,
        ],
    },
  ];

  return (
    <PageContainer>
      <Alert
        showIcon
        type="info"
        message="系统会在聊天后自动提取长期偏好。你也可以手动维护偏好；启用的偏好会在后续聊天中作为上下文参考。"
        style={{ marginBottom: 16 }}
      />
      <ProTable<AdminPreference>
        actionRef={ref}
        rowKey="id"
        columns={columns}
        request={(params: AdminPreferenceSearchParams) => getAdminPreferenceList(params)}
        toolBarRender={() =>
          write && [
            <Button key="new" icon={<PlusOutlined />} type="primary" onClick={() => { setId(undefined); setOpen(true); }}>
              新增偏好
            </Button>,
          ]
        }
      />
      <PreferenceForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => { setId(undefined); ref.current?.reload(); }}
      />
    </PageContainer>
  );
};

export default PreferencePage;
