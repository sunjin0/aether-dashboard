const React = require('react');
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import Login from './Login';
import {verify} from '@/services/sys/LoginController';

jest.mock('@ant-design/icons', () => ({
  ArrowLeftOutlined: () => null,
  LockOutlined: () => null,
  MobileOutlined: () => null,
  UserOutlined: () => null,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const ProFormText = ({name, initialValue}: any) => <div data-testid={`${name}-field`}>{initialValue}</div>;
  ProFormText.Password = () => null;
  return {
    ProConfigProvider: ({children}: any) => <>{children}</>,
    LoginForm: ({children, title, subTitle, onFinish}: any) => (
      <form>
        <h1>{title}</h1>
        <p>{subTitle}</p>
        {children}
        <button type="button" onClick={() => onFinish({account: 'admin', password: 'password'})}>submit</button>
      </form>
    ),
    ProFormCaptcha: () => null,
    ProFormText,
  };
});

jest.mock('antd', () => ({
  Button: ({children}: any) => <button>{children}</button>,
  Steps: ({items}: any) => <div>{items.map((item: any) => <span key={item.title}>{item.title}</span>)}</div>,
  message: {success: jest.fn()},
  theme: {useToken: () => ({token: {colorBgContainer: '#fff'}})},
}));

jest.mock('@umijs/max', () => ({
  history: {push: jest.fn()},
  request: jest.fn(),
  useIntl: () => ({formatMessage: ({id}: {id: string}) => id}),
  useModel: () => ({initialState: {}, setInitialState: jest.fn()}),
}));

jest.mock('@/components', () => ({
  Footer: () => <footer />,
}));

jest.mock('@/services/sys/LoginController', () => ({
  login: jest.fn(),
  verify: jest.fn(),
}));

describe('Login', () => {
  it('presents Aether as an ambient AI workspace entry point', () => {
    render(<Login />);

    expect(screen.getByText('user.login.brand.eyebrow')).toBeTruthy();
    expect(screen.getByText('user.login.brand.headline')).toBeTruthy();
    expect(screen.getByText('user.login.account.title')).toBeTruthy();
    expect(screen.getByTestId('login-page').className).toContain('login-page');
    expect(screen.getByTestId('login-brand-symbol').className).toContain('login-brand-symbol');
    expect(screen.getByText('AETHER')).toBeTruthy();
  });

  it('moves to email verification after account credentials are verified', async () => {
    (verify as jest.Mock).mockResolvedValue({data: true, message: 'Verified'});
    render(<Login />);

    fireEvent.click(screen.getByRole('button', {name: 'submit'}));

    await waitFor(() => expect(screen.getByText('user.login.back')).toBeTruthy());
    expect(screen.getByTestId('email-field').textContent).toBe('admin');
  });
});
