import DrawerForm from '@/components/DrawerForm'
import {
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import { Form } from 'antd'
import {
  addModelProviderInfo,
  getModelProviderInfo,
  updateModelProviderInfo,
} from '@/services/agent/ModelProviderController'
import { getOptionList } from '@/services/sys/DictController'
import { useIntl } from '@umijs/max'

const ModelProviderForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: (providerId?: string) => void;
}) => {
  const { id, open, setOpen, onSuccess } = props
  const intl = useIntl()
  const format = (id: string) => intl.formatMessage({ id })
  const [form] = Form.useForm()

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
        let providerId = id
        if (id) {
          await updateModelProviderInfo(values)
        } else {
          const result = await addModelProviderInfo(values)
          providerId = result.data || undefined
        }
        onSuccess(providerId)
        return true
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormText
        name="name"
        label={format('pages.agent.modelProvider.name')}
        rules={[{ required: true }]}
      />
      <ProFormSelect
        name="type"
        label={format('pages.agent.modelProvider.type')}
        request={async () => getOptionList('Model_Provider_Type')}
        rules={[{ required: true }]}
      />
      <ProFormText
        name="apiBaseUrl"
        label={format('pages.agent.modelProvider.apiBaseUrl')}
        rules={[{ required: true }]}
      />
      <ProFormText.Password
        name="apiKey"
        label={format('pages.agent.modelProvider.apiKey')}
        required={!id}
        rules={[{ required: !id }]}
        fieldProps={{ autoComplete: 'new-password' }}
        extra={id ? format('pages.agent.modelProvider.apiKeyUnchanged') : undefined}
      />
      <ProFormSwitch
        name="compressionOutboundAllowed"
        label={format('pages.agent.modelProvider.compressionOutboundAllowed')}
        initialValue={true}
      />
      <ProFormText
        name="processingRegion"
        label={format('pages.agent.modelProvider.processingRegion')}
        placeholder="CN / US / EU / GLOBAL"
      />
      <ProFormTextArea
        name="dataProcessingPolicy"
        label={format('pages.agent.modelProvider.dataProcessingPolicy')}
        extra={format('pages.agent.modelProvider.dataProcessingPolicyHint')}
        fieldProps={{ maxLength: 500, showCount: true }}
      />
      <ProFormSelect
        name="status"
        label={format('pages.common.status')}
        request={async () => getOptionList('Agent_Status')}
        rules={[{ required: true }]}
      />
      <ProFormDigit
        name="sort"
        label={format('pages.common.sort.number')}
        min={0}
        fieldProps={{ precision: 0 }}
      />
      <ProFormTextArea name="remark" label={format('pages.common.remark')} />
    </DrawerForm>
  )
}

export default ModelProviderForm
