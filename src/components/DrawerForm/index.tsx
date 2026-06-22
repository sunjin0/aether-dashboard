import {
  DrawerForm,
} from '@ant-design/pro-components';
import React, {useEffect, useState} from "react";
import {Props} from "@/components";
import {Button} from "antd";
import {useIntl} from "@umijs/max";


export default (props: Props) => {
  const {id, onSuccess, open, setOpen, children, form, request,readonly} = props;
  const [loading, setLoading] = useState(false);
  const intl = useIntl()
  return (
    <DrawerForm
      params={id ? id : undefined}
      request={async (params: any) => {
        if (!params)
          return {
            data: {},
            success: true,
            code: 200
          };
        const res = await request(params);
        form.setFieldsValue(res.data)
        return res
      }}
      loading={loading}
      open={open}
      readonly={readonly}
      onOpenChange={(open)=>{
        if (setOpen) {
          setOpen(open)
        }
      }}
      form={form}
      autoFocusFirstInput
      drawerProps={{
        destroyOnClose: true,
      }}
      submitter={{
        render: (props, dom) => {
          if (!readonly) {
            return dom
          }
          return [
            //关闭
            <Button
              key="cancel"
                    onClick={() => {
              if (setOpen) {
                setOpen(false)
              }
            }}>
              {intl.formatMessage({id: 'pages.common.close'})}
            </Button>
          ]
        }

      }}
      onFinish={async (values) => {
        try {
          setLoading(true)
          return onSuccess(values)
        } finally {
          setLoading(false)
        }
      }}
    >
      {children}
    </DrawerForm>
  );
};
