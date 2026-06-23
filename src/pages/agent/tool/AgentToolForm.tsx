import DrawerForm from '@/components/DrawerForm';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {Form} from 'antd';
import {
  addAgentToolInfo,
  getAgentToolInfo,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';

const typeOptions = [{label: 'HTTP', value: 'http'}];

const httpMethodOptions = [
  {label: 'GET', value: 'GET'},
  {label: 'POST', value: 'POST'},
];

const statusOptions = [
  {label: '禁用', value: 0},
  {label: '启用', value: 1},
];

const AgentToolForm = (props: {
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
      request={async (params) => getAgentToolInfo(params)}
      onSuccess={async (values) => {
        if (id) {
          await updateAgentToolInfo(values);
        } else {
          await addAgentToolInfo(values);
        }
        onSuccess();
        return true;
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormText name="name" label="工具名称" rules={[{required: true}]} />
      <ProFormText name="code" label="工具编码" rules={[{required: true}]} />
      <ProFormTextArea name="description" label="描述" />
      <ProFormSelect
        name="type"
        label="工具类型"
        options={typeOptions}
        rules={[{required: true}]}
        initialValue="http"
      />
      <ProFormSelect name="httpMethod" label="HTTP 方法" options={httpMethodOptions} />
      <ProFormText name="httpUrl" label="HTTP URL" />
      <ProFormTextArea
        name="httpHeaders"
        label="HTTP Headers"
        fieldProps={{placeholder: '请输入 JSON 字符串模板'}}
      />
      <ProFormTextArea name="httpBodyTemplate" label="请求体模板" />
      <ProFormTextArea name="responseExtractRule" label="响应提取规则" />
      <ProFormDigit
        name="timeoutMs"
        label="超时时间(ms)"
        min={0}
        fieldProps={{precision: 0}}
      />
      <ProFormDigit
        name="cacheTtlSeconds"
        label="缓存 TTL(s)"
        min={0}
        fieldProps={{precision: 0}}
      />
      <ProFormSelect
        name="status"
        label="状态"
        options={statusOptions}
        rules={[{required: true}]}
        initialValue={1}
      />
    </DrawerForm>
  );
};

export default AgentToolForm;
