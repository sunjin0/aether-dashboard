import DrawerForm from "@/components/DrawerForm";
import {request, useIntl} from "@umijs/max";
import {Form} from "antd";
import {ProFormSelect, ProFormText} from "@ant-design/pro-components";
import {addAdminInfo, getAdminInfo, getRoleOptions, updateAdminInfo} from "@/services/sys/AdminController";
import {getOptionList} from "@/services/sys/DictController";

const AdminForm = (props: {
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
      request={async (params) => getAdminInfo(params)}
      onSuccess={async (values) => {
        if (!values.avatar) {
          values.avatar = 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png'
        }
        if (id) {
          await updateAdminInfo(values)
        } else {
          await addAdminInfo(values)
        }
        onSuccess();
        return true;
      }}
      form={form}
    >
      <ProFormText
        name={'id'}
        hidden={true}
      />
      <ProFormSelect
        name={'roleIds'}
        label={intl.formatMessage({id: 'pages.sys.role.name'})}
        rules={[{required: true}]}
        request={async () => getRoleOptions()}
        fieldProps={{
          mode: 'multiple'
        }}
      />
      <ProFormText
        name={'username'}
        label={intl.formatMessage({id: 'pages.common.name'})}
        rules={[{required: true}]}
      />
      <ProFormSelect
        name={'sex'}
        label={intl.formatMessage({id: 'pages.common.gender'})}
        rules={[{required: true}]}
        request={async () => getOptionList("Gender_Type")}
      />
      <ProFormSelect
        name={'type'}
        label={intl.formatMessage({id: 'pages.common.type'})}
        rules={[{required: true}]}
        request={async () => getOptionList("System_Role")}
      />
      <ProFormText
        name={'email'}
        label={intl.formatMessage({id: 'pages.common.email'})}
        rules={[{required: true}]}
      />
      <ProFormText
        name={'phone'}
        label={intl.formatMessage({id: 'pages.common.phone'})}
        rules={[{required: true}]}
      />
      <ProFormText.Password
        required={!id}
        name={'password'}
        label={intl.formatMessage({id: 'pages.common.password'})}
        rules={[{required: !id, min: 6, max: 10}]}
      />
    </DrawerForm>);
};
export default AdminForm;
