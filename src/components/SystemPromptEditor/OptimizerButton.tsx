import React, { useState, useRef, useEffect } from 'react';
import { useIntl } from '@umijs/max';
import { Button, Modal, Typography, Spin, Space, message, Select, Avatar, Input } from 'antd';
import {
  ThunderboltOutlined,
  StopOutlined,
  RobotOutlined,
  UserOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { streamAgentChat } from '@/services/agent/ChatController';
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController';
import { AgentDefinition } from '@/services/entity/Agent';
import MarkdownText from '@/components/MarkdownText';
import './OptimizerButton.less';

const { Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OptimizerButtonProps {
  prompt: string;
  onOptimized: (optimized: string) => void;
  disabled?: boolean;
}

const OptimizerButton: React.FC<OptimizerButtonProps> = ({ prompt, onOptimized, disabled }) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
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
      const options = await getAgentDefinitionOptions();
      setAgents(options.map((item) => ({ id: String(item.value), name: item.label } as any)));
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
      ? `你是一个系统提示词优化助手。请优化用户提供的系统提示词，使其更加专业、清晰、结构化。

优化要求：
1. 保持原有意图和核心功能
2. 改进语言表达，使其更清晰
3. 优化结构，使用 Markdown 格式
4. 补充可能遗漏的行为规范
5. 移除冗余内容
6. 输出优化后的完整提示词

原始提示词：
${prompt}`
      : '请根据用户的反馈继续优化和完善系统提示词，保持之前的输出格式。';

    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n');
    const fullMessage = isFirstMessage
      ? `${systemPrompt}\n\n用户反馈：${content}`
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
                        id: 'pages.components.systemPromptEditor.optimizeFailed',
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
                  id: 'pages.components.systemPromptEditor.optimizeFailed',
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
      onOptimized(lastAssistantMessage.content);
      handleClose();
    }
  };

  const handleClose = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setInput('');
    setLoading(false);
    setSelectedAgentId(undefined);
    setOpen(false);
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
    <>
      <Button
        icon={<ThunderboltOutlined />}
        onClick={() => setOpen(true)}
        disabled={disabled || !prompt}
        title={
          !prompt
            ? intl.formatMessage({ id: 'pages.components.systemPromptEditor.enterPromptFirst' })
            : '一键优化提示词'
        }
      >
        {intl.formatMessage({ id: 'pages.components.systemPromptEditor.optimize' })}
      </Button>

      <Modal
        title={intl.formatMessage({ id: 'pages.components.systemPromptEditor.optimizeTitle' })}
        open={open}
        onCancel={handleClose}
        footer={null}
        width={700}
        destroyOnClose
        className="optimizer-modal"
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            {intl.formatMessage({ id: 'pages.components.systemPromptEditor.optimizeDescription' })}
          </Text>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder={intl.formatMessage({
              id: 'pages.components.systemPromptEditor.selectOptimizeAgent',
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

        <div style={{ marginBottom: 16 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>
            {intl.formatMessage({ id: 'pages.components.systemPromptEditor.originalPrompt' })}
          </Text>
          <div
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              padding: 12,
              maxHeight: 120,
              overflow: 'auto',
              backgroundColor: '#fafafa',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            {prompt}
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 && selectedAgentId && (
              <div className="chat-empty">
                <ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <Text type="secondary">
                  {intl.formatMessage({
                    id: 'pages.components.systemPromptEditor.clickToStartOptimize',
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
                        id: 'pages.components.systemPromptEditor.optimizeInputPlaceholder',
                      })
                    : intl.formatMessage({
                        id: 'pages.components.systemPromptEditor.selectAgentFirst',
                      })
                }
                autoSize={{ minRows: 2, maxRows: 6 }}
                disabled={!selectedAgentId || loading}
              />
              <div className="chat-input-actions">
                {messages.length === 0 ? (
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={() => sendMessage('请开始优化')}
                    disabled={!selectedAgentId || loading}
                  >
                    {intl.formatMessage({
                      id: 'pages.components.systemPromptEditor.startOptimization',
                    })}
                  </Button>
                ) : loading ? (
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
            <Button onClick={handleClose}>
              {intl.formatMessage({ id: 'pages.common.cancel' })}
            </Button>
            <Button type="primary" onClick={handleUse} disabled={!lastAssistantMessage || loading}>
              {intl.formatMessage({
                id: 'pages.components.systemPromptEditor.useOptimizationResult',
              })}
            </Button>
          </Space>
        </div>
      </Modal>
    </>
  );
};

export default OptimizerButton;
