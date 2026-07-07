import React, { useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Collapse, message, Tooltip, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { AgentMessage } from '@/services/entity/Agent';
import './index.less';

const { Text } = Typography;

export type AgentMessageBubbleStatus = 'streaming' | 'error' | 'stopped';

export interface AgentMessageBubbleProps {
  message: AgentMessage & { reasoningStream?: string };
  align?: 'left' | 'right';
  compact?: boolean;
  status?: AgentMessageBubbleStatus;
  errorMessage?: string;
}

const roleLabelMap: Record<string, string> = {
  user: '你',
  assistant: 'AI',
  system: '系统',
  tool: '工具',
  unknown: '未知',
};

const roleAvatarMap: Record<string, string> = {
  user: '👤',
  assistant: '🤖',
  system: '⚙️',
  tool: '🔧',
  unknown: '❓',
};

const getRole = (role?: string) => role || 'unknown';

const getAlign = (message: AgentMessage, align?: 'left' | 'right') => {
  if (align) {
    return align;
  }
  return message.role === 'user' ? 'right' : 'left';
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isYesterday) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timeStr;
  }
};

const getMessageMeta = (message: AgentMessage) => {
  const items: { label: string; value: string | number }[] = [];

  if (message.model) {
    items.push({ label: '模型', value: message.model });
  }
  if (message.promptTokens !== undefined && message.promptTokens > 0) {
    items.push({ label: '输入', value: message.promptTokens });
  }
  if (message.completionTokens !== undefined && message.completionTokens > 0) {
    items.push({ label: '输出', value: message.completionTokens });
  }
  if (message.totalTokens !== undefined && message.totalTokens > 0) {
    items.push({ label: '总计', value: message.totalTokens });
  }
  if (message.reasoningTokens !== undefined && message.reasoningTokens > 0) {
    items.push({ label: '推理', value: message.reasoningTokens });
  }
  if (message.latencyMs !== undefined && message.latencyMs > 0) {
    items.push({ label: '耗时', value: `${message.latencyMs}ms` });
  }

  return items;
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
  const reasoningContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const prevReasoningLenRef = useRef(0);
  const prevContentLenRef = useRef(0);

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
    status === 'streaming' ? 'agent-message-bubble-streaming' : undefined,
    status === 'error' ? 'agent-message-bubble-error' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  }, []);

  const currentReasoning = message.reasoningContent || message.reasoningStream || '';
  const currentContent = message.content || '';

  useEffect(() => {
    if (reasoningContainerRef.current && currentReasoning.length > prevReasoningLenRef.current) {
      reasoningContainerRef.current.scrollTop = reasoningContainerRef.current.scrollHeight;
    }
    prevReasoningLenRef.current = currentReasoning.length;
  }, [currentReasoning]);

  useEffect(() => {
    if (contentContainerRef.current && currentContent.length > prevContentLenRef.current) {
      contentContainerRef.current.scrollTop = contentContainerRef.current.scrollHeight;
    }
    prevContentLenRef.current = currentContent.length;
  }, [currentContent]);

  const renderChunkedContent = (content: string, containerRef: React.RefObject<HTMLDivElement>, prevLenRef: React.MutableRefObject<number>, classNamePrefix: string) => {
    if (!content) return null;

    const chunks: { text: string; isNew: boolean }[] = [];
    let start = 0;
    const chunkSize = 30;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push({
        text: content.slice(start, end),
        isNew: end > prevLenRef.current,
      });
      start = end;
    }

    return chunks.map((chunk, index) => (
      <span
        key={index}
        className={chunk.isNew ? `${classNamePrefix}-chunk ${classNamePrefix}-chunk-new` : `${classNamePrefix}-chunk`}
      >
        {chunk.text}
      </span>
    ));
  };

  const renderContent = () => {
    if (!message.content && !message.reasoningContent && !message.reasoningStream) {
      if (status === 'streaming') {
        return (
          <Text className="agent-message-bubble-placeholder" type="secondary">
            生成中...
          </Text>
        );
      }
      return null;
    }

    return (
      <>
        {(message.reasoningContent || message.reasoningStream) && (
          <div className="agent-message-bubble-reasoning">
            <Collapse
              size="small"
              defaultActiveKey={status === 'streaming' ? ['reasoning'] : []}
              items={[
                {
                  key: 'reasoning',
                  label: '💭 推理过程',
                  children: (
                    <div ref={reasoningContainerRef} className="agent-message-bubble-reasoning-content">
                      {renderChunkedContent(currentReasoning, reasoningContainerRef, prevReasoningLenRef, 'agent-message-bubble-reasoning')}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {message.content ? (
          <div ref={contentContainerRef} className="agent-message-bubble-main-content">
            {renderChunkedContent(currentContent, contentContainerRef, prevContentLenRef, 'agent-message-bubble-main')}
          </div>
        ) : message.reasoningContent || message.reasoningStream ? (
          <Text className="agent-message-bubble-warning" type="warning">
            ⚠️ 模型仅返回推理过程，未返回最终答案
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <div className={className}>
      <div className="agent-message-bubble-card">
        <div className="agent-message-bubble-header">
          <div className="agent-message-bubble-role">
            <span style={{ marginRight: 6 }}>{roleAvatarMap[role]}</span>
            {roleLabelMap[role]}
          </div>
          {message.createdAt && (
            <Tooltip title={message.createdAt}>
              <span className="agent-message-bubble-time">
                {formatTime(message.createdAt)}
              </span>
            </Tooltip>
          )}
        </div>

        <div className="agent-message-bubble-content">
          {renderContent()}
          {status === 'streaming' && <span className="agent-message-bubble-cursor" />}
        </div>

        {statusText && (
          <Text className={`agent-message-bubble-status agent-message-bubble-status-${status}`}>
            {statusText}
          </Text>
        )}

        {metas.length > 0 && (
          <div className="agent-message-bubble-meta">
            {metas.map((item, index) => (
              <span key={index} className="agent-message-bubble-meta-item">
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentMessageBubble;
