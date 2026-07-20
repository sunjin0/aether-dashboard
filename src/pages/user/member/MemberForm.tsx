import DrawerForm from '@/components/DrawerForm'
import { useIntl } from '@umijs/max'
import { Form } from 'antd'
import { ProFormText } from '@ant-design/pro-components'
import { getMemberInfo, addMemberInfo, updateMemberInfo } from '@/services/user/MemberController'
/**
 *
 *@description 表单
 *@since 2025-07-23 10:46:11
 */
const MemberForm = (props: {
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
      request={async (params) => getMemberInfo(params)}
      form={form}
      onSuccess={async (values) => {
        if (id) {
          await updateMemberInfo(values)
        } else {
          await addMemberInfo(values)
        }
        onSuccess()
        return true
      }}
    >
      <ProFormText name={'id'} hidden={true} />
      <ProFormText
        name={'username'}
        label={intl.formatMessage({ id: 'pages.user.member.username' })}
        required
        rules={[
          {
            required: true,
          },
        ]}
      />
      <ProFormText
        name={'password'}
        label={intl.formatMessage({ id: 'pages.common.password' })}
        required
        rules={[
          {
            required: true,
          },
        ]}
      />
      <ProFormText
        name={'nickname'}
        label={intl.formatMessage({ id: 'pages.user.member.nickname' })}
        required
        rules={[
          {
            required: true,
          },
        ]}
      />
      <ProFormText
        name={'email'}
        label={intl.formatMessage({ id: 'pages.common.email' })}
        required
        rules={[
          {
            required: true,
          },
        ]}
      />
      <ProFormText
        name={'phone'}
        label={intl.formatMessage({ id: 'pages.common.phone' })}
        required
        rules={[
          {
            required: true,
          },
        ]}
      />
    </DrawerForm>
  )
}
export default MemberForm
