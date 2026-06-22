import DrawerForm from "@/components/DrawerForm";
import { useIntl} from "@umijs/max";
import {Form} from "antd";
import {ProFormText} from "@ant-design/pro-components";
import {getMemberInfo,addMemberInfo,updateMemberInfo} from "@/services/user/MemberController";
/**
 *
 *@description 表单
 *@since 2025-07-23 10:46:11
 */
const MemberForm = (props: {
  id: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void
}) => {
  const {id, open, setOpen, onSuccess} = props
  const intl = useIntl()
  const [form] = Form.useForm();
  return (
    <DrawerForm
      open={open}
      setOpen={setOpen}
      id={id}
      request={async (params) => getMemberInfo(params)}
      form={form}
      onSuccess={async (values) => {
        if(id){
          await updateMemberInfo(values)
        }else{
          await addMemberInfo(values)
        }
          onSuccess()
          return true
      }}
    >
      <ProFormText
        name={'id'}
        hidden={true}
      />
        <ProFormText
          name={'username'}
          label={'用户名'}
          required
          rules={[
            {
              required: true,
            }
          ]}
        />
        <ProFormText
          name={'password'}
          label={'密码'}
          required
          rules={[
            {
              required: true,
            }
          ]}
        />
        <ProFormText
          name={'nickname'}
          label={'昵称'}
          required
          rules={[
            {
              required: true,
            }
          ]}
        />
        <ProFormText
          name={'email'}
          label={'邮箱'}
          required
          rules={[
            {
              required: true,
            }
          ]}
        />
        <ProFormText
          name={'phone'}
          label={'手机号'}
          required
          rules={[
            {
              required: true,
            }
          ]}
        />
    </DrawerForm>);
};
export default MemberForm;
