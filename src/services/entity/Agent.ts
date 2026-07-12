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
  thinking?: boolean;
  temporary?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
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
}

export type AgentStreamEvent =
  | { event: 'message'; data: AgentStreamMessageData }
  | { event: 'tool_call'; data: AgentStreamToolCallData }
  | { event: 'error'; data: AgentStreamErrorData }
  | { event: 'done'; data: AgentStreamDoneData };

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
