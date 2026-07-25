import * as React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/DrawerForm', () => ({ children }: any) => <>{children}</>)
jest.mock('@/services/agent/ModelProviderController', () => ({}))
jest.mock('@/services/sys/DictController', () => ({ getOptionList: jest.fn() }))

jest.mock('@ant-design/pro-components', () => {
  const ProFormText = ({ name, label }: any) => <input aria-label={label || name} />
  ProFormText.Password = () => null

  return {
    ProFormDigit: () => null,
    ProFormSelect: ({ name }: any) => <select aria-label={name} />,
    ProFormText,
    ProFormTextArea: () => null,
  }
})

jest.mock('antd', () => ({
  Form: {
    useForm: () => [{}],
    useWatch: () => undefined,
  },
}))
jest.mock('@umijs/max', () => ({
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id,
  }),
}));
(global as any).React = React
const ModelProviderForm = require('./ModelProviderForm').default

describe('ModelProviderForm', () => {
  it('uses text inputs for the provider name and default model', () => {
    render(<ModelProviderForm onSuccess={jest.fn()} />)

    expect(screen.getByRole('textbox', { name: 'pages.agent.modelProvider.name' })).toBeTruthy()
    expect(
      screen.getByRole('textbox', { name: 'pages.agent.modelProvider.defaultModel' }),
    ).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'name' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'defaultModel' })).toBeNull()
  })
})
