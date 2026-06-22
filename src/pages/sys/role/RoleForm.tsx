import React from "react";
import DrawerForm from "@/components/DrawerForm";
import {request, useIntl} from "@umijs/max";
import {Form} from "antd";
import {ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {addRoleInfo, getRoleInfo, updateRoleInfo} from "@/services/sys/RoleController";
import {RoleSearchParams} from "@/services/entity/Sys";

const RoleForm = (props: {
  id: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void
}) => {
  const {id, open, setOpen, onSuccess} = props
  const [form] = Form.useForm();
  const intl = useIntl()
  return (
    <DrawerForm
      request={async (params:RoleSearchParams) =>  getRoleInfo(params) }
      id={id}
      open={open}
      setOpen={setOpen}
      onSuccess={async (values: any) => {
        if (id) {
          await updateRoleInfo(values);
        } else {
          await addRoleInfo(values);
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
      <ProFormText
        name="name"
        label={intl.formatMessage({id: 'pages.common.name'})}
        rules={[{required: true}]}
      />
      <ProFormText
        name="sortNum"
        label={intl.formatMessage({id: 'pages.common.sort.number'})}
        rules={[{required: true}]}
      />
      <ProFormTextArea
        name="description"
        label={intl.formatMessage({id: 'pages.common.description'})}
        fieldProps={{
          maxLength: 1024,
          showCount: true
        }}
      />
    </DrawerForm>
  )

}
export default RoleForm
