import DrawerForm from '@/components/DrawerForm'
import { request, useIntl } from '@umijs/max'
import { Form } from 'antd'
import { ProCard, ProFormDigit, ProFormSelect, ProFormText } from '@ant-design/pro-components'
import {
  addAdminInfo,
  getAdminInfo,
  getRoleOptions,
  updateAdminInfo,
} from '@/services/sys/AdminController'
import { getOptionList } from '@/services/sys/DictController'
import ProFormFileUpload from '@/components/ProFormFileUpload'

const AdminForm = (props: {
  id: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props
  const intl = useIntl()
  const [form] = Form.useForm()
  return (
    <DrawerForm
      open={open}
      setOpen={setOpen}
      id={id}
      request={async (params) => getAdminInfo(params)}
      onSuccess={async (values) => {
        if (!values.avatar) {
          values.avatar =
            'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png'
        }
        if (id) {
          await updateAdminInfo(values)
        } else {
          await addAdminInfo(values)
        }
        onSuccess()
        return true
      }}
      form={form}
    >
      <ProFormText name={'id'} hidden={true} />
      <ProFormSelect
        name={'roleIds'}
        label={intl.formatMessage({ id: 'pages.sys.role.name' })}
        rules={[{ required: true }]}
        request={async () => getRoleOptions()}
        fieldProps={{
          mode: 'multiple',
        }}
      />
      <ProFormText
        name={'username'}
        label={intl.formatMessage({ id: 'pages.common.name' })}
        rules={[{ required: true }]}
      />
      <ProFormSelect
        name={'sex'}
        label={intl.formatMessage({ id: 'pages.common.gender' })}
        rules={[{ required: true }]}
        request={async () => getOptionList('Gender_Type', false)}
      />
      <ProFormFileUpload
        name={'avatar'}
        label={intl.formatMessage({ id: 'pages.common.avatar' })}
        rules={[{ required: true }]}
        mode="card"
        accept="image/png,image/jpeg,image/webp,image/gif"
        allowedExtensions={['png', 'jpg', 'jpeg', 'webp', 'gif']}
      />
      <ProFormSelect
        name={'type'}
        label={intl.formatMessage({ id: 'pages.common.type' })}
        rules={[{ required: true }]}
        request={async () => getOptionList('System_Role', false)}
      />
      <ProFormText
        name={'email'}
        label={intl.formatMessage({ id: 'pages.common.email' })}
        rules={[{ required: true }]}
      />
      <ProFormText
        name={'phone'}
        label={intl.formatMessage({ id: 'pages.common.phone' })}
        rules={[{ required: true }]}
      />
      <ProCard title="邮箱发送配置" bordered collapsible defaultCollapsed={!!id}>
        <ProFormSelect
          name={'smtpProvider'}
          label="邮件服务商"
          placeholder="选择后自动填充 SMTP 配置"
          options={[
            { label: 'QQ 邮箱', value: 'qq' },
            { label: '网易 163 邮箱', value: '163' },
            { label: '网易 126 邮箱', value: '126' },
            { label: 'Gmail', value: 'gmail' },
            { label: 'Microsoft Outlook / 365', value: 'outlook' },
            { label: 'iCloud Mail', value: 'icloud' },
            { label: '自定义', value: 'custom' },
          ]}
          fieldProps={{
            onChange: (provider: string) => {
              const presets: Record<string, { smtpHost: string; smtpPort: number; smtpSecurity: 'ssl' | 'starttls' }> = {
                qq: { smtpHost: 'smtp.qq.com', smtpPort: 465, smtpSecurity: 'ssl' },
                '163': { smtpHost: 'smtp.163.com', smtpPort: 465, smtpSecurity: 'ssl' },
                '126': { smtpHost: 'smtp.126.com', smtpPort: 465, smtpSecurity: 'ssl' },
                gmail: { smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecurity: 'starttls' },
                outlook: { smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecurity: 'starttls' },
                icloud: { smtpHost: 'smtp.mail.me.com', smtpPort: 587, smtpSecurity: 'starttls' },
              }
              const preset = presets[provider]
              if (preset) form.setFieldsValue(preset)
            },
          }}
        />
        <ProFormText name={'smtpHost'} label="SMTP 主机" placeholder="smtp.example.com" rules={[{ max: 255 }]} />
        <ProFormDigit name={'smtpPort'} label="SMTP 端口" min={1} max={65535} />
        <ProFormSelect
          name={'smtpSecurity'}
          label="SMTP 加密方式"
          options={[
            { label: 'SSL/TLS', value: 'ssl' },
            { label: 'STARTTLS', value: 'starttls' },
          ]}
        />
        <ProFormText.Password
          name={'smtpAuthorizationCode'}
          label="SMTP 授权码"
          placeholder={id ? '留空则保留原授权码' : '邮箱服务商提供的授权码'}
          rules={[{ max: 512 }]}
        />
      </ProCard>
      <ProFormText.Password
        required={!id}
        name={'password'}
        label={intl.formatMessage({ id: 'pages.common.password' })}
        rules={[{ required: !id, min: 6, max: 10 }]}
      />
    </DrawerForm>
  )
}
export default AdminForm
