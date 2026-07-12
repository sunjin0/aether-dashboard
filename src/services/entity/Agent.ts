/**
 * @description 模型供应商
 */
export interface ModelProvider {
  id?: string;
  name?: string;
  type?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  status?: number;
  sort?: number;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description 模型供应商查询参数
 */
export interface ModelProviderSearchParams extends ModelProvider {
  current?: number;
  pageSize?: number;
}

/**
 * @description 模型供应商启用/禁用参数
 */
export interface ModelProviderStatusParams {
  status: number;
}

/**
 * @description Agent 定义
 */
export interface AgentDefinition {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  systemPrompt?: string;
  modelProviderId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  status?: number;
  maxToolRounds?: number;
  accessType?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 定义查询参数
 */
export interface AgentDefinitionSearchParams extends AgentDefinition {
  current?: number;
  pageSize?: number;
}

/**
 * @description Agent 定义启用/禁用参数
 */
export interface AgentDefinitionStatusParams {
  status: number;
}

/**
 * @description Agent 聊天请求
 */
export interface AgentChatRequest {
  agentId: string;
  conversationId?: string;
  message: string;
  interactive?: boolean;
  thinking?: boolean;
  temporary?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

/**
 * @description 选项配置
 */
export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

/**
 * @description 选择题已选选项（含 label）
 */
export interface SelectedOption {
  id: string;
  label: string;
  value: string;
}

/**
 * @description 问题回答结果
 */
export interface QuestionAnswer {
  /** choice: 单选值或多选值数组 */
  selected?: string | string[];
  /** choice: 已选选项（含 label，用于回显） */
  selectedOptions?: SelectedOption[];
  /** confirm: 是否确认 */
  confirmed?: boolean;
  /** confirm: 展示文本 */
  label?: string;
  /** 回答时间 */
  answeredAt?: number;
}

/**
 * @description 选择题配置
 */
export interface ChoiceQuestionConfig {
  id: string;
  type: 'choice';
  question: string;
  options: QuestionOption[];
  multiple?: boolean;
  /** 历史回显时携带的回答 */
  answer?: QuestionAnswer;
}

/**
 * @description 确认题配置
 */
export interface ConfirmQuestionConfig {
  id: string;
  type: 'confirm';
  question: string;
  confirmText?: string;
  cancelText?: string;
  /** 历史回显时携带的回答 */
  answer?: QuestionAnswer;
}

/**
 * @description 单个问题配置（choice 或 confirm）
 */
export type QuestionItemConfig = ChoiceQuestionConfig | ConfirmQuestionConfig;

/**
 * @description 批量提问组配置（group interaction）
 */
export interface GroupQuestionConfig {
  type: 'group';
  layout: 'tabs';
  question: string;
  questions: QuestionItemConfig[];
  /** 历史回显时的组级回答 */
  answer?: {
    answeredAt?: number;
    answers: Record<string, QuestionAnswer>;
  };
}

/**
 * @description 提问配置（顶层联合类型）
 */
export type QuestionConfig = GroupQuestionConfig | QuestionItemConfig;

/**
 * @description 用户回答
 */
export type AskUserAnswer =
  | { selected: string | string[] }
  | { confirmed: boolean };

/**
 * @description 单个问题数据（SSE question 事件中的 questions 数组项）
 */
export interface QuestionItem {
  id: string;
  content: string;
  messageType: string;
  interactionType: string;
  interactionStatus: string;
  questionConfig: QuestionItemConfig;
}

/**
 * @description Agent 聊天回复请求
 */
export interface AgentChatReplyRequest {
  conversationId: string;
  parentMessageId?: string;
  answer?: {
    answers: Record<string, AskUserAnswer>;
  };
  interactive?: boolean;
}

/**
 * @description Agent 流式推理事件
 */
export interface AgentStreamReasoningData {
  chunk?: string;
  conversationId?: string;
}

/**
 * @description Agent 流式消息事件
 */
export interface AgentStreamMessageData {
  chunk?: string;
  conversationId?: string;
  messageId?: string | null;
}

/**
 * @description Agent 流式工具调用事件
 */
export interface AgentStreamToolCallData {
  conversationId?: string;
  toolName?: string;
  toolCallId?: string;
  arguments?: Record<string, unknown>;
}

/**
 * @description Agent 流式错误事件
 */
export interface AgentStreamErrorData {
  code?: number;
  message?: string;
}

/**
 * @description Agent 流式提问事件
 */
export interface AgentStreamQuestionData {
  conversationId?: string;
  runId?: string;
  messageId?: string;
  content?: string;
  messageType?: string;
  interactionType?: string;
  questionConfig?: GroupQuestionConfig;
}

/**
 * @description Agent 流式完成事件
 */
export interface AgentStreamDoneData {
  conversationId?: string;
  messageId?: string;
  content?: string;
  reasoningContent?: string;
  reasoningTokens?: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  waitingUser?: boolean;
}

export type AgentStreamEvent =
  | { event: 'message'; data: AgentStreamMessageData }
  | { event: 'tool_call'; data: AgentStreamToolCallData }
  | { event: 'question'; data: AgentStreamQuestionData }
  | { event: 'done'; data: AgentStreamDoneData }
  | { event: 'error'; data: AgentStreamErrorData };

/**
 * @description Agent 会话
 */
export interface AgentConversation {
  id?: string;
  agentDefinitionId?: string;
  title?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 会话查询参数
 */
export interface AgentConversationSearchParams extends AgentConversation {
  current?: number;
  pageSize?: number;
}

/**
 * @description Agent 消息
 */
export interface AgentMessage {
  id?: string;
  conversationId?: string;
  role?: string;
  messageType?: 'chat' | 'interaction' | 'answer';
  interactionType?: 'choice' | 'confirm' | 'group';
  interactionStatus?: 'pending' | 'answered' | 'cancelled' | 'expired';
  questionConfig?: string;
  parentMessageId?: string;
  answeredAt?: number;
  expiresAt?: number;
  content?: string;
  reasoningContent?: string;
  reasoningTokens?: number;
  toolCalls?: string;
  runId?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  toolCallLogs?: AgentToolCallLog[];
  createdAt?: number;
}

/**
 * @description Agent 消息查询参数
 */
export interface AgentMessageSearchParams {
  current?: number;
  pageSize?: number;
  includeToolCalls?: boolean;
}

/**
 * @description Agent 运行记录
 */
export interface AgentRun {
  id?: string;
  agentDefinitionId?: string;
  userId?: string;
  conversationId?: string;
  messageId?: string;
  inputContent?: string;
  outputContent?: string;
  model?: string;
  modelProviderId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status?: number;
  errorMsg?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 运行记录查询参数
 */
export interface AgentRunSearchParams extends AgentRun {
  current?: number;
  pageSize?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * @description Agent 工具调用日志
 */
export interface AgentToolCallLog {
  id?: string;
  runId?: string;
  toolCallId?: string;
  toolId?: string;
  toolName?: string;
  arguments?: string;
  agentDefinitionId?: string;
  requestUrl?: string;
  requestMethod?: string;
  requestHeaders?: string;
  requestBody?: string;
  responseStatus?: number;
  responseBody?: string;
  latencyMs?: number;
  status?: 0 | 1 | 2 | 3;
  errorMsg?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * @description Agent 工具调用日志查询参数
 */
export interface AgentToolCallLogSearchParams extends AgentToolCallLog {
  current?: number;
  pageSize?: number;
}

/**
 * @description Agent 工具
 */
export interface AgentTool {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  type?: string;
  httpMethod?: string;
  httpUrl?: string;
  httpHeaders?: string;
  httpBodyTemplate?: string;
  responseExtractRule?: string;
  timeoutMs?: number;
  cacheTtlSeconds?: number;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 工具查询参数
 */
export interface AgentToolSearchParams extends AgentTool {
  current?: number;
  pageSize?: number;
}

/**
 * @description Agent 工具绑定信息
 */
export interface AgentToolBinding {
  id?: string;
  toolId?: string;
  toolName?: string;
  toolCode?: string;
  priority?: number;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description 绑定工具请求参数
 */
export interface BindToolRequest {
  toolId: string;
  priority?: number;
  status?: number;
}

/**
 * @description 调整工具优先级请求参数
 */
export interface UpdateToolPriorityRequest {
  priority: number;
}

/**
 * @description Agent 运行统计
 */
export interface AgentRunStatistics {
  agentDefinitionId?: string;
  totalCalls?: number;
  successCalls?: number;
  failedCalls?: number;
  timeoutCalls?: number;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
  totalTokens?: number;
  avgLatencyMs?: number;
  errorRate?: number;
}

/**
 * @description Agent 运行统计查询参数
 */
export interface AgentRunStatisticsParams {
  agentId?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * @description 会话生命周期信息
 */
export interface ConversationLifecycle {
  conversationId: string;
  createdAt: number;
  lastActiveAt: number;
  closedAt: number | null;
  status: 0 | 1 | 2;
  messageCount: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  durationMs: number;
}

/**
 * @description 会话消息统计
 */
export interface MessageStatistics {
  conversationId: string;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  toolMessages: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
}
