import React, { useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, Collapse, message, Popover, Tag, Tooltip, Typography } from 'antd'
import { useIntl } from '@umijs/max'
import {
  CustomerServiceOutlined,
  CopyOutlined,
  RedoOutlined,
  SettingOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { AgentMessage, AskUserAnswer, KnowledgeSource } from '@/services/entity/Agent'
import ToolCallCard from '@/components/ToolCallCard'
import TemporaryUrlPreviewModal from '@/components/TemporaryUrlPreviewModal'
import InteractiveQuestionCard, {
  InteractiveQuestionCardStatus,
} from '@/components/InteractiveQuestionCard'
import { createChatAttachmentPreviewUrl } from '@/services/file/FileController'
import './index.less'

const { Text } = Typography

export type AgentMessageBubbleStatus = 'streaming' | 'error' | 'stopped'

export interface AgentMessageBubbleProps {
  agentMessage: AgentMessage & {
    reasoningStream?: string
    progressMessage?: string
    executionEvents?: Array<{
      id: string
      title: string
      detail?: string
      status?: 'running' | 'completed' | 'failed' | 'pending'
      actions?: Array<{ label: string; danger?: boolean; onClick: () => void }>
    }>
  }
  align?: 'left' | 'right'
  compact?: boolean
  status?: AgentMessageBubbleStatus
  errorMessage?: string
  onQuestionSubmit?: (answers: Record<string, AskUserAnswer>) => void
  onRegenerate?: () => void
}

const roleIconMap: Record<string, React.ReactNode> = {
  user: <UserOutlined />,
  assistant: <CustomerServiceOutlined />,
  system: <SettingOutlined />,
  tool: <ToolOutlined />,
  unknown: <UserOutlined />,
}

const getRole = (role?: string) => (role && roleIconMap[role] ? role : 'unknown')

const getAlign = (message: AgentMessage, align?: 'left' | 'right') => {
  if (align) {
    return align
  }
  return message.role === 'user' ? 'right' : 'left'
}

const getAttachments = (value?: string) => {
  if (!value)
    return [] as { fileName?: string; size?: number; contentType?: string; objectKey?: string }[]
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const remarkCitations = (sources: KnowledgeSource[], messageId?: string) => () => (tree: any) => {
  const validIndexes = new Set(sources.map((source) => source.citationIndex))
  const prefix = messageId ? `${messageId}-` : ''
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
        children.push(
          citationIndex !== undefined && validIndexes.has(citationIndex)
            ? {
                type: 'link',
                url: `#knowledge-source-${prefix}${citationIndex}`,
                children: [{ type: 'text', value: part }],
              }
            : { type: 'text', value: part },
        )
      })
      return children
    }, [])
  }
  visit(tree)
}

const formatTime = (
  time: string | number | undefined,
  locale: string,
  formatYesterday: ReturnType<typeof useIntl>['formatMessage'],
) => {
  if (time === undefined) return ''
  try {
    const date = new Date(typeof time === 'number' ? time : time)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isYesterday) {
      return formatYesterday(
        { id: 'components.agentMessageBubble.yesterday' },
        { time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) },
      )
    }

    return date.toLocaleDateString(locale, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(time)
  }
}

const getMessageMeta = (
  message: AgentMessage,
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
) => {
  const items: { label: string; value: string | number }[] = []

  if (message.model) {
    items.push({
      label: formatMessage({ id: 'components.agentMessageBubble.model' }),
      value: message.model,
    })
  }
  if (message.promptTokens !== undefined && message.promptTokens > 0) {
    items.push({
      label: formatMessage({ id: 'components.agentMessageBubble.inputTokens' }),
      value: message.promptTokens,
    })
  }
  if (message.completionTokens !== undefined && message.completionTokens > 0) {
    items.push({
      label: formatMessage({ id: 'components.agentMessageBubble.outputTokens' }),
      value: message.completionTokens,
    })
  }
  if (message.totalTokens !== undefined && message.totalTokens > 0) {
    items.push({
      label: formatMessage({ id: 'components.agentMessageBubble.totalTokens' }),
      value: message.totalTokens,
    })
  }
  if (message.reasoningTokens !== undefined && message.reasoningTokens > 0) {
    items.push({
      label: formatMessage({ id: 'components.agentMessageBubble.reasoningTokens' }),
      value: message.reasoningTokens,
    })
  }
  if (message.latencyMs !== undefined && message.latencyMs > 0) {
    items.push({
      label: formatMessage({ id: 'components.agentMessageBubble.latency' }),
      value: `${message.latencyMs}ms`,
    })
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
  onRegenerate,
}) => {
  const intl = useIntl()
  const role = getRole(agentMessage.role)
  const placement = getAlign(agentMessage, align)
  const metas = getMessageMeta(agentMessage, intl.formatMessage)
  const reasoningContainerRef = useRef<HTMLDivElement>(null)
  const contentContainerRef = useRef<HTMLDivElement>(null)

  const statusText =
    status === 'error'
      ? errorMessage ||
        intl.formatMessage({ id: 'components.agentMessageBubble.generationInterrupted' })
      : status === 'stopped'
        ? intl.formatMessage({ id: 'components.agentMessageBubble.generationStopped' })
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

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        message.success(intl.formatMessage({ id: 'components.agentMessageBubble.copied' }))
      } catch {
        message.error(intl.formatMessage({ id: 'components.agentMessageBubble.copyFailed' }))
      }
    },
    [intl],
  )

  const currentReasoning = agentMessage.reasoningContent || agentMessage.reasoningStream || ''
  const currentContent = agentMessage.content || ''
  const copyText = currentContent || currentReasoning
  const attachments = getAttachments(agentMessage.attachments)
  const executionEvents = agentMessage.executionEvents || []

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
    const messageIdPrefix = agentMessage.id || `msg-${Math.random().toString(36).substr(2, 9)}`
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

    if (
      !agentMessage.content &&
      !agentMessage.reasoningContent &&
      !agentMessage.reasoningStream &&
      !executionEvents.length &&
      !(agentMessage.toolCallLogs && agentMessage.toolCallLogs.length > 0)
    ) {
      if (status === 'streaming') {
        return (
          <Text className="agent-message-bubble-placeholder" type="secondary">
            {agentMessage.progressMessage ||
              intl.formatMessage({ id: 'components.agentMessageBubble.generating' })}
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
                  label: intl.formatMessage({
                    id: 'components.agentMessageBubble.reasoningProcess',
                  }),
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

        {!!executionEvents.length && (
          <div className="agent-message-bubble-execution">
            <Collapse
              size="small"
              defaultActiveKey={status === 'streaming' ? ['execution'] : []}
              items={[
                {
                  key: 'execution',
                  label: intl.formatMessage(
                    { id: 'components.agentMessageBubble.executionProcess' },
                    { count: executionEvents.length },
                  ),
                  children: (
                    <div className="agent-message-bubble-execution-list">
                      {executionEvents.map((event) => (
                        <div className="agent-message-bubble-execution-item" key={event.id}>
                          <span
                            className={`agent-message-bubble-execution-status agent-message-bubble-execution-status-${event.status || 'pending'}`}
                          />
                          <div className="agent-message-bubble-execution-body">
                            <div>{event.title}</div>
                            {event.detail && (
                              <pre className="agent-message-bubble-execution-detail">
                                {event.detail}
                              </pre>
                            )}
                            {!!event.actions?.length && <div style={{ marginTop: 6 }}>{event.actions.map((action) => <Button key={action.label} size="small" danger={action.danger} onClick={action.onClick} style={{ marginRight: 6 }}>{action.label}</Button>)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {agentMessage.content ? (
          <div ref={contentContainerRef} className="agent-message-bubble-main-content">
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                remarkCitations(agentMessage.sources || [], messageIdPrefix),
              ]}
            >
              {currentContent}
            </ReactMarkdown>
          </div>
        ) : agentMessage.reasoningContent || agentMessage.reasoningStream ? (
          <Text className="agent-message-bubble-warning" type="warning">
            {intl.formatMessage({ id: 'components.agentMessageBubble.reasoningOnly' })}
          </Text>
        ) : null}

        {!!attachments.length && (
          <div className="agent-message-bubble-attachments">
            {attachments.map((attachment, index) => (
              <Tag key={`${attachment.fileName || 'file'}-${index}`}>
                {attachment.objectKey ? (
                  <TemporaryUrlPreviewModal
                    title={attachment.fileName}
                    triggerText={attachment.fileName || 'file'}
                    getUrl={async () => ({
                      code: 200,
                       data: await createChatAttachmentPreviewUrl({
                        objectKey: attachment.objectKey || '',
                        fileName: attachment.fileName,
                        contentType: attachment.contentType,
                      }),
                    })}
                  />
                ) : (
                  attachment.fileName || 'file'
                )}
              </Tag>
            ))}
          </div>
        )}

        {agentMessage.toolCallLogs && agentMessage.toolCallLogs.length > 0 && (
          <div className="agent-message-bubble-tool-calls">
            {agentMessage.toolCallLogs.map((log) => (
              <ToolCallCard key={log.id} log={log} compact />
            ))}
          </div>
        )}
        {!!agentMessage.sources?.length && (
          <section className="agent-message-bubble-sources">
            <div className="agent-message-bubble-sources-header">
              {intl.formatMessage(
                { id: 'components.agentMessageBubble.sources' },
                { count: agentMessage.sources.length },
              )}
            </div>
            <div className="agent-message-bubble-sources-list">
              {agentMessage.sources.map((source) => (
                <Popover
                  key={source.chunkId}
                  placement="top"
                  trigger="hover"
                  overlayClassName="agent-message-bubble-source-popover"
                  title={
                    <div className="agent-message-bubble-source-popover-title">
                      <span className="agent-message-bubble-source-index">
                        【{source.citationIndex}】
                      </span>
                      {source.documentName ||
                        intl.formatMessage({ id: 'components.agentMessageBubble.unnamedDocument' })}
                      {source.similarity !== undefined && (
                        <span className="agent-message-bubble-source-similarity">
                          {intl.formatMessage({ id: 'components.agentMessageBubble.similarity' })}:{' '}
                          {(source.similarity * 100).toFixed(1)}%
                        </span>
                      )}
                      {source.contextExpanded && (source.contextChunkCount || 0) > 1 && (
                        <span className="agent-message-bubble-source-context-expanded">
                          {intl.formatMessage(
                            { id: 'components.agentMessageBubble.contextExpanded' },
                            { count: source.contextChunkCount },
                          )}
                        </span>
                      )}
                    </div>
                  }
                  content={
                    <div className="agent-message-bubble-source-popover-content">
                      {source.sectionPath && (
                        <div className="agent-message-bubble-source-popover-section">
                          {source.sectionPath}
                        </div>
                      )}
                      <div className="agent-message-bubble-source-popover-text">
                        {source.content}
                      </div>
                    </div>
                  }
                >
                  <div
                    id={`knowledge-source-${messageIdPrefix}-${source.citationIndex}`}
                    className="agent-message-bubble-source"
                  >
                    <span className="agent-message-bubble-source-index">
                      【{source.citationIndex}】
                    </span>
                    <span className="agent-message-bubble-source-name">
                      {source.documentName ||
                        intl.formatMessage({ id: 'components.agentMessageBubble.unnamedDocument' })}
                    </span>
                    {source.similarity !== undefined && (
                      <span className="agent-message-bubble-source-similarity">
                        {(source.similarity * 100).toFixed(1)}%
                      </span>
                    )}
                    {source.contextExpanded && (source.contextChunkCount || 0) > 1 && (
                      <span className="agent-message-bubble-source-context-expanded">
                        {intl.formatMessage(
                          { id: 'components.agentMessageBubble.contextExpanded' },
                          { count: source.contextChunkCount },
                        )}
                      </span>
                    )}
                  </div>
                </Popover>
              ))}
            </div>
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
            {intl.formatMessage({ id: `components.agentMessageBubble.role.${role}` })}
          </div>
          {agentMessage.createdAt !== undefined && (
            <Tooltip title={agentMessage.createdAt}>
              <span className="agent-message-bubble-time">
                {formatTime(agentMessage.createdAt, intl.locale, intl.formatMessage)}
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

        {(copyText || onRegenerate) && status !== 'streaming' && (
          <div className="agent-message-bubble-actions">
            {copyText && (
              <Tooltip title={intl.formatMessage({ id: 'components.agentMessageBubble.copy' })}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  aria-label={intl.formatMessage({ id: 'components.agentMessageBubble.copy' })}
                  onClick={() => void handleCopy(copyText)}
                />
              </Tooltip>
            )}
            {onRegenerate && (
              <Tooltip title={intl.formatMessage({ id: 'components.agentMessageBubble.regenerate' })}>
                <Button
                  type="text"
                  size="small"
                  icon={<RedoOutlined />}
                  aria-label={intl.formatMessage({ id: 'components.agentMessageBubble.regenerate' })}
                  onClick={onRegenerate}
                />
              </Tooltip>
            )}
          </div>
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
