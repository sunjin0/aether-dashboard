import DrawerForm from '@/components/DrawerForm';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {Form} from 'antd';
import {
  addModelProviderInfo,
  getModelProviderInfo,
  updateModelProviderInfo,
} from '@/services/agent/ModelProviderController';

const typeOptions = [
  {label: 'OpenAI', value: 'openai'},
  {label: 'Local', value: 'local'},
];

const statusOptions = [
  {label: '禁用', value: 0},
  {label: '启用', value: 1},
];

const ModelProviderForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const {id, open, setOpen, onSuccess} = props;
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
        label="供应商名称"
        rules={[{required: true}]}
      />
      <ProFormSelect
        name="type"
        label="供应商类型"
        options={typeOptions}
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
      <ProFormText name="defaultModel" label="默认模型" />
      <ProFormSelect
        name="status"
        label="状态"
        options={statusOptions}
        rules={[{required: true}]}
      />
      <ProFormDigit name="sort" label="排序" min={0} fieldProps={{precision: 0}} />
      <ProFormTextArea name="remark" label="备注" />
    </DrawerForm>
  );
};

export default ModelProviderForm;
