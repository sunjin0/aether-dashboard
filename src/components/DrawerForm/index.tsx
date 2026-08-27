import { DrawerForm as ProDrawerForm } from '@ant-design/pro-components';
import type { ComponentProps } from 'react';
import React, { useState } from 'react';
import { Button } from 'antd';
import { useIntl } from '@umijs/max';

type DrawerFormProps<T = any> = Omit<ComponentProps<typeof ProDrawerForm>, 'onFinish' | 'request'> & {
  id?: string;
  setOpen?: (open: boolean) => void;
  request?: (params: any) => Promise<any>;
  onFinish?: (values: T) => Promise<boolean>;
  onSuccess?: (values: T) => Promise<boolean>;
};

export default function DrawerForm<T = any>(props: DrawerFormProps<T>) {
  const { id, onSuccess, open, setOpen, children, form, request, readonly, drawerProps, ...rest } = props;
  const [loading, setLoading] = useState(false);
  const intl = useIntl();

  if (!onSuccess) {
    return <ProDrawerForm {...(props as any)} />;
  }

  return (
    <ProDrawerForm
      {...rest}
      params={id ? id : undefined}
      request={async (params: any) => {
        if (!params)
          return {
            data: {},
            success: true,
            code: 200,
          };
        const res = await request?.(params);
        form?.setFieldsValue(res?.data);
        return res;
      }}
      loading={loading}
      open={open}
      readonly={readonly}
      onOpenChange={(open) => {
        if (open && !id) {
          form?.resetFields();
        }
        if (!open) {
          // The form instance is owned by the caller, so destroying the drawer alone
          // does not clear values before the next create operation.
          form?.resetFields();
        }
        if (setOpen) {
          setOpen(open);
        }
      }}
      form={form}
      autoFocusFirstInput
      drawerProps={{
        destroyOnClose: true,
        ...drawerProps,
      }}
      submitter={{
        render: (props, dom) => {
          if (!readonly) {
            return dom;
          }
          return [
            //关闭
            <Button
              key="cancel"
              onClick={() => {
                if (setOpen) {
                  setOpen(false);
                }
              }}
            >
              {intl.formatMessage({ id: 'pages.common.close' })}
            </Button>,
          ];
        },
      }}
      onFinish={async (values) => {
        try {
          setLoading(true);
          return onSuccess(values as T);
        } finally {
          setLoading(false);
        }
      }}
    >
      {children}
    </ProDrawerForm>
  );
}
