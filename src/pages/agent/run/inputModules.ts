/**
 * 把执行记录里的 `AgentRun.inputContent`（发送给模型的完整输入快照）拆成模块。
 *
 * 消息切分规则与后端 `ContextMetricService.classify`（biz/.../ContextMetricService.java）保持一致，
 * 那边已经把同一套前缀判定用在上下文 token 统计上；这里只是把它的结果呈现出来。
 * 改动任何一条前缀规则时请同步改后端，否则两处口径会漂移。
 */

export type InputModuleKey =
  | 'systemPrompt'
  | 'capabilityIndex'
  | 'skill'
  | 'deepTask'
  | 'memory'
  | 'runtimeContext'
  | 'summary'
  | 'toolResult'
  | 'currentMessage'
  | 'history'

export interface InputModuleMessage {
  role: string
  content: string
}

export interface InputModule {
  key: InputModuleKey
  role: string
  count: number
  charCount: number
  estimatedTokens: number
  preview: string
  messages: InputModuleMessage[]
}

/** 快照里无法归类到上面任何一种消息模块的顶层字段（Deep 运行的任务载荷走这里）。 */
export interface InputField {
  name: string
  charCount: number
  estimatedTokens: number
  preview: string
  text: string
}

export interface CapabilitySummary {
  kind: string
  name: string
  description?: string
  riskLevel?: string
}

export interface ToolSummary {
  name: string
  code: string
  description?: string
  source: 'mcp' | 'builtin' | 'workflow'
}

export interface ModelInputView {
  /** false 表示快照不是可解析的 JSON 对象，调用方应回退到原始展示。 */
  parsed: boolean
  model?: string
  requestId?: string
  parameters: { key: string; value: string }[]
  modules: InputModule[]
  fields: InputField[]
  capabilities: CapabilitySummary[]
  tools: ToolSummary[]
  messageCount: number
  totalEstimatedTokens: number
}

/** 常驻能力目录消息的开头标记，见后端 `CapabilityIndexService.buildIndex`。 */
const CAPABILITY_MARKER = '[可用能力 / Available capabilities]'

/**
 * 工作流生命周期工具的固定协议名，见后端 `AgentToolCatalog.addUnifiedWorkflowTools`。
 *
 * 这 7 个是合成工具（无 DB 行），所有工作流能力共用它们，具体能力由 `workflow_start`
 * 的 capabilityCode 选择。它们同时也是 `toolType=workflow` 的内置工具，所以既会出现在
 * 快照的 `tools[]` 里，也会被 `AgentToolLiveness.filterLive` 保留而进入能力目录的
 * `categories.tools` —— 不单独归类的话，用户会以为它们是两拨东西。
 */
export const WORKFLOW_PROTOCOL_TOOLS = [
  'workflow_start',
  'workflow_observe',
  'workflow_stop',
  'workflow_provide_input',
  'workflow_resolve_mcp_approval',
  'workflow_signal_event',
  'workflow_retry',
]

const isWorkflowProtocolName = (name: string): boolean =>
  WORKFLOW_PROTOCOL_TOOLS.includes(name)

/** 与后端 MODEL_TOKEN_RATIOS 对齐的模型前缀系数。 */
const MODEL_TOKEN_DIVISORS: Array<[string, number]> = [
  ['gpt-4o', 3.5],
  ['gpt-4-turbo', 3.5],
  ['gpt-4', 3.5],
  ['gpt-3.5-turbo', 3.5],
  ['claude-3-5', 4.0],
  ['claude-3', 4.0],
  ['qwen', 3.0],
  ['deepseek', 3.5],
  ['gemma', 3.0],
  ['llama', 3.0],
  ['mistral', 3.5],
]

const DEFAULT_TOKEN_DIVISOR = 3.0
const MESSAGE_BASE_TOKENS = 4
const PREVIEW_LENGTH = 160

/** 快照自身的标量参数，按展示顺序列出。 */
const PARAMETER_KEYS = [
  'temperature',
  'topP',
  'maxCompletionTokens',
  'reasoningEffort',
  'toolChoice',
  'toolChoiceName',
]

const KNOWN_TOP_LEVEL_KEYS = ['model', 'requestId', 'messages', 'tools', ...PARAMETER_KEYS]

/**
 * 统计 UTF-8 字节数。`TextEncoder` 在 jest 的 jsdom 环境下不保证存在，这里手算，
 * 结果与后端 `String.getBytes(StandardCharsets.UTF_8).length` 一致。
 */
const utf8Length = (value: string): number => {
  let bytes = 0
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code < 0x80) {
      bytes += 1
    } else if (code < 0x800) {
      bytes += 2
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      bytes += 4
      i += 1
    } else {
      bytes += 3
    }
  }
  return bytes
}

const resolveTokenDivisor = (model?: string): number => {
  if (!model) {
    return DEFAULT_TOKEN_DIVISOR
  }
  const lower = model.toLowerCase()
  const matched = MODEL_TOKEN_DIVISORS.find(([prefix]) => lower.startsWith(prefix))
  return matched ? matched[1] : DEFAULT_TOKEN_DIVISOR
}

/** 与后端 `ContextMetricService.estimateTokens` 同口径的粗略估算。 */
export const estimateTokens = (value?: string, model?: string): number => {
  if (!value) {
    return 0
  }
  return Math.ceil(utf8Length(value) / resolveTokenDivisor(model))
}

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

/** 把任意快照值渲染成可读文本：字符串原样，其余走 JSON 美化。 */
const toText = (value: unknown): string => {
  const scalar = asString(value)
  if (scalar !== undefined) {
    return scalar
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const toPreview = (text: string): string => {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > PREVIEW_LENGTH ? `${singleLine.slice(0, PREVIEW_LENGTH)}…` : singleLine
}

/**
 * 单条消息的模块归属。判定顺序与后端 `ContextMetricService.classify` 一致，
 * 只在最前面多了能力目录这一条（后端把它并入系统提示统计）。
 */
const classify = (role: string, content: string, index: number, finalUserIndex: number): InputModuleKey => {
  if (content.trimStart().startsWith(CAPABILITY_MARKER)) {
    return 'capabilityIndex'
  }
  if (content.startsWith('【Skill') || content.startsWith('【技能')) {
    return 'skill'
  }
  if (content.startsWith('【当前Deep任务】')) {
    return 'deepTask'
  }
  if (content.startsWith('【会话记忆】') || content.startsWith('【用户已确认偏好】')) {
    return 'memory'
  }
  if (content.startsWith('【运行时上下文】')) {
    return 'runtimeContext'
  }
  if (content.startsWith('【对话历史摘要】')) {
    return 'summary'
  }
  if (role === 'tool') {
    return 'toolResult'
  }
  if (index === finalUserIndex) {
    return 'currentMessage'
  }
  if (role === 'user' || role === 'assistant') {
    return 'history'
  }
  return 'systemPrompt'
}

interface ParsedMessage {
  role: string
  content: string
  estimatedTokens: number
}

const parseMessage = (value: unknown, model?: string): ParsedMessage | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const role = typeof record.role === 'string' ? record.role : 'system'
  const content = typeof record.content === 'string' ? record.content : ''
  let tokens = MESSAGE_BASE_TOKENS + estimateTokens(role, model) + estimateTokens(content, model)
  // 与后端 estimateContextTokens 一致：工具调用参数同样计入输入体积。
  const toolCalls = asString(record.toolCalls)
  if (toolCalls) {
    tokens += estimateTokens(toolCalls, model)
  }
  const toolCallId = asString(record.toolCallId)
  if (toolCallId) {
    tokens += estimateTokens(toolCallId, model)
  }
  return { role, content, estimatedTokens: tokens }
}

const parseCapabilityItems = (
  kind: string,
  value: unknown,
): CapabilitySummary[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }
    const record = item as Record<string, unknown>
    const name = asString(record.displayName) || asString(record.name) || asString(record.code)
    if (!name) {
      return []
    }
    const description = asString(record.description)
    const riskLevel = asString(record.riskLevel)
    // 能力目录的工具条目不带 code/type，只能按固定协议名把工作流生命周期工具摘出来，
    // 免得它们和真正的 MCP 工具混在同一个「工具」分组里。
    const resolvedKind = kind === 'tool' && isWorkflowProtocolName(name) ? 'workflowProtocol' : kind
    return [
      { kind: resolvedKind, name, ...(description ? { description } : {}), ...(riskLevel ? { riskLevel } : {}) },
    ]
  })
}

/**
 * 解析常驻能力目录消息。
 *
 * `bbcce812` 起正文是分类 JSON（`{type:"agent_capability_catalog", categories:{...}}`），
 * 更早的运行是自然语言列表（`- tool 发送邮件: 描述`），两种都要认。
 */
const parseCapabilities = (content: string): CapabilitySummary[] => {
  const at = content.indexOf(CAPABILITY_MARKER)
  if (at < 0) {
    return []
  }
  const body = content.slice(at + CAPABILITY_MARKER.length).trim()
  if (body.startsWith('{')) {
    try {
      const catalog: unknown = JSON.parse(body)
      const categories = catalog && typeof catalog === 'object' && !Array.isArray(catalog)
        ? (catalog as Record<string, unknown>).categories
        : undefined
      if (categories && typeof categories === 'object' && !Array.isArray(categories)) {
        const grouped = categories as Record<string, unknown>
        return ['tools', 'skills', 'workflows'].flatMap((group) =>
          parseCapabilityItems(group.replace(/s$/, ''), grouped[group]),
        )
      }
    } catch {
      // 落到下面的老式列表解析
    }
  }
  return body
    .split('\n')
    .map((line) => line.trim())
    .flatMap((line) => {
      if (!line.startsWith('- ')) {
        return []
      }
      const rest = line.slice(2).trim()
      const kindMatch = /^(\S+)\s+(.*)$/.exec(rest)
      if (!kindMatch) {
        return []
      }
      const separator = kindMatch[2].indexOf(': ')
      const name = separator < 0 ? kindMatch[2].trim() : kindMatch[2].slice(0, separator).trim()
      if (!name) {
        return []
      }
      const description = separator < 0 ? undefined : kindMatch[2].slice(separator + 2).trim()
      return [{ kind: kindMatch[1], name, ...(description ? { description } : {}) }]
    })
}

const parseTools = (value: unknown): ToolSummary[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }
    const record = item as Record<string, unknown>
    const name = asString(record.name) || asString(record.code)
    if (!name) {
      return []
    }
    const description = asString(record.description)
    // mcp_server_id 为空即平台内置工具，口径同后端 AgentToolLiveness。
    let source: ToolSummary['source'] = 'builtin'
    if (asString(record.mcpServerId)) {
      source = 'mcp'
    } else if (
      asString(record.toolType) === 'workflow'
      || asString(record.type) === 'workflow'
      || isWorkflowProtocolName(name)
    ) {
      // 工作流生命周期工具：内置，但属于固定协议而非某个 MCP 服务。
      source = 'workflow'
    }
    return [{
      name,
      code: asString(record.code) || name,
      ...(description ? { description } : {}),
      source,
    } as ToolSummary]
  })
}

const EMPTY_VIEW: ModelInputView = {
  parsed: false,
  parameters: [],
  modules: [],
  fields: [],
  capabilities: [],
  tools: [],
  messageCount: 0,
  totalEstimatedTokens: 0,
}

/**
 * 把模型输入快照拆成可直接渲染的模块。
 *
 * 解析失败（历史明文、`ENCv1:` 密文、非 JSON 载荷）时返回 `parsed: false`，
 * 由调用方回退到原始展示。
 */
export const parseModelInput = (raw?: string, fallbackModel?: string): ModelInputView => {
  if (!raw) {
    return EMPTY_VIEW
  }

  let snapshot: unknown
  try {
    snapshot = JSON.parse(raw)
  } catch {
    return EMPTY_VIEW
  }
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return EMPTY_VIEW
  }

  const record = snapshot as Record<string, unknown>
  // 老快照可能没记 model 字段，退回运行记录本身记录的模型，至少让 token 系数取对。
  const model = asString(record.model) || fallbackModel
  const requestId = asString(record.requestId)

  const parsedMessages: ParsedMessage[] = Array.isArray(record.messages)
    ? (record.messages.map((message) => parseMessage(message, model)).filter(Boolean) as ParsedMessage[])
    : []
  const messageCount = parsedMessages.length

  let finalUserIndex = -1
  for (let i = parsedMessages.length - 1; i >= 0; i -= 1) {
    if (parsedMessages[i].role === 'user') {
      finalUserIndex = i
      break
    }
  }

  const modules: InputModule[] = []
  const byKey = new Map<InputModuleKey, InputModule>()
  let capabilities: CapabilitySummary[] = []

  parsedMessages.forEach((message, index) => {
    const key = classify(message.role, message.content, index, finalUserIndex)
    if (key === 'capabilityIndex') {
      capabilities = capabilities.concat(parseCapabilities(message.content))
    }
    const existing = byKey.get(key)
    const entry: InputModuleMessage = { role: message.role, content: message.content }
    if (existing) {
      existing.count += 1
      existing.charCount += message.content.length
      existing.estimatedTokens += message.estimatedTokens
      existing.messages.push(entry)
      return
    }
    const created: InputModule = {
      key,
      role: message.role,
      count: 1,
      charCount: message.content.length,
      estimatedTokens: message.estimatedTokens,
      preview: toPreview(message.content),
      messages: [entry],
    }
    byKey.set(key, created)
    modules.push(created)
  })

  const parameters = PARAMETER_KEYS.flatMap((key) => {
    const value = asString(record[key])
    return value === undefined ? [] : [{ key, value }]
  })

  const tools = parseTools(record.tools)

  const fields: InputField[] = Object.keys(record)
    .filter((key) => !KNOWN_TOP_LEVEL_KEYS.includes(key))
    .map((key) => {
      const text = toText(record[key])
      return {
        name: key,
        charCount: text.length,
        estimatedTokens: estimateTokens(text, model),
        preview: toPreview(text),
        text,
      }
    })

  const moduleTokens = modules.reduce((sum, module) => sum + module.estimatedTokens, 0)
  // 工具定义按后端 estimateToolTokens 的思路单独计入，不进消息模块。
  const toolTokens = estimateTokens(JSON.stringify(record.tools || []), model)
  const fieldTokens = fields.reduce((sum, field) => sum + field.estimatedTokens, 0)

  return {
    parsed: true,
    ...(model ? { model } : {}),
    ...(requestId ? { requestId } : {}),
    parameters,
    modules,
    fields,
    capabilities,
    tools,
    messageCount,
    totalEstimatedTokens: moduleTokens + toolTokens + fieldTokens,
  }
}
