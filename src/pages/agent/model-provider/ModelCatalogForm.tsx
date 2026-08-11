import DrawerForm from '@/components/DrawerForm'
import { ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { Form } from 'antd'
import { getModelCatalog, saveModelCatalog, updateModelCatalog } from '@/services/agent/ModelProviderController'
import { getModelProviderOptions } from '@/services/agent/ModelProviderController'
import { useIntl } from '@umijs/max'

const capabilities = ['CHAT', 'VIDEO', 'AUDIO', 'MULTIMODAL', 'EMBEDDING', 'RERANK']

export default function ModelCatalogForm(props: { id?: string; providerId?: string; open: boolean; setOpen: (value: boolean) => void; onSuccess: () => void }) {
  const { id, providerId, open, setOpen, onSuccess } = props
  const intl = useIntl()
  const [form] = Form.useForm()
  const text = (key: string) => intl.formatMessage({ id: key })

  return <DrawerForm id={id || ''} open={open} setOpen={setOpen} form={form}
    request={async (modelId) => { const result = await getModelCatalog(); return { ...result, data: result.data?.find((item) => item.id === modelId) } }}
    onSuccess={async (values) => { if (id) await updateModelCatalog(id, values); else await saveModelCatalog(values); onSuccess(); return true }}>
    {providerId ? <ProFormText name="providerId" hidden initialValue={providerId} /> : <ProFormSelect name="providerId" label={text('pages.agent.modelCatalog.provider')} rules={[{ required: true }]} request={() => getModelProviderOptions()} />}
    <ProFormText name="name" label={text('pages.agent.modelCatalog.name')} rules={[{ required: true }]} />
    <ProFormSelect name="capabilities" label={text('pages.agent.modelCatalog.capabilities')} mode="multiple" rules={[{ required: true }]} options={capabilities.map((value) => ({ label: text(`pages.agent.modelCatalog.capability.${value}`), value }))} transform={(value) => ({ capabilities: Array.isArray(value) ? value.join(',') : value })} convertValue={(value) => typeof value === 'string' ? value.split(',') : value} />
    <ProFormDigit name="contextWindow" label={text('pages.agent.modelCatalog.contextWindow')} min={1} />
    <ProFormText name="endpointOverride" label={text('pages.agent.modelCatalog.endpointOverride')} />
    <ProFormSelect name="status" label={text('pages.common.status')} initialValue={1} options={[{ label: text('pages.common.enabled'), value: 1 }, { label: text('pages.common.disabled'), value: 0 }]} />
    <ProFormTextArea name="remark" label={text('pages.common.remark')} />
  </DrawerForm>
}
