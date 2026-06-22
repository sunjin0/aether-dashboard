import React from "react";
import DrawerForm from "@/components/DrawerForm";
import {request, useIntl} from "@umijs/max";
import {Form} from "antd";
import {ProFormSelect, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {addDictInfo, getDictInfo, getSelectList, updateDictInfo} from "@/services/sys/DictController";

const DictForm = (props: {
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
      request={async (params) => getDictInfo(params)}
      id={id}
      open={open}
      setOpen={setOpen}
      onSuccess={async (values: any) => {
        if (id) {
          await updateDictInfo(values);
        } else {
          await addDictInfo(values);
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
        name="parent"
        label={intl.formatMessage({id: 'pages.sys.resource.menu.parent'})}
        showSearch={true}
        request={async () => getSelectList()}
      />
      <ProFormText
        name="code"
        disabled={id}
        label={intl.formatMessage({id: 'pages.common.code'})}
        rules={[{required: true}]}
      />
      <ProFormText
        name="name"
        label={intl.formatMessage({id: 'pages.common.name.en'})}
        rules={[{required: true}]}
      />
      <ProFormText
        name="nameCn"
        label={intl.formatMessage({id: 'pages.common.name.zh'})}
        rules={[{required: true}]}
      />
      <ProFormText
        name="val"
        label={intl.formatMessage({id: 'pages.common.value'})}
      />

      <ProFormText
        name="sortNum"
        label={intl.formatMessage({id: 'pages.common.sort.number'})}
        rules={[{required: true}]}
      />
      <ProFormTextArea
        name="remark"
        label={intl.formatMessage({id: 'pages.common.remark'})}
      />
    </DrawerForm>
  )

}
export default DictForm
