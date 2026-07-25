import * as React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Form } from 'antd'
import AgentToolForm from './AgentToolForm'

jest.mock('@/components/DrawerForm', () => ({ children }: any) => <>{children}</>)
jest.mock('@/components/JsonDisplay', () => ({ content }: any) => (
  <pre data-testid="schema-preview">{content}</pre>
))
jest.mock('@/services/agent/ToolController', () => ({}))
jest.mock('@/services/agent/McpServerController', () => ({}))
jest.mock('@/services/sys/DictController', () => ({}))

jest.mock('@ant-design/pro-components', () => ({
  ProFormDigit: () => null,
  ProFormSelect: () => null,
  ProFormText: () => null,
  ProFormTextArea: ({ fieldProps, name }: any) => (
    <textarea aria-label={name} defaultValue="{}" {...fieldProps} />
  ),
}))

jest.mock('antd', () => {
  const React = require('react')
  return {
    Form: {
      Item: ({ children }: any) => <>{children}</>,
      useForm: jest.fn(() => [{}]),
      useWatch: jest.fn(() => '{"name":"lookup"}'),
    },
    Segmented: ({ options, value, onChange }: any) => (
      <div>
        {options.map((option: any) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    ),
  }
})

jest.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: any) => id }),
}))

describe('AgentToolForm', () => {
  const mockForm = { setFieldValue: jest.fn() }

  beforeEach(() => {
    mockForm.setFieldValue.mockClear();
    (Form.useForm as jest.Mock).mockReturnValue([mockForm])
  })

  it('switches between schema editing and structured preview', () => {
    render(<AgentToolForm onSuccess={jest.fn()} />)

    expect(Form.useWatch).toHaveBeenCalledWith(
      'mcpInputSchema',
      expect.objectContaining({ preserve: true }),
    )
    expect(screen.getByLabelText('mcpInputSchema')).toBeTruthy()
    expect(screen.queryByTestId('schema-preview')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'pages.agent.tool.schemaPreview' }))

    expect(screen.queryByLabelText('mcpInputSchema')).toBeNull()
    expect(screen.getByTestId('schema-preview').textContent).toBe('{"name":"lookup"}')
  })

  it('formats valid JSON when schema editing loses focus', () => {
    render(<AgentToolForm onSuccess={jest.fn()} />)
    const input = screen.getByLabelText('mcpInputSchema') as HTMLTextAreaElement
    input.value = '{"name":"lookup","required":true}'

    fireEvent.blur(input)

    expect(mockForm.setFieldValue).toHaveBeenCalledWith(
      'mcpInputSchema',
      '{\n  "name": "lookup",\n  "required": true\n}',
    )
  })
})
