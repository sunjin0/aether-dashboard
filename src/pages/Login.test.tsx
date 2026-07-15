const React = require('react');
import {readFileSync} from 'fs';
import {resolve} from 'path';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {history, useModel} from '@umijs/max';
import {flushSync} from 'react-dom';
import Login from './Login';
import {login, verify} from '@/services/sys/LoginController';

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

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  flushSync: jest.fn((callback) => callback()),
}));

jest.mock('antd', () => ({
  Button: ({children}: any) => <button>{children}</button>,
  Steps: ({items}: any) => <div>{items.map((item: any) => <span key={item.title}>{item.title}</span>)}</div>,
  message: {success: jest.fn()},
  theme: {useToken: () => ({token: {colorBgContainer: '#fff'}})},
}));

jest.mock('@umijs/max', () => ({
  history: {location: {search: ''}, push: jest.fn()},
  request: jest.fn(),
  useIntl: () => ({formatMessage: ({id}: {id: string}) => id}),
  useModel: jest.fn(),
}));

jest.mock('@/components', () => ({
  Footer: () => <footer />,
}));

jest.mock('@/services/sys/LoginController', () => ({
  login: jest.fn(),
  verify: jest.fn(),
}));

describe('Login', () => {
  const mockHistoryPush = history.push as jest.Mock;
  const mockUseModel = useModel as jest.Mock;
  const mockFlushSync = flushSync as jest.Mock;
  const mockSetInitialState = jest.fn();
  const mockFetchUserInfo = jest.fn();

  beforeEach(() => {
    mockHistoryPush.mockClear();
    mockFlushSync.mockClear();
    mockSetInitialState.mockClear();
    mockFetchUserInfo.mockReset();
    mockFetchUserInfo.mockResolvedValue({id: '1'});
    mockUseModel.mockReturnValue({initialState: {fetchUserInfo: mockFetchUserInfo}, setInitialState: mockSetInitialState});
  });

  it('keeps nested inputs transparent so the dark field background remains visible while focused', () => {
    const styles = readFileSync(resolve(__dirname, 'Login.less'), 'utf8');

    expect(styles).toMatch(/\.ant-input-affix-wrapper\s*\{[\s\S]*?\.ant-input\s*\{\s*background: transparent;/);
  });

  it('keeps validation-error inputs on the dark field background', () => {
    const styles = readFileSync(resolve(__dirname, 'Login.less'), 'utf8');

    expect(styles).toMatch(/\.ant-input-status-error,[\s\S]*?\.ant-input-affix-wrapper-status-error\s*\{[\s\S]*?background: rgba\(3, 10, 26, 0\.5\) !important;/);
  });

  it('uses high-contrast colors for clear and password visibility icons', () => {
    const styles = readFileSync(resolve(__dirname, 'Login.less'), 'utf8');

    expect(styles).toMatch(/\.ant-input-clear-icon,[\s\S]*?\.ant-input-password-icon\s*\{[\s\S]*?color: rgba\(218, 231, 255, 0\.78\) !important;/);
  });

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

  it('updates the current user before redirecting successful logins to the dashboard', async () => {
    (login as jest.Mock).mockResolvedValue({data: {token: 'token', refreshToken: 'refresh'}, message: 'Logged in'});
    render(<Login />);

    (verify as jest.Mock).mockResolvedValue({data: true, message: 'Verified'});
    fireEvent.click(screen.getByRole('button', {name: 'submit'}));
    await screen.findByText('user.login.back');
    fireEvent.click(screen.getByRole('button', {name: 'submit'}));

    await waitFor(() => expect(mockHistoryPush).toHaveBeenCalledWith('/dashboard'));
    expect(mockFlushSync).toHaveBeenCalled();
    expect(mockSetInitialState.mock.invocationCallOrder[0]).toBeLessThan(mockHistoryPush.mock.invocationCallOrder[0]);
  });
});
