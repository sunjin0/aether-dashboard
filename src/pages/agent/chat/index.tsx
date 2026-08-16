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
  Modal,
  Progress,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  BulbOutlined,
  CheckCircleFilled,
  ClearOutlined,
  CloseCircleFilled,
  CommentOutlined,
  LoadingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UnorderedListOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import {
  streamAgentChat,
  streamDeepRun,
  streamReplyAgentChat,
  uploadAgentChatAttachments,
} from '@/services/agent/ChatController'
import { cancelAgentRun, getAgentRunPlan } from '@/services/agent/RunController'
import { deleteAgentSessionMemory, getAgentSessionByConversation, getAgentSessionMemories, getAgentSessionMetrics, getAgentSessionTimeline, getAgentTaskSnapshot, pauseAgentSessionTask, submitAgentTaskFeedback } from '@/services/agent/SessionController'
import { getAgentArtifactByRun } from '@/services/agent/ArtifactController'
import { cancelSandboxTask, decideSandboxTask, getSandboxTaskByRun, retrySandboxTask } from '@/services/agent/SandboxTaskController'
import {
  getAgentConversationList,
  getAgentConversationMessages,
  updateAgentConversationToolApprovalPolicy,
} from '@/services/agent/ConversationController'
import { getOptionList } from '@/services/sys/DictController'
import {
  AgentChatReplyRequest,
  AgentChatAttachment,
  AgentConversation,
  AgentDefinition,
  AgentMessage,
  AskUserAnswer,
  AgentStreamRunStepData,
  AgentStreamAcceptedData,
  AgentStreamToolCallData,
  KnowledgeSource,
  AgentRunPlan,
  AgentSessionMetrics,
  AgentSessionMemory,
  AgentTask,
  AgentTaskEvent,
} from '@/services/entity/Agent'
import { Option } from '@/services/entity/Common'
import AgentMessageBubble from '@/components/AgentMessageBubble'
import TemporaryUrlPreviewModal from '@/components/TemporaryUrlPreviewModal'
import FormattedContent from '@/components/FormattedContent'
import { createChatAttachmentPreviewUrl } from '@/services/file/FileController'
import {
  cancelDeepRun,
  getDeepRunTasks,
  getDeepStepDisplayText,
  mergeDeepRunSteps,
  DeepTask,
} from './deepProgress'
import './index.less'

const { Text } = Typography
const TYPEWRITER_INTERVAL = 16
const TYPEWRITER_BASE_STEP = 2
const TYPEWRITER_MAX_STEP = 50

type ChatStreamStatus = 'streaming' | 'error' | 'stopped'

type ChatMessage = AgentMessage & {
  clientId?: string
  streamStatus?: ChatStreamStatus
  errorMsg?: string
  reasoningStream?: string
  progressMessage?: string
  executionEvents?: ChatExecutionEvent[]
}

type ChatExecutionEvent = {
  id: string
  title: string
  detail?: string
  status?: 'running' | 'completed' | 'failed' | 'pending'
  actions?: Array<{ label: string; danger?: boolean; onClick: () => void }>
}

type ChatAttachmentFile = UploadFile & { attachment?: AgentChatAttachment }

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

type ChatTurnState = 'idle' | 'streaming' | 'waiting_user' | 'submitting_answer' | 'error'

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
  const [sandboxDecision, setSandboxDecision] = useState<{ id: string; decision: 'approve' | 'reject'; detail?: string }>()
  const [sandboxDecisionReason, setSandboxDecisionReason] = useState('')
  const [sandboxDecisionSubmitting, setSandboxDecisionSubmitting] = useState(false)
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachmentFile[]>([])
  const attachmentsRef = useRef<ChatAttachmentFile[]>([])
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
  const [toolApprovalPolicy, setToolApprovalPolicy] = useState<'ask' | 'risky' | 'never'>('ask')
  const [chatTurnState, setChatTurnState] = useState<ChatTurnState>('idle')
  const [pendingQuestionMessage, setPendingQuestionMessage] = useState<ChatMessage | null>(null)
  const [deepRunId, setDeepRunId] = useState<string | null>(null)
  const [deepRunSteps, setDeepRunSteps] = useState<AgentStreamRunStepData[]>([])
  const [persistedDeepTasks, setPersistedDeepTasks] = useState<DeepTask[]>([])
  const [taskPlanDrawerOpen, setTaskPlanDrawerOpen] = useState(false)
  const [activeDeepSessionId, setActiveDeepSessionId] = useState<string>()
  const [sessionMemories, setSessionMemories] = useState<AgentSessionMemory[]>([])
  const [sessionMemoryModalOpen, setSessionMemoryModalOpen] = useState(false)
  const [selectedSessionTask, setSelectedSessionTask] = useState<AgentTask>()
  const [taskFeedbackOpen, setTaskFeedbackOpen] = useState(false)
  const [taskFeedbackRating, setTaskFeedbackRating] = useState(5)
  const [taskFeedbackNote, setTaskFeedbackNote] = useState('')
  const [sessionMetrics, setSessionMetrics] = useState<AgentSessionMetrics>()
  const [sessionMetricsModalOpen, setSessionMetricsModalOpen] = useState(false)
  const [sessionTasks, setSessionTasks] = useState<AgentTask[]>([])
  const [sessionTaskTimeline, setSessionTaskTimeline] = useState<AgentTaskEvent[]>([])
  const [sessionTaskPlan, setSessionTaskPlan] = useState<AgentRunPlan>()
  const messageEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController>()
  const deepStreamAbortControllerRef = useRef<AbortController>()
  const deepRunIdRef = useRef<string | null>(null)
  const deepStreamSubscribedRunIdRef = useRef<string>()
  const streamingAssistantIdRef = useRef<string>()
  const stoppedByUserRef = useRef(false)
  const typewriterQueueRef = useRef('')
  const typewriterTimerRef = useRef<number>()
  const typewriterDrainCallbackRef = useRef<() => void>()
  const artifactRequestedRef = useRef(false)
  const artifactPollingTimerRef = useRef<number>()
  const sandboxPollingKeyRef = useRef<string>()
  const shownSandboxApprovalTaskRef = useRef<string>()
  const loadedPlanRunIdRef = useRef<string>()

  const findPendingQuestionMessage = (messageList: ChatMessage[]) =>
    messageList.find(
      (item) => item.messageType === 'interaction' && item.interactionStatus === 'pending',
    ) || null

  const resetConversationTurnState = () => {
    setPendingQuestionMessage(null)
    setChatTurnState('idle')
  }

  const resetDeepProgress = () => {
    deepStreamAbortControllerRef.current?.abort()
    deepStreamAbortControllerRef.current = undefined
    deepRunIdRef.current = null
    deepStreamSubscribedRunIdRef.current = undefined
    setDeepRunId(null)
    setDeepRunSteps([])
    setPersistedDeepTasks([])
    setActiveDeepSessionId(undefined)
    setSessionMemories([])
    setSelectedSessionTask(undefined)
    setSessionTasks([])
    setSessionTaskTimeline([])
    setSessionTaskPlan(undefined)
    loadedPlanRunIdRef.current = undefined
    setTaskPlanDrawerOpen(false)
  }

  const addDeepRunStep = (data: AgentStreamRunStepData) => {
    if (!deepRunIdRef.current && data.runId) {
      deepRunIdRef.current = data.runId
      setDeepRunId(data.runId)
    }
    setDeepRunSteps((current) => mergeDeepRunSteps(current, data))
    if (data.eventType === 'plan.updated' && data.runId) {
      void loadPersistedTaskPlan(data.runId, true)
    }
    // Deep Agent reports MCP lifecycle through run_step rather than the
    // regular Agent's tool_call event. Start artifact completion tracking as
    // soon as the platform generator is actually invoked.
    if (data.eventType === 'tool.started' && data.data?.toolName === 'generate_artifact') {
      artifactRequestedRef.current = true
      appendExecutionEvent(streamingAssistantIdRef.current, {
        id: `artifact-${data.eventId || data.occurredAt || Date.now()}`,
        title: intl.formatMessage({ id: 'pages.agent.chat.artifactGenerating' }),
        status: 'running',
      })
    }
    const title = getDeepStepDisplayText(data, intl.formatMessage)
    const detail = data.data?.error || data.data?.outputSummary || data.data?.summary || data.data?.message
    if (title) {
      appendExecutionEvent(streamingAssistantIdRef.current, {
        id: `deep-${data.eventId || `${data.eventType}-${data.occurredAt}`}`,
        title,
        detail,
        status:
          data.eventType?.endsWith('.failed') || data.eventType === 'run.failed'
            ? 'failed'
            : data.eventType?.endsWith('.completed') || data.eventType === 'run.completed'
              ? 'completed'
              : data.eventType?.endsWith('.started') || data.eventType === 'run.started'
                ? 'running'
                : 'pending',
      })
    }
  }

  const deepRunTasks = useMemo(() => getDeepRunTasks(deepRunSteps), [deepRunSteps])
  const visibleDeepTasks = deepRunTasks.length > 0 ? deepRunTasks : persistedDeepTasks
  const activeDeepTask = visibleDeepTasks.find((task) => task.status === 'running')

  const toDeepTaskStatus = (status?: string): DeepTask['status'] => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCEEDED':
      case 'SUCCESS':
      case 'DONE':
        return 'completed'
      case 'RUNNING':
      case 'IN_PROGRESS':
      case 'PLANNING':
      case 'WAITING_USER':
      case 'WAITING_APPROVAL':
      case 'PAUSED':
        return 'running'
      case 'FAILED':
      case 'CANCELLED':
      case 'BLOCKED':
        return 'failed'
      default:
        return 'pending'
    }
  }

  const loadPersistedTaskPlan = async (runId: string, force = false) => {
    if (!runId || (!force && loadedPlanRunIdRef.current === runId)) return
    loadedPlanRunIdRef.current = runId
    try {
      const response = await getAgentRunPlan(runId)
      if (response.code !== 200 || !response.data) return
      const plan = response.data as AgentRunPlan
      const currentVersion = plan.versions?.find((item) => item.version === plan.currentVersion)
        || plan.versions?.[plan.versions.length - 1]
      setPersistedDeepTasks((currentVersion?.steps || []).map((step, index) => {
        return {
          id: step.id || step.stepKey || `plan-${index + 1}`,
          title: step.title || `步骤 ${index + 1}`,
          status: toDeepTaskStatus(step.status),
        }
      }))
    } catch {
      // A run may be accepted before its first persisted plan callback arrives.
    }
  }

  const loadSessionWorkspace = async (targetConversationId: string) => {
    if (!targetConversationId) return
    try {
      // 先拉取 Session 快照与时间线，再据此恢复工作区；前端内存不作为任务状态来源。
      const [sessionResult, timelineResult] = await Promise.allSettled([
        getAgentSessionByConversation(targetConversationId),
        getAgentSessionTimeline(targetConversationId),
      ])
      const sessionResponse = sessionResult.status === 'fulfilled' ? sessionResult.value : undefined
      const timelineResponse = timelineResult.status === 'fulfilled' ? timelineResult.value : undefined
      const session = sessionResponse?.data?.session
      if (!session) return
      setActiveDeepSessionId(session.id)
      const tasks = sessionResponse?.data?.tasks?.length
        ? sessionResponse.data.tasks
        : timelineResponse?.data?.tasks || []
      setSessionTasks(tasks)
      setSessionTaskTimeline(timelineResponse?.data?.events || [])
      const activeTask = tasks.find((item: AgentTask) =>
        ['QUEUED', 'PLANNING', 'RUNNING', 'WAITING_USER', 'WAITING_APPROVAL', 'PAUSED'].includes(item.status || ''),
      ) || tasks[0]
      if (!activeTask?.id) return
      setSelectedSessionTask(activeTask)
      const taskResponse = await getAgentTaskSnapshot(activeTask.id)
      const plan = taskResponse.data?.plan
      setSessionTaskPlan(plan)
      const currentVersion = plan?.versions?.find((item) => item.version === plan.currentVersion)
        || plan?.versions?.[plan.versions.length - 1]
      if (currentVersion?.steps?.length) {
        setPersistedDeepTasks(currentVersion.steps.map((step, index) => {
          return {
            id: step.id || step.stepKey || `task-${index + 1}`,
            title: step.title || `步骤 ${index + 1}`,
            status: toDeepTaskStatus(step.status),
          }
        }))
        setTaskPlanDrawerOpen(true)
      } else {
        // 排队任务尚未被派发，因此没有计划版本；仍应让用户看见它而不是误以为请求丢失。
        setPersistedDeepTasks([{
          id: activeTask.id,
          title: activeTask.title || '等待处理任务',
          status: toDeepTaskStatus(activeTask.status),
        }])
        setTaskPlanDrawerOpen(true)
      }
    } catch {
      // Standard conversations and historical conversations may not own a Deep Session yet.
    }
  }

  /** Codex 风格中断：停止当前任务，随后通过回复消息继续或调整目标。 */
  const handlePauseSessionTask = async () => {
    if (!selectedSessionTask?.id || !conversationId) return
    const response = await pauseAgentSessionTask(selectedSessionTask.id)
    if (response.code === 200) {
      message.success(intl.formatMessage({ id: 'pages.agent.chat.session.interrupted' }))
      setSelectedSessionTask((item) => (item ? { ...item, status: 'PAUSED' } : item))
      await loadSessionWorkspace(conversationId)
    } else {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.session.pauseFailed' }))
    }
  }

  /** 等待用户输入/审批时，滚动到消息区中对应的交互卡片继续作答。 */
  const handleWorkspaceUserInput = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const openSessionMemory = async () => {
    if (!activeDeepSessionId) return
    try {
      const response = await getAgentSessionMemories(activeDeepSessionId)
      if (response.code === 200) {
        setSessionMemories(response.data || [])
        setSessionMemoryModalOpen(true)
      }
    } catch {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.session.memoryLoadFailed' }))
    }
  }

  const removeSessionMemory = async (memoryId?: string) => {
    if (!activeDeepSessionId || !memoryId) return
    const response = await deleteAgentSessionMemory(activeDeepSessionId, memoryId)
    if (response.code === 200) {
      setSessionMemories((items) => items.filter((item) => item.id !== memoryId))
      message.success(intl.formatMessage({ id: 'pages.agent.chat.session.memoryDeleted' }))
    }
  }

  const openSessionMetrics = async () => {
    if (!activeDeepSessionId) return
    try {
      const response = await getAgentSessionMetrics(activeDeepSessionId)
      if (response.code === 200) {
        setSessionMetrics(response.data)
        setSessionMetricsModalOpen(true)
      }
    } catch {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.session.metricsLoadFailed' }))
    }
  }

  const submitTaskFeedback = async () => {
    if (!selectedSessionTask?.id) return
    const response = await submitAgentTaskFeedback(selectedSessionTask.id, {
      rating: taskFeedbackRating,
      note: taskFeedbackNote.trim() || undefined,
    })
    if (response.code === 200) {
      setTaskFeedbackOpen(false)
      setTaskFeedbackNote('')
      message.success(intl.formatMessage({ id: 'pages.agent.chat.session.feedbackSaved' }))
    }
  }

  const acceptDeepRun = async (data: AgentStreamAcceptedData) => {
    deepRunIdRef.current = data.runId
    setDeepRunId(data.runId)
    setConversationId(data.conversationId)
    // Deep 运行已受理时立即展示规划区域；首个 plan.updated 事件到达前显示准备态。
    setTaskPlanDrawerOpen(true)
    void loadPersistedTaskPlan(data.runId)
    // 先恢复 Session 快照与时间线，再订阅 SSE 增量，保证工作区以 API 历史状态为准。
    await loadSessionWorkspace(data.conversationId)
    deepStreamAbortControllerRef.current?.abort()
    const controller = new AbortController()
    deepStreamAbortControllerRef.current = controller
    deepStreamSubscribedRunIdRef.current = data.runId
    void streamDeepRun(data.runId, {
      signal: controller.signal,
      onRunStep: addDeepRunStep,
      onDone: async (done) => {
        if (done.conversationId) {
          setConversationId(done.conversationId)
          await loadMessages(done.conversationId)
        }
      },
    }).catch(() => undefined)
  }

  const setConversationMessages = (messageList: ChatMessage[]) => {
    const executionEventsByMessageId = new Map(
      messages
        .filter((item) => item.id && item.executionEvents?.length)
        .map((item) => [item.id as string, item.executionEvents as ChatExecutionEvent[]]),
    )
    const restoredMessages = messageList.map((item) => ({
      ...restoreMessageSources(item),
      executionEvents: item.id ? executionEventsByMessageId.get(item.id) : undefined,
    }))
    const pendingQuestion = findPendingQuestionMessage(restoredMessages)

    setMessages(restoredMessages)
    setPendingQuestionMessage(pendingQuestion)
    setChatTurnState(pendingQuestion ? 'waiting_user' : 'idle')
  }

  const stopArtifactPolling = () => {
    if (artifactPollingTimerRef.current !== undefined) {
      window.clearInterval(artifactPollingTimerRef.current)
      artifactPollingTimerRef.current = undefined
    }
  }

  const openSandboxDecision = (id: string, decision: 'approve' | 'reject', detail?: string) => {
    setSandboxDecisionReason('')
    setSandboxDecision({ id, decision, detail })
  }

  const submitSandboxDecision = async (decision = sandboxDecision?.decision) => {
    if (!sandboxDecision) return
    setSandboxDecisionSubmitting(true)
    try {
      const result = await decideSandboxTask(sandboxDecision.id, decision === 'approve' ? 'APPROVE' : 'REJECT', sandboxDecisionReason)
      if (result.code === 200) {
        message.success(decision === 'approve' ? '任务已批准并进入队列' : '任务已拒绝')
        setSandboxDecision(undefined)
      }
    } finally {
      setSandboxDecisionSubmitting(false)
    }
  }

  const startArtifactPolling = (targetConversationId?: string, targetMessageId?: string, runId?: string) => {
    if (!targetConversationId || !targetMessageId) return
    sandboxPollingKeyRef.current = runId ? `${targetConversationId}:${targetMessageId}:${runId}` : undefined
    stopArtifactPolling()
    let attempts = 0
    const refresh = async () => {
      attempts += 1
      try {
        if (runId) {
          const task = await getSandboxTaskByRun(runId)
          if (task.code === 200 && task.data) {
            const status = task.data.status || 'QUEUED'
            const terminal = ['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED', 'EXPIRED'].includes(status)
            const plan = task.data.approvalSummary
            const approvalDetail = plan ? intl.formatMessage({ id: 'pages.agent.sandbox.chatApprovalDetail' }, { target: plan.targetUrl || '-', purpose: plan.purpose || '-', domains: (plan.allowedDomains || []).join(', '), subdomains: plan.allowSubdomains ? intl.formatMessage({ id: 'pages.agent.sandbox.chatSubdomains' }) : '', estimated: plan.estimatedRequests ?? '-', maximum: plan.maxRequests ?? '-', depth: plan.pageDepth ?? 0, maxDepth: plan.maxPageDepth ?? '-', sensitive: intl.formatMessage({ id: plan.externalSensitiveRisk ? 'pages.agent.sandbox.yes' : 'pages.agent.sandbox.no' }) }) : undefined
            if (status === 'PENDING_APPROVAL' && task.data.id && shownSandboxApprovalTaskRef.current !== task.data.id) {
              shownSandboxApprovalTaskRef.current = task.data.id
              openSandboxDecision(task.data.id, 'approve', approvalDetail)
            }
            appendExecutionEvent(targetMessageId, {
              id: `sandbox-${task.data.id || runId}`,
              title: `Sandbox: ${status}`,
              detail: task.data.failureReason || task.data.logSummary || approvalDetail,
              status: status === 'SUCCEEDED' ? 'completed' : terminal ? 'failed' : 'running',
              actions: status !== 'PENDING_APPROVAL' && !terminal && task.data.id ? [
                { label: intl.formatMessage({ id: 'pages.agent.sandbox.cancel' }), danger: true, onClick: () => void cancelSandboxTask(task.data!.id!).then(() => void refresh()) },
              ] : ['FAILED', 'TIMED_OUT', 'CANCELLED'].includes(status) && task.data.id ? [
                { label: intl.formatMessage({ id: 'pages.agent.sandbox.retry' }), onClick: () => void retrySandboxTask(task.data!.id!).then((result) => { if (result.code === 200) { message.success(intl.formatMessage({ id: 'pages.agent.sandbox.retryCreated' })); void refresh() } }) },
              ] : undefined,
            })
            if (terminal && status !== 'SUCCEEDED') {
              stopArtifactPolling()
              return
            }
          }
          const artifact = await getAgentArtifactByRun(runId)
          if (artifact.code === 200 && artifact.data) {
            const result = await getAgentConversationMessages(targetConversationId, { current: 1, pageSize: 100 })
            if (result.code === 200 && result.data) setConversationMessages(result.data)
            stopArtifactPolling()
            message.success(intl.formatMessage({ id: 'pages.agent.chat.artifactReady' }))
            return
          }
        }
        const result = await getAgentConversationMessages(targetConversationId, { current: 1, pageSize: 100 })
        const target = result.data?.find((item) => item.id === targetMessageId)
        const hasArtifact = Boolean(target?.attachments && /"artifactId"\s*:/.test(target.attachments))
        if (result.code === 200 && result.data && hasArtifact) {
          setConversationMessages(result.data)
          stopArtifactPolling()
          message.success(intl.formatMessage({ id: 'pages.agent.chat.artifactReady' }))
        } else if (attempts >= 60) {
          stopArtifactPolling()
        }
      } catch {
        if (attempts >= 60) stopArtifactPolling()
      }
    }
    void refresh()
    artifactPollingTimerRef.current = window.setInterval(() => void refresh(), 2000)
  }

  useEffect(() => () => stopArtifactPolling(), [])

  useEffect(() => {
    if (!conversationId) return
    const messageWithRun = [...messages].reverse().find((item) => item.id && item.runId)
    if (!messageWithRun?.id || !messageWithRun.runId) return
    const key = `${conversationId}:${messageWithRun.id}:${messageWithRun.runId}`
    if (sandboxPollingKeyRef.current === key) return
    startArtifactPolling(conversationId, messageWithRun.id, messageWithRun.runId)
  }, [conversationId, messages])

  useEffect(() => {
    const messageWithRun = [...messages].reverse().find((item) => item.runId)
    if (!messageWithRun?.runId) return
    deepRunIdRef.current = messageWithRun.runId
    setDeepRunId(messageWithRun.runId)
    void loadPersistedTaskPlan(messageWithRun.runId)
  }, [messages])

  // 刷新/切换会话恢复工作区后，若当前任务仍可推进，则重新订阅该运行的 SSE 增量。
  // 只有历史的非终态任务才会触发，避免对已完成运行重复回放。
  useEffect(() => {
    const status = selectedSessionTask?.status?.toUpperCase()
    const runId = selectedSessionTask?.currentRunId
    if (!conversationId || !runId) return
    if (!['QUEUED', 'PLANNING', 'RUNNING', 'WAITING_USER', 'WAITING_APPROVAL', 'PAUSED'].includes(status || '')) return
    if (deepStreamSubscribedRunIdRef.current === runId) return
    deepStreamSubscribedRunIdRef.current = runId
    deepStreamAbortControllerRef.current?.abort()
    const controller = new AbortController()
    deepStreamAbortControllerRef.current = controller
    void streamDeepRun(runId, {
      signal: controller.signal,
      onRunStep: addDeepRunStep,
      onDone: async (done) => {
        if (done.conversationId) {
          setConversationId(done.conversationId)
          await loadMessages(done.conversationId)
        }
      },
    }).catch(() => undefined)
  }, [conversationId, selectedSessionTask])

  const loadAgents = async () => {
    setLoadingAgents(true)
    try {
      const options = await getAgentDefinitionOptions()
      setAgents(options.map((item) => ({ id: String(item.value), name: item.label }) as any))
    } finally {
      setLoadingAgents(false)
    }
  }

  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      const { code, data } = await getAgentConversationList({
        status: 0,
        current: 1,
        pageSize: 50,
      })
      if (code === 200) {
        setConversations(data || [])
      }
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadMessages = async (id: string) => {
    setLoadingMessages(true)
    try {
      const { code, data } = await getAgentConversationMessages(id, {
        current: 1,
        pageSize: 100,
      })
      if (code === 200) {
        setConversationMessages(data || [])
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
    attachmentsRef.current = attachments
  }, [attachments])

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
      current.map((item) => (item.clientId === clientId || item.id === clientId ? updater(item) : item)),
    )
  }

  const appendExecutionEvent = (assistantClientId: string | undefined, event: ChatExecutionEvent) => {
    if (!assistantClientId) {
      return
    }
    updateAssistantMessage(assistantClientId, (item) => {
      const currentEvents = item.executionEvents || []
      const existingIndex = currentEvents.findIndex((current) => current.id === event.id)
      const executionEvents =
        existingIndex < 0
          ? [...currentEvents.slice(-39), event]
          : currentEvents.map((current, index) => (index === existingIndex ? { ...current, ...event } : current))
      return { ...item, executionEvents }
    })
  }

  const appendToolCallEvents = (assistantClientId: string, data: AgentStreamToolCallData) => {
    const toolCalls = (data.toolCalls?.length ? data.toolCalls : [data]).filter(
      (toolCall) =>
        toolCall &&
        typeof toolCall === 'object' &&
        Boolean(toolCall.toolName || toolCall.name || toolCall.function?.name || toolCall.toolCallId || toolCall.id),
    )
    toolCalls.forEach((toolCall, index) => {
      const toolName = toolCall.toolName || toolCall.name || toolCall.function?.name
      if (toolName === 'generate_artifact') {
        artifactRequestedRef.current = true
        appendExecutionEvent(assistantClientId, {
          id: `artifact-${toolCall.toolCallId || toolCall.id || index}`,
          title: intl.formatMessage({ id: 'pages.agent.chat.artifactGenerating' }),
          status: 'running',
        })
      }
      // 流式工具参数会拆成多个片段；没有稳定调用标识和工具名的片段不是独立执行事件。
      if (!toolName && !toolCall.toolCallId && !toolCall.id) {
        return
      }
      const toolCallId = toolCall.toolCallId || toolCall.id || toolName || `unknown-${index}`
      const argumentsValue = toolCall.arguments || toolCall.function?.arguments
      appendExecutionEvent(assistantClientId, {
        id: `tool-${toolCallId}`,
        title: toolName
          ? intl.formatMessage({ id: 'pages.agent.chat.execution.toolCalling' }, { toolName })
          : intl.formatMessage({ id: 'pages.agent.chat.execution.toolCallingUnknown' }),
        detail:
          typeof argumentsValue === 'object' && argumentsValue
            ? JSON.stringify(argumentsValue)
            : undefined,
        status: 'running',
      })
    })
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
      if (deepRunIdRef.current) {
        void cancelDeepRun(deepRunIdRef.current, cancelAgentRun)
      }
      abortControllerRef.current?.abort()
      deepStreamAbortControllerRef.current?.abort()
      resetTypewriter()
    }
  }, [])

  const handleNewConversation = () => {
    if (sending) {
      return
    }
    setConversationId(undefined)
    setMessages([])
    attachmentsRef.current = []
    setAttachments([])
    setToolApprovalPolicy('ask')
    resetDeepProgress()
    resetConversationTurnState()
  }

  const handleToolApprovalPolicyChange = async (policy: 'ask' | 'risky' | 'never') => {
    if (policy === toolApprovalPolicy) return
    if (conversationId) {
      const result = await updateAgentConversationToolApprovalPolicy(conversationId, policy)
      if (result.code !== 200) return
      setConversations((items) =>
        items.map((item) => (item.id === conversationId ? { ...item, toolApprovalPolicy: policy } : item)),
      )
      message.success(intl.formatMessage({ id: 'pages.agent.chat.toolApprovalSaved' }))
    }
    setToolApprovalPolicy(policy)
  }

  const handleSelectConversation = async (conversation: AgentConversation) => {
    if (sending || !conversation.id) {
      return
    }

    setConversationId(conversation.id)
    setToolApprovalPolicy(conversation.toolApprovalPolicy || 'ask')
    if (conversation.agentDefinitionId) {
      setAgentId(conversation.agentDefinitionId)
    }
    setMessages([])
    resetDeepProgress()
    resetConversationTurnState()
    await loadMessages(conversation.id)
    await loadSessionWorkspace(conversation.id)
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
    if (deepRunIdRef.current) {
      void cancelDeepRun(deepRunIdRef.current, cancelAgentRun)
    }
    deepStreamAbortControllerRef.current?.abort()
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

    const conversationAgentId = conversations.find(
      (item) => item.id === questionConversationId,
    )?.agentDefinitionId
    const replyAgentId = conversationAgentId || agentId
    if (!replyAgentId) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.selectAgent' }))
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
    resetDeepProgress()
    abortControllerRef.current = controller
    streamingAssistantIdRef.current = assistantClientId
    stoppedByUserRef.current = false
    setSending(true)

    let terminalEventReceived = false
    let questionReceived = false
    let typewriterDrainPromise: Promise<void> | undefined

    resetTypewriter()
    artifactRequestedRef.current = false

    try {
      const replyPayload: AgentChatReplyRequest = {
        agentId: replyAgentId,
        conversationId: questionConversationId,
        parentMessageId: questionMessageId,
        answer: { answers },
        interactive: true,
      }

      await streamReplyAgentChat(replyPayload, {
        signal: controller.signal,
        onAccepted: (data) => {
          acceptDeepRun(data)
          appendExecutionEvent(assistantClientId, {
            id: `run-${data.runId}-accepted`,
            title: intl.formatMessage({ id: 'pages.agent.chat.execution.runAccepted' }),
            status: 'running',
          })
        },
        onRunStep: addDeepRunStep,
        onToolCall: (data) => appendToolCallEvents(assistantClientId, data),
        onProgress: (data) => {
          if (data.message) {
            appendExecutionEvent(assistantClientId, {
              id: `progress-${data.stage || 'default'}-${Date.now()}`,
              title: data.message,
              status: 'running',
            })
          }
        },
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
          const errorMsg =
            data.message || intl.formatMessage({ id: 'pages.agent.chat.replyFailed' })
          markAssistantError(assistantClientId, errorMsg)
          message.error(errorMsg)
          setChatTurnState('error')
        },
        onQuestion: (data) => {
          // question 事件：追加交互卡片，不清空当前流式 assistant
          questionReceived = true
          flushTypewriterQueue(assistantClientId)
          appendExecutionEvent(assistantClientId, {
            id: `question-${data.messageId || Date.now()}`,
            title: intl.formatMessage({ id: 'pages.agent.chat.execution.waitingForUser' }),
            status: 'pending',
          })

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
          appendExecutionEvent(assistantClientId, {
            id: `done-${data.messageId || Date.now()}`,
            title: intl.formatMessage({ id: 'pages.agent.chat.execution.completed' }),
            status: 'completed',
          })
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

            if (artifactRequestedRef.current || data.runId) {
              startArtifactPolling(doneConversationId, data.messageId, data.runId)
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
        markAssistantError(
          assistantClientId,
          intl.formatMessage({ id: 'pages.agent.chat.connectionClosed' }),
        )
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
        const errorMsg =
          error instanceof Error
            ? error.message
            : intl.formatMessage({ id: 'pages.agent.chat.replyFailed' })
        flushTypewriterQueue(assistantClientId)
        markAssistantError(assistantClientId, errorMsg)
        message.error(errorMsg)
        setChatTurnState('error')
      }
    } finally {
      setSending(false)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = undefined
        streamingAssistantIdRef.current = undefined
      }
    }
  }

  const handleSend = async (text?: string) => {
    if (sending) {
      return
    }

    const content = (text || input).trim()
    const recognizedAttachments = attachments
      .map((item) => item.attachment)
      .filter((item): item is AgentChatAttachment => Boolean(item))
    const conversationAgentId = conversationId
      ? conversations.find((item) => item.id === conversationId)?.agentDefinitionId
      : undefined
    const sendAgentId = conversationAgentId || agentId
    if (!sendAgentId) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.selectAgent' }))
      return
    }
    if (!content && !recognizedAttachments.length) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.enterMessage' }))
      return
    }

    const userMessage: ChatMessage = {
      clientId: createClientId('user'),
      role: 'user',
      content: content || intl.formatMessage({ id: 'pages.agent.chat.analyzeAttachments' }),
      attachments: recognizedAttachments.length
        ? JSON.stringify(
            recognizedAttachments.map(({ fileName, size, contentType, objectKey }) => ({
              fileName,
              size,
              contentType,
              objectKey,
            })),
          )
        : undefined,
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
    artifactRequestedRef.current = false
    resetDeepProgress()
    abortControllerRef.current = controller
    streamingAssistantIdRef.current = assistantClientId
    stoppedByUserRef.current = false
    setSending(true)
    setChatTurnState('streaming')
    setInput('')
    attachmentsRef.current = []
    setAttachments([])
    setMessages((current) => [...current, userMessage, assistantMessage])

    try {
      const payload: any = conversationId
        ? {
            agentId: sendAgentId,
            conversationId,
            message: content || intl.formatMessage({ id: 'pages.agent.chat.analyzeAttachments' }),
          }
        : {
            agentId: sendAgentId,
            message: content || intl.formatMessage({ id: 'pages.agent.chat.analyzeAttachments' }),
          }
      if (recognizedAttachments.length) {
        payload.attachments = userMessage.attachments
        payload.attachmentContent = recognizedAttachments
          .map((attachment) => `文件：${attachment.fileName}\n${attachment.extractedContent}`)
          .join('\n\n')
      }
      if (thinking) {
        payload.thinking = true
        payload.reasoningEffort = reasoningEffort
      }
      if (!conversationId) payload.toolApprovalPolicy = toolApprovalPolicy
      await streamAgentChat(payload, {
        signal: controller.signal,
        onAccepted: (data) => {
          acceptDeepRun(data)
          appendExecutionEvent(assistantClientId, {
            id: `run-${data.runId}-accepted`,
            title: intl.formatMessage({ id: 'pages.agent.chat.execution.runAccepted' }),
            status: 'running',
          })
        },
        onRunStep: addDeepRunStep,
        onProgress: (data) => {
          updateAssistantMessage(assistantClientId, (item) => ({
            ...item,
            progressMessage: data.message,
          }))
          if (data.message) {
            appendExecutionEvent(assistantClientId, {
              id: `progress-${data.stage || 'default'}-${Date.now()}`,
              title: data.message,
              status: 'running',
            })
          }
        },
        onToolCall: (data) => appendToolCallEvents(assistantClientId, data),
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
          const errorMsg =
            data.message || intl.formatMessage({ id: 'pages.agent.chat.generateFailed' })
          markAssistantError(assistantClientId, errorMsg)
          message.error(errorMsg)
          setChatTurnState('error')
        },
        onQuestion: (data) => {
          // question 事件：追加交互卡片，不清空当前流式 assistant
          questionReceived = true
          flushTypewriterQueue(assistantClientId)
          appendExecutionEvent(assistantClientId, {
            id: `question-${data.messageId || Date.now()}`,
            title: intl.formatMessage({ id: 'pages.agent.chat.execution.waitingForUser' }),
            status: 'pending',
          })

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
          appendExecutionEvent(assistantClientId, {
            id: `done-${data.messageId || Date.now()}`,
            title: intl.formatMessage({ id: 'pages.agent.chat.execution.completed' }),
            status: 'completed',
          })
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
                })
                if (result.code === 200 && result.data) {
                  setConversationMessages(result.data)
                }
              } catch {
                // ignore
              }
            }
            if (artifactRequestedRef.current || data.runId) {
              startArtifactPolling(doneConversationId, data.messageId, data.runId)
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
        markAssistantError(
          assistantClientId,
          intl.formatMessage({ id: 'pages.agent.chat.connectionClosed' }),
        )
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
      const errorMsg =
        error instanceof Error
          ? error.message
          : intl.formatMessage({ id: 'pages.agent.chat.sendFailed' })
      flushTypewriterQueue(assistantClientId)
      markAssistantError(assistantClientId, errorMsg)
      message.error(errorMsg || intl.formatMessage({ id: 'pages.agent.chat.sendFailed' }))
      setChatTurnState('error')
    } finally {
      setSending(false)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = undefined
        streamingAssistantIdRef.current = undefined
        stoppedByUserRef.current = false
      }
    }
  }

  const handleRegenerate = (messageIndex: number) => {
    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find((item) => item.role === 'user' && item.content)

    if (!previousUserMessage?.content) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.regenerateUnavailable' }))
      return
    }

    void handleSend(previousUserMessage.content)
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
    return (
      item.title ||
      item.createdAt ||
      item.id ||
      intl.formatMessage({ id: 'pages.agent.chat.untitledConversation' })
    )
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
  const isDeepRequestProcessing = currentAgent?.executionMode === 'DEEP' && sending
  const shouldShowTaskPlan = visibleDeepTasks.length > 0 || isDeepRequestProcessing
  const inputDisabled =
    sending || chatTurnState === 'waiting_user' || chatTurnState === 'submitting_answer'

  // 会话工作区：实时流优先展示流式计划；否则展示已持久化的计划版本；都没有时退回扁平任务列表。
  const showLivePlanTasks = deepRunTasks.length > 0
  const showVersionedPlan = !showLivePlanTasks && Boolean(sessionTaskPlan?.versions?.length)
  const activeTaskStatus = selectedSessionTask?.status?.toUpperCase()
  // Codex 风格：不再手动暂停/继续；通过"中断"停止当前任务，回复消息继续或调整目标。
  const taskInterruptible = Boolean(selectedSessionTask?.currentRunId)
    && ['QUEUED', 'PLANNING', 'RUNNING'].includes(activeTaskStatus || '')
  const interrupted = activeTaskStatus === 'PAUSED'
  const taskWaitingUser = activeTaskStatus === 'WAITING_USER' || activeTaskStatus === 'WAITING_APPROVAL'

  const sessionTaskStatusColor = (status?: string): string => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'success'
      case 'FAILED':
      case 'CANCELLED':
        return 'error'
      case 'RUNNING':
      case 'PLANNING':
      case 'QUEUED':
        return 'processing'
      case 'WAITING_USER':
      case 'WAITING_APPROVAL':
      case 'PAUSED':
        return 'warning'
      default:
        return 'default'
    }
  }

  const sessionTaskStatusLabel = (status?: string): string => {
    const normalized = (status || 'QUEUED').toUpperCase()
    const known = ['COMPLETED', 'FAILED', 'CANCELLED', 'RUNNING', 'PLANNING', 'QUEUED',
      'WAITING_USER', 'WAITING_APPROVAL', 'PAUSED']
    if (!known.includes(normalized)) return status || ''
    return intl.formatMessage({ id: `pages.agent.chat.session.taskStatus.${normalized}` })
  }

  /** 近期事件摘要里的状态前缀（如 "COMPLETED：原因"）映射为国际化文案。 */
  const sessionEventLabel = (event: AgentTaskEvent): string => {
    const summary = event.summary || ''
    const match = summary.match(
      /^(QUEUED|PLANNING|RUNNING|WAITING_USER|WAITING_APPROVAL|PAUSED|COMPLETED|FAILED|CANCELLED)([:：]?)\s*(.*)$/,
    )
    if (!match) return summary
    const rest = match[3]
    return rest ? `${sessionTaskStatusLabel(match[1])}：${rest}` : sessionTaskStatusLabel(match[1])
  }

  useEffect(() => {
    // 用户发起 Deep 请求后无需等待规划回调，直接打开卡片反馈正在处理。
    if (isDeepRequestProcessing) {
      setTaskPlanDrawerOpen(true)
    }
  }, [isDeepRequestProcessing])

  const removeAttachment = (uid: string) => {
    attachmentsRef.current = attachmentsRef.current.filter((item) => item.uid !== uid)
    setAttachments((current) => current.filter((item) => item.uid !== uid))
  }

  const handleAttachmentUpload: NonNullable<UploadProps['customRequest']> = async (options) => {
    const file = options.file as RcFile
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.attachmentTooLarge' }))
      options.onError?.(
        new Error(intl.formatMessage({ id: 'pages.agent.chat.attachmentTooLarge' })),
      )
      return
    }
    if (attachmentsRef.current.length >= 3) {
      message.error(intl.formatMessage({ id: 'pages.agent.chat.attachmentLimit' }))
      options.onError?.(new Error(intl.formatMessage({ id: 'pages.agent.chat.attachmentLimit' })))
      return
    }

    const pending: ChatAttachmentFile = {
      uid: file.uid,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      percent: 0,
      originFileObj: file,
    }
    attachmentsRef.current = [...attachmentsRef.current, pending]
    setAttachments((current) => [...current, pending])
    try {
      const result = await uploadAgentChatAttachments([file], (percent) => {
        setAttachments((current) =>
          current.map((item) => (item.uid === file.uid ? { ...item, percent } : item)),
        )
        options.onProgress?.({ percent })
      })
      const attachment = result.data?.[0]
      if (result.code !== 200 || !attachment) {
        throw new Error(intl.formatMessage({ id: 'pages.agent.chat.sendFailed' }))
      }
      setAttachments((current) =>
        current.map((item) =>
          item.uid === file.uid ? { ...item, status: 'done', percent: 100, attachment } : item,
        ),
      )
      attachmentsRef.current = attachmentsRef.current.map((item) =>
        item.uid === file.uid ? { ...item, status: 'done', percent: 100, attachment } : item,
      )
      options.onSuccess?.(result)
    } catch (error) {
      const uploadError =
        error instanceof Error
          ? error
          : new Error(intl.formatMessage({ id: 'pages.agent.chat.sendFailed' }))
      removeAttachment(file.uid)
      options.onError?.(uploadError)
      message.error(uploadError.message)
    }
  }

  return (
    <PageContainer title={false} className="agent-chat-page-container">
      <div className="agent-chat-page">
        {/* 侧边栏 */}
        <div
          className={`agent-chat-sidebar ${sidebarCollapsed ? 'agent-chat-sidebar-collapsed' : ''}`}
        >
          {!sidebarCollapsed && (
            <>
              <div className="agent-chat-sidebar-header">
                <Select
                  placeholder={intl.formatMessage({
                    id: 'pages.agent.chat.selectAgentPlaceholder',
                  })}
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
                <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.collapseSidebar' })}>
                  <Button
                    className="agent-chat-sidebar-toggle"
                    type="text"
                    icon={<MenuFoldOutlined />}
                    onClick={() => setSidebarCollapsed(true)}
                  />
                </Tooltip>
              </div>

              <div className="agent-chat-new-conversation">
                <Button
                  block
                  icon={<PlusOutlined />}
                  disabled={sending}
                  onClick={handleNewConversation}
                >
                  {intl.formatMessage({ id: 'pages.agent.chat.newConversation' })}
                </Button>
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
                      description={intl.formatMessage({
                        id: searchText
                          ? 'pages.agent.chat.noMatchingConversations'
                          : 'pages.agent.chat.noConversations',
                      })}
                      style={{ padding: '40px 0' }}
                    />
                  )}
                </div>
              </Spin>
            </>
          )}
        </div>

        {/* 主面板 */}
        <div className={`agent-chat-panel ${!messages.length ? 'agent-chat-panel-empty' : ''} ${taskPlanDrawerOpen && shouldShowTaskPlan ? 'agent-chat-panel-plan-open' : ''}`}>
          {/* 顶部 */}
          <div className="agent-chat-panel-header">
            <div className="agent-chat-panel-info">
              <div className="agent-chat-panel-title">
                {sidebarCollapsed && (
                  <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.expandSidebar' })}>
                    <Button
                      className="agent-chat-panel-menu"
                      type="text"
                      icon={<MenuUnfoldOutlined />}
                      onClick={() => setSidebarCollapsed(false)}
                    />
                  </Tooltip>
                )}
                <Text strong={true} style={{ fontSize: 16 }}>
                  {currentAgent?.name ||
                    currentAgent?.code ||
                    intl.formatMessage({ id: 'pages.agent.chat.noAgentSelected' })}
                </Text>
                {currentAgent?.model && (
                  <Tag className="agent-chat-model-tag">{currentAgent.model}</Tag>
                )}
              </div>
              <div className="agent-chat-panel-subtitle">
                {currentConversation
                  ? renderConversationTitle(currentConversation)
                  : intl.formatMessage({ id: 'pages.agent.chat.newConversationTitle' })}
              </div>
            </div>
            {shouldShowTaskPlan && (
              <Button
                className="agent-chat-plan-trigger"
                type="text"
                icon={<UnorderedListOutlined />}
                onClick={() => setTaskPlanDrawerOpen((value) => !value)}
              >
                {intl.formatMessage({ id: 'pages.agent.chat.deepTaskPlan' })}
                {visibleDeepTasks.length > 0 && ` · ${visibleDeepTasks.filter((task) => task.status === 'completed').length}/${visibleDeepTasks.length}`}
              </Button>
            )}
          </div>

          {taskPlanDrawerOpen && shouldShowTaskPlan && (
            <aside className="agent-chat-task-plan-drawer" aria-label={intl.formatMessage({ id: 'pages.agent.chat.deepTaskPlan' })}>
              <div className="agent-chat-task-plan-header">
                <Text strong>{intl.formatMessage({ id: 'pages.agent.chat.deepTaskPlan' })}</Text>
                <div>
                  {activeDeepSessionId && (
                    <>
                      <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.session.memoryTooltip' })}>
                        <Button type="link" size="small" icon={<BulbOutlined />} onClick={() => void openSessionMemory()}>
                          {intl.formatMessage({ id: 'pages.agent.chat.session.memory' })}
                        </Button>
                      </Tooltip>
                      <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.session.overviewTooltip' })}>
                        <Button type="link" size="small" icon={<BarChartOutlined />} onClick={() => void openSessionMetrics()}>
                          {intl.formatMessage({ id: 'pages.agent.chat.session.overview' })}
                        </Button>
                      </Tooltip>
                    </>
                  )}
                  {selectedSessionTask?.status === 'COMPLETED' && (
                    <Button type="link" size="small" onClick={() => setTaskFeedbackOpen(true)}>
                      {intl.formatMessage({ id: 'pages.agent.chat.session.feedback' })}
                    </Button>
                  )}
                  <Text type="secondary">
                    {isDeepRequestProcessing
                      ? intl.formatMessage({ id: 'pages.agent.chat.deepRunning' })
                      : intl.formatMessage({ id: 'pages.agent.chat.deepTaskPlan' })}
                  </Text>
                </div>
              </div>

              {selectedSessionTask && (
                <div className="agent-chat-session-task-header">
                  <div className="agent-chat-session-task-title">
                    <Text strong ellipsis style={{ display: 'block', flex: 1, minWidth: 0 }}>
                      {selectedSessionTask.title || intl.formatMessage({ id: 'pages.agent.chat.session.currentTask' })}
                    </Text>
                    <Tag color={sessionTaskStatusColor(selectedSessionTask.status)}>
                      {sessionTaskStatusLabel(selectedSessionTask.status)}
                    </Tag>
                  </div>
                  {selectedSessionTask.pauseReason && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedSessionTask.pauseReason}
                    </Text>
                  )}
                  <div className="agent-chat-session-task-actions">
                    {taskInterruptible && (
                      <Button size="small" danger onClick={() => void handlePauseSessionTask()}>
                        {intl.formatMessage({ id: 'pages.agent.chat.session.interrupt' })}
                      </Button>
                    )}
                    {taskWaitingUser && (
                      <Button size="small" type="primary" ghost onClick={handleWorkspaceUserInput}>
                        {intl.formatMessage({ id: 'pages.agent.chat.session.answer' })}
                      </Button>
                    )}
                  </div>
                  {interrupted && (
                    <Text type="secondary" className="agent-chat-session-interrupted-hint">
                      {intl.formatMessage({ id: 'pages.agent.chat.session.interruptedHint' })}
                    </Text>
                  )}
                </div>
              )}

              <div className="agent-chat-deep-task-list">
                {showVersionedPlan ? (
                  (sessionTaskPlan?.versions || []).slice().reverse().map((version) => (
                    <div key={version.version || 0} className="agent-chat-plan-version">
                      <Text strong style={{ fontSize: 12 }}>
                        {intl.formatMessage({ id: 'pages.agent.chat.session.planVersion' }, { version: version.version })}：{version.summary || version.reason}
                      </Text>
                      {version.steps?.map((step) => (
                        <div
                          key={step.id || step.stepKey || step.sequence}
                          className={`agent-chat-plan-step agent-chat-plan-step-${(step.status || 'pending').toLowerCase()}`}
                        >
                          <Checkbox
                            className="agent-chat-plan-step-check"
                            checked={step.status?.toUpperCase() === 'COMPLETED'}
                            disabled
                          />
                          <span className="agent-chat-plan-step-index">
                            {step.sequence ? `${step.sequence}.` : ''}
                          </span>
                          <span className="agent-chat-plan-step-title">{step.title}</span>
                          {step.status && (
                            <Tag color={step.status.toUpperCase() === 'COMPLETED' ? 'success' : step.status.toUpperCase() === 'RUNNING' ? 'processing' : 'default'}>
                              {step.status}
                            </Tag>
                          )}
                          {step.resultSummary && (
                            <Text type="secondary" className="agent-chat-plan-step-summary">
                              {step.resultSummary}
                            </Text>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <>
                    {visibleDeepTasks.length === 0 && (
                      <div className="agent-chat-deep-task-preparing">
                        <LoadingOutlined spin />
                        <span>{intl.formatMessage({ id: 'pages.agent.chat.deepRunning' })}</span>
                      </div>
                    )}
                    {visibleDeepTasks.map((task) => (
                      <div className={`agent-chat-deep-task agent-chat-deep-task-${task.status}`} key={task.id}>
                        {task.status === 'completed' ? (
                          <CheckCircleFilled className="agent-chat-deep-task-state-completed" />
                        ) : task.status === 'failed' ? (
                          <CloseCircleFilled className="agent-chat-deep-task-state-failed" />
                        ) : task.status === 'running' ? (
                          <LoadingOutlined spin className="agent-chat-deep-task-state-running" />
                        ) : (
                          <span className="agent-chat-deep-task-state-pending" />
                        )}
                        <span>{task.title}</span>
                        <Text type="secondary" className="agent-chat-deep-task-status">
                          {intl.formatMessage({ id: `pages.agent.chat.deepTaskStatus.${task.status}` })}
                        </Text>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {sessionTaskTimeline.length > 0 && (
                <div className="agent-chat-session-timeline">
                  <Text strong style={{ fontSize: 12 }}>
                    {intl.formatMessage({ id: 'pages.agent.chat.session.recentEvents' })}
                  </Text>
                  {sessionTaskTimeline.slice(-8).map((event) => (
                    <div
                      key={event.id || `${event.eventType}-${event.occurredAt}`}
                      className="agent-chat-session-timeline-item"
                    >
                      <span className="agent-chat-session-timeline-dot" />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {sessionEventLabel(event)}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}

          <Modal
            title={intl.formatMessage({ id: 'pages.agent.chat.session.memoryModalTitle' })}
            open={sessionMemoryModalOpen}
            footer={null}
            width={600}
            onCancel={() => setSessionMemoryModalOpen(false)}
          >
            {sessionMemories.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={intl.formatMessage({ id: 'pages.agent.chat.session.memoryEmpty' })}
                style={{ padding: '32px 0' }}
              />
            ) : (
              <div className="agent-chat-memory-list">
                {sessionMemories.map((memory) => (
                  <div key={memory.id} className="agent-chat-memory-card">
                    <div className="agent-chat-memory-card-head">
                      <Text strong className="agent-chat-memory-card-title">
                        {memory.summary || intl.formatMessage({ id: 'pages.agent.chat.session.memoryFallbackTitle' })}
                      </Text>
                      <Button
                        type="text"
                        danger
                        size="small"
                        onClick={() => void removeSessionMemory(memory.id)}
                      >
                        {intl.formatMessage({ id: 'pages.agent.chat.session.memoryDelete' })}
                      </Button>
                    </div>
                    <div className="agent-chat-memory-card-content">
                      <FormattedContent content={memory.content} maxHeight={140} />
                    </div>
                    <div className="agent-chat-memory-card-meta">
                      {memory.importance != null && (
                        <Tag>
                          {intl.formatMessage({ id: 'pages.agent.chat.session.memoryImportance' }, { value: memory.importance })}
                        </Tag>
                      )}
                      {memory.sourceTaskId && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {memory.sourceTaskId}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          <Modal
            title={intl.formatMessage({ id: 'pages.agent.chat.session.feedbackTitle' })}
            open={taskFeedbackOpen}
            okText={intl.formatMessage({ id: 'pages.agent.chat.session.feedbackSubmit' })}
            cancelText={intl.formatMessage({ id: 'pages.agent.chat.session.feedbackCancel' })}
            onCancel={() => setTaskFeedbackOpen(false)}
            onOk={() => void submitTaskFeedback()}
          >
            <div style={{ marginBottom: 12 }}>
              {intl.formatMessage({ id: 'pages.agent.chat.session.feedbackRating' })}
            </div>
            <Select
              style={{ width: '100%', marginBottom: 16 }}
              value={taskFeedbackRating}
              onChange={setTaskFeedbackRating}
              options={[5, 4, 3, 2, 1].map((rating) => ({
                value: rating,
                label: intl.formatMessage({ id: 'pages.agent.chat.session.feedbackScore' }, { rating }),
              }))}
            />
            <Input.TextArea
              value={taskFeedbackNote}
              onChange={(event) => setTaskFeedbackNote(event.target.value)}
              maxLength={500}
              showCount
              rows={4}
              placeholder={intl.formatMessage({ id: 'pages.agent.chat.session.feedbackPlaceholder' })}
            />
          </Modal>

          <Modal
            title={intl.formatMessage({ id: 'pages.agent.chat.session.metricsTitle' })}
            open={sessionMetricsModalOpen}
            footer={null}
            onCancel={() => setSessionMetricsModalOpen(false)}
          >
            <List size="small">
              <List.Item>
                {intl.formatMessage({ id: 'pages.agent.chat.session.metricsTaskCount' })}：{sessionMetrics?.taskCount || 0}
              </List.Item>
              <List.Item>
                {intl.formatMessage({ id: 'pages.agent.chat.session.metricsMemoryCount' })}：{sessionMetrics?.memoryCount || 0}
              </List.Item>
              {Object.entries(sessionMetrics?.taskStatusCounts || {}).map(([status, count]) => (
                <List.Item key={status}>{sessionTaskStatusLabel(status)}：{count}</List.Item>
              ))}
            </List>
          </Modal>

          {/* 消息列表 */}
          <div className="agent-chat-message-container">
            <div className="agent-chat-message-scroll" ref={messageListRef} onScroll={handleScroll}>
              <Spin spinning={loadingMessages}>
                <div className="agent-chat-message-list">
                  {!messages.length ? (
                    <div className="agent-chat-empty-container">
                      <div className="agent-chat-welcome-mark">
                        <CommentOutlined />
                      </div>
                      <h2>
                        {currentAgent
                          ? intl.formatMessage(
                              { id: 'pages.agent.chat.startChatWithAgent' },
                              { name: currentAgent.name },
                            )
                          : intl.formatMessage({ id: 'pages.agent.chat.selectAgentToStart' })}
                      </h2>
                      <p>{intl.formatMessage({ id: 'pages.agent.chat.welcomeHint' })}</p>
                      {currentAgent && (
                        <div className="agent-chat-quick-start">
                          {quickStartQuestions.map((question) => (
                            <button
                              type="button"
                              key={question}
                              onClick={() => handleSend(question)}
                            >
                              <span>{question}</span>
                              <ArrowUpOutlined />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {messages.map((item, index) => (
                        <React.Fragment key={item.id || item.clientId || `${item.role}-${index}`}>
                          <AgentMessageBubble
                            agentMessage={item}
                            status={item.streamStatus}
                            errorMessage={item.errorMsg}
                            onQuestionSubmit={
                              item.messageType === 'interaction' &&
                              item.interactionStatus === 'pending'
                                ? handleReplyQuestion
                                : undefined
                            }
                            onRegenerate={
                              item.role === 'assistant' &&
                              item.messageType !== 'interaction' &&
                              !item.streamStatus
                                ? () => handleRegenerate(index)
                                : undefined
                            }
                          />
                          {item.clientId === streamingAssistantIdRef.current &&
                            item.streamStatus === 'streaming' &&
                            deepRunSteps.length > 0 && (
                              <div
                                aria-live="polite"
                                style={{
                                  marginTop: 8,
                                  padding: '8px 12px',
                                  background: '#f6f8fa',
                                  borderRadius: 6,
                                }}
                              >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  <LoadingOutlined spin />{' '}
                                  {intl.formatMessage({ id: 'pages.agent.chat.deepRunning' })}
                                </Text>
                                {deepRunSteps.slice(-4).map((step, stepIndex) => {
                                  if (step.eventType === 'message.delta') {
                                    return null
                                  }
                                  const displayText = getDeepStepDisplayText(
                                    step,
                                    intl.formatMessage,
                                  )
                                  return displayText ? (
                                    <div
                                      key={step.eventId || `${step.occurredAt || 0}-${stepIndex}`}
                                      style={{ fontSize: 12, marginTop: 2 }}
                                    >
                                      <Text type="secondary">{displayText}</Text>
                                    </div>
                                  ) : (
                                    <div
                                      key={step.eventId || `${step.occurredAt || 0}-${stepIndex}`}
                                      style={{ fontSize: 12, marginTop: 2 }}
                                    >
                                      <Text type="secondary">
                                        {intl.formatMessage({
                                          id: 'pages.agent.chat.deepStepFallback',
                                        })}
                                      </Text>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                        </React.Fragment>
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

          <div className="agent-chat-input-bar">
            <div className="agent-chat-input-wrapper">
              {!!attachments.length && (
                <div className="agent-chat-attachment-list">
                  {attachments.map((file) => (
                    <div className="agent-chat-attachment-item" key={file.uid}>
                      <Tag closable onClose={() => removeAttachment(file.uid)}>
                        <PaperClipOutlined />
                        {file.name}
                      </Tag>
                      {file.status === 'uploading' ? (
                        <Progress percent={Math.round(file.percent || 0)} size="small" />
                      ) : (
                        <TemporaryUrlPreviewModal
                          title={file.name}
                          triggerText={intl.formatMessage({ id: 'pages.common.preview' })}
                          getUrl={async () => ({
                            code: 200,
                            data: file.attachment
                              ? await createChatAttachmentPreviewUrl(file.attachment)
                              : file.originFileObj
                                ? URL.createObjectURL(file.originFileObj)
                                : '',
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="agent-chat-input-box">
                <Input.TextArea
                  value={input}
                  disabled={inputDisabled}
                  autoSize={{ minRows: 2, maxRows: 6 }}
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
              <div className="agent-chat-input-tools">
                <div className="agent-chat-input-tools-left">
                  <Select
                    className="agent-chat-tool-approval-select"
                    size="small"
                    value={toolApprovalPolicy}
                    disabled={sending || chatTurnState === 'waiting_user'}
                    aria-label={intl.formatMessage({ id: 'pages.agent.chat.toolApprovalSettings' })}
                    onChange={handleToolApprovalPolicyChange}
                    options={[
                      { value: 'ask', label: intl.formatMessage({ id: 'pages.agent.chat.toolApproval.ask' }) },
                      { value: 'risky', label: intl.formatMessage({ id: 'pages.agent.chat.toolApproval.risky' }) },
                      { value: 'never', label: intl.formatMessage({ id: 'pages.agent.chat.toolApproval.never' }) },
                    ]}
                  />
                  <Upload
                    multiple
                    accept=".txt,.md,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp"
                    fileList={attachments}
                    disabled={inputDisabled}
                    customRequest={handleAttachmentUpload}
                    onRemove={(file) => removeAttachment(file.uid)}
                    showUploadList={false}
                  >
                    <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.attachFile' })}>
                      <Button
                        className="agent-chat-tool-icon"
                        type="text"
                        shape="circle"
                        aria-label={intl.formatMessage({ id: 'pages.agent.chat.attachFile' })}
                        icon={<PaperClipOutlined />}
                        disabled={inputDisabled}
                      />
                    </Tooltip>
                  </Upload>
                  <Button
                    className={`agent-chat-thinking-btn ${
                      thinking ? 'agent-chat-thinking-btn-active' : ''
                    }`}
                    type="text"
                    icon={<BulbOutlined />}
                    onClick={() => setThinking((value) => !value)}
                  >
                    {intl.formatMessage({ id: 'pages.agent.chat.deepThinking' })}
                  </Button>
                  {thinking && (
                    <Select
                      bordered={false}
                      size="small"
                      value={reasoningEffort}
                      onChange={setReasoningEffort}
                      options={reasoningEffortOptions}
                    />
                  )}
                  {thinking && sending && (
                    <Tag color="processing">
                      {intl.formatMessage({ id: 'pages.agent.chat.thinking' })}
                    </Tag>
                  )}
                </div>
                {sending ? (
                  <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.stopGenerating' })}>
                    <Button
                      className="agent-chat-send-btn agent-chat-stop-btn"
                      shape="circle"
                      icon={<ClearOutlined />}
                      onClick={handleStop}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.send' })}>
                    <Button
                      className="agent-chat-send-btn"
                      type="primary"
                      shape="circle"
                      aria-label={intl.formatMessage({ id: 'pages.agent.chat.send' })}
                      icon={<ArrowUpOutlined />}
                      disabled={
                        attachments.some((item) => item.status === 'uploading') ||
                        (!input.trim() && !attachments.length) ||
                        chatTurnState === 'waiting_user' ||
                        chatTurnState === 'submitting_answer'
                      }
                      onClick={() => handleSend()}
                    />
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="agent-chat-input-hint">
              {intl.formatMessage({ id: 'pages.agent.chat.aiDisclaimer' })}
            </div>
          </div>
        </div>
      </div>
      <Modal className="agent-chat-sandbox-approval"
        title="Sandbox 执行审批"
        open={Boolean(sandboxDecision)}
        footer={[
          <Button key="cancel" onClick={() => setSandboxDecision(undefined)}>稍后处理</Button>,
          <Button key="reject" danger loading={sandboxDecisionSubmitting} onClick={() => void submitSandboxDecision('reject')}>拒绝</Button>,
          <Button key="approve" type="primary" loading={sandboxDecisionSubmitting} onClick={() => void submitSandboxDecision('approve')}>批准并执行</Button>,
        ]}
        onCancel={() => setSandboxDecision(undefined)}
      >
        <Tag color="gold">需要你的确认 · 受控 Sandbox 执行</Tag>
        <Typography.Title level={4} style={{ margin: '14px 0 6px' }}>是否允许此任务开始执行？</Typography.Title>
        <Typography.Paragraph type="secondary">{sandboxDecision?.detail || '该任务将按已冻结的模板、策略与资源限制执行。'}</Typography.Paragraph>
        <Input.TextArea value={sandboxDecisionReason} onChange={(event) => setSandboxDecisionReason(event.target.value)} rows={3} maxLength={1024} placeholder="审批意见（可选）" />
      </Modal>
    </PageContainer>
  )
}

export default ChatDebugPage
