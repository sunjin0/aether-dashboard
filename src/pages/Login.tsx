import {
  ArrowLeftOutlined,
  LockOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProConfigProvider,
  ProFormCaptcha,
  ProFormText,
} from '@ant-design/pro-components';
import {Button, message, theme} from 'antd';
import React, {useState} from 'react';
import {flushSync} from 'react-dom';
import {history, request, useIntl, useModel} from "@umijs/max";
import {Footer} from "@/components";
import {login, verify} from "@/services/sys/LoginController";
import './Login.less';


export default () => {
  const {token} = theme.useToken();
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState('');
  const {initialState, setInitialState} = useModel('@@initialState');

  const intl = useIntl();
  const isEmailStep = verified;
  const formatMessage = (id: string) => intl.formatMessage({id});

  const getRedirectPath = () => {
    const redirect = new URLSearchParams(history.location.search).get('redirect');
    return redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
  };

  const handleFinish = async (values: Record<string, string>) => {
    setSubmitting(true);
    try {
      if (isEmailStep) {
        const {data, message: msg} = await login(values);
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        message.success(msg);
        if (initialState?.fetchUserInfo) {
          const currentUser = await initialState.fetchUserInfo();
          flushSync(() => {
            setInitialState({...initialState, currentUser});
          });
        }
        history.push(getRedirectPath());
        return true;
      }

      const {data, message: msg} = await verify(values);
      message.success(msg);
      setAccount(values.account);
      setVerified(data as boolean);
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProConfigProvider hashed={false} >
      <section className="login-page" data-testid="login-page">
        <aside className="login-brand" aria-label="Aether">
          <div className="login-brand-symbol" data-testid="login-brand-symbol" aria-hidden="true">
            <img src="/logo.svg" alt=""/>
          </div>
          <div className="login-brand-name">AETHER</div>
          <p className="login-brand-eyebrow">{formatMessage('user.login.brand.eyebrow')}</p>
          <h1>{formatMessage('user.login.brand.headline.before')} <span>{formatMessage('user.login.brand.headline')}</span></h1>
          <p className="login-brand-copy">{formatMessage('user.login.brand.description')}</p>
          <div className="login-network" aria-hidden="true"><span/><span/><span/></div>
        </aside>
        <main className="login-panel-wrap">
          <div className="login-panel">
            <LoginForm
              submitter={{
                searchConfig: {submitText: formatMessage(isEmailStep ? 'user.login.submit' : 'user.login.next')},
                submitButtonProps: {size: 'large', loading: submitting, block: true},
              }}
              onFinish={handleFinish}
            >
              <div className="login-stage-label">
                {formatMessage(isEmailStep ? 'user.login.email.eyebrow' : 'user.login.account.eyebrow')}
              </div>
              <div className="login-stage-header">
                <div>
                  <h2>{formatMessage(isEmailStep ? 'user.login.email.title' : 'user.login.account.title')}</h2>
                  <p>{formatMessage(isEmailStep ? 'user.login.email.description' : 'user.login.account.description')}</p>
                </div>
                <div className="login-progress" aria-label={formatMessage(isEmailStep ? 'user.login.step.email' : 'user.login.step.account')}>
                  <span className="is-active"/><span className={isEmailStep ? 'is-active' : ''}/>
                </div>
              </div>
          {!isEmailStep && (
            <>
              <ProFormText
                name="account"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined className={'prefixIcon'}/>,
                }}
                placeholder={intl.formatMessage(({id: 'user.login.username.placeholder'}))}
                rules={[
                  {
                    required: true,
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={'prefixIcon'}/>,
                  strengthText: intl.formatMessage({id: 'user.login.password.length'}),
                  statusRender: (value) => {
                    const getStatus = () => {
                      if (value && value.length > 12) {
                        return 'ok';
                      }
                      if (value && value.length > 6) {
                        return 'pass';
                      }
                      return 'poor';
                    };
                    const status = getStatus();
                    if (status === 'pass') {
                      return (
                        <div style={{color: token.colorWarning}}>
                          {intl.formatMessage({id: 'user.login.strength.medium'})}
                        </div>
                      );
                    }
                    if (status === 'ok') {
                      return (
                        <div style={{color: token.colorSuccess}}>
                          {intl.formatMessage({id: 'user.login.strength.strong'})}
                        </div>
                      );
                    }
                    return (
                      <div style={{color: token.colorError}}>{intl.formatMessage({id: 'user.login.strength.low'})}</div>
                    );
                  },
                }}
                placeholder={intl.formatMessage({id: 'user.login.password.placeholder'})}
                rules={[
                  {
                    required: true,
                    validator: (rule, value) => {
                      if (!value || value.length < 6 || value.length > 20) {
                        return Promise.reject(new Error(intl.formatMessage({id: 'user.login.password.length'})))
                      } else {
                        return Promise.resolve();
                      }
                    }
                  },
                ]}
              />
            </>
          )}
          {isEmailStep && (
            <>
              <Button
                type="link"
                icon={<ArrowLeftOutlined/>}
                onClick={() => setVerified(false)}
                className="login-back"
              >
                {formatMessage('user.login.back')}
              </Button>
              <ProFormText
                fieldProps={{
                  size: 'large',
                  prefix: <MobileOutlined className={'prefixIcon'}/>,
                }}
                name="email"
                initialValue={account}
                rules={[
                  {
                    required: true,
                  },
                  {
                    pattern: /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/,
                    message: intl.formatMessage({id: 'user.login.email.invalid'}),
                  },
                ]}
              />
              <ProFormCaptcha
                phoneName={'email'}
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={'prefixIcon'}/>,
                }}
                captchaProps={{
                  size: 'large',
                }}
                placeholder={intl.formatMessage(({id: 'user.login.captcha.placeholder'}))}
                captchaTextRender={(timing, count) => {
                  if (timing) {
                    return `${count} ${intl.formatMessage({id: 'user.login.captcha.msg'})}`;
                  }
                  return intl.formatMessage({id: 'user.login.captcha.get'});
                }}
                name="verificationCode"
                rules={[
                  {
                    required: true,
                  },
                  {
                    pattern: /^\d{6}$/,
                    message: intl.formatMessage({id: 'user.login.captcha.minLength'}),
                  },
                ]}
                onGetCaptcha={async (email) => {
                  const result = await request('/api/sys/send', {
                    data: {
                      email: email
                    },
                    method: 'POST',
                  })
                  message.success(result.message)
                }}
              />
            </>
          )}
          <div className="login-tip">
            {formatMessage(isEmailStep ? 'user.login.email.tip' : 'user.login.account.tip')}
          </div>
            </LoginForm>
          </div>
        </main>
        <div className="login-footer"><Footer/></div>
      </section>
    </ProConfigProvider>
  );
};
