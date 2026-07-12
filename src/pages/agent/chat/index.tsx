import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Checkbox,
  Empty,
  Input,
  List,
  message,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ClearOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { getAgentDefinitionList } from '@/services/agent/AgentDefinitionController';
import { streamAgentChat } from '@/services/agent/ChatController';
import {
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController';
import { getOptionList } from '@/services/sys/DictController';
import { AgentConversation, AgentDefinition, AgentMessage } from '@/services/entity/Agent';
import { Option } from '@/services/entity/Common';
import AgentMessageBubble from '@/components/AgentMessageBubble';
import './index.less';

const { Text } = Typography;
const TYPEWRITER_INTERVAL = 16;
const TYPEWRITER_BASE_STEP = 2;
const TYPEWRITER_MAX_STEP = 50;

type ChatStreamStatus = 'streaming' | 'error' | 'stopped';

type ChatMessage = AgentMessage & {
  clientId?: string;
  streamStatus?: ChatStreamStatus;
  errorMsg?: string;
  reasoningStream?: string;
};

const createClientId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}`;

const quickStartQuestions = [
  '帮我写一个Hello World',
  '解释一下机器学习',
  '推荐一些学习资源',
  '如何提高代码质量',
];

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');
  const [reasoningEffortOptions, setReasoningEffortOptions] = useState<Option[]>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
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
        status: 0,
        current: 1,
        pageSize: 50,
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
        pageSize: 100,
        includeToolCalls: true,
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
    getOptionList('Agent_Reasoning_Effort').then(setReasoningEffortOptions);
  }, []);

  useEffect(() => {
    if (!showScrollBottom) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
      const queueLen = typewriterQueueRef.current.length;
      if (!queueLen) {
        clearTypewriterTimer();
        runTypewriterDrainCallback();
        return;
      }

      const step = Math.min(TYPEWRITER_BASE_STEP + Math.floor(queueLen / 20), TYPEWRITER_MAX_STEP);
      const nextText = typewriterQueueRef.current.slice(0, step);
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
    if (conversation.agentDefinitionId) {
      setAgentId(conversation.agentDefinitionId);
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

  const handleSend = async (text?: string) => {
    if (sending) {
      return;
    }

    const content = (text || input).trim();
    const conversationAgentId = conversationId
      ? conversations.find((item) => item.id === conversationId)?.agentDefinitionId
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
      const payload: any = conversationId
        ? { agentId: sendAgentId, conversationId, message: content }
        : { agentId: sendAgentId, message: content };
      if (thinking) {
        payload.thinking = true;
        payload.reasoningEffort = reasoningEffort;
      }
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
        onReasoning: (chunk, data) => {
          if (data.conversationId) {
            setConversationId(data.conversationId);
            if (!conversationId) {
              shouldReloadConversations = true;
            }
          }
          if (!chunk) {
            return;
          }
          updateAssistantMessage(assistantClientId, (item) => ({
            ...item,
            reasoningStream: (item.reasoningStream || '') + chunk,
          }));
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
          const doneConversationId = data.conversationId;
          if (doneConversationId) {
            setConversationId(doneConversationId);
            if (!conversationId) {
              shouldReloadConversations = true;
            }
          }
          typewriterDrainPromise = waitForTypewriterDrain().then(async () => {
            updateAssistantMessage(assistantClientId, (item) => ({
              ...item,
              id: data.messageId || item.id,
              conversationId: doneConversationId || item.conversationId,
              content: data.content || item.content,
              reasoningContent: data.reasoningContent || item.reasoningContent || item.reasoningStream,
              reasoningStream: undefined,
              reasoningTokens: data.reasoningTokens ?? item.reasoningTokens,
              model: data.model || item.model,
              promptTokens: data.promptTokens ?? item.promptTokens,
              completionTokens: data.completionTokens ?? item.completionTokens,
              totalTokens: data.totalTokens ?? item.totalTokens,
              latencyMs: data.latencyMs ?? item.latencyMs,
              streamStatus: undefined,
            }));
            if (doneConversationId && data.messageId) {
              try {
                const result = await getAgentConversationMessages(doneConversationId, {
                  current: 1,
                  pageSize: 100,
                  includeToolCalls: true,
                });
                if (result.code === 200 && result.data) {
                  setMessages(result.data);
                }
              } catch {
                // ignore
              }
            }
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

  const handleScrollBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottom(!isNearBottom);
  };

  const renderConversationTitle = (item: AgentConversation) => {
    return item.title || item.createdAt || item.id || '未命名会话';
  };

  const renderTimeGroup = (date: string) => {
    const now = new Date();
    const target = new Date(date);
    const diffDays = Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return '最近7天';
    if (diffDays < 30) return '最近30天';
    return '更早';
  };

  const groupedConversations = useMemo(() => {
    const filtered = searchText
      ? conversations.filter(
          (item) =>
            item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.id?.toLowerCase().includes(searchText.toLowerCase()),
        )
      : conversations;

    const groups: Record<string, AgentConversation[]> = {};
    filtered.forEach((item) => {
      const date = item.updatedAt || item.createdAt || '';
      const group = renderTimeGroup(date);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    });

    return groups;
  }, [conversations, searchText]);

  const currentConversation = conversations.find((item) => item.id === conversationId);
  const activeAgentId = currentConversation?.agentDefinitionId || agentId;
  const currentAgent = agents.find((item) => item.id === activeAgentId);

  return (
    <PageContainer
      header={{
        title: 'AI 对话',
        breadcrumb: undefined,
      }}
    >
      <div className="agent-chat-page">
        {/* 侧边栏 */}
        <div className={`agent-chat-sidebar ${sidebarCollapsed ? 'agent-chat-sidebar-collapsed' : ''}`}>
          {!sidebarCollapsed && (
            <>
              <div className="agent-chat-sidebar-header">
                <Select
                  placeholder="选择 Agent"
                  loading={loadingAgents}
                  value={activeAgentId}
                  disabled={sending}
                  showSearch={true}
                  allowClear={true}
                  optionFilterProp="label"
                  style={{ flex: 1 }}
                  onChange={(value) => {
                    setAgentId(value);
                    setConversationId(undefined);
                    setMessages([]);
                  }}
                  options={agents
                    .filter((item) => item.id)
                    .map((item) => ({
                      label: item.name || item.code || item.id,
                      value: item.id,
                    }))}
                />
                <Tooltip title="新建会话">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={sending}
                    onClick={handleNewConversation}
                  />
                </Tooltip>
              </div>

              <div className="agent-chat-sidebar-search">
                <Input
                  placeholder="搜索会话..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
              </div>

              <Spin spinning={loadingConversations}>
                <div className="agent-chat-session-list">
                  {Object.entries(groupedConversations).map(([group, items]) => (
                    <div key={group}>
                      <div className="agent-chat-session-group">{group}</div>
                      <List
                        dataSource={items}
                        renderItem={(item) => (
                          <List.Item
                            className={item.id === conversationId ? 'agent-chat-session-active' : undefined}
                            onClick={() => handleSelectConversation(item)}
                          >
                            <List.Item.Meta
                              title={
                                <Tooltip title={renderConversationTitle(item)}>
                                  <Text
                                    strong={item.id === conversationId}
                                    ellipsis={true}
                                    style={{ display: 'block' }}
                                  >
                                    {renderConversationTitle(item)}
                                  </Text>
                                </Tooltip>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  ))}
                  {Object.keys(groupedConversations).length === 0 && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={searchText ? '没有找到匹配的会话' : '暂无会话'}
                      style={{ padding: '40px 0' }}
                    />
                  )}
                </div>
              </Spin>
            </>
          )}
        </div>

        {/* 主面板 */}
        <div className="agent-chat-panel">
          {/* 顶部 */}
          <div className="agent-chat-panel-header">
            <div className="agent-chat-panel-info">
              <div className="agent-chat-panel-title">
                <Tooltip title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>
                  <Button
                    type="text"
                    icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  />
                </Tooltip>
                <Text strong={true} style={{ fontSize: 16 }}>
                  {currentAgent?.name || currentAgent?.code || '未选择 Agent'}
                </Text>
                {currentAgent?.model && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {currentAgent.model}
                  </Tag>
                )}
              </div>
              <div className="agent-chat-panel-subtitle">
                {currentConversation ? renderConversationTitle(currentConversation) : '新会话'}
              </div>
            </div>
            <div className="agent-chat-panel-actions">
              {sending && (
                <Button
                  type="primary"
                  danger
                  icon={<ClearOutlined />}
                  onClick={handleStop}
                >
                  停止生成
                </Button>
              )}
            </div>
          </div>

          {/* 消息列表 */}
          <div className="agent-chat-message-container">
            <div
              className="agent-chat-message-scroll"
              ref={messageListRef}
              onScroll={handleScroll}
            >
              <Spin spinning={loadingMessages}>
                <div className="agent-chat-message-list">
                  {!messages.length ? (
                    <div className="agent-chat-empty-container">
                      <Empty
                        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                        description={
                          <span style={{ fontSize: 15, color: 'rgba(0, 0, 0, 0.45)' }}>
                            {currentAgent ? `与 ${currentAgent.name} 开始对话` : '选择一个 Agent 开始对话'}
                          </span>
                        }
                      >
                        {currentAgent && (
                          <div className="agent-chat-quick-start">
                            {quickStartQuestions.map((q) => (
                              <Tag key={q} onClick={() => handleSend(q)}>
                                {q}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </Empty>
                    </div>
                  ) : (
                    <>
                      {messages.map((item, index) => (
                        <AgentMessageBubble
                          key={item.id || item.clientId || `${item.role}-${index}`}
                          agentMessage={item}
                          status={item.streamStatus}
                          errorMessage={item.errorMsg}
                        />
                      ))}
                      <div ref={messageEndRef} />
                    </>
                  )}
                </div>
              </Spin>
            </div>

            {showScrollBottom && (
              <div className="agent-chat-scroll-bottom">
                <Button
                  icon={<ArrowDownOutlined />}
                  onClick={handleScrollBottom}
                >
                  回到底部
                </Button>
              </div>
            )}
          </div>

          {/* 底部输入 */}
          <div className="agent-chat-input-bar">
            <div className="agent-chat-thinking-bar">
              <Checkbox
                checked={thinking}
                onChange={(e) => setThinking(e.target.checked)}
              >
                <span className="agent-chat-thinking-label">深度思考</span>
              </Checkbox>
              {thinking && (
                <Select
                  size="small"
                  value={reasoningEffort}
                  onChange={setReasoningEffort}
                  style={{ width: 80 }}
                  options={reasoningEffortOptions}
                />
              )}
              {thinking && sending && (
                <Tag color="processing" style={{ marginLeft: 8 }}>
                  思考中...
                </Tag>
              )}
            </div>
            <div className="agent-chat-input-wrapper">
              <div className="agent-chat-input-box">
                <Input.TextArea
                  value={input}
                  disabled={sending}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  placeholder="输入消息，支持 Markdown 格式..."
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
              </div>
              <Button
                className="agent-chat-send-btn"
                type="primary"
                disabled={sending || !input.trim()}
                onClick={() => handleSend()}
              >
                发送
              </Button>
            </div>
            <div className="agent-chat-input-hint">
              <span>
                <kbd>Enter</kbd> 发送
              </span>
              <span>
                <kbd>Shift</kbd> + <kbd>Enter</kbd> 换行
              </span>
              {currentAgent?.model && (
                <span style={{ marginLeft: 'auto' }}>
                  模型: {currentAgent.model}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ChatDebugPage;
