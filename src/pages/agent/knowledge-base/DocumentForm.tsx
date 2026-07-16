import DrawerForm from '@/components/DrawerForm';
import { addDocument, getDocument, updateDocument } from '@/services/knowledge/DocumentController';
import { ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { Form } from 'antd';

interface DocumentFormProps {
  id?: string;
  knowledgeBaseId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({ id, knowledgeBaseId, open, setOpen, onSuccess }) => {
  const [form] = Form.useForm();

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      form={form}
      request={getDocument}
      onSuccess={async (values) => {
        const payload = { ...values, knowledgeBaseId };
        if (id) await updateDocument({ ...payload, id });
        else await addDocument(payload);
        onSuccess();
        return true;
      }}
    >
      <ProFormText name="title" label="文档标题" rules={[{ required: true, message: '请输入文档标题' }]} />
      <ProFormTextArea
        name="content"
        label="文档内容（纯文本或 Markdown）"
        rules={[{ required: true, message: '请输入文档内容' }]}
        fieldProps={{ rows: 14, maxLength: 100000, showCount: true }}
      />
      <ProFormText name="sourceUrl" label="来源 URL" rules={[{ type: 'url', message: '请输入有效 URL' }]} />
    </DrawerForm>
  );
};

export default DocumentForm;
