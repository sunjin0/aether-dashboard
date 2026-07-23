import React, { useState, useRef, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { Modal, Input, Button, Space, Typography, Spin, Select, Avatar } from 'antd';
import { SendOutlined, StopOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { streamAgentChat } from '@/services/agent/ChatController';
import { getAgentDefinitionList } from '@/services/agent/AgentDefinitionController';
import { AgentDefinition } from '@/services/entity/Agent';
import MarkdownText from '@/components/MarkdownText';
import './PromptGenerateModal.less';

const { Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PromptGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (prompt: string) => void;
  agentName?: string;
}

const PromptGenerateModal: React.FC<PromptGenerateModalProps> = ({
  open,
  onClose,
  onGenerated,
  agentName,
}) => {
  const intl = useIntl();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const abortControllerRef = useRef<AbortController>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      loadAgents();
    } else {
      setMessages([]);
      setSelectedAgentId(undefined);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && selectedAgentId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, selectedAgentId]);

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const { code, data } = await getAgentDefinitionList({
        current: 1,
        pageSize: 1000,
        status: 1,
      });
      if (code === 200) {
        setAgents(data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAgents(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedAgentId || loading) return;

    const isFirstMessage = messages.length === 0;
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const systemPrompt = isFirstMessage
      ? `你是一个系统提示词生成助手。用户会描述需要什么样的 AI 助手，请根据描述生成一个专业的系统提示词。

要求：
1. 输出纯文本格式的系统提示词
2. 包含角色定义、能力描述、行为规范
3. 结构清晰，使用 Markdown 格式
4. 内容完整，可直接使用

当前 Agent 名称：${agentName || '未命名'}`
      : '请根据用户的反馈继续优化和完善系统提示词，保持之前的输出格式。';

    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n');
    const fullMessage = isFirstMessage
      ? `${systemPrompt}\n\n用户需求：${content}`
      : `${systemPrompt}\n\n对话历史：\n${conversationHistory}\n\n用户：${content}`;

    abortControllerRef.current = new AbortController();
    let assistantContent = '';

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      await streamAgentChat(
        {
          agentId: selectedAgentId,
          message: fullMessage,
          temporary: true,
        },
        {
          signal: abortControllerRef.current.signal,
          onMessage: (chunk) => {
            assistantContent += chunk;
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantContent,
              };
              return newMessages;
            });
          },
          onError: (err) => {
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: intl.formatMessage(
                  { id: 'pages.components.systemPromptEditor.errorWithMessage' },
                  {
                    message:
                      err.message ||
                      intl.formatMessage({
                        id: 'pages.components.systemPromptEditor.generateFailed',
                      }),
                  },
                ),
              };
              return newMessages;
            });
            setLoading(false);
          },
          onDone: () => {
            setLoading(false);
          },
        },
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: intl.formatMessage(
              { id: 'pages.components.systemPromptEditor.errorWithMessage' },
              {
                message: intl.formatMessage({
                  id: 'pages.components.systemPromptEditor.generateFailed',
                }),
              },
            ),
          };
          return newMessages;
        });
      }
      setLoading(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
  };

  const handleUse = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.content && !m.content.startsWith('[错误]'));

    if (lastAssistantMessage) {
      onGenerated(lastAssistantMessage.content);
      handleClose();
    }
  };

  const handleClose = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setInput('');
    setLoading(false);
    setSelectedAgentId(undefined);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.content && !m.content.startsWith('[错误]'));

  return (
    <Modal
      title={intl.formatMessage({ id: 'pages.components.systemPromptEditor.generateTitle' })}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      destroyOnClose
      className="prompt-generate-modal"
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          {intl.formatMessage({ id: 'pages.components.systemPromptEditor.generateDescription' })}
        </Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder={intl.formatMessage({
            id: 'pages.components.systemPromptEditor.selectGenerateAgent',
          })}
          style={{ width: '100%' }}
          value={selectedAgentId}
          onChange={setSelectedAgentId}
          loading={loadingAgents}
          showSearch
          optionFilterProp="label"
          options={agents.map((agent) => ({
            label: `${agent.name} (${agent.code})`,
            value: agent.id,
          }))}
          notFoundContent={
            loadingAgents ? (
              <Spin size="small" />
            ) : (
              intl.formatMessage({ id: 'pages.components.systemPromptEditor.noAvailableAgents' })
            )
          }
        />
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && selectedAgentId && (
            <div className="chat-empty">
              <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <Text type="secondary">
                {intl.formatMessage({
                  id: 'pages.components.systemPromptEditor.describeAssistant',
                })}
              </Text>
            </div>
          )}

          {messages.map((msg, index) => {
            const isLastAssistant = msg.role === 'assistant' && index === messages.length - 1;
            const isThinking = isLastAssistant && loading && !msg.content;
            return (
              <div key={index} className={`chat-message chat-message-${msg.role}`}>
                <div className="chat-message-avatar">
                  {msg.role === 'user' ? (
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                  ) : (
                    <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />
                  )}
                </div>
                <div className="chat-message-content">
                  {msg.role === 'assistant' ? (
                    <MarkdownText content={msg.content} loading={isThinking} />
                  ) : (
                    <div className="chat-message-text">{msg.content}</div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <Input.TextArea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedAgentId
                  ? intl.formatMessage({
                      id: 'pages.components.systemPromptEditor.inputMessagePlaceholder',
                    })
                  : intl.formatMessage({
                      id: 'pages.components.systemPromptEditor.selectAgentFirst',
                    })
              }
              autoSize={{ minRows: 2, maxRows: 6 }}
              disabled={!selectedAgentId || loading}
            />
            <div className="chat-input-actions">
              {loading ? (
                <Button icon={<StopOutlined />} onClick={handleStop}>
                  {intl.formatMessage({ id: 'pages.common.stop' })}
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || !selectedAgentId}
                >
                  {intl.formatMessage({ id: 'pages.common.send' })}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          <Button onClick={handleClose}>{intl.formatMessage({ id: 'pages.common.cancel' })}</Button>
          <Button type="primary" onClick={handleUse} disabled={!lastAssistantMessage || loading}>
            {intl.formatMessage({ id: 'pages.components.systemPromptEditor.useThisPrompt' })}
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default PromptGenerateModal;
