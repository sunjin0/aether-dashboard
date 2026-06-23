import React from 'react';
import ReactMarkdown from 'react-markdown';
import {Typography} from 'antd';
import {AgentMessage} from '@/services/entity/Agent';
import './index.less';

const {Text} = Typography;

export interface AgentMessageBubbleProps {
  message: AgentMessage;
  align?: 'left' | 'right';
  compact?: boolean;
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

const AgentMessageBubble: React.FC<AgentMessageBubbleProps> = ({message, align, compact}) => {
  const role = getRole(message.role);
  const placement = getAlign(message, align);
  const metas = getMessageMeta(message);
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
        <div className="agent-message-bubble-role">{roleLabelMap[role] || roleLabelMap.unknown}</div>
        <div className="agent-message-bubble-content">
          <ReactMarkdown>{message.content || ''}</ReactMarkdown>
        </div>
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
