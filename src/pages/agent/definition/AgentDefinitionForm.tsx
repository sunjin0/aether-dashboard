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
import { useIntl } from '@umijs/max';

const AgentDefinitionForm = (props: {
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
      <ProFormText
        name="name"
        label={format('pages.agent.definition.name')}
        rules={[{ required: true }]}
      />
      <ProFormText
        name="code"
        label={format('pages.agent.definition.code')}
        rules={[{ required: true }]}
      />
      <ProFormTextArea name="description" label={format('pages.common.description')} />
      <Form.Item name="systemPrompt" label={format('pages.agent.definition.systemPrompt')}>
        <SystemPromptEditor
          agentName={form.getFieldValue('name')}
          placeholder={format('pages.agent.definition.systemPromptPlaceholder')}
        />
      </Form.Item>
      <ProFormSelect
        name="modelProviderId"
        label={format('pages.agent.definition.modelProvider')}
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
      <ProFormText
        name="model"
        label={format('pages.agent.definition.model')}
        rules={[{ required: true }]}
        disabled
      />
      <ProFormDigit
        name="temperature"
        label={format('pages.agent.definition.temperature')}
        min={0}
        max={2}
      />
      <ProFormDigit
        name="maxTokens"
        label={format('pages.agent.definition.maxTokens')}
        min={1}
        fieldProps={{ precision: 0 }}
      />
      <ProFormSelect
        name="status"
        label={format('pages.common.status')}
        request={async () => getOptionList('Agent_Definition_Status')}
        rules={[{ required: true }]}
      />
      <ProFormDigit
        name="maxToolRounds"
        label={format('pages.agent.definition.maxToolRounds')}
        min={0}
        fieldProps={{ precision: 0 }}
      />
      <ProFormSelect
        name="accessType"
        label={format('pages.agent.definition.accessType')}
        request={async () => getOptionList('Agent_Access_Type')}
      />

      <ProFormSwitch
        name="defaultThinking"
        label={format('pages.agent.definition.defaultThinking')}
      />
      <ProFormDependency name={['defaultThinking']}>
        {(values) => {
          if (!values.defaultThinking) {
            return null;
          }
          return (
            <ProFormSelect
              name="defaultReasoningEffort"
              label={format('pages.agent.definition.defaultReasoningEffort')}
              request={async () => getOptionList('Agent_Reasoning_Effort')}
              placeholder={format('pages.agent.definition.selectDefaultReasoningEffort')}
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
              label={format('pages.agent.tool.bind')}
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
              placeholder={format('pages.agent.definition.selectToolsToBind')}
            />
          );
        }}
      </ProFormDependency>
    </DrawerForm>
  );
};

export default AgentDefinitionForm;
