import DrawerForm from '@/components/DrawerForm';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {Form} from 'antd';
import {
  addAgentDefinitionInfo,
  getAgentDefinitionInfo,
  updateAgentDefinitionInfo,
} from '@/services/agent/AgentDefinitionController';
import {getModelProviderList} from '@/services/agent/ModelProviderController';

const statusOptions = [
  {label: '草稿', value: 0},
  {label: '启用', value: 1},
  {label: '禁用', value: 2},
];

const accessTypeOptions = [
  {label: 'private', value: 'private'},
  {label: 'public', value: 'public'},
];

const AgentDefinitionForm = (props: {
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
      request={async (params) => getAgentDefinitionInfo(params)}
      onSuccess={async (values) => {
        if (id) {
          await updateAgentDefinitionInfo(values);
        } else {
          await addAgentDefinitionInfo(values);
        }
        onSuccess();
        return true;
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormText name="name" label="Agent 名称" rules={[{required: true}]} />
      <ProFormText name="code" label="Agent 编码" rules={[{required: true}]} />
      <ProFormTextArea name="description" label="描述" />
      <ProFormTextArea name="systemPrompt" label="系统提示词" />
      <ProFormSelect
        name="modelProviderId"
        label="模型供应商"
        showSearch={true}
        rules={[{required: true}]}
        request={async () => {
          const {data} = await getModelProviderList({
            current: 1,
            pageSize: 1000,
            status: 1,
          });

          return (data || [])
            .filter((item) => item.id)
            .map((item) => ({
              label: item.name || item.id,
              value: item.id as string,
            }));
        }}
      />
      <ProFormText name="model" label="模型名称" rules={[{required: true}]} />
      <ProFormDigit name="temperature" label="温度参数" min={0} max={2} />
      <ProFormDigit name="maxTokens" label="最大输出 token" min={1} fieldProps={{precision: 0}} />
      <ProFormSelect
        name="status"
        label="状态"
        options={statusOptions}
        rules={[{required: true}]}
      />
      <ProFormDigit name="maxToolRounds" label="最大工具轮次" min={0} fieldProps={{precision: 0}} />
      <ProFormSelect name="accessType" label="访问类型" options={accessTypeOptions} />
    </DrawerForm>
  );
};

export default AgentDefinitionForm;
