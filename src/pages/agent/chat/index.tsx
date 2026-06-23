import React, { useEffect, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Empty, Input, List, message, Select, Spin, Typography } from 'antd';
import { getAgentDefinitionList } from '@/services/agent/AgentDefinitionController';
import { streamAgentChat } from '@/services/agent/ChatController';
import {
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController';
import { AgentConversation, AgentDefinition, AgentMessage } from '@/services/entity/Agent';
import AgentMessageBubble from '@/components/AgentMessageBubble';
import './index.less';

const { Text } = Typography;
const TYPEWRITER_INTERVAL = 24;
const TYPEWRITER_STEP = 1;

type ChatStreamStatus = 'streaming' | 'error' | 'stopped';

type ChatMessage = AgentMessage & {
  clientId?: string;
  streamStatus?: ChatStreamStatus;
  errorMsg?: string;
};

const createClientId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}`;

const ChatDebugPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [agentId, setAgentId] = useState<string>();
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController>();
  const streamingAssistantIdRef = useRef<string>();
  const stoppedByUserRef = useRef(false);
  const typewriterQueueRef = useRef('');
  const typewriterTimerRef = useRef<number>();
  const typewriterDrainCallbackRef = useRef<() => void>();

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const {
        code,
        data,
        message: msg,
      } = await getAgentDefinitionList({
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
      const {
        code,
        data,
        message: msg,
      } = await getAgentConversationList({
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
      const {
        code,
        data,
        message: msg,
      } = await getAgentConversationMessages(id, {
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
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateAssistantMessage = (
    clientId: string,
    updater: (messageItem: ChatMessage) => ChatMessage,
  ) => {
    setMessages((current) =>
      current.map((item) => (item.clientId === clientId ? updater(item) : item)),
    );
  };

  const clearTypewriterTimer = () => {
    if (typewriterTimerRef.current !== undefined) {
      window.clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = undefined;
    }
  };

  const runTypewriterDrainCallback = () => {
    const callback = typewriterDrainCallbackRef.current;
    typewriterDrainCallbackRef.current = undefined;
    callback?.();
  };

  const resetTypewriter = () => {
    clearTypewriterTimer();
    typewriterQueueRef.current = '';
    typewriterDrainCallbackRef.current = undefined;
  };

  const startTypewriterTimer = (assistantClientId: string) => {
    if (typewriterTimerRef.current !== undefined) {
      return;
    }

    typewriterTimerRef.current = window.setInterval(() => {
      const nextText = typewriterQueueRef.current.slice(0, TYPEWRITER_STEP);
      if (!nextText) {
        clearTypewriterTimer();
        runTypewriterDrainCallback();
        return;
      }

      typewriterQueueRef.current = typewriterQueueRef.current.slice(nextText.length);
      updateAssistantMessage(assistantClientId, (item) => ({
        ...item,
        content: `${item.content || ''}${nextText}`,
      }));

      if (!typewriterQueueRef.current) {
        clearTypewriterTimer();
        runTypewriterDrainCallback();
      }
    }, TYPEWRITER_INTERVAL);
  };

  const appendTypewriterText = (assistantClientId: string, text: string) => {
    typewriterQueueRef.current += text;
    startTypewriterTimer(assistantClientId);
  };

  const flushTypewriterQueue = (assistantClientId: string) => {
    const remainingText = typewriterQueueRef.current;
    resetTypewriter();
    if (!remainingText) {
      return;
    }
    updateAssistantMessage(assistantClientId, (item) => ({
      ...item,
      content: `${item.content || ''}${remainingText}`,
    }));
  };

  const waitForTypewriterDrain = () => {
    if (!typewriterQueueRef.current && typewriterTimerRef.current === undefined) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      typewriterDrainCallbackRef.current = resolve;
    });
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      resetTypewriter();
    };
  }, []);

  const handleNewConversation = () => {
    if (sending) {
      return;
    }
    setConversationId(undefined);
    setMessages([]);
  };

  const handleSelectConversation = async (conversation: AgentConversation) => {
    if (sending || !conversation.id) {
      return;
    }

    setConversationId(conversation.id);
    if (conversation.agentId) {
      setAgentId(conversation.agentId);
    }
    await loadMessages(conversation.id);
  };

  const markAssistantStopped = (assistantClientId?: string) => {
    if (!assistantClientId) {
      return;
    }
    updateAssistantMessage(assistantClientId, (item) => ({
      ...item,
      streamStatus: 'stopped',
    }));
  };

  const markAssistantError = (assistantClientId: string, errorMsg: string) => {
    updateAssistantMessage(assistantClientId, (item) => ({
      ...item,
      streamStatus: 'error',
      errorMsg,
    }));
  };

  const handleStop = () => {
    if (!abortControllerRef.current) {
      return;
    }
    stoppedByUserRef.current = true;
    abortControllerRef.current.abort();
    resetTypewriter();
    markAssistantStopped(streamingAssistantIdRef.current);
  };

  const handleSend = async () => {
    if (sending) {
      return;
    }

    const content = input.trim();
    const conversationAgentId = conversationId
      ? conversations.find((item) => item.id === conversationId)?.agentId
      : undefined;
    const sendAgentId = conversationAgentId || agentId;
    if (!sendAgentId) {
      message.error('请选择 Agent');
      return;
    }
    if (!content) {
      message.error('请输入消息内容');
      return;
    }

    const userMessage: ChatMessage = {
      clientId: createClientId('user'),
      role: 'user',
      content,
    };
    const assistantClientId = createClientId('assistant');
    const assistantMessage: ChatMessage = {
      clientId: assistantClientId,
      role: 'assistant',
      content: '',
      streamStatus: 'streaming',
    };
    const controller = new AbortController();
    let shouldReloadConversations = false;
    let terminalEventReceived = false;
    let typewriterDrainPromise: Promise<void> | undefined;

    resetTypewriter();
    abortControllerRef.current = controller;
    streamingAssistantIdRef.current = assistantClientId;
    stoppedByUserRef.current = false;
    setSending(true);
    setInput('');
    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const payload = conversationId
        ? { agentId: sendAgentId, conversationId, message: content }
        : { agentId: sendAgentId, message: content };
      await streamAgentChat(payload, {
        signal: controller.signal,
        onMessage: (chunk, data) => {
          if (data.conversationId) {
            setConversationId(data.conversationId);
            if (!conversationId) {
              shouldReloadConversations = true;
            }
          }
          if (!chunk) {
            return;
          }
          appendTypewriterText(assistantClientId, chunk);
        },
        onError: (data) => {
          terminalEventReceived = true;
          flushTypewriterQueue(assistantClientId);
          const errorMsg = data.message || '生成失败';
          markAssistantError(assistantClientId, errorMsg);
          message.error(errorMsg);
        },
        onDone: (data) => {
          terminalEventReceived = true;
          if (data.conversationId) {
            setConversationId(data.conversationId);
            if (!conversationId) {
              shouldReloadConversations = true;
            }
          }
          typewriterDrainPromise = waitForTypewriterDrain().then(() => {
            updateAssistantMessage(assistantClientId, (item) => ({
              ...item,
              id: data.messageId || item.id,
              conversationId: data.conversationId || item.conversationId,
              totalTokens: data.totalTokens ?? item.totalTokens,
              streamStatus: undefined,
            }));
          });
        },
      });

      if (typewriterDrainPromise) {
        await typewriterDrainPromise;
      }
      if (!terminalEventReceived && !stoppedByUserRef.current) {
        flushTypewriterQueue(assistantClientId);
        markAssistantError(assistantClientId, '连接已断开');
      }
      if (shouldReloadConversations) {
        await loadConversations();
      }
    } catch (error) {
      if (stoppedByUserRef.current || controller.signal.aborted) {
        markAssistantStopped(assistantClientId);
        return;
      }
      const errorMsg = error instanceof Error ? error.message : '发送失败';
      flushTypewriterQueue(assistantClientId);
      markAssistantError(assistantClientId, errorMsg);
      message.error(errorMsg || '发送失败');
    } finally {
      setSending(false);
      abortControllerRef.current = undefined;
      streamingAssistantIdRef.current = undefined;
      stoppedByUserRef.current = false;
    }
  };

  const renderConversationTitle = (item: AgentConversation) => {
    return item.title || item.createdAt || item.id || '未命名会话';
  };

  const currentConversation = conversations.find((item) => item.id === conversationId);
  const activeAgentId = currentConversation?.agentId || agentId;
  const currentAgent = agents.find((item) => item.id === activeAgentId);

  return (
    <PageContainer>
      <div className="agent-chat-page">
        <Card className="agent-chat-sidebar" bodyStyle={{ padding: 0 }}>
          <div className="agent-chat-sidebar-header">
            <Select
              placeholder="请选择启用 Agent"
              loading={loadingAgents}
              value={activeAgentId}
              disabled={sending}
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
                .map((item) => ({ label: item.name || item.code || item.id, value: item.id }))}
            />
            <Button type="primary" block={true} disabled={sending} onClick={handleNewConversation}>
              新建会话
            </Button>
          </div>
          <Spin spinning={loadingConversations} wrapperClassName="agent-chat-session-spin">
            <List
              className="agent-chat-session-list"
              dataSource={conversations}
              locale={{ emptyText: '暂无会话' }}
              renderItem={(item) => (
                <List.Item
                  className={[
                    item.id === conversationId ? 'agent-chat-session-active' : undefined,
                    sending ? 'agent-chat-session-disabled' : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')}
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

        <Card className="agent-chat-panel" bodyStyle={{ padding: 0 }}>
          <div className="agent-chat-panel-header">
            <div>
              <Text strong={true}>
                {currentAgent?.name || currentAgent?.code || '未选择 Agent'}
              </Text>
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
                    <AgentMessageBubble
                      key={item.id || item.clientId || `${item.role}-${index}`}
                      message={item}
                      status={item.streamStatus}
                      errorMessage={item.errorMsg}
                    />
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
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder="支持 Markdown，Shift+Enter 换行"
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  if (!sending) {
                    handleSend();
                  }
                }
              }}
            />
            <Button
              type={sending ? 'default' : 'primary'}
              danger={sending}
              onClick={sending ? handleStop : handleSend}
            >
              {sending ? '停止生成' : '发送'}
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ChatDebugPage;
