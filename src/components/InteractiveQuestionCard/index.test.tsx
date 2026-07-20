const React = require('react')
import { fireEvent, render, screen } from '@testing-library/react'
import InteractiveQuestionCard from './index'

jest.mock('@umijs/max', () => ({
  useIntl: () => ({
    locale: 'zh-CN',
    formatMessage: ({ id }: { id: string }, values?: Record<string, number>) => {
      const messages: Record<string, string> = {
        'components.interactiveQuestionCard.customInputPlaceholder': '请输入自定义内容',
        'components.interactiveQuestionCard.confirm': '确认',
        'components.interactiveQuestionCard.cancel': '取消',
        'components.interactiveQuestionCard.risk.low': '低风险',
        'components.interactiveQuestionCard.risk.medium': '中风险',
        'components.interactiveQuestionCard.toolCallConfirmation': '工具调用确认',
        'components.interactiveQuestionCard.tool': '工具',
        'components.interactiveQuestionCard.riskLevel': '风险等级',
        'components.interactiveQuestionCard.riskReason': '风险说明',
        'components.interactiveQuestionCard.arguments': '调用参数',
        'components.interactiveQuestionCard.choice': '选择',
        'components.interactiveQuestionCard.required': '必填',
        'components.interactiveQuestionCard.submit': '提交',
        'components.interactiveQuestionCard.multipleQuestions': '多项提问',
        'components.interactiveQuestionCard.confirmSubmit': '确认提交',
        'components.interactiveQuestionCard.questionPrefix': '第 {number} 题',
      }
      if (id === 'components.interactiveQuestionCard.questionNumber') return `问题 ${values?.count}`
      if (id === 'components.interactiveQuestionCard.questionPrefix') return `第 ${values?.number} 题`
      if (id === 'components.interactiveQuestionCard.remainingQuestions') return `还需回答 ${values?.count} 个问题`
      return messages[id] || id
    },
  }),
}))

describe('InteractiveQuestionCard', () => {
  it('renders a confirmation layout for MCP tool approvals', () => {
    const onSubmit = jest.fn()

    render(
      <InteractiveQuestionCard
        questionConfig={{
          type: 'group',
          layout: 'confirm',
          question: '请确认 MCP 工具调用',
          questions: [
            {
              id: 'confirm',
              type: 'confirm',
              question: 'AI 请求调用 MCP 工具，请核对调用详情后确认。',
              confirmText: '确认执行',
              cancelText: '拒绝执行',
            },
          ],
          approvalType: 'mcp_tool_approval',
          toolName: 'list_commits',
          arguments: { owner: 'sunjin0', repo: 'aether', sha: 'master' },
          riskLevel: 'medium',
          riskReason: '无法确认调用是否只读，按中风险处理',
        }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText('工具调用确认')).toBeTruthy()
    expect(screen.getByText('list_commits')).toBeTruthy()
    expect(screen.getByText('中风险')).toBeTruthy()
    expect(screen.getByText(/"owner": "sunjin0"/)).toBeTruthy()
    expect(screen.queryByText('多项提问')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /确认执行/ }))

    expect(onSubmit).toHaveBeenCalledWith({ confirm: { confirmed: true } })
  })

  it('renders tool details and authorization choices for choice-based confirmations', () => {
    const onSubmit = jest.fn()

    render(
      <InteractiveQuestionCard
        questionConfig={{
          type: 'group',
          layout: 'confirm',
          question: '请确认 MCP 工具调用',
          questions: [
            {
              id: 'decision',
              type: 'choice',
              question: 'AI 请求调用 MCP 工具，请核对调用详情后确认。',
              multiple: false,
              options: [
                { id: 'once', label: '仅本次执行', value: 'once' },
                { id: 'allow_10m', label: '当前工具 10 分钟内免确认', value: 'allow_10m' },
                { id: 'reject', label: '拒绝执行', value: 'reject' },
              ],
            },
          ],
          toolName: 'search_commits',
          arguments: { perPage: 10, query: 'author:sunjin0' },
          riskLevel: 'low',
          riskReason: '调用看起来是只读查询；仍需用户确认后才会发送',
        }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText('search_commits')).toBeTruthy()
    expect(screen.getByText('低风险')).toBeTruthy()
    expect(screen.getByText('仅本次执行')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('仅本次执行'))
    fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }))

    expect(onSubmit).toHaveBeenCalledWith({ decision: { selected: 'once' } })
  })

  it('submits trimmed custom input instead of a selected single choice', () => {
    const onSubmit = jest.fn()

    render(
      <InteractiveQuestionCard
        questionConfig={{
          id: 'github_username',
          type: 'choice',
          question: '你的 GitHub 用户名是什么？',
          options: [{ id: 'unknown', label: '不确定', value: 'unknown_username' }],
          allowCustomInput: true,
          customInputPlaceholder: '输入你的 GitHub 用户名...',
        }}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByLabelText('不确定'))
    fireEvent.change(screen.getByPlaceholderText('输入你的 GitHub 用户名...'), {
      target: { value: '  octocat  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }))

    expect(onSubmit).toHaveBeenCalledWith({ github_username: { selected: 'octocat' } })
  })

  it('submits trimmed custom input instead of selected multiple choices', () => {
    const onSubmit = jest.fn()

    render(
      <InteractiveQuestionCard
        questionConfig={{
          id: 'repo_description',
          type: 'choice',
          question: '仓库大概是关于什么的？',
          multiple: true,
          options: [{ id: 'frontend', label: '前端项目', value: 'frontend' }],
          allowCustomInput: true,
          customInputPlaceholder: '简单描述一下仓库内容...',
        }}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByLabelText('前端项目'))
    fireEvent.change(screen.getByPlaceholderText('简单描述一下仓库内容...'), {
      target: { value: '  管理后台  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }))

    expect(onSubmit).toHaveBeenCalledWith({
      repo_description: { selected: ['管理后台'] },
    })
  })

  it('clears selected choices when custom input has content', () => {
    render(
      <InteractiveQuestionCard
        questionConfig={{
          id: 'repo_description',
          type: 'choice',
          question: '仓库大概是关于什么的？',
          multiple: true,
          options: [{ id: 'frontend', label: '前端项目', value: 'frontend' }],
          allowCustomInput: true,
          customInputPlaceholder: '简单描述一下仓库内容...',
        }}
      />,
    )

    fireEvent.click(screen.getByLabelText('前端项目'))
    fireEvent.change(screen.getByPlaceholderText('简单描述一下仓库内容...'), {
      target: { value: '管理后台' },
    })

    expect((screen.getByLabelText('前端项目') as HTMLInputElement).checked).toBe(false)
  })

  it('submits custom input from a tabbed question group', () => {
    const onSubmit = jest.fn()

    render(
      <InteractiveQuestionCard
        questionConfig={{
          type: 'group',
          layout: 'tabs',
          question: '请确认以下问题后继续。',
          questions: [
            {
              id: 'github_username',
              type: 'choice',
              question: '你的 GitHub 用户名是什么？',
              options: [{ id: 'unknown', label: '不确定', value: 'unknown_username' }],
              allowCustomInput: true,
              customInputPlaceholder: '输入你的 GitHub 用户名...',
            },
          ],
        }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText('第 1 题')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('输入你的 GitHub 用户名...'), {
      target: { value: '  octocat  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /确认提交/ }))

    expect(onSubmit).toHaveBeenCalledWith({ github_username: { selected: 'octocat' } })
  })

  it('keeps the current tab after another question is answered', () => {
    render(
      <InteractiveQuestionCard
        questionConfig={{
          type: 'group',
          layout: 'tabs',
          question: '请确认以下问题后继续。',
          questions: [
            {
              id: 'first',
              type: 'choice',
              question: '第一个问题',
              options: [{ id: 'yes', label: '是', value: 'yes' }],
            },
            {
              id: 'second',
              type: 'choice',
              question: '第二个问题',
              options: [{ id: 'no', label: '否', value: 'no' }],
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: /问题 2/ }))
    fireEvent.click(screen.getByLabelText('否'))

    expect(screen.getByRole('tab', { name: /问题 2/ }).getAttribute('aria-selected')).toBe('true')
  })
})
