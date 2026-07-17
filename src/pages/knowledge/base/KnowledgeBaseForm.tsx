import DrawerForm from '@/components/DrawerForm'
import {
  addKnowledgeBase,
  getKnowledgeBase,
  updateKnowledgeBase,
} from '@/services/knowledge/KnowledgeBaseController'
import { ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { Form } from 'antd'
import { getEmbeddingProviderOptions } from '@/services/agent/ModelProviderController'

interface KnowledgeBaseFormProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const KnowledgeBaseForm: React.FC<KnowledgeBaseFormProps> = ({ id, open, setOpen, onSuccess }) => {
  const [form] = Form.useForm()

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      form={form}
      request={getKnowledgeBase}
      onSuccess={async (values) => {
        const payload = { ...values, status: Number(values.status) }
        if (id) await updateKnowledgeBase({ ...payload, id })
        else await addKnowledgeBase(payload)
        onSuccess()
        return true
      }}
    >
      <ProFormSelect
        name="scope"
        label="知识库范围"
        initialValue="PLATFORM"
        rules={[{ required: true }]}
        options={[
          { label: '平台级', value: 'PLATFORM' },
          { label: 'Agent 专属', value: 'AGENT' },
        ]}
      />
      <ProFormSelect
        name="embeddingProviderId"
        label="Embedding 供应商"
        required={true}
        rules={[{ required: true }]}
        request={async () => {
          const response = await getEmbeddingProviderOptions()
          return response.data || []
        }}
        fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
      />
      <ProFormText
        name="name"
        label="知识库名称"
        rules={[{ required: true, message: '请输入知识库名称' }]}
      />
      <ProFormTextArea
        name="description"
        label="描述"
        fieldProps={{ rows: 4, maxLength: 1000, showCount: true }}
      />
      <ProFormText name="ownerAdminId" label="归属后台用户 ID" />
      <ProFormSelect
        name="visibility"
        label="可见范围"
        initialValue="platform"
        options={[
          { label: '平台可见', value: 'platform' },
          { label: '仅本人', value: 'private' },
          { label: '共享', value: 'shared' },
        ]}
      />
      <ProFormTextArea
        name="retrievalConfig"
        label="检索配置（JSON）"
        fieldProps={{ rows: 4, placeholder: '{ }' }}
      />
      <ProFormSelect
        name="status"
        label="状态"
        initialValue={1}
        rules={[{ required: true }]}
        options={[
          { label: '启用', value: 1 },
          { label: '禁用', value: 0 },
        ]}
      />
    </DrawerForm>
  )
}

export default KnowledgeBaseForm
