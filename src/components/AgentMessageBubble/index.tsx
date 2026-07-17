import React, { useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Collapse, message, Tooltip, Typography } from 'antd'
import { CustomerServiceOutlined, SettingOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { AgentMessage, AskUserAnswer, KnowledgeSource } from '@/services/entity/Agent'
import ToolCallCard from '@/components/ToolCallCard'
import InteractiveQuestionCard, {
  InteractiveQuestionCardStatus,
} from '@/components/InteractiveQuestionCard'
import './index.less'

const { Text } = Typography

export type AgentMessageBubbleStatus = 'streaming' | 'error' | 'stopped';

export interface AgentMessageBubbleProps {
  agentMessage: AgentMessage & { reasoningStream?: string };
  align?: 'left' | 'right';
  compact?: boolean;
  status?: AgentMessageBubbleStatus;
  errorMessage?: string;
  onQuestionSubmit?: (answers: Record<string, AskUserAnswer>) => void;
}

const roleLabelMap: Record<string, string> = {
  user: '用户',
  assistant: '助手',
  system: '系统',
  tool: '工具',
  unknown: '未知',
}

const roleIconMap: Record<string, React.ReactNode> = {
  user: <UserOutlined />,
  assistant: <CustomerServiceOutlined />,
  system: <SettingOutlined />,
  tool: <ToolOutlined />,
  unknown: <UserOutlined />,
}

const getRole = (role?: string) => role || 'unknown'

const getAlign = (message: AgentMessage, align?: 'left' | 'right') => {
  if (align) {
    return align
  }
  return message.role === 'user' ? 'right' : 'left'
}

const remarkCitations = (sources: KnowledgeSource[]) => () => (tree: any) => {
  const validIndexes = new Set(sources.map((source) => source.citationIndex))
  const visit = (node: any) => {
    if (node.type === 'link' || !Array.isArray(node.children)) {
      return
    }
    node.children = node.children.reduce((children: any[], child: any) => {
      if (child.type !== 'text') {
        visit(child)
        children.push(child)
        return children
      }
      const parts = child.value.split(/(\u3010\d+\u3011)/g)
      parts.forEach((part: string) => {
        const match = /^\u3010(\d+)\u3011$/.exec(part)
        const citationIndex = match ? Number(match[1]) : undefined
        children.push(citationIndex !== undefined && validIndexes.has(citationIndex)
          ? { type: 'link', url: `#knowledge-source-${citationIndex}`, children: [{ type: 'text', value: part }] }
          : { type: 'text', value: part })
      })
      return children
    }, [])
  }
  visit(tree)
}

const formatTime = (time?: string | number) => {
  if (!time) return ''
  try {
    const date = new Date(typeof time === 'number' ? time : time)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isYesterday) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    }

    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(time)
  }
}

const getMessageMeta = (message: AgentMessage) => {
  const items: { label: string; value: string | number }[] = []

  if (message.model) {
    items.push({ label: '模型', value: message.model })
  }
  if (message.promptTokens !== undefined && message.promptTokens > 0) {
    items.push({ label: '输入', value: message.promptTokens })
  }
  if (message.completionTokens !== undefined && message.completionTokens > 0) {
    items.push({ label: '输出', value: message.completionTokens })
  }
  if (message.totalTokens !== undefined && message.totalTokens > 0) {
    items.push({ label: '总计', value: message.totalTokens })
  }
  if (message.reasoningTokens !== undefined && message.reasoningTokens > 0) {
    items.push({ label: '推理', value: message.reasoningTokens })
  }
  if (message.latencyMs !== undefined && message.latencyMs > 0) {
    items.push({ label: '耗时', value: `${message.latencyMs}ms` })
  }

  return items
}

const AgentMessageBubble: React.FC<AgentMessageBubbleProps> = ({
  agentMessage,
  align,
  compact,
  status,
  errorMessage,
  onQuestionSubmit,
}) => {
  const role = getRole(agentMessage.role)
  const placement = getAlign(agentMessage, align)
  const metas = getMessageMeta(agentMessage)
  const reasoningContainerRef = useRef<HTMLDivElement>(null)
  const contentContainerRef = useRef<HTMLDivElement>(null)

  const statusText =
    status === 'error'
      ? errorMessage || '生成中断'
      : status === 'stopped'
        ? '已停止生成'
        : undefined

  const className = [
    'agent-message-bubble',
    `agent-message-bubble-${placement}`,
    `agent-message-bubble-role-${role}`,
    compact ? 'agent-message-bubble-compact' : undefined,
    status === 'streaming' ? 'agent-message-bubble-streaming' : undefined,
    status === 'error' ? 'agent-message-bubble-error' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败')
    }
  }, [])

  const currentReasoning = agentMessage.reasoningContent || agentMessage.reasoningStream || ''
  const currentContent = agentMessage.content || ''

  useEffect(() => {
    if (reasoningContainerRef.current) {
      reasoningContainerRef.current.scrollTop = reasoningContainerRef.current.scrollHeight
    }
  }, [currentReasoning])

  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = contentContainerRef.current.scrollHeight
    }
  }, [currentContent])

  // messageType=answer 是后端内部消息，前端默认不渲染为独立聊天气泡
  if (agentMessage.messageType === 'answer') {
    return null
  }

  const renderContent = () => {
    if (agentMessage.messageType === 'interaction' && agentMessage.questionConfig) {
      const questionStatus: InteractiveQuestionCardStatus =
        agentMessage.interactionStatus === 'answered'
          ? 'answered'
          : agentMessage.interactionStatus === 'cancelled'
            ? 'cancelled'
            : agentMessage.interactionStatus === 'expired'
              ? 'expired'
              : status === 'streaming'
                ? 'submitting'
                : 'pending'

      return (
        <InteractiveQuestionCard
          questionConfig={agentMessage.questionConfig}
          content={agentMessage.content}
          status={questionStatus}
          onSubmit={onQuestionSubmit}
        />
      )
    }

    if (!agentMessage.content && !agentMessage.reasoningContent && !agentMessage.reasoningStream && !(agentMessage.toolCallLogs && agentMessage.toolCallLogs.length > 0)) {
      if (status === 'streaming') {
        return (
          <Text className="agent-message-bubble-placeholder" type="secondary">
            生成中...
          </Text>
        )
      }
      return null
    }

    return (
      <>
        {(agentMessage.reasoningContent || agentMessage.reasoningStream) && (
          <div className="agent-message-bubble-reasoning">
            <Collapse
              size="small"
              defaultActiveKey={status === 'streaming' ? ['reasoning'] : []}
              items={[
                {
                  key: 'reasoning',
                  label: '💭 推理过程',
                  children: (
                    <div
                      ref={reasoningContainerRef}
                      className="agent-message-bubble-reasoning-content"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentReasoning}</ReactMarkdown>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {agentMessage.content ? (
          <div ref={contentContainerRef} className="agent-message-bubble-main-content">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkCitations(agentMessage.sources || [])]}>
              {currentContent}
            </ReactMarkdown>
          </div>
        ) : agentMessage.reasoningContent || agentMessage.reasoningStream ? (
          <Text className="agent-message-bubble-warning" type="warning">
            ⚠️ 模型仅返回推理过程，未返回最终答案
          </Text>
        ) : null}

        {agentMessage.toolCallLogs && agentMessage.toolCallLogs.length > 0 && (
          <div className="agent-message-bubble-tool-calls">
            {agentMessage.toolCallLogs.map((log) => (
              <ToolCallCard key={log.id} log={log} compact />
            ))}
          </div>
        )}
        {!!agentMessage.sources?.length && (
          <section className="agent-message-bubble-sources"><details><summary>参考来源（{agentMessage.sources.length}）</summary>
            <div className="agent-message-bubble-sources-list">
              {agentMessage.sources.map((source) => (
                <article
                  id={`knowledge-source-${source.citationIndex}`}
                  key={source.chunkId}
                  className="agent-message-bubble-source"
                >
                  <strong>【{source.citationIndex}】{source.documentName || '未命名文档'}</strong>
                  {source.sectionPath && <small> · {source.sectionPath}</small>}
                  <p>{source.content}</p>
                </article>
              ))}
            </div>
          </details>
          </section>
        )}
      </>
    )
  }

  return (
    <div className={className}>
      <div className="agent-message-bubble-card">
        <div className="agent-message-bubble-header">
          <div className="agent-message-bubble-role">
            <span style={{ marginRight: 6 }}>{roleIconMap[role]}</span>
            {roleLabelMap[role]}
          </div>
          {agentMessage.createdAt && (
            <Tooltip title={agentMessage.createdAt}>
              <span className="agent-message-bubble-time">
                {formatTime(agentMessage.createdAt)}
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
  )
}

export default AgentMessageBubble
