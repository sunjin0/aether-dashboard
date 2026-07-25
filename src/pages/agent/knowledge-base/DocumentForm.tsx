import DrawerForm from '@/components/DrawerForm'
import { addDocument, getDocument, updateDocument } from '@/services/knowledge/DocumentController'
import { getKnowledgeBaseList } from '@/services/knowledge/KnowledgeBaseController'
import { ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import { Form } from 'antd'
import { useIntl } from '@umijs/max'

interface DocumentFormProps {
  id?: string;
  /** 从知识库页面进入时由外部预设；独立访问时由表单选择。 */
  knowledgeBaseId?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({
  id,
  knowledgeBaseId,
  open,
  setOpen,
  onSuccess,
}) => {
  const intl = useIntl()
  const format = (id: string) => intl.formatMessage({ id })
  const [form] = Form.useForm()

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      form={form}
      request={getDocument}
      onSuccess={async (values) => {
        // 独立访问文档管理时，使用表单中选择的知识库；从知识库页进入时优先使用预设值。
        const payload = { ...values, knowledgeBaseId: knowledgeBaseId || values.knowledgeBaseId }
        if (id) await updateDocument({ ...payload, id })
        else await addDocument(payload)
        onSuccess()
        return true
      }}
    >
      {!knowledgeBaseId && (
        <ProFormSelect
          name="knowledgeBaseId"
          label={format('pages.agent.knowledgeBase.name')}
          rules={[{ required: true, message: format('pages.agent.knowledgeBase.select') }]}
          request={async () => {
            const response = await getKnowledgeBaseList({ current: 1, pageSize: 1000 })
            return (response.data || [])
              .filter((item) => item.id)
              .map((item) => ({ label: item.name || item.id, value: item.id }))
          }}
        />
      )}
      <ProFormText
        name="title"
        label={format('pages.agent.knowledgeBase.documentTitle')}
        rules={[
          { required: true, message: format('pages.agent.knowledgeBase.enterDocumentTitle') },
        ]}
      />
      <ProFormTextArea
        name="content"
        label={format('pages.agent.knowledgeBase.documentContent')}
        rules={[
          { required: true, message: format('pages.agent.knowledgeBase.enterDocumentContent') },
        ]}
        fieldProps={{ rows: 14, maxLength: 100000, showCount: true }}
      />
      <ProFormText
        name="sourceUrl"
        label={format('pages.agent.knowledgeBase.sourceUrl')}
        rules={[{ type: 'url', message: format('pages.agent.knowledgeBase.enterValidUrl') }]}
      />
    </DrawerForm>
  )
}

export default DocumentForm
