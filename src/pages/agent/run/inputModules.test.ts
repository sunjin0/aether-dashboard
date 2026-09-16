import { estimateTokens, parseModelInput } from './inputModules'

const snapshot = (payload: Record<string, unknown>) => JSON.stringify(payload)

describe('parseModelInput', () => {
  it('returns an unparsed view for non-JSON content', () => {
    expect(parseModelInput(undefined).parsed).toBe(false)
    expect(parseModelInput('ENCv1:aaaa:bbbb').parsed).toBe(false)
    expect(parseModelInput('[1,2,3]').parsed).toBe(false)
    expect(parseModelInput('').parsed).toBe(false)
  })

  it('splits messages into modules using the backend section markers', () => {
    const view = parseModelInput(snapshot({
      model: 'qwen-plus',
      requestId: 'req-1',
      messages: [
        { role: 'system', content: '你是企业助手' },
        { role: 'system', content: '\n\n[可用能力 / Available capabilities]\n{"categories":{}}' },
        { role: 'system', content: '【Skill 采购】规则' },
        { role: 'system', content: '【当前Deep任务】任务' },
        { role: 'system', content: '【会话记忆】记忆' },
        { role: 'system', content: '【用户已确认偏好】偏好' },
        { role: 'system', content: '【运行时上下文】上下文' },
        { role: 'system', content: '【对话历史摘要】摘要' },
        { role: 'user', content: '之前的问题' },
        { role: 'assistant', content: '之前的回答' },
        { role: 'tool', content: '工具结果' },
        { role: 'user', content: '当前问题' },
      ],
    }))

    expect(view.parsed).toBe(true)
    expect(view.model).toBe('qwen-plus')
    expect(view.requestId).toBe('req-1')
    expect(view.messageCount).toBe(12)
    expect(view.modules.map((module) => module.key)).toEqual([
      'systemPrompt',
      'capabilityIndex',
      'skill',
      'deepTask',
      'memory',
      'runtimeContext',
      'summary',
      'history',
      'toolResult',
      'currentMessage',
    ])
  })

  it('keeps only the final user message as the current message', () => {
    const view = parseModelInput(snapshot({
      messages: [
        { role: 'user', content: '第一问' },
        { role: 'user', content: '第二问' },
      ],
    }))

    const current = view.modules.find((module) => module.key === 'currentMessage')
    const history = view.modules.find((module) => module.key === 'history')
    expect(current?.messages.map((message) => message.content)).toEqual(['第二问'])
    expect(history?.messages.map((message) => message.content)).toEqual(['第一问'])
  })

  it('merges non-adjacent messages that share a section', () => {
    const view = parseModelInput(snapshot({
      messages: [
        { role: 'system', content: '【技能 A】a' },
        { role: 'user', content: '问题' },
        { role: 'system', content: '【技能 B】b' },
      ],
    }))

    const skill = view.modules.find((module) => module.key === 'skill')
    expect(skill?.count).toBe(2)
    expect(skill?.messages.map((message) => message.content)).toEqual(['【技能 A】a', '【技能 B】b'])
  })

  it('reads the structured capability catalog', () => {
    const view = parseModelInput(snapshot({
      messages: [{
        role: 'system',
        content: `\n\n[可用能力 / Available capabilities]\n${JSON.stringify({
          type: 'agent_capability_catalog',
          version: 1,
          categories: {
            tools: [{ name: '发送邮件', description: '提交邮件' }],
            skills: [{ name: '采购与供应链协同', description: '核对采购申请' }],
            workflows: [{ name: '请假审批', description: '发起请假', riskLevel: 'HIGH' }],
          },
        })}`,
      }],
    }))

    expect(view.capabilities).toEqual([
      { kind: 'tool', name: '发送邮件', description: '提交邮件' },
      { kind: 'skill', name: '采购与供应链协同', description: '核对采购申请' },
      { kind: 'workflow', name: '请假审批', description: '发起请假', riskLevel: 'HIGH' },
    ])
  })

  it('falls back to the legacy bullet capability list', () => {
    const view = parseModelInput(snapshot({
      messages: [{
        role: 'system',
        content: [
          '',
          '',
          '[可用能力 / Available capabilities]',
          '- tool 发送邮件: 使用调用方本次运行提供的 SMTP 邮箱提交邮件',
          '- skill 采购与供应链协同: 辅助采购申请',
        ].join('\n'),
      }],
    }))

    expect(view.capabilities).toEqual([
      { kind: 'tool', name: '发送邮件', description: '使用调用方本次运行提供的 SMTP 邮箱提交邮件' },
      { kind: 'skill', name: '采购与供应链协同', description: '辅助采购申请' },
    ])
  })

  it('classifies tools by whether an MCP server is bound', () => {
    const view = parseModelInput(snapshot({
      tools: [
        { name: 'process_document', code: 'aether_process_document', mcpServerId: '2081210365587558401' },
        { name: 'generate_artifact', code: 'aether_generate_artifact', mcpServerId: '', description: '生成文件' },
        { mcpServerId: 'x' },
      ],
    }))

    expect(view.tools).toEqual([
      { name: 'process_document', code: 'aether_process_document', source: 'mcp' },
      { name: 'generate_artifact', code: 'aether_generate_artifact', description: '生成文件', source: 'builtin' },
    ])
  })

  it('separates the workflow lifecycle tools from ordinary built-ins', () => {
    const view = parseModelInput(snapshot({
      tools: [
        // 快照里存的是完整 AgentTool 实体，工作流工具带 toolType=workflow。
        { id: 'workflow:start', name: 'workflow_start', code: 'workflow_start', toolType: 'workflow', status: 1 },
        { id: 'workflow:observe', name: 'workflow_observe', code: 'workflow_observe', toolType: 'workflow', status: 1 },
        // 老快照可能只有名字，按固定协议名兜底识别。
        { name: 'workflow_stop', code: 'workflow_stop', mcpServerId: '' },
        { name: 'ask_user', code: 'aether_ask_user', mcpServerId: '', description: '向用户追问' },
      ],
    }))

    expect(view.tools.map((tool) => [tool.name, tool.source])).toEqual([
      ['workflow_start', 'workflow'],
      ['workflow_observe', 'workflow'],
      ['workflow_stop', 'workflow'],
      ['ask_user', 'builtin'],
    ])
  })

  it('lifts workflow tools out of the catalog tool category', () => {
    const view = parseModelInput(snapshot({
      messages: [{
        role: 'system',
        content: `\n\n[可用能力 / Available capabilities]\n${JSON.stringify({
          type: 'agent_capability_catalog',
          version: 1,
          categories: {
            // 这 7 个合成工具 mcpServerId 为空且 status=1，会被 AgentToolLiveness
            // 当成内置工具保留，因此也出现在目录的 tools 分类里。
            tools: [
              { name: 'workflow_start', description: '启动指定工作流能力' },
              { name: '发送邮件', description: '提交邮件' },
            ],
            skills: [],
            workflows: [{ name: '文件分析工作流', code: 'file_analyse_v6', riskLevel: 'HIGH' }],
          },
        })}`,
      }],
    }))

    // 解析保持「目录里的分类顺序」，分组重排是渲染层的事。
    expect(view.capabilities).toEqual([
      { kind: 'workflowProtocol', name: 'workflow_start', description: '启动指定工作流能力' },
      { kind: 'tool', name: '发送邮件', description: '提交邮件' },
      { kind: 'workflow', name: '文件分析工作流', riskLevel: 'HIGH' },
    ])
  })

  it('collects scalar parameters and leaves other top-level fields generic', () => {
    const view = parseModelInput(snapshot({
      model: 'qwen-plus',
      temperature: 0.3,
      maxCompletionTokens: 2048,
      toolChoice: 'auto',
      task: '整理这份文档',
      system_prompt: 'deep 的提示词',
      allowed_tools: ['a', 'b'],
    }))

    expect(view.parameters).toEqual([
      { key: 'temperature', value: '0.3' },
      { key: 'maxCompletionTokens', value: '2048' },
      { key: 'toolChoice', value: 'auto' },
    ])
    expect(view.fields.map((field) => field.name)).toEqual(['task', 'system_prompt', 'allowed_tools'])
    expect(view.fields[0].text).toBe('整理这份文档')
    expect(view.fields[2].text).toBe('[\n  "a",\n  "b"\n]')
  })

  it('falls back to the run model when the snapshot omits it', () => {
    const payload = snapshot({ messages: [{ role: 'user', content: 'a'.repeat(14) }] })

    expect(parseModelInput(payload).model).toBeUndefined()
    expect(parseModelInput(payload, 'gpt-4o').model).toBe('gpt-4o')
    expect(parseModelInput(payload, 'gpt-4o').totalEstimatedTokens)
      .toBeLessThan(parseModelInput(payload, 'qwen-plus').totalEstimatedTokens)
  })

  it('counts tool usage messages and tool definitions into the total', () => {
    const view = parseModelInput(snapshot({
      messages: [{ role: 'tool', content: '结果' }],
      tools: [{ name: 't', code: 't', mcpServerId: 'm' }],
    }))

    expect(view.totalEstimatedTokens).toBeGreaterThan(view.modules[0].estimatedTokens)
  })
})

describe('estimateTokens', () => {
  it('counts UTF-8 bytes rather than characters', () => {
    expect(estimateTokens('中文', 'qwen-plus')).toBe(2)
  })

  it('applies the per-model divisor', () => {
    const value = 'a'.repeat(14)
    expect(estimateTokens(value, 'qwen-plus')).toBe(5)
    expect(estimateTokens(value, 'gpt-4o')).toBe(4)
    expect(estimateTokens(value, undefined)).toBe(5)
  })

  it('returns zero for empty input', () => {
    expect(estimateTokens('', 'qwen-plus')).toBe(0)
    expect(estimateTokens(undefined, 'qwen-plus')).toBe(0)
  })
})
