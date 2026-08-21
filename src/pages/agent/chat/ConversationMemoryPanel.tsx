import React, { useEffect, useMemo, useState } from 'react'
import { useIntl } from '@umijs/max'
import {
  Button,
  Drawer,
  Empty,
  Input,
  message,
  Popconfirm,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { CheckOutlined, ClockCircleOutlined, DeleteOutlined, DownOutlined, EditOutlined, RightOutlined } from '@ant-design/icons'
import {
  correctAgentConversationMemory,
  deleteAgentConversationMemory,
  getAgentConversationMemories,
  submitAgentConversationMemoryFeedback,
} from '@/services/agent/ConversationController'
import { deleteAgentSessionMemory, getAgentSessionMemories } from '@/services/agent/SessionController'
import { AgentSessionMemory } from '@/services/entity/Agent'
import FormattedContent from '@/components/FormattedContent'

const { Text } = Typography

interface ConversationMemoryPanelProps {
  /** 所属 Conversation；存在时优先使用文档定义的 Conversation Memory API。 */
  conversationId?: string
  /** 所属 Session；不存在时面板显示空状态。 */
  sessionId?: string
  /** Drawer 是否可见。 */
  open: boolean
  onClose: () => void
}

const MEMORY_TYPE_ORDER = [
  'GOAL',
  'CONSTRAINT',
  'FACT',
  'DECISION',
  'TODO',
  'ARTIFACT',
  'PREFERENCE',
  'TASK_CONCLUSION',
]

const KNOWN_MEMORY_TYPES = new Set<string>([
  ...MEMORY_TYPE_ORDER,
  'OTHER',
])

const KNOWN_MEMORY_STATUS = new Set<string>(['ACTIVE', 'SUPERSEDED', 'DELETED'])

function idempotencyKey(action: string, memoryId?: string): string {
  return `${action}-${memoryId || 'memory'}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function memoryTypeLabel(type: string | undefined, intl: ReturnType<typeof useIntl>): string {
  const key = type || 'OTHER'
  if (KNOWN_MEMORY_TYPES.has(key)) {
    return intl.formatMessage({ id: `pages.agent.chat.session.memoryType.${key}` })
  }
  return intl.formatMessage({ id: 'pages.agent.chat.session.memoryType.OTHER' })
}

function memoryStatusLabel(status: string | undefined, intl: ReturnType<typeof useIntl>): string {
  const key = (status || 'ACTIVE').toUpperCase()
  if (KNOWN_MEMORY_STATUS.has(key)) {
    return intl.formatMessage({ id: `pages.agent.chat.session.memoryStatus.${key}` })
  }
  return intl.formatMessage({ id: 'pages.agent.chat.session.memoryStatus.ACTIVE' })
}

function formatTimestamp(value?: number, locale?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale || undefined)
}

function MemoryCard({
  memory,
  conversationId,
  sessionId,
  onChanged,
}: {
  memory: AgentSessionMemory
  conversationId?: string
  sessionId?: string
  onChanged: () => void
}) {
  const intl = useIntl()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [feedbacking, setFeedbacking] = useState(false)
  const [draftContent, setDraftContent] = useState(memory.content || '')
  const [draftReason, setDraftReason] = useState('')
  const [feedbackVerdict, setFeedbackVerdict] = useState<'ACCURATE' | 'INACCURATE' | 'EXPIRED'>('ACCURATE')
  const [feedbackReason, setFeedbackReason] = useState('')

  const removeMemory = async () => {
    if (!memory.id || (!conversationId && !sessionId)) return
    setDeleting(true)
    try {
      const response = conversationId
        ? await deleteAgentConversationMemory(
          conversationId,
          memory.id,
          memory.memoryVersion,
          idempotencyKey('delete', memory.id),
        )
        : await deleteAgentSessionMemory(
          sessionId!,
          memory.id,
          memory.memoryVersion,
          idempotencyKey('delete', memory.id),
        )
      if (response.code === 200) {
        onChanged()
        message.success(intl.formatMessage({ id: 'pages.agent.chat.session.memoryDeleted' }))
      }
    } catch {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.session.memoryDeleteFailed' }))
    } finally {
      setDeleting(false)
    }
  }

  const submitCorrection = async () => {
    if (!conversationId || !memory.id) return
    if (!draftContent.trim() || !draftReason.trim()) {
      message.warning(intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrectionRequired' }))
      return
    }
    setCorrecting(true)
    try {
      const response = await correctAgentConversationMemory(
        conversationId,
        memory.id,
        {
          content: draftContent.trim(),
          reason: draftReason.trim(),
          memoryVersion: memory.memoryVersion,
        },
        idempotencyKey('correct', memory.id),
      )
      if (response.code === 200) {
        setEditing(false)
        setDraftReason('')
        onChanged()
        message.success(intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrected' }))
      }
    } catch {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrectionFailed' }))
    } finally {
      setCorrecting(false)
    }
  }

  const submitFeedback = async () => {
    if (!conversationId || !memory.id) return
    if (feedbackVerdict === 'INACCURATE' && !feedbackReason.trim()) {
      message.warning(intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackReasonRequired' }))
      return
    }
    setFeedbacking(true)
    try {
      const response = await submitAgentConversationMemoryFeedback(
        conversationId,
        {
          memoryId: memory.id,
          memoryVersion: memory.memoryVersion,
          verdict: feedbackVerdict,
          reason: feedbackReason.trim() || undefined,
        },
        idempotencyKey('feedback', memory.id),
      )
      if (response.code === 200) {
        setFeedbackReason('')
        onChanged()
        message.success(intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackSaved' }))
      }
    } catch {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackFailed' }))
    } finally {
      setFeedbacking(false)
    }
  }

  const typeLabel = memoryTypeLabel(memory.memoryType, intl)

  const status = memory.status || 'ACTIVE'
  const statusLabel = memoryStatusLabel(memory.status, intl)

  const updatedAt = memory.updatedAt ?? memory.createdAt

  return (
    <div className={`agent-chat-memory-card agent-chat-memory-card-${(status || 'ACTIVE').toLowerCase()}`}>
      <div className="agent-chat-memory-card-head" role="button" tabIndex={0} onClick={() => setExpanded((value) => !value)} onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setExpanded((value) => !value)
        }
      }}>
        <span className="agent-chat-memory-card-expand">
          {expanded ? <DownOutlined /> : <RightOutlined />}
        </span>
        <Text strong className="agent-chat-memory-card-title">
          {memory.summary || memory.content || intl.formatMessage({ id: 'pages.agent.chat.session.memoryFallbackTitle' })}
        </Text>
        {conversationId && status === 'ACTIVE' && (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label={intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrect' })}
            onClick={(event) => {
              event.stopPropagation()
              setExpanded(true)
              setEditing((value) => !value)
            }}
          >
            {intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrect' })}
          </Button>
        )}
        <Popconfirm
          title={intl.formatMessage({ id: 'pages.agent.chat.session.memoryDeleteConfirmTitle' })}
          description={intl.formatMessage({ id: 'pages.agent.chat.session.memoryDeleteConfirmDescription' })}
          okText={intl.formatMessage({ id: 'pages.agent.chat.session.memoryDelete' })}
          cancelText={intl.formatMessage({ id: 'pages.agent.chat.session.memoryDeleteCancel' })}
          okButtonProps={{ danger: true }}
          onConfirm={() => void removeMemory()}
          onPopupClick={(event) => event.stopPropagation()}
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={deleting}
            aria-label={intl.formatMessage({ id: 'pages.agent.chat.session.memoryDelete' })}
            onClick={(event) => event.stopPropagation()}
          >
            {intl.formatMessage({ id: 'pages.agent.chat.session.memoryDelete' })}
          </Button>
        </Popconfirm>
      </div>
      {expanded && (
        <div className="agent-chat-memory-card-detail">
          <FormattedContent content={memory.content || ''} maxHeight={240} />
          <div className="agent-chat-memory-card-meta">
            <Tag color="blue">{typeLabel}</Tag>
            <Tag color={status === 'SUPERSEDED' ? 'default' : 'green'}>{statusLabel}</Tag>
            {memory.importance != null && (
              <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.session.memoryImportanceTooltip' })}>
                <Tag>{intl.formatMessage({ id: 'pages.agent.chat.session.memoryImportance' }, { value: memory.importance })}</Tag>
              </Tooltip>
            )}
            {memory.sensitivityLevel && (
              <Tag color={memory.sensitivityLevel === 'RESTRICTED' ? 'volcano' : memory.sensitivityLevel === 'SENSITIVE' ? 'orange' : 'default'}>
                {intl.formatMessage({ id: `pages.agent.chat.session.memorySensitivity.${memory.sensitivityLevel}` })}
              </Tag>
            )}
            {updatedAt && (
              <Text type="secondary" style={{ fontSize: 12 }} className="agent-chat-memory-card-time">
                <ClockCircleOutlined /> {formatTimestamp(updatedAt, intl.locale)}
              </Text>
            )}
          </div>
          {memory.sourceTaskId && (
            <Text type="secondary" style={{ fontSize: 12 }} className="agent-chat-memory-card-source">
              {intl.formatMessage({ id: 'pages.agent.chat.session.memorySourceTask' }, { taskId: memory.sourceTaskId })}
            </Text>
          )}
          {memory.sourceMessageId && (
            <Text type="secondary" style={{ fontSize: 12 }} className="agent-chat-memory-card-source">
              {intl.formatMessage({ id: 'pages.agent.chat.session.memorySourceMessage' }, { messageId: memory.sourceMessageId })}
            </Text>
          )}
          {memory.correctionReason && (
            <Text type="secondary" style={{ fontSize: 12 }} className="agent-chat-memory-card-source">
              {intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrectionReason' }, { reason: memory.correctionReason })}
            </Text>
          )}
          {conversationId && status === 'ACTIVE' && (
            <div className="agent-chat-memory-card-actions">
              {editing && (
                <div className="agent-chat-memory-correction-form">
                  <Text strong style={{ fontSize: 12 }}>
                    {intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrectTitle' })}
                  </Text>
                  <Input.TextArea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    showCount
                    placeholder={intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrectionContentPlaceholder' })}
                  />
                  <Input
                    value={draftReason}
                    onChange={(event) => setDraftReason(event.target.value)}
                    maxLength={500}
                    placeholder={intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrectionReasonPlaceholder' })}
                  />
                  <div className="agent-chat-memory-inline-actions">
                    <Button size="small" onClick={() => setEditing(false)}>
                      {intl.formatMessage({ id: 'pages.agent.chat.session.memoryDeleteCancel' })}
                    </Button>
                    <Button size="small" type="primary" loading={correcting} onClick={() => void submitCorrection()}>
                      {intl.formatMessage({ id: 'pages.agent.chat.session.memoryCorrectionSubmit' })}
                    </Button>
                  </div>
                </div>
              )}
              <div className="agent-chat-memory-feedback-form">
                <Select
                  size="small"
                  value={feedbackVerdict}
                  onChange={setFeedbackVerdict}
                  options={[
                    { value: 'ACCURATE', label: intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackAccurate' }) },
                    { value: 'INACCURATE', label: intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackInaccurate' }) },
                    { value: 'EXPIRED', label: intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackExpired' }) },
                  ]}
                />
                <Input
                  size="small"
                  value={feedbackReason}
                  onChange={(event) => setFeedbackReason(event.target.value)}
                  maxLength={500}
                  placeholder={intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackReasonPlaceholder' })}
                />
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={feedbacking}
                  onClick={() => void submitFeedback()}
                >
                  {intl.formatMessage({ id: 'pages.agent.chat.session.memoryFeedbackSubmit' })}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MemoryList({ conversationId, sessionId, open }: { conversationId?: string; sessionId?: string; open: boolean }) {
  const intl = useIntl()
  const [loading, setLoading] = useState(false)
  const [memories, setMemories] = useState<AgentSessionMemory[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open || (!conversationId && !sessionId)) return
    let cancelled = false
    setLoading(true)
    const request = conversationId
      ? getAgentConversationMemories(conversationId)
      : getAgentSessionMemories(sessionId!)
    request
      .then((response) => {
        if (cancelled) return
        if (response.code === 200) setMemories(response.data || [])
      })
      .catch(() => {
        if (!cancelled) {
          message.error(intl.formatMessage({ id: 'pages.agent.chat.session.memoryLoadFailed' }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, conversationId, sessionId, reloadKey, intl])

  const grouped = useMemo(() => {
    const groups: { type: string; items: AgentSessionMemory[] }[] = []
    const byType = new Map<string, AgentSessionMemory[]>()
    memories.forEach((memory) => {
      const type = memory.memoryType || 'OTHER'
      const list = byType.get(type) || []
      list.push(memory)
      byType.set(type, list)
    })
    const orderedTypes = [...MEMORY_TYPE_ORDER].filter((type) => byType.has(type))
    const restTypes = Array.from(byType.keys())
      .filter((type) => !MEMORY_TYPE_ORDER.includes(type))
      .sort()
    ;[...orderedTypes, ...restTypes].forEach((type) => {
      groups.push({ type, items: byType.get(type) || [] })
    })
    return groups
  }, [memories])

  const reloadMemories = () => {
    setReloadKey((value) => value + 1)
  }

  if (loading) {
    return (
      <div className="agent-chat-memory-loading">
        <Spin />
      </div>
    )
  }

  if (memories.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={intl.formatMessage({ id: 'pages.agent.chat.session.memoryEmpty' })}
        style={{ padding: '32px 0' }}
      />
    )
  }

  return (
    <div className="agent-chat-memory-list">
      {grouped.map((group) => (
        <div key={group.type} className="agent-chat-memory-group">
          <div className="agent-chat-memory-group-header">
            <Text strong style={{ fontSize: 13 }}>
              {memoryTypeLabel(group.type, intl)}
            </Text>
            <Tag>{group.items.length}</Tag>
          </div>
          {group.items.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              conversationId={conversationId}
              sessionId={sessionId}
              onChanged={reloadMemories}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function ConversationMemoryPanel({
  conversationId,
  sessionId,
  open,
  onClose,
}: ConversationMemoryPanelProps) {
  const intl = useIntl()

  const content = <MemoryList conversationId={conversationId} sessionId={sessionId} open={open} />

  return (
    <Drawer
      className="agent-chat-memory-panel"
      title={intl.formatMessage({ id: 'pages.agent.chat.session.memoryModalTitle' })}
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
    >
      {content}
    </Drawer>
  )
}
