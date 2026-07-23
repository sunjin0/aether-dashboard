import DrawerForm from '@/components/DrawerForm';
import {
  addAdminPreference,
  getAdminPreference,
  updateAdminPreference,
} from '@/services/sys/AdminPreferenceController';
import {
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Form } from 'antd';
import dayjs from 'dayjs';
import { getAdminList } from '@/services/sys/AdminController';
import { useIntl } from '@umijs/max';

interface PreferenceFormProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const PreferenceForm: React.FC<PreferenceFormProps> = ({ id, open, setOpen, onSuccess }) => {
  const intl = useIntl();
  const format = (id: string) => intl.formatMessage({ id });
  const [form] = Form.useForm();
  const categoryOptions = ['language', 'style', 'format', 'tech_stack', 'tool_strategy'].map(
    (value) => ({ label: format(`pages.sys.preference.category.${value}`), value }),
  );
  const scopeOptions = ['global', 'session', 'task_type'].map((value) => ({
    label: format(`pages.sys.preference.scope.${value}`),
    value,
  }));

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      form={form}
      request={getAdminPreference}
      onSuccess={async (values) => {
        const payload = {
          ...values,
          status: Number(values.status),
          priority: Number(values.priority),
          decayRate: Number(values.decayRate),
          expiresAt: values.expiresAt ? dayjs(values.expiresAt).valueOf() : null,
          scopeDetail: values.scope === 'task_type' ? values.scopeDetail : null,
        };
        if (id) await updateAdminPreference({ ...payload, id });
        else await addAdminPreference(payload);
        onSuccess();
        return true;
      }}
    >
      <ProFormSelect
        name="adminId"
        label={format('pages.sys.preference.admin')}
        rules={[{ required: true, message: format('pages.sys.preference.selectAdmin') }]}
        request={async () => {
          const res = await getAdminList({ current: 1, pageSize: 100 });
          if (res.code === 200 && res.data) {
            return res.data.map((a) => ({
              label: a.username || String(a.id),
              value: String(a.id),
            }));
          }
          return [];
        }}
        fieldProps={{ showSearch: true }}
      />

      <ProFormSelect
        name="category"
        label={format('pages.sys.preference.category')}
        rules={[{ required: true, message: format('pages.sys.preference.selectCategory') }]}
        options={categoryOptions}
        fieldProps={{ showSearch: true }}
      />
      <ProFormText
        name="keyName"
        label={format('pages.sys.preference.keyName')}
        rules={[{ required: true, message: format('pages.sys.preference.enterKeyName') }]}
        placeholder={format('pages.sys.preference.keyNamePlaceholder')}
      />
      <ProFormText
        name="value"
        label={format('pages.sys.preference.value')}
        rules={[{ required: true, message: format('pages.sys.preference.enterValue') }]}
        placeholder={format('pages.sys.preference.valuePlaceholder')}
      />
      <ProFormTextArea
        name="description"
        label={format('pages.common.description')}
        fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
      />
      <ProFormSelect
        name="scope"
        label={format('pages.sys.preference.scope')}
        initialValue="global"
        options={scopeOptions}
      />
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope !== cur.scope}>
        {({ getFieldValue }) =>
          getFieldValue('scope') === 'task_type' && (
            <ProFormText
              name="scopeDetail"
              label={format('pages.sys.preference.taskType')}
              placeholder={format('pages.sys.preference.taskTypePlaceholder')}
            />
          )
        }
      </Form.Item>
      <ProFormDigit
        name="priority"
        label={format('pages.sys.preference.priority')}
        initialValue={50}
        min={0}
        max={100}
        fieldProps={{ precision: 0 }}
      />
      <ProFormDatePicker
        name="expiresAt"
        label={format('pages.sys.preference.expiresAt')}
        placeholder={format('pages.sys.preference.expiresAtPlaceholder')}
        fieldProps={{
          showTime: true,
          format: 'YYYY-MM-DD HH:mm:ss',
        }}
      />
      <ProFormDigit
        name="decayRate"
        label={format('pages.sys.preference.decayRate')}
        initialValue={0}
        min={0}
        max={0.1}
        fieldProps={{ precision: 3, step: 0.001 }}
      />
      <ProFormSelect
        name="status"
        label={format('pages.common.status')}
        initialValue={1}
        rules={[{ required: true }]}
        options={[
          { label: format('pages.common.enabled'), value: 1 },
          { label: format('pages.common.disabled'), value: 0 },
        ]}
      />
    </DrawerForm>
  );
};

export default PreferenceForm;
