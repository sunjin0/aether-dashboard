import React, {useRef, useState} from 'react';
import {ActionType, PageContainer, ProDescriptions, ProTable} from '@ant-design/pro-components';
import {Button, Card, Drawer, Empty, message, Popconfirm, Spin} from 'antd';
import {history, useAccess} from '@@/exports';
import {
  closeAgentConversation,
  deleteAgentConversation,
  getAgentConversationInfo,
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController';
import {getOptionList} from '@/services/sys/DictController';
import {AgentConversation, AgentConversationSearchParams, AgentMessage} from '@/services/entity/Agent';
import AgentMessageBubble from '@/components/AgentMessageBubble';

// ProDescriptions 不支持 request，保留用于详情展示
const statusValueEnum = {
  0: {text: '进行中', status: 'Processing'},
  1: {text: '关闭', status: 'Default'},
  2: {text: '归档', status: 'Warning'},
};

const AgentConversationPage: React.FC = () => {
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const path = history.location.pathname;
  const write = permissionMap[path];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string>();
  const [conversation, setConversation] = useState<AgentConversation>();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const [detailResult, messageResult] = await Promise.all([
        getAgentConversationInfo(id),
        getAgentConversationMessages(id, {current: 1, pageSize: 20}),
      ]);

      if (detailResult.code === 200) {
        setConversation(detailResult.data);
      } else {
        setConversation(undefined);
        message.error(detailResult.message || '加载会话详情失败');
      }

      if (messageResult.code === 200) {
        setMessages(messageResult.data || []);
      } else {
        setMessages([]);
        message.error(messageResult.message || '加载消息列表失败');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID');
      return;
    }
    setCurrentId(record.id);
    setDrawerOpen(true);
    await loadDetail(record.id);
  };

  const handleCloseConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID');
      return;
    }

    const {code, message: msg} = await closeAgentConversation(record.id);
    if (code === 200) {
      message.success(msg || '关闭成功');
      ref.current?.reload();
      if (record.id === currentId) {
        await loadDetail(record.id);
      }
    } else {
      message.error(msg || '关闭失败');
    }
  };

  const handleDeleteConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID');
      return;
    }

    const {code, message: msg} = await deleteAgentConversation(record.id);
    if (code === 200) {
      message.success(msg || '删除成功');
      ref.current?.reload();
      if (record.id === currentId) {
        setDrawerOpen(false);
        setCurrentId(undefined);
        setConversation(undefined);
        setMessages([]);
      }
    } else {
      message.error(msg || '删除失败');
    }
  };

  const columns: any[] = [
    {
      title: '会话标题',
      dataIndex: 'title',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: 'Agent ID',
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Conversation_Status'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 250,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentConversation) => [
        <Button type="link" key="detail" onClick={() => openDetail(record)}>
          查看详情
        </Button>,
        write && record.status === 0 ? (
          <Popconfirm
            key="close"
            title="确认关闭该会话？"
            onConfirm={() => handleCloseConversation(record)}
          >
            <Button type="link" key="close-button">
              关闭
            </Button>
          </Popconfirm>
        ) : null,
        write ? (
          <Popconfirm
            key="delete"
            title="确认删除该会话？"
            onConfirm={() => handleDeleteConversation(record)}
          >
            <Button type="link" key="delete-button">
              删除
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: AgentConversationSearchParams) => getAgentConversationList(params)}
        columns={columns}
      />
      <Drawer
        title="会话详情"
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {conversation ? (
            <ProDescriptions
              column={1}
              dataSource={conversation}
              columns={[
                { title: 'ID', dataIndex: 'id' },
                { title: '标题', dataIndex: 'title' },
                { title: 'Agent ID', dataIndex: 'agentDefinitionId' },
                { title: '状态', dataIndex: 'status', valueEnum: statusValueEnum },
                { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime' },
                { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime' },
              ]}
            />
          ) : (
            <Empty description="暂无会话详情" />
          )}
          <Card title="消息列表" style={{ marginTop: 16 }}>
            {!messages.length ? (
              <Empty description="暂无消息" />
            ) : (
              <div className="agent-conversation-message-list">
                {messages.map((item, index) => (
                  <AgentMessageBubble
                    key={item.id || `${item.role}-${index}`}
                    agentMessage={item}
                    compact={true}
                  />
                ))}
              </div>
            )}
          </Card>
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default AgentConversationPage;
