import DrawerForm from '@/components/DrawerForm';
import { addMcpServer, getMcpServer, updateMcpServer } from '@/services/agent/McpServerController';
import { getOptionList } from '@/services/sys/DictController';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Form } from 'antd';
import { useIntl } from '@umijs/max';

const McpServerForm = (props: {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props;
  const intl = useIntl();
  const [form] = Form.useForm();
  const authType = Form.useWatch('authType', form);
  const format = (key: string, values?: Record<string, string>) =>
    intl.formatMessage({ id: key }, values);
  const validateJson = async (_: unknown, value?: string) => {
    if (!value?.trim()) return Promise.resolve();
    try {
      JSON.parse(value);
      return Promise.resolve();
    } catch {
      return Promise.reject(
        new Error(
          format('pages.agent.tool.invalidJson', {
            label: format('pages.agent.mcpServer.requestHeaders'),
          }),
        ),
      );
    }
  };

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      request={getMcpServer}
      form={form}
      onSuccess={async (values) => {
        const payload = { ...values, status: Number(values.status) };
        if (id) await updateMcpServer(id, payload);
        else await addMcpServer(payload);
        onSuccess();
        return true;
      }}
    >
      <ProFormText name="id" hidden />
      <ProFormText
        name="name"
        label={format('pages.agent.mcpServer.name')}
        rules={[{ required: true }]}
      />
      <ProFormText
        name="code"
        label={format('pages.agent.mcpServer.code')}
        rules={[{ required: true }]}
      />
      <ProFormSelect
        name="transport"
        label={format('pages.agent.mcpServer.transport')}
        request={() => getOptionList('Agent_Mcp_Transport')}
        rules={[{ required: true }]}
      />
      <ProFormText
        name="baseUrl"
        label={format('pages.agent.mcpServer.baseUrl')}
        rules={[{ required: true }]}
      />
      <ProFormTextArea
        name="requestHeaders"
        label={format('pages.agent.mcpServer.requestHeaders')}
        initialValue="{}"
        fieldProps={{ rows: 5 }}
        rules={[{ validator: validateJson }]}
      />
      <ProFormSelect
        name="authType"
        label={format('pages.agent.mcpServer.authType')}
        request={() => getOptionList('Agent_Mcp_Auth_Type')}
        initialValue="none"
        rules={[{ required: true }]}
      />
      {authType !== 'none' && (
        <ProFormText.Password
          name="authToken"
          label={format('pages.agent.mcpServer.authToken')}
          fieldProps={{ autoComplete: 'new-password' }}
        />
      )}
      <ProFormDigit
        name="timeoutMs"
        label={format('pages.agent.tool.timeout')}
        min={1}
        initialValue={30000}
        fieldProps={{ precision: 0 }}
      />
      <ProFormSelect
        name="status"
        label={format('pages.common.status')}
        request={() => getOptionList('Agent_Status')}
        initialValue={1}
        rules={[{ required: true }]}
      />
      <ProFormTextArea name="remark" label={format('pages.common.remark')} />
    </DrawerForm>
  );
};

export default McpServerForm;
