import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import AgentRunInputModules from './AgentRunInputModules'
import enUS from '@/locales/en-US'

const renderWithEnglishLocale = (ui: any) =>
  render(
    React.createElement(IntlProvider, { locale: 'en-US', messages: enUS }, ui),
  )

/** 形状取自真实的 agent_run.input_content 快照。 */
const snapshot = () => JSON.stringify({
  model: 'qwen-plus',
  requestId: 'c62b797c-7224-4ff9-b14a-0204d2d28dbf',
  temperature: 0.3,
  toolChoice: 'auto',
  messages: [
    { role: 'system', content: '# 角色定义\n\n你是企业Aether人工智能助手。' },
    {
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
    },
    { role: 'user', content: '你有哪些工具' },
    { role: 'system', content: '【运行时上下文】\n【表达偏好】…' },
  ],
  tools: [
    { name: 'process_document', code: 'aether_process_document', mcpServerId: '2081210325657784321', description: '文档转换' },
    { name: 'generate_artifact', code: 'aether_generate_artifact', mcpServerId: '', description: '生成文件' },
  ],
})

describe('AgentRunInputModules', () => {
  it('renders the summary, capabilities and parameters on first paint', () => {
    const { container } = renderWithEnglishLocale(
      <AgentRunInputModules content={snapshot()} model="qwen-plus" />,
    )

    expect(screen.getByText(/4 modules · 4 messages/)).toBeTruthy()
    expect(screen.getByText('qwen-plus')).toBeTruthy()

    // 组合条：一个模块一段，首屏就能看出谁占大头。
    expect(container.querySelectorAll('.agent-run-input-bar').length).toBe(4)

    expect(screen.getByText('Carried capabilities')).toBeTruthy()
    expect(screen.getByText('采购与供应链协同')).toBeTruthy()
    expect(screen.getByText('请假审批')).toBeTruthy()
    expect(screen.getByText('HIGH')).toBeTruthy()

    expect(screen.getByText('temperature=0.3')).toBeTruthy()
    expect(screen.getByText('toolChoice=auto')).toBeTruthy()
  })

  it('keeps the module breakdown and tool definitions folded until expanded', () => {
    renderWithEnglishLocale(<AgentRunInputModules content={snapshot()} model="qwen-plus" />)

    // 折叠态下模块名不渲染，抽屉才不会一屏塞满模块框。
    expect(screen.queryByText('System prompt')).toBeNull()
    expect(screen.queryByText('process_document')).toBeNull()

    fireEvent.click(screen.getByText('Input modules'))
    expect(screen.getByText('System prompt')).toBeTruthy()
    expect(screen.getByText('Capability catalog')).toBeTruthy()
    expect(screen.getByText('Runtime context')).toBeTruthy()
    expect(screen.getByText('Current user message')).toBeTruthy()

    fireEvent.click(screen.getByText('Tool definitions sent to the model'))
    expect(screen.getByText('process_document')).toBeTruthy()
    expect(screen.getByText('MCP')).toBeTruthy()
    expect(screen.getByText('Built-in')).toBeTruthy()
  })

  it('reveals the original message text when a module is expanded', () => {
    renderWithEnglishLocale(<AgentRunInputModules content={snapshot()} model="qwen-plus" />)

    fireEvent.click(screen.getByText('Input modules'))
    fireEvent.click(screen.getByText('Current user message'))

    expect(screen.getByText('你有哪些工具')).toBeTruthy()
  })

  it('keeps the workflow protocol tools out of the ordinary tool group', () => {
    const content = JSON.stringify({
      model: 'qwen-plus',
      messages: [
        {
          role: 'system',
          content: `\n\n[可用能力 / Available capabilities]\n${JSON.stringify({
            type: 'agent_capability_catalog',
            version: 1,
            categories: {
              tools: [
                { name: 'workflow_start', description: '启动指定工作流能力' },
                { name: '发送邮件', description: '提交邮件' },
              ],
              skills: [],
              workflows: [{ name: '文件分析工作流', code: 'file_analyse_v6', riskLevel: 'HIGH' }],
            },
          })}`,
        },
      ],
      tools: [
        { id: 'workflow:start', name: 'workflow_start', code: 'workflow_start', toolType: 'workflow', status: 1 },
      ],
    })

    renderWithEnglishLocale(<AgentRunInputModules content={content} model="qwen-plus" />)

    // 目录里 workflow_start 归到独立分组，不再混在「Tools」里。
    expect(screen.getByText('Workflow protocol tools')).toBeTruthy()
    expect(screen.getByText('发送邮件')).toBeTruthy()
    expect(screen.getByText('文件分析工作流')).toBeTruthy()

    fireEvent.click(screen.getByText('Tool definitions sent to the model'))
    // workflow_start 在能力目录里也有一份，所以这里断言工具定义区独有的来源标签。
    expect(screen.getByText('Workflow protocol')).toBeTruthy()
    expect(screen.getAllByText('workflow_start').length).toBeGreaterThan(1)
  })

  it('falls back to the raw content when the snapshot is not structured', () => {
    renderWithEnglishLocale(<AgentRunInputModules content="ENCv1:aaaa:bbbb" />)

    expect(screen.getByText(/No structured input snapshot/)).toBeTruthy()
    expect(screen.getByText(/ENCv1:aaaa:bbbb/)).toBeTruthy()
  })

  it('falls back to the run model when the snapshot omits it', () => {
    renderWithEnglishLocale(
      <AgentRunInputModules
        content={JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })}
        model="qwen-max"
      />,
    )

    expect(screen.getByText('qwen-max')).toBeTruthy()
  })
})
