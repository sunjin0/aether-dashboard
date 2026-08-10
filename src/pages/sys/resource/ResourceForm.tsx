import React, { useState } from 'react'
import DrawerForm from '@/components/DrawerForm'
import { useIntl } from '@umijs/max'
import { Form } from 'antd'
import {
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import { ProFormDependency } from '@ant-design/pro-form'
import {
  addResourceInfo,
  getResourceInfo,
  getResourceOptions,
  updateResourceInfo,
} from '@/services/sys/ResourceController'
import { ResourceSearchParams } from '@/services/entity/Sys'

const ResourceForm = (props: {
  id: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props
  const [form] = Form.useForm()
  const intl = useIntl()
  const [readOnly, setReadOnly] = useState(false)
  return (
    <DrawerForm
      readonly={readOnly}
      id={id}
      request={async (params: ResourceSearchParams) => {
        try {
          const res = await getResourceInfo(params)
          if (res.data?.type !== 'Resource_Type_Route') {
            setReadOnly(true)
          }
          return res
        } catch {
          return {
            data: {},
            success: false,
            code: 500,
          }
        }
      }}
      open={open}
      setOpen={(open) => {
        if (open!) {
          setReadOnly(false)
        }
        if (setOpen) {
          setOpen(open)
        }
      }}
      onSuccess={async (values: any) => {
        values.type = 'Resource_Type_Route'
        if (id) {
          await updateResourceInfo(values)
        } else {
          await addResourceInfo(values)
        }
        onSuccess()
        return true
      }}
      form={form}
    >
      <ProFormText name={'id'} hidden={true} />
      <ProFormSelect
        name="parentId"
        label={intl.formatMessage({ id: 'pages.sys.resource.menu.parent' })}
        showSearch={true}
        required={true}
        rules={[{ required: true }]}
        request={async () => {
          try {
            return await getResourceOptions()
          } catch {
            return []
          }
        }}
      />
      <ProFormText
        name="name"
        label={intl.formatMessage({ id: 'pages.common.name.en' })}
        rules={[{ required: true }]}
      />
      <ProFormText
        name="nameCn"
        label={intl.formatMessage({ id: 'pages.common.name.zh' })}
        rules={[{ required: true }]}
      />
      {/*<ProFormSelect*/}
      {/*  name="type"*/}
      {/*  label={intl.formatMessage({id: 'pages.common.type'})}*/}
      {/*  rules={[{required: true}]}*/}
      {/*  request={async () =>  getOptionList('Resource_Type')}*/}
      {/*/>*/}
      <ProFormRadio.Group
        tooltip={{ title: intl.formatMessage({ id: 'pages.sys.resource.leaf.tooltip' }) }}
        name="leaf"
        label={intl.formatMessage({ id: 'pages.sys.resource.leaf' })}
        rules={[{ required: true }]}
        options={[
          {
            label: intl.formatMessage({ id: 'pages.common.yes' }),
            value: true,
          },
          {
            label: intl.formatMessage({ id: 'pages.common.no' }),
            value: false,
          },
        ]}
      ></ProFormRadio.Group>
      <ProFormDependency name={['leaf']}>
        {({ leaf }) => {
          return (
            <ProFormText
              name="path"
              label={intl.formatMessage({ id: 'pages.sys.resource.menu.path' })}
              required={leaf}
              rules={[{ required: leaf }]}
            />
          )
        }}
      </ProFormDependency>
      <ProFormText name="icon" label={intl.formatMessage({ id: 'pages.sys.resource.menu.icon' })} />
      <ProFormText
        name="sortNum"
        label={intl.formatMessage({ id: 'pages.common.sort.number' })}
        rules={[{ required: true }]}
      />
      <ProFormTextArea
        name="description"
        label={intl.formatMessage({ id: 'pages.common.description' })}
      />
    </DrawerForm>
  )
}
export default ResourceForm
