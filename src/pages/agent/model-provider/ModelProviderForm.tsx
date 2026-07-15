import DrawerForm from '@/components/DrawerForm'
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import {Form} from 'antd'
import {useEffect, useState} from 'react'
import {
  addModelProviderInfo,
  getModelProviderInfo,
  updateModelProviderInfo,
} from '@/services/agent/ModelProviderController'
import {Option} from '@/services/entity/Common'
import {getOptionList} from '@/services/sys/DictController'

const ModelProviderForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const {id, open, setOpen, onSuccess} = props
  const [form] = Form.useForm()
  const supplierName = Form.useWatch('name', form)
  const [modelOptions, setModelOptions] = useState<Option[]>([])
  const [modelLoading, setModelLoading] = useState(false)

  useEffect(() => {
    if (supplierName) {
      setModelLoading(true)
      getOptionList(`Model_Provider_Name_${supplierName}`)
        .then(setModelOptions)
        .finally(() => setModelLoading(false))
    } else {
      setModelOptions([])
    }
  }, [supplierName])

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      request={async (params) => {
        const res = await getModelProviderInfo(params)
        return {
          ...res,
          data: {
            ...res.data,
            apiKey: undefined,
          },
        }
      }}
      onSuccess={async (values) => {
        if (id) {
          await updateModelProviderInfo(values)
        } else {
          await addModelProviderInfo(values)
        }
        onSuccess()
        return true
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormSelect
        name="name"
        label="供应商名称"
        request={async () => getOptionList('Model_Provider_Name')}
        rules={[{required: true}]}
        fieldProps={{
          onChange: () => {
            form.setFieldsValue({defaultModel: undefined})
          },
        }}
      />
      <ProFormSelect
        name="type"
        label="供应商类型"
        request={async () => getOptionList('Model_Provider_Type')}
        rules={[{required: true}]}
      />
      <ProFormText
        name="apiBaseUrl"
        label="API 基础地址"
        rules={[{required: true}]}
      />
      <ProFormText.Password
        name="apiKey"
        label="API Key"
        required={!id}
        rules={[{required: !id}]}
        fieldProps={{autoComplete: 'new-password'}}
        extra={id ? '留空表示不修改原 API Key' : undefined}
      />
      <ProFormSelect
        name="defaultModel"
        label="默认模型"
        options={modelOptions}
        rules={[{required: true}]}
        fieldProps={{
          disabled: !supplierName,
          loading: modelLoading,
          placeholder: supplierName ? '请选择模型' : '请先选择供应商名称',
        }}
      />
      <ProFormSelect
        name="status"
        label="状态"
        request={async () => getOptionList('Agent_Status')}
        rules={[{required: true}]}
      />
      <ProFormDigit name="sort" label="排序" min={0} fieldProps={{precision: 0}} />
      <ProFormTextArea name="remark" label="备注" />
    </DrawerForm>
  )
}

export default ModelProviderForm
