import DrawerForm from '@/components/DrawerForm';
import {
  addAdminPreference,
  getAdminPreference,
  updateAdminPreference,
} from '@/services/sys/AdminPreferenceController';
import { ProFormDigit, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { Form } from 'antd';
import { getOptionList } from '@/services/sys/DictController';

interface PreferenceFormProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const PreferenceForm: React.FC<PreferenceFormProps> = ({ id, open, setOpen, onSuccess }) => {
  const [form] = Form.useForm();

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      form={form}
      request={getAdminPreference}
      onSuccess={async (values) => {
        const payload = { ...values, status: Number(values.status) };
        if (id) await updateAdminPreference({ ...payload, id });
        else await addAdminPreference(payload);
        onSuccess();
        return true;
      }}
    >
      <ProFormSelect
        name="category"
        label="分类"
        rules={[{ required: true, message: '请选择分类' }]}
        request={() => getOptionList('Admin_Preference_Category')}
        fieldProps={{ showSearch: true }}
      />
      <ProFormTextArea
        name="content"
        label="偏好内容"
        rules={[{ required: true, message: '请输入偏好内容' }]}
        fieldProps={{ rows: 5, maxLength: 2000, showCount: true }}
      />
      <ProFormDigit
        name="confidence"
        label="置信度"
        initialValue={1}
        min={0}
        max={1}
        fieldProps={{ precision: 2 }}
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
  );
};

export default PreferenceForm;
