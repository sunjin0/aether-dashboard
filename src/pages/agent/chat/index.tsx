import React, {useEffect, useRef, useState} from 'react';
import {PageContainer} from '@ant-design/pro-components';
import {Button, Card, Empty, Input, List, message, Select, Spin, Typography} from 'antd';
import {getAgentDefinitionList} from '@/services/agent/AgentDefinitionController';
import {sendAgentChat} from '@/services/agent/ChatController';
import {
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController';
import {AgentConversation, AgentDefinition, AgentMessage} from '@/services/entity/Agent';
import AgentMessageBubble from '@/components/AgentMessageBubble';
import './index.less';

const {Text} = Typography;

const ChatDebugPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [agentId, setAgentId] = useState<string>();
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const {code, data, message: msg} = await getAgentDefinitionList({
        current: 1,
        pageSize: 1000,
        status: 1,
      });
      if (code === 200) {
        setAgents(data || []);
      } else {
        message.error(msg || '加载 Agent 列表失败');
      }
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const {code, data, message: msg} = await getAgentConversationList({
        current: 1,
        pageSize: 20,
      });
      if (code === 200) {
        setConversations(data || []);
      } else {
        message.error(msg || '加载会话列表失败');
      }
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (id: string) => {
    setLoadingMessages(true);
    try {
      const {code, data, message: msg} = await getAgentConversationMessages(id, {
        current: 1,
        pageSize: 20,
      });
      if (code === 200) {
        setMessages(data || []);
      } else {
        message.error(msg || '加载消息列表失败');
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadAgents();
    loadConversations();
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  const handleNewConversation = () => {
    setConversationId(undefined);
    setMessages([]);
  };

  const handleSelectConversation = async (conversation: AgentConversation) => {
    if (!conversation.id) {
      return;
    }

    setConversationId(conversation.id);
    if (conversation.agentId) {
      setAgentId(conversation.agentId);
    }
    await loadMessages(conversation.id);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!agentId) {
      message.error('请选择 Agent');
      return;
    }
    if (!content) {
      message.error('请输入消息内容');
      return;
    }

    const userMessage: AgentMessage = {
      role: 'user',
      content,
    };

    setSending(true);
    setMessages((current) => [...current, userMessage]);
    try {
      const payload = conversationId
        ? {agentId, conversationId, message: content}
        : {agentId, message: content};
      const {code, data, message: msg} = await sendAgentChat(payload);
      if (code === 200) {
        setMessages((current) => [...current, data]);
        setInput('');
        if (!conversationId && data?.conversationId) {
          setConversationId(data.conversationId);
          await loadConversations();
        }
      } else {
        setMessages((current) => current.filter((item) => item !== userMessage));
        message.error(msg || '发送失败');
      }
    } catch (error) {
      setMessages((current) => current.filter((item) => item !== userMessage));
      message.error('发送失败');
    } finally {
      setSending(false);
    }
  };

  const renderConversationTitle = (item: AgentConversation) => {
    return item.title || item.createdAt || item.id || '未命名会话';
  };

  const currentAgent = agents.find((item) => item.id === agentId);
  const currentConversation = conversations.find((item) => item.id === conversationId);

  return (
    <PageContainer>
      <div className="agent-chat-page">
        <Card className="agent-chat-sidebar" bodyStyle={{padding: 0}}>
          <div className="agent-chat-sidebar-header">
            <Select
              placeholder="请选择启用 Agent"
              loading={loadingAgents}
              value={agentId}
              showSearch={true}
              allowClear={true}
              optionFilterProp="label"
              onChange={(value) => {
                setAgentId(value);
                setConversationId(undefined);
                setMessages([]);
              }}
              options={agents
                .filter((item) => item.id)
                .map((item) => ({label: item.name || item.code || item.id, value: item.id}))}
            />
            <Button type="primary" block={true} onClick={handleNewConversation}>
              新建会话
            </Button>
          </div>
          <Spin spinning={loadingConversations}>
            <List
              className="agent-chat-session-list"
              dataSource={conversations}
              locale={{emptyText: '暂无会话'}}
              renderItem={(item) => (
                <List.Item
                  className={item.id === conversationId ? 'agent-chat-session-active' : undefined}
                  onClick={() => handleSelectConversation(item)}
                >
                  <List.Item.Meta
                    title={
                      <Text strong={item.id === conversationId} ellipsis={true}>
                        {renderConversationTitle(item)}
                      </Text>
                    }
                    description={item.updatedAt || item.createdAt}
                  />
                </List.Item>
              )}
            />
          </Spin>
        </Card>

        <Card className="agent-chat-panel" bodyStyle={{padding: 0}}>
          <div className="agent-chat-panel-header">
            <div>
              <Text strong={true}>{currentAgent?.name || currentAgent?.code || '未选择 Agent'}</Text>
              <div className="agent-chat-panel-subtitle">
                {currentConversation ? renderConversationTitle(currentConversation) : '新会话'}
              </div>
            </div>
            {conversationId ? <Text type="secondary">会话：{conversationId}</Text> : null}
          </div>

          <Spin spinning={loadingMessages} wrapperClassName="agent-chat-message-spin">
            <div className="agent-chat-message-list">
              {!messages.length ? (
                <Empty description="请选择会话或发送新消息" />
              ) : (
                <>
                  {messages.map((item, index) => (
                    <AgentMessageBubble key={item.id || `${item.role}-${index}`} message={item} />
                  ))}
                  <div ref={messageEndRef} />
                </>
              )}
            </div>
          </Spin>

          <div className="agent-chat-input-bar">
            <Input.TextArea
              value={input}
              disabled={sending}
              autoSize={{minRows: 2, maxRows: 6}}
              placeholder="支持 Markdown，Shift+Enter 换行"
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button type="primary" loading={sending} disabled={sending} onClick={handleSend}>
              发送
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ChatDebugPage;
