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
  executionMode?: 'STANDARD' | 'DEEP';
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

/** Agent 专属知识库 */
export interface KnowledgeBase {
  id?: string;
  scope?: 'PLATFORM' | 'AGENT';
  embeddingProviderId?: string;
  name?: string;
  description?: string;
  visibility?: 'platform' | 'private' | 'shared';
  retrievalConfig?: RetrievalConfig | string;
  reviewConfig?: ReviewConfig;
  indexStatus?: 0 | 1 | 2;
  referenceCount?: number;
  lastReferencedAt?: number;
  status?: 0 | 1;
  createdAt?: number;
  updatedAt?: number;
}

export interface RetrievalConfig {
  topK?: number;
  minSimilarity?: number;
  maxChunksPerDocument?: number;
  hybridEnabled?: boolean;
  vectorWeight?: number;
  minLexicalScore?: number;
  rerankEnabled?: boolean;
  rerankProviderId?: string;
  rerankModel?: string;
  rerankTopN?: number;
  strictGrounding?: boolean;
  authorityScore?: number;
  authorityWeight?: number;
  freshnessWeight?: number;
}

export interface ReviewConfig {
  autoAiReview: boolean;
  aiReviewRequired: boolean;
  blockOnCriticalIssues: boolean;
  requireDifferentApprover: boolean;
  reviewModelProviderId: string;
  reviewModel?: string;
}
export interface KnowledgeBaseSearchParams extends KnowledgeBase {
  current?: number;
  pageSize?: number;
}

/** 知识库纯文本或 Markdown 文档 */
export interface Document {
  id?: string;
  knowledgeBaseId?: string;
  title?: string;
  content?: string;
  sourceUrl?: string;
  sourceType?: string;
  originalFileName?: string;
  fileExtension?: string;
  mimeType?: string;
  fileSize?: number;
  fileChecksum?: string;
  currentVersionNo?: number;
  currentPublishedVersionNo?: number;
  reviewStatus?: ReviewStatus;
  indexStatus?: 0 | 1 | 2 | 3;
  indexErrorMessage?: string;
  indexedAt?: number;
  chunkCount?: number;
  referenceCount?: number;
  lastReferencedAt?: number;
  status?: 0 | 1 | 2;
  createdAt?: number;
  updatedAt?: number;
}

export interface DocumentSearchParams extends Document {
  current?: number;
  pageSize?: number;
}
export interface KnowledgeDocumentVersion {
  id?: string;
  knowledgeDocumentId?: string;
  versionNo?: number;
  content?: string;
  contentChecksum?: string;
  reviewStatus?: ReviewStatus;
  sourceVersionId?: string;
  originalFileName?: string;
  fileExtension?: string;
  mimeType?: string;
  fileSize?: number;
  indexStatus?: 0 | 1 | 2 | 3;
  chunkCount?: number;
  indexedAt?: number;
  indexErrorMessage?: string | null;
  createdAt?: number;
}

export type ReviewStatus =
  | 'DRAFT'
  | 'AI_REVIEWING'
  | 'AI_REVIEWED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED';
export interface KnowledgeAiReview {
  id?: string;
  versionId?: string;
  status?: 'pending' | 'running' | 'success' | 'failed' | 'stale';
  score?: number;
  summary?: string;
  model?: string;
  errorMessage?: string;
  createdAt?: number;
  finishedAt?: number;
}
export interface KnowledgeAiReviewIssue {
  id?: string;
  severity?: 'critical' | 'major' | 'minor' | string;
  category?: string;
  title?: string;
  description?: string;
  originalExcerpt?: string;
  suggestedPatch?: string;
  status?: 'pending' | 'rejected' | 'manually_fixed' | 'ignored';
  comment?: string;
}
export type AiReviewIssueSeverity = 'critical' | 'high' | 'medium' | 'low' | string;
export type AiReviewIssueHandleStatus = 'pending' | 'accepted' | 'rejected' | string;
export interface AiReviewSuggestedPatch {
  operation: 'replace' | 'insert_before' | 'insert_after' | 'delete' | 'set_heading';
  target: { original: string };
  replacement?: string;
  level?: number;
  title?: string;
}
export interface AiReviewDiffIssue {
  id: string;
  blockId?: string;
  issueType: string;
  severity: AiReviewIssueSeverity;
  message: string;
  originalExcerpt?: string;
  suggestedPatch?: AiReviewSuggestedPatch;
  appliedChecksum?: string;
  handleStatus: AiReviewIssueHandleStatus;
  baseStartLine?: number;
  baseEndLine?: number;
  proposedStartLine?: number;
  proposedEndLine?: number;
}
export interface AiReviewDiff {
  reviewId: string;
  documentId: string;
  documentVersionId: string;
  contentChecksum: string;
  reviewStatus: string;
  stale: boolean;
  originalContent: string;
  proposedContent: string;
  issues: AiReviewDiffIssue[];
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  criticalPendingCount: number;
}
export interface AiReviewDiffAcceptResult {
  documentVersionId?: string;
  contentChecksum?: string;
  reviewStatus?: string;
  issueStatus?: string;
  requiresAiReview?: boolean;
}
export interface KnowledgeReviewTask {
  id?: string;
  documentId?: string;
  documentTitle?: string;
  documentVersionId?: string;
  versionNo?: number;
  knowledgeBaseId?: string;
  submitterId?: string;
  submitterName?: string;
  reviewerId?: string;
  claimantName?: string;
  status?: 'pending' | 'claimed' | 'approved' | 'rejected';
  comment?: string;
  submittedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}
export interface KnowledgeReviewTaskDetail extends KnowledgeReviewTask {
  document?: Document;
  version?: KnowledgeDocumentVersion;
  aiReview?: KnowledgeAiReview;
  issues?: KnowledgeAiReviewIssue[];
  actionLogs?: Array<{
    action?: string;
    operatorName?: string;
    comment?: string;
    createdAt?: number;
    operatorId?: string;
  }>;
}
export interface KnowledgeReviewTaskSearchParams extends KnowledgeReviewTask {
  current?: number;
  pageSize?: number;
  view?: 'available' | 'submittedByMe' | 'reviewedByMe' | 'all';
}
/** 文档版本索引后生成的最小检索文本单元。 */
export interface KnowledgeDocumentChunk {
  id?: string;
  chunkNo?: number;
  content?: string;
  tokenCount?: number;
  createdAt?: number;
}

/** 知识库文档索引任务。 */
export interface KnowledgeIndexJob {
  id?: string;
  knowledgeBaseId?: string;
  documentId?: string;
  documentVersionId?: string;
  /** create-新建文本、upload-上传文件、update-编辑、reindex-重建、rollback-回滚、retry-人工重试。 */
  jobType?: 'create' | 'upload' | 'update' | 'reindex' | 'rollback' | 'retry' | string;
  status?: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  retryCount?: number;
  maxRetryCount?: number;
  errorMessage?: string | null;
  statistics?: Record<string, unknown> | string | null;
  startedAt?: number;
  finishedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface KnowledgeIndexJobSearchParams extends KnowledgeIndexJob {
  current?: number;
  pageSize?: number;
}

/** Agent 与知识库的 RAG 使用关系 */
export interface KnowledgeBaseBinding {
  id?: string;
  agentDefinitionId?: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  scope?: 'PLATFORM' | 'AGENT';
  status?: 0 | 1;
  createdAt?: number;
  updatedAt?: number;
}

export interface KnowledgeBaseBindingSearchParams extends KnowledgeBaseBinding {
  current?: number;
  pageSize?: number;
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
  attachmentContent?: string;
  attachments?: string;
}

export interface AgentChatAttachment {
  fileName: string;
  contentType?: string;
  size?: number;
  objectKey: string;
  extractedContent: string;
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
  /** 是否允许填写自定义内容 */
  allowCustomInput?: boolean;
  /** 自定义内容输入框占位文本 */
  customInputPlaceholder?: string;
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
  layout: 'tabs' | 'confirm';
  question: string;
  questions: QuestionItemConfig[];
  approvalType?: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  riskLevel?: 'low' | 'medium' | 'high' | string;
  riskReason?: string;
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
export type AskUserAnswer = { selected: string | string[] } | { confirmed: boolean };

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
  agentId: string;
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
  runId?: string;
  content?: string;
  sources?: KnowledgeSource[];
  reasoningContent?: string;
  reasoningTokens?: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  waitingUser?: boolean;
}

/** Identifies a newly accepted Deep run before progress callbacks begin. */
export interface AgentStreamAcceptedData {
  runId: string;
  conversationId: string;
}

export interface KnowledgeSource {
  citationIndex: number;
  similarity?: number;
  /** Adjacent chunks are merged into this anchor source for answer context. */
  contextExpanded?: boolean;
  contextChunkCount?: number;
  documentName?: string;
  sectionPath?: string;
  content: string;
  chunkId: string;
}

export type AgentStreamEvent =
  | { event: 'message'; data: AgentStreamMessageData }
  | { event: 'reasoning'; data: AgentStreamReasoningData }
  | { event: 'tool_call'; data: AgentStreamToolCallData }
  | { event: 'progress'; data: { stage?: string; message?: string } }
  | { event: 'question'; data: AgentStreamQuestionData }
  | { event: 'accepted'; data: AgentStreamAcceptedData }
  | { event: 'run_step'; data: AgentStreamRunStepData }
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
  attachments?: string;
  citations?: string;
  sources?: KnowledgeSource[];
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
  status?: 0 | 1 | 2 | 3 | 4 | 5;
  errorMsg?: string;
  executionMode?: 'STANDARD' | 'DEEP';
  externalRunId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentRunStep {
  id?: string;
  runId?: string;
  eventId?: string;
  eventType?: string;
  data?: string;
  occurredAt?: number;
  createdAt?: string;
}

export interface AgentStreamRunStepData {
  runId?: string;
  eventId?: string;
  eventType?: string;
  occurredAt?: number;
  data?: {
    toolName?: string;
    message?: string;
    outputSummary?: string;
    summary?: string;
    maxSteps?: number;
    status?: string;
    toolCount?: number;
    actions?: Array<{ name?: string }>;
    error?: string;
  };
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
  toolType?: string;
  mcpServerId?: string;
  mcpServerName?: string;
  mcpBaseUrl?: string;
  mcpToolName?: string;
  mcpInputSchema?: string;
  timeoutMs?: number;
  status?: number;
  callCount?: number;
  successRate?: number;
  remark?: string;
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
 * @description Agent tool statistics
 */
export interface AgentToolStatistics {
  totalCount?: number;
  enabledCount?: number;
  disabledCount?: number;
  callCount?: number;
  successCount?: number;
  successRate?: number;
}

/** 工具页面左侧筛选项 */
export interface AgentToolFacetItem {
  value: string | number;
  label: string;
  count: number;
}

/** 工具分类、集成状态和来源的聚合数据 */
export interface AgentToolFacets {
  categories: AgentToolFacetItem[];
  statuses: AgentToolFacetItem[];
  sources: AgentToolFacetItem[];
}

/**
 * @description Agent tool statistics query params
 */
export interface AgentToolStatisticsParams {
  toolType?: string;
  mcpServerId?: string;
}

/** MCP 服务 */
export interface McpServer {
  id?: string;
  name?: string;
  code?: string;
  transport?: 'http' | 'sse' | 'streamable_http';
  baseUrl?: string;
  requestHeaders?: string;
  authType?: 'none' | 'bearer' | 'api_key';
  authToken?: string;
  timeoutMs?: number;
  status?: number;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface McpServerSearchParams extends McpServer {
  current?: number;
  pageSize?: number;
}

/** MCP 服务暴露的工具 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown> | string;
  outputSchema?: Record<string, unknown> | string;
}

/** 工具测试请求 */
/** 工具测试结果 */
export interface AgentToolTestResult {
  success?: boolean;
  content?: unknown;
  rawResponse?: unknown;
  latencyMs?: number;
  errorMsg?: string;
  requestUrl?: string;
  requestMethod?: string;
  [key: string]: unknown;
}

/**
 * @description Agent 工具绑定信息
 */
export interface AgentToolBinding {
  id?: string;
  toolId?: string;
  toolName?: string;
  toolCode?: string;
  mcpServerName?: string;
  mcpToolName?: string;
  mcpBaseUrl?: string;
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
  agentDefinitionId?: string;
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
