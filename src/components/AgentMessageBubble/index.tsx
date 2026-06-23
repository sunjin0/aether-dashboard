import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Typography } from 'antd';
import { AgentMessage } from '@/services/entity/Agent';
import './index.less';

const { Text } = Typography;

export type AgentMessageBubbleStatus = 'streaming' | 'error' | 'stopped';

export interface AgentMessageBubbleProps {
  message: AgentMessage;
  align?: 'left' | 'right';
  compact?: boolean;
  status?: AgentMessageBubbleStatus;
  errorMessage?: string;
}

const roleLabelMap: Record<string, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
  unknown: 'Unknown',
};

const getRole = (role?: string) => role || 'unknown';

const getAlign = (message: AgentMessage, align?: 'left' | 'right') => {
  if (align) {
    return align;
  }
  return message.role === 'user' ? 'right' : 'left';
};

const getMessageMeta = (message: AgentMessage) => {
  return [
    message.model ? `模型：${message.model}` : undefined,
    message.promptTokens !== undefined ? `Prompt：${message.promptTokens}` : undefined,
    message.completionTokens !== undefined ? `Completion：${message.completionTokens}` : undefined,
    message.totalTokens !== undefined ? `Total：${message.totalTokens}` : undefined,
    message.latencyMs !== undefined ? `耗时：${message.latencyMs}ms` : undefined,
    message.createdAt ? `时间：${message.createdAt}` : undefined,
  ].filter(Boolean);
};

const AgentMessageBubble: React.FC<AgentMessageBubbleProps> = ({
  message,
  align,
  compact,
  status,
  errorMessage,
}) => {
  const role = getRole(message.role);
  const placement = getAlign(message, align);
  const metas = getMessageMeta(message);
  const statusText =
    status === 'error'
      ? errorMessage || '生成中断'
      : status === 'stopped'
        ? '已停止生成'
        : undefined;
  const className = [
    'agent-message-bubble',
    `agent-message-bubble-${placement}`,
    `agent-message-bubble-role-${role}`,
    compact ? 'agent-message-bubble-compact' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="agent-message-bubble-card">
        <div className="agent-message-bubble-role">
          {roleLabelMap[role] || roleLabelMap.unknown}
        </div>
        <div className="agent-message-bubble-content">
          {message.content ? (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          ) : status === 'streaming' ? (
            <Text className="agent-message-bubble-placeholder" type="secondary">
              生成中...
            </Text>
          ) : null}
          {status === 'streaming' ? <span className="agent-message-bubble-cursor" /> : null}
        </div>
        {statusText ? (
          <Text className={`agent-message-bubble-status agent-message-bubble-status-${status}`}>
            {statusText}
          </Text>
        ) : null}
        {metas.length ? (
          <Text className="agent-message-bubble-meta" type="secondary">
            {metas.join(' / ')}
          </Text>
        ) : null}
      </div>
    </div>
  );
};

export default AgentMessageBubble;
