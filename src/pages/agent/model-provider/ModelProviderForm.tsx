import DrawerForm from '@/components/DrawerForm';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Form } from 'antd';
import {
  addModelProviderInfo,
  getModelProviderInfo,
  updateModelProviderInfo,
} from '@/services/agent/ModelProviderController';
import { getOptionList } from '@/services/sys/DictController';
import { useIntl } from '@umijs/max';

const ModelProviderForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props;
  const intl = useIntl();
  const format = (id: string) => intl.formatMessage({ id });
  const [form] = Form.useForm();

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      request={async (params) => {
        const res = await getModelProviderInfo(params);
        return {
          ...res,
          data: {
            ...res.data,
            apiKey: undefined,
          },
        };
      }}
      onSuccess={async (values) => {
        if (id) {
          await updateModelProviderInfo(values);
        } else {
          await addModelProviderInfo(values);
        }
        onSuccess();
        return true;
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
        label="API Key"
        required={!id}
        rules={[{ required: !id }]}
        fieldProps={{ autoComplete: 'new-password' }}
        extra={id ? format('pages.agent.modelProvider.apiKeyUnchanged') : undefined}
      />
      <ProFormText
        name="defaultModel"
        label={format('pages.agent.modelProvider.defaultModel')}
        rules={[{ required: true }]}
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
  );
};

export default ModelProviderForm;
