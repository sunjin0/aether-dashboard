import DrawerForm from '@/components/DrawerForm';
import SystemPromptEditor from '@/components/SystemPromptEditor';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormDependency,
} from '@ant-design/pro-components';
import { Form } from 'antd';
import {
  addAgentDefinitionInfo,
  getAgentDefinitionInfo,
  updateAgentDefinitionInfo,
  getModelProviderList,
} from '@/services/agent/AgentDefinitionController';
import { getModelProviderInfo } from '@/services/agent/ModelProviderController';
import { getAgentToolList } from '@/services/agent/ToolController';
import { getOptionList } from '@/services/sys/DictController';

const AgentDefinitionForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props;
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
      <ProFormText name="name" label="Agent 名称" rules={[{ required: true }]} />
      <ProFormText name="code" label="Agent 编码" rules={[{ required: true }]} />
      <ProFormTextArea name="description" label="描述" />
      <Form.Item name="systemPrompt" label="系统提示词">
        <SystemPromptEditor
          agentName={form.getFieldValue('name')}
          placeholder="输入系统提示词，或使用 AI 生成/模板..."
        />
      </Form.Item>
      <ProFormSelect
        name="modelProviderId"
        label="模型供应商"
        showSearch={true}
        rules={[{ required: true }]}
        request={async () => getModelProviderList()}
        fieldProps={{
          onChange: async (value: string) => {
            if (value) {
              const { data } = await getModelProviderInfo(value);
              if (data?.defaultModel) {
                form.setFieldsValue({ model: data.defaultModel });
              }
            }
          },
        }}
      />
      <ProFormText name="model" label="模型名称" rules={[{ required: true }]} disabled />
      <ProFormDigit name="temperature" label="温度参数" min={0} max={2} />
      <ProFormDigit name="maxTokens" label="最大输出 token" min={1} fieldProps={{ precision: 0 }} />
      <ProFormSelect
        name="status"
        label="状态"
        request={async () => getOptionList('Agent_Definition_Status')}
        rules={[{ required: true }]}
      />
      <ProFormDigit
        name="maxToolRounds"
        label="最大工具轮次"
        min={0}
        fieldProps={{ precision: 0 }}
      />
      <ProFormSelect
        name="accessType"
        label="访问类型"
        request={async () => getOptionList('Agent_Access_Type')}
      />

      <ProFormSwitch name="defaultThinking" label="默认启用深度思考" />
      <ProFormDependency name={['defaultThinking']}>
        {(values) => {
          if (!values.defaultThinking) {
            return null;
          }
          return (
            <ProFormSelect
              name="defaultReasoningEffort"
              label="默认推理力度"
              request={async () => getOptionList('Agent_Reasoning_Effort')}
              placeholder="选择默认推理力度"
            />
          );
        }}
      </ProFormDependency>

      <ProFormDependency name={['id']}>
        {(values) => {
          // 只有在编辑模式下才显示工具绑定选项
          if (!values.id) {
            return null;
          }

          return (
            <ProFormSelect
              name="toolIds"
              label="绑定工具"
              mode="multiple"
              showSearch
              request={async () => {
                const { data } = await getAgentToolList({
                  current: 1,
                  pageSize: 1000,
                  status: 1,
                });

                return (data || [])
                  .filter((item) => item.id)
                  .map((item) => ({
                    label: `${item.name || item.id} (${item.code}) / ${item.mcpToolName || '-'}`,
                    value: item.id as string,
                  }));
              }}
              placeholder="选择要绑定的工具（可多选）"
            />
          );
        }}
      </ProFormDependency>
    </DrawerForm>
  );
};

export default AgentDefinitionForm;
