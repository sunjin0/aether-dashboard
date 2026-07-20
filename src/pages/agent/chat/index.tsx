import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PageContainer } from '@ant-design/pro-components'
import { useIntl } from '@umijs/max'
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
} from 'antd'
import {
  ArrowDownOutlined,
  ClearOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { getAgentDefinitionList } from '@/services/agent/AgentDefinitionController'
import { streamAgentChat, streamReplyAgentChat } from '@/services/agent/ChatController'
import {
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController'
import { getOptionList } from '@/services/sys/DictController'
import {
  AgentChatReplyRequest,
  AgentConversation,
  AgentDefinition,
  AgentMessage,
  AskUserAnswer,
  KnowledgeSource,
} from '@/services/entity/Agent'
import { Option } from '@/services/entity/Common'
import AgentMessageBubble from '@/components/AgentMessageBubble'
import './index.less'

const { Text } = Typography
const TYPEWRITER_INTERVAL = 16
const TYPEWRITER_BASE_STEP = 2
const TYPEWRITER_MAX_STEP = 50

type ChatStreamStatus = 'streaming' | 'error' | 'stopped';

type ChatMessage = AgentMessage & {
  clientId?: string;
  streamStatus?: ChatStreamStatus;
  errorMsg?: string;
  reasoningStream?: string;
};

const restoreMessageSources = (messageItem: AgentMessage): ChatMessage => {
  if (!messageItem.citations) {
    return { ...messageItem, sources: messageItem.sources || [] }
  }

  try {
    return { ...messageItem, sources: JSON.parse(messageItem.citations) as KnowledgeSource[] }
  } catch {
    return { ...messageItem, sources: [] }
  }
}

type ChatTurnState = 'idle' | 'streaming' | 'waiting_user' | 'submitting_answer' | 'error';

const createClientId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}`

const ChatDebugPage: React.FC = () => {
  const intl = useIntl()
  const quickStartQuestions = [
    intl.formatMessage({ id: 'pages.agent.chat.quickStart.helloWorld' }),
    intl.formatMessage({ id: 'pages.agent.chat.quickStart.machineLearning' }),
    intl.formatMessage({ id: 'pages.agent.chat.quickStart.learningResources' }),
    intl.formatMessage({ id: 'pages.agent.chat.quickStart.codeQuality' }),
  ]
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [agentId, setAgentId] = useState<string>()
  const [conversationId, setConversationId] = useState<string>()
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium')
  const [reasoningEffortOptions, setReasoningEffortOptions] = useState<Option[]>([])
  const [chatTurnState, setChatTurnState] = useState<ChatTurnState>('idle')
  const [pendingQuestionMessage, setPendingQuestionMessage] = useState<ChatMessage | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController>()
  const streamingAssistantIdRef = useRef<string>()
  const stoppedByUserRef = useRef(false)
  const typewriterQueueRef = useRef('')
  const typewriterTimerRef = useRef<number>()
  const typewriterDrainCallbackRef = useRef<() => void>()

  const findPendingQuestionMessage = (messageList: ChatMessage[]) =>
    messageList.find(
      (item) => item.messageType === 'interaction' && item.interactionStatus === 'pending',
    ) || null

  const resetConversationTurnState = () => {
    setPendingQuestionMessage(null)
    setChatTurnState('idle')
  }

  const setConversationMessages = (messageList: ChatMessage[]) => {
    const restoredMessages = messageList.map(restoreMessageSources)
    const pendingQuestion = findPendingQuestionMessage(restoredMessages)

    setMessages(restoredMessages)
    setPendingQuestionMessage(pendingQuestion)
    setChatTurnState(pendingQuestion ? 'waiting_user' : 'idle')
  }

  const loadAgents = async () => {
    setLoadingAgents(true)
    try {
      const {
        code,
        data,
        message: msg,
      } = await getAgentDefinitionList({
        current: 1,
        pageSize: 1000,
        status: 1,
      })
      if (code === 200) {
        setAgents(data || [])
      } else {
        message.error(msg || intl.formatMessage({ id: 'pages.agent.chat.loadAgentsFailed' }))
      }
    } finally {
      setLoadingAgents(false)
    }
  }

  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      const {
        code,
        data,
        message: msg,
      } = await getAgentConversationList({
        status: 0,
        current: 1,
        pageSize: 50,
      })
      if (code === 200) {
        setConversations(data || [])
      } else {
        message.error(msg || intl.formatMessage({ id: 'pages.agent.chat.loadConversationsFailed' }))
      }
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadMessages = async (id: string) => {
    setLoadingMessages(true)
    try {
      const {
        code,
        data,
        message: msg,
      } = await getAgentConversationMessages(id, {
        current: 1,
        pageSize: 100,
        includeToolCalls: true,
      })
      if (code === 200) {
        setConversationMessages(data || [])
      } else {
        message.error(msg || intl.formatMessage({ id: 'pages.agent.chat.loadMessagesFailed' }))
      }
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    loadAgents()
    loadConversations()
    getOptionList('Agent_Reasoning_Effort').then(setReasoningEffortOptions)
  }, [])

  useEffect(() => {
    if (!showScrollBottom) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const updateAssistantMessage = (
    clientId: string,
    updater: (messageItem: ChatMessage) => ChatMessage,
  ) => {
    setMessages((current) =>
      current.map((item) => (item.clientId === clientId ? updater(item) : item)),
    )
  }

  const clearTypewriterTimer = () => {
    if (typewriterTimerRef.current !== undefined) {
      window.clearInterval(typewriterTimerRef.current)
      typewriterTimerRef.current = undefined
    }
  }

  const runTypewriterDrainCallback = () => {
    const callback = typewriterDrainCallbackRef.current
    typewriterDrainCallbackRef.current = undefined
    callback?.()
  }

  const resetTypewriter = () => {
    clearTypewriterTimer()
    typewriterQueueRef.current = ''
    typewriterDrainCallbackRef.current = undefined
  }

  const startTypewriterTimer = (assistantClientId: string) => {
    if (typewriterTimerRef.current !== undefined) {
      return
    }

    typewriterTimerRef.current = window.setInterval(() => {
      const queueLen = typewriterQueueRef.current.length
      if (!queueLen) {
        clearTypewriterTimer()
        runTypewriterDrainCallback()
        return
      }

      const step = Math.min(TYPEWRITER_BASE_STEP + Math.floor(queueLen / 20), TYPEWRITER_MAX_STEP)
      const nextText = typewriterQueueRef.current.slice(0, step)
      typewriterQueueRef.current = typewriterQueueRef.current.slice(nextText.length)
      updateAssistantMessage(assistantClientId, (item) => ({
        ...item,
        content: `${item.content || ''}${nextText}`,
      }))

      if (!typewriterQueueRef.current) {
        clearTypewriterTimer()
        runTypewriterDrainCallback()
      }
    }, TYPEWRITER_INTERVAL)
  }

  const appendTypewriterText = (assistantClientId: string, text: string) => {
    typewriterQueueRef.current += text
    startTypewriterTimer(assistantClientId)
  }

  const flushTypewriterQueue = (assistantClientId: string) => {
    const remainingText = typewriterQueueRef.current
    resetTypewriter()
    if (!remainingText) {
      return
    }
    updateAssistantMessage(assistantClientId, (item) => ({
      ...item,
      content: `${item.content || ''}${remainingText}`,
    }))
  }

  const waitForTypewriterDrain = () => {
    if (!typewriterQueueRef.current && typewriterTimerRef.current === undefined) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      typewriterDrainCallbackRef.current = resolve
    })
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      resetTypewriter()
    }
  }, [])

  const handleNewConversation = () => {
    if (sending) {
      return
    }
    setConversationId(undefined)
    setMessages([])
    resetConversationTurnState()
  }

  const handleSelectConversation = async (conversation: AgentConversation) => {
    if (sending || !conversation.id) {
      return
    }

    setConversationId(conversation.id)
    if (conversation.agentDefinitionId) {
      setAgentId(conversation.agentDefinitionId)
    }
    setMessages([])
    resetConversationTurnState()
    await loadMessages(conversation.id)
  }

  const markAssistantStopped = (assistantClientId?: string) => {
    if (!assistantClientId) {
      return
    }
    updateAssistantMessage(assistantClientId, (item) => ({
      ...item,
      streamStatus: 'stopped',
    }))
  }

  const markAssistantError = (assistantClientId: string, errorMsg: string) => {
    updateAssistantMessage(assistantClientId, (item) => ({
      ...item,
      streamStatus: 'error',
      errorMsg,
    }))
  }

  const handleStop = () => {
    if (!abortControllerRef.current) {
      return
    }
    stoppedByUserRef.current = true
    abortControllerRef.current.abort()
    resetTypewriter()
    markAssistantStopped(streamingAssistantIdRef.current)
    setChatTurnState('idle')
    setPendingQuestionMessage(null)
  }

  const handleReplyQuestion = async (answers: Record<string, AskUserAnswer>) => {
    if (chatTurnState !== 'waiting_user' || !pendingQuestionMessage) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.waitPreviousQuestion' }))
      return
    }

    const questionMessageId = pendingQuestionMessage.id
    const questionConversationId = pendingQuestionMessage.conversationId || conversationId

    if (!questionMessageId || !questionConversationId) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.incompleteQuestion' }))
      return
    }

    setChatTurnState('submitting_answer')

    // 乐观更新：标记已回答 + 写入答案到 questionConfig
    setMessages((current) =>
      current.map((item) => {
        if (item.id !== questionMessageId) return item

        // 解析现有 questionConfig
        let parsed: any = null
        try {
          parsed =
            typeof item.questionConfig === 'string'
              ? JSON.parse(item.questionConfig)
              : item.questionConfig
        } catch {
          // ignore
        }

        // 构建带 label 的答案
        const answersWithLabels: Record<string, any> = {}
        const questions = parsed?.questions || []
        for (const q of questions) {
          const userAnswer = answers[q.id]
          if (!userAnswer) continue

          if ('selected' in userAnswer) {
            const values = Array.isArray(userAnswer.selected)
              ? userAnswer.selected
              : [userAnswer.selected]
            const selectedOptions = values.map((val: string) => {
              const opt = q.options?.find((o: any) => o.value === val)
              return { id: opt?.id || val, label: opt?.label || val, value: val }
            })
            answersWithLabels[q.id] = {
              selected: userAnswer.selected,
              selectedOptions,
              answeredAt: Date.now(),
            }
          } else if ('confirmed' in userAnswer) {
            answersWithLabels[q.id] = {
              confirmed: userAnswer.confirmed,
              label: userAnswer.confirmed
                ? q.confirmText || intl.formatMessage({ id: 'pages.agent.chat.confirm' })
                : q.cancelText || intl.formatMessage({ id: 'pages.agent.chat.cancel' }),
              answeredAt: Date.now(),
            }
          }
        }

        // 写回 questionConfig
        if (parsed) {
          parsed.answer = { answeredAt: Date.now(), answers: answersWithLabels }
          if (parsed.questions) {
            parsed.questions = parsed.questions.map((q: any) => ({
              ...q,
              answer: answersWithLabels[q.id],
            }))
          }
        }

        return {
          ...item,
          interactionStatus: 'answered',
          questionConfig: parsed ? JSON.stringify(parsed) : item.questionConfig,
        }
      }),
    )

    // 创建 assistant 消息用于流式显示后续回复
    const assistantClientId = createClientId('assistant')
    const assistantMessage: ChatMessage = {
      clientId: assistantClientId,
      role: 'assistant',
      content: '',
      streamStatus: 'streaming',
    }
    setMessages((current) => [...current, assistantMessage])

    const controller = new AbortController()
    abortControllerRef.current = controller
    streamingAssistantIdRef.current = assistantClientId
    setSending(true)

    let terminalEventReceived = false
    let questionReceived = false
    let typewriterDrainPromise: Promise<void> | undefined

    resetTypewriter()

    try {
      const replyPayload: AgentChatReplyRequest = {
        conversationId: questionConversationId,
        parentMessageId: questionMessageId,
        answer: { answers },
        interactive: true,
      }

      await streamReplyAgentChat(replyPayload, {
        signal: controller.signal,
        onMessage: (chunk, data) => {
          if (data.conversationId) {
            setConversationId(data.conversationId)
          }
          if (!chunk) {
            return
          }
          appendTypewriterText(assistantClientId, chunk)
        },
        onReasoning: (chunk, data) => {
          if (data.conversationId) {
            setConversationId(data.conversationId)
          }
          if (!chunk) {
            return
          }
          updateAssistantMessage(assistantClientId, (item) => ({
            ...item,
            reasoningStream: (item.reasoningStream || '') + chunk,
          }))
        },
        onError: (data) => {
          terminalEventReceived = true
          flushTypewriterQueue(assistantClientId)
          const errorMsg = data.message || intl.formatMessage({ id: 'pages.agent.chat.replyFailed' })
          markAssistantError(assistantClientId, errorMsg)
          message.error(errorMsg)
          setChatTurnState('error')
        },
        onQuestion: (data) => {
          // question 事件：追加交互卡片，不清空当前流式 assistant
          questionReceived = true
          flushTypewriterQueue(assistantClientId)

          const interactionMessage: ChatMessage = {
            clientId: createClientId('interaction'),
            id: data.messageId,
            conversationId: data.conversationId,
            role: 'assistant',
            messageType: 'interaction',
            interactionType: (data.interactionType as any) || 'group',
            interactionStatus: 'pending',
            content: data.content,
            questionConfig: data.questionConfig ? JSON.stringify(data.questionConfig) : undefined,
          }

          // 追加交互卡片（保留当前流式 assistant 消息）
          setMessages((current) => [...current, interactionMessage])

          setPendingQuestionMessage(interactionMessage)
          setChatTurnState('waiting_user')
        },
        onDone: (data) => {
          terminalEventReceived = true
          const doneConversationId = data.conversationId
          if (doneConversationId) {
            setConversationId(doneConversationId)
          }
          typewriterDrainPromise = waitForTypewriterDrain().then(async () => {
            // 刷新历史消息以获取完整的 answer 消息
            let reloaded = false
            if (doneConversationId && data.messageId) {
              try {
                const result = await getAgentConversationMessages(doneConversationId, {
                  current: 1,
                  pageSize: 100,
                  includeToolCalls: true,
                })
                if (result.code === 200 && result.data) {
                  setConversationMessages(result.data)
                  reloaded = true
                }
              } catch {
                // ignore
              }
            }

            if (!reloaded) {
              // 只结束当前流式 assistant，不用 question.messageId 覆盖
              updateAssistantMessage(assistantClientId, (item) => ({
                ...item,
                id: data.messageId || item.id,
                conversationId: doneConversationId || item.conversationId,
                content: data.content || item.content,
                sources: data.sources ?? item.sources ?? [],
                reasoningContent:
                  data.reasoningContent || item.reasoningContent || item.reasoningStream,
                reasoningStream: undefined,
                reasoningTokens: data.reasoningTokens ?? item.reasoningTokens,
                model: data.model || item.model,
                promptTokens: data.promptTokens ?? item.promptTokens,
                completionTokens: data.completionTokens ?? item.completionTokens,
                totalTokens: data.totalTokens ?? item.totalTokens,
                latencyMs: data.latencyMs ?? item.latencyMs,
                streamStatus: undefined,
              }))
            }

            // 如果已收到 question，保持 waiting_user 状态（由 handleReplyQuestion 管理）
            if (!questionReceived) {
              if (data.waitingUser) {
                setChatTurnState('waiting_user')
              } else {
                setPendingQuestionMessage(null)
                setChatTurnState('idle')
              }
            }
          })
        },
      })

      if (typewriterDrainPromise) {
        await typewriterDrainPromise
      }
      if (!terminalEventReceived) {
        flushTypewriterQueue(assistantClientId)
        markAssistantError(assistantClientId, intl.formatMessage({ id: 'pages.agent.chat.connectionClosed' }))
      }
    } catch (error: any) {
      if (error?.response?.status === 409 || error?.status === 409) {
        message.warning(intl.formatMessage({ id: 'pages.agent.chat.questionExpired' }))
        if (questionConversationId) {
          await loadMessages(questionConversationId)
        }
        setPendingQuestionMessage(null)
        setChatTurnState('idle')
      } else if (controller.signal.aborted) {
        markAssistantStopped(assistantClientId)
        setChatTurnState('idle')
      } else {
        const errorMsg = error instanceof Error ? error.message : intl.formatMessage({ id: 'pages.agent.chat.replyFailed' })
        flushTypewriterQueue(assistantClientId)
        markAssistantError(assistantClientId, errorMsg)
        message.error(errorMsg)
        setChatTurnState('error')
      }
    } finally {
      setSending(false)
      abortControllerRef.current = undefined
      streamingAssistantIdRef.current = undefined
    }
  }

  const handleSend = async (text?: string) => {
    if (sending) {
      return
    }

    const content = (text || input).trim()
    const conversationAgentId = conversationId
      ? conversations.find((item) => item.id === conversationId)?.agentDefinitionId
      : undefined
    const sendAgentId = conversationAgentId || agentId
    if (!sendAgentId) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.selectAgent' }))
      return
    }
    if (!content) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.enterMessage' }))
      return
    }

    const userMessage: ChatMessage = {
      clientId: createClientId('user'),
      role: 'user',
      content,
    }
    const assistantClientId = createClientId('assistant')
    const assistantMessage: ChatMessage = {
      clientId: assistantClientId,
      role: 'assistant',
      content: '',
      streamStatus: 'streaming',
    }
    const controller = new AbortController()
    let shouldReloadConversations = false
    let terminalEventReceived = false
    let questionReceived = false
    let typewriterDrainPromise: Promise<void> | undefined

    resetTypewriter()
    abortControllerRef.current = controller
    streamingAssistantIdRef.current = assistantClientId
    stoppedByUserRef.current = false
    setSending(true)
    setChatTurnState('streaming')
    setInput('')
    setMessages((current) => [...current, userMessage, assistantMessage])

    try {
      const payload: any = conversationId
        ? { agentId: sendAgentId, conversationId, message: content }
        : { agentId: sendAgentId, message: content }
      if (thinking) {
        payload.thinking = true
        payload.reasoningEffort = reasoningEffort
      }
      await streamAgentChat(payload, {
        signal: controller.signal,
        onMessage: (chunk, data) => {
          if (data.conversationId) {
            setConversationId(data.conversationId)
            if (!conversationId) {
              shouldReloadConversations = true
            }
          }
          if (!chunk) {
            return
          }
          appendTypewriterText(assistantClientId, chunk)
        },
        onReasoning: (chunk, data) => {
          if (data.conversationId) {
            setConversationId(data.conversationId)
            if (!conversationId) {
              shouldReloadConversations = true
            }
          }
          if (!chunk) {
            return
          }
          updateAssistantMessage(assistantClientId, (item) => ({
            ...item,
            reasoningStream: (item.reasoningStream || '') + chunk,
          }))
        },
        onError: (data) => {
          terminalEventReceived = true
          flushTypewriterQueue(assistantClientId)
          const errorMsg = data.message || intl.formatMessage({ id: 'pages.agent.chat.generateFailed' })
          markAssistantError(assistantClientId, errorMsg)
          message.error(errorMsg)
          setChatTurnState('error')
        },
        onQuestion: (data) => {
          // question 事件：追加交互卡片，不清空当前流式 assistant
          questionReceived = true
          flushTypewriterQueue(assistantClientId)

          const interactionMessage: ChatMessage = {
            clientId: createClientId('interaction'),
            id: data.messageId,
            conversationId: data.conversationId,
            role: 'assistant',
            messageType: 'interaction',
            interactionType: (data.interactionType as any) || 'group',
            interactionStatus: 'pending',
            content: data.content,
            questionConfig: data.questionConfig ? JSON.stringify(data.questionConfig) : undefined,
          }

          // 追加交互卡片（保留当前流式 assistant 消息）
          setMessages((current) => [...current, interactionMessage])

          setPendingQuestionMessage(interactionMessage)
          setChatTurnState('waiting_user')
        },
        onDone: (data) => {
          terminalEventReceived = true
          const doneConversationId = data.conversationId
          if (doneConversationId) {
            setConversationId(doneConversationId)
            if (!conversationId) {
              shouldReloadConversations = true
            }
          }
          typewriterDrainPromise = waitForTypewriterDrain().then(async () => {
            updateAssistantMessage(assistantClientId, (item) => ({
              ...item,
              id: data.messageId || item.id,
              conversationId: doneConversationId || item.conversationId,
              content: data.content || item.content,
              sources: data.sources ?? item.sources ?? [],
              reasoningContent:
                data.reasoningContent || item.reasoningContent || item.reasoningStream,
              reasoningStream: undefined,
              reasoningTokens: data.reasoningTokens ?? item.reasoningTokens,
              model: data.model || item.model,
              promptTokens: data.promptTokens ?? item.promptTokens,
              completionTokens: data.completionTokens ?? item.completionTokens,
              totalTokens: data.totalTokens ?? item.totalTokens,
              latencyMs: data.latencyMs ?? item.latencyMs,
              streamStatus: undefined,
            }))
            if (doneConversationId && data.messageId) {
              try {
                const result = await getAgentConversationMessages(doneConversationId, {
                  current: 1,
                  pageSize: 100,
                  includeToolCalls: true,
                })
                if (result.code === 200 && result.data) {
                  setConversationMessages(result.data)
                }
              } catch {
                // ignore
              }
            }
            if (!questionReceived) {
              if (data.waitingUser) {
                setChatTurnState('waiting_user')
              } else {
                setPendingQuestionMessage(null)
                setChatTurnState('idle')
              }
            }
          })
        },
      })

      if (typewriterDrainPromise) {
        await typewriterDrainPromise
      }
      if (!terminalEventReceived && !stoppedByUserRef.current) {
        flushTypewriterQueue(assistantClientId)
        markAssistantError(assistantClientId, intl.formatMessage({ id: 'pages.agent.chat.connectionClosed' }))
      }
      if (shouldReloadConversations) {
        await loadConversations()
      }
    } catch (error) {
      if (stoppedByUserRef.current || controller.signal.aborted) {
        markAssistantStopped(assistantClientId)
        setChatTurnState('idle')
        return
      }
      const errorMsg = error instanceof Error ? error.message : intl.formatMessage({ id: 'pages.agent.chat.sendFailed' })
      flushTypewriterQueue(assistantClientId)
      markAssistantError(assistantClientId, errorMsg)
      message.error(errorMsg || intl.formatMessage({ id: 'pages.agent.chat.sendFailed' }))
      setChatTurnState('error')
    } finally {
      setSending(false)
      abortControllerRef.current = undefined
      streamingAssistantIdRef.current = undefined
      stoppedByUserRef.current = false
    }
  }

  const handleScrollBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBottom(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollBottom(!isNearBottom)
  }

  const renderConversationTitle = (item: AgentConversation) => {
    return item.title || item.createdAt || item.id || intl.formatMessage({ id: 'pages.agent.chat.untitledConversation' })
  }

  const renderTimeGroup = (date: string) => {
    const now = new Date()
    const target = new Date(date)
    const diffDays = Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return intl.formatMessage({ id: 'pages.agent.chat.today' })
    if (diffDays === 1) return intl.formatMessage({ id: 'pages.agent.chat.yesterday' })
    if (diffDays < 7) return intl.formatMessage({ id: 'pages.agent.chat.recentWeek' })
    if (diffDays < 30) return intl.formatMessage({ id: 'pages.agent.chat.recentMonth' })
    return intl.formatMessage({ id: 'pages.agent.chat.earlier' })
  }

  const groupedConversations = useMemo(() => {
    const filtered = searchText
      ? conversations.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.id?.toLowerCase().includes(searchText.toLowerCase()),
      )
      : conversations

    const groups: Record<string, AgentConversation[]> = {}
    filtered.forEach((item) => {
      const date = item.updatedAt || item.createdAt || ''
      const group = renderTimeGroup(date)
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(item)
    })

    return groups
  }, [conversations, searchText])

  const currentConversation = conversations.find((item) => item.id === conversationId)
  const activeAgentId = currentConversation?.agentDefinitionId || agentId
  const currentAgent = agents.find((item) => item.id === activeAgentId)

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'pages.agent.chat.title' }),
        breadcrumb: undefined,
      }}
    >
      <div className="agent-chat-page">
        {/* 侧边栏 */}
        <div
          className={`agent-chat-sidebar ${sidebarCollapsed ? 'agent-chat-sidebar-collapsed' : ''}`}
        >
          {!sidebarCollapsed && (
            <>
              <div className="agent-chat-sidebar-header">
                <Select
                  placeholder={intl.formatMessage({ id: 'pages.agent.chat.selectAgentPlaceholder' })}
                  loading={loadingAgents}
                  value={activeAgentId}
                  disabled={sending}
                  showSearch={true}
                  allowClear={true}
                  optionFilterProp="label"
                  style={{ flex: 1 }}
                  onChange={(value) => {
                    setAgentId(value)
                    setConversationId(undefined)
                    setMessages([])
                    resetConversationTurnState()
                  }}
                  options={agents
                    .filter((item) => item.id)
                    .map((item) => ({
                      label: item.name || item.code || item.id,
                      value: item.id,
                    }))}
                />
                <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.newConversation' })}>
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
                  placeholder={intl.formatMessage({ id: 'pages.agent.chat.searchConversations' })}
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
                            className={
                              item.id === conversationId ? 'agent-chat-session-active' : undefined
                            }
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
                      description={intl.formatMessage({ id: searchText ? 'pages.agent.chat.noMatchingConversations' : 'pages.agent.chat.noConversations' })}
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
                <Tooltip title={intl.formatMessage({ id: sidebarCollapsed ? 'pages.agent.chat.expandSidebar' : 'pages.agent.chat.collapseSidebar' })}>
                  <Button
                    type="text"
                    icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  />
                </Tooltip>
                <Text strong={true} style={{ fontSize: 16 }}>
                  {currentAgent?.name || currentAgent?.code || intl.formatMessage({ id: 'pages.agent.chat.noAgentSelected' })}
                </Text>
                {currentAgent?.model && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {currentAgent.model}
                  </Tag>
                )}
              </div>
              <div className="agent-chat-panel-subtitle">
                {currentConversation ? renderConversationTitle(currentConversation) : intl.formatMessage({ id: 'pages.agent.chat.newConversationTitle' })}
              </div>
            </div>
            <div className="agent-chat-panel-actions">
              {sending && (
                <Button type="primary" danger icon={<ClearOutlined />} onClick={handleStop}>
                  {intl.formatMessage({ id: 'pages.agent.chat.stopGenerating' })}
                </Button>
              )}
            </div>
          </div>

          {/* 消息列表 */}
          <div className="agent-chat-message-container">
            <div className="agent-chat-message-scroll" ref={messageListRef} onScroll={handleScroll}>
              <Spin spinning={loadingMessages}>
                <div className="agent-chat-message-list">
                  {!messages.length ? (
                    <div className="agent-chat-empty-container">
                      <Empty
                        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                        description={
                          <span style={{ fontSize: 15, color: 'rgba(0, 0, 0, 0.45)' }}>
                            {currentAgent
                              ? intl.formatMessage({ id: 'pages.agent.chat.startChatWithAgent' }, { name: currentAgent.name })
                              : intl.formatMessage({ id: 'pages.agent.chat.selectAgentToStart' })}
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
                          onQuestionSubmit={
                            item.messageType === 'interaction' &&
                            item.interactionStatus === 'pending'
                              ? handleReplyQuestion
                              : undefined
                          }
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
                <Button icon={<ArrowDownOutlined />} onClick={handleScrollBottom}>
                  {intl.formatMessage({ id: 'pages.agent.chat.backToBottom' })}
                </Button>
              </div>
            )}
          </div>

          {/* 底部输入 */}
          <div className="agent-chat-input-bar">
            <div className="agent-chat-thinking-bar">
              <Checkbox checked={thinking} onChange={(e) => setThinking(e.target.checked)}>
                <span className="agent-chat-thinking-label">{intl.formatMessage({ id: 'pages.agent.chat.deepThinking' })}</span>
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
                  {intl.formatMessage({ id: 'pages.agent.chat.thinking' })}
                </Tag>
              )}
            </div>
            <div className="agent-chat-input-wrapper">
              <div className="agent-chat-input-box">
                <Input.TextArea
                  value={input}
                  disabled={
                    sending ||
                    chatTurnState === 'waiting_user' ||
                    chatTurnState === 'submitting_answer'
                  }
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  placeholder={intl.formatMessage({ id: 'pages.agent.chat.inputPlaceholder' })}
                  onChange={(event) => setInput(event.target.value)}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault()
                      if (!sending) {
                        handleSend()
                      }
                    }
                  }}
                />
              </div>
              <Button
                className="agent-chat-send-btn"
                type="primary"
                disabled={
                  sending ||
                  !input.trim() ||
                  chatTurnState === 'waiting_user' ||
                  chatTurnState === 'submitting_answer'
                }
                onClick={() => handleSend()}
              >
                {intl.formatMessage({ id: 'pages.agent.chat.send' })}
              </Button>
            </div>
            <div className="agent-chat-input-hint">
              <span>
                <kbd>Enter</kbd> {intl.formatMessage({ id: 'pages.agent.chat.send' })}
              </span>
              <span>
                <kbd>Shift</kbd> + <kbd>Enter</kbd> {intl.formatMessage({ id: 'pages.agent.chat.newLine' })}
              </span>
              {currentAgent?.model && (
                <span style={{ marginLeft: 'auto' }}>{intl.formatMessage({ id: 'pages.agent.chat.model' }, { model: currentAgent.model })}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default ChatDebugPage
