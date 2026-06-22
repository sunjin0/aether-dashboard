import {
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
import {message, theme} from 'antd';
import {useState} from 'react';
import {request, useIntl, history, useModel} from "@umijs/max";
import {Header} from "antd/es/layout/layout";
import {Footer, SelectLang} from "@/components";
import {login, verify} from "@/services/sys/LoginController";


export default () => {
  const {token} = theme.useToken();
  const [verity, setVerity] = useState<boolean>(false);
  const {initialState, setInitialState} = useModel('@@initialState');

  let intl = useIntl();
  return (
    <ProConfigProvider hashed={false} >
      <section style={{backgroundImage: "https://gw.alipayobjects.com/zos/rmsportal/TVYTbAXWheQpRcWDaDMu.svg"}}>
        <Header style={{
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: token.colorBgContainer,
        }}> <SelectLang key="SelectLang"/></Header>

        <LoginForm
          logo="https://github.githubassets.com/favicons/favicon.png"
          title="Github"
          subTitle="全球最大的代码托管平台"
          onFinish={async (values) => {
            if (verity) {
              // 登录
              let {data, message: msg} = await login(values);
              localStorage.setItem('token', data.token);
              localStorage.setItem('refreshToken', data.refreshToken)
              message.success(msg)
             if (initialState&&initialState.fetchUserInfo) {
               const currentUser = await initialState.fetchUserInfo();
               setInitialState({
                 ...initialState,
                 currentUser: currentUser,
               })
             }
              setTimeout(() => history.push('/'), 500)
              return true
            } else {
              // 验证账号密码
              let {data, message: msg} = await verify(values);
              message.success(msg)
              setVerity(data as boolean)
            }

          }}
        >
          {!verity && (
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
                      if (value && value.length < 6 || value.length > 20) {
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
          {verity && (
            <>
              <ProFormText
                fieldProps={{
                  size: 'large',
                  prefix: <MobileOutlined className={'prefixIcon'}/>,
                }}
                name="email"
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
          <div
            style={{
              marginBlockEnd: 24,
            }}
          >
            <a
              style={{
                float: 'right',
              }}
            >
              忘记密码
            </a>
          </div>
        </LoginForm>
        <Footer/>
      </section>
    </ProConfigProvider>
  );
};
