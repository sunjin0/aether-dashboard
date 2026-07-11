import DrawerForm from '@/components/DrawerForm';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {Button, Col, Form, Input, Row, Select, Space, Typography} from 'antd';
import {MinusCircleOutlined, PlusOutlined} from '@ant-design/icons';
import {
  addAgentToolInfo,
  getAgentToolInfo,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';
import {getOptionList} from '@/services/sys/DictController';
import {Option} from '@/services/entity/Common';
import {useState, useEffect} from 'react';

const headerOptions = [
  {
    label: '通用请求头',
    options: [
      {label: 'Content-Type', value: 'Content-Type'},
      {label: 'Authorization', value: 'Authorization'},
      {label: 'Accept', value: 'Accept'},
      {label: 'User-Agent', value: 'User-Agent'},
      {label: 'Cache-Control', value: 'Cache-Control'},
    ],
  },
  {
    label: 'CORS 相关',
    options: [
      {label: 'Origin', value: 'Origin'},
      {label: 'Access-Control-Allow-Origin', value: 'Access-Control-Allow-Origin'},
    ],
  },
  {
    label: '自定义',
    options: [{label: 'X-Custom-Header', value: 'X-Custom-Header'}],
  },
];

const jsonpathExamples = [
  {label: '$.data', value: '$.data'},
  {label: '$.data.list[0].name', value: '$.data.list[0].name'},
  {label: '$.result.message', value: '$.result.message'},
  {label: '$.data.items', value: '$.data.items'},
];

const regexExamples = [
  {label: '"message":"([^"]+)"', value: '"message":"([^"]+)"'},
  {label: '"code":\\s*(\\d+)', value: '"code":\\s*(\\d+)'},
  {label: 'hello', value: 'hello'},
];

interface HeaderItem {
  name: string;
  value: string;
}

interface ParamItem {
  key: string;
  value: string;
}

const parseJsonToObject = (jsonStr: string): Record<string, unknown> => {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
};

const AgentToolForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const {id, open, setOpen, onSuccess} = props;
  const [form] = Form.useForm();
  const toolType = Form.useWatch('type', form);
  const [headers, setHeaders] = useState<HeaderItem[]>([{name: 'Content-Type', value: 'application/json'}]);
  const [params, setParams] = useState<ParamItem[]>([{key: '', value: ''}]);
  const [bodyMode, setBodyMode] = useState<'kv' | 'json'>('kv');
  const [jsonInput, setJsonInput] = useState('{\n  \n}');
  const [responseType, setResponseType] = useState<string>('empty');
  const [contentTypeOptions, setContentTypeOptions] = useState<Option[]>([]);
  const [responseTypeOptions, setResponseTypeOptions] = useState<Option[]>([]);

  useEffect(() => {
    getOptionList('Agent_Content_Type').then(setContentTypeOptions);
    getOptionList('Agent_Response_Type').then(setResponseTypeOptions);
  }, []);

  useEffect(() => {
    if (id && open) {
      getAgentToolInfo(id).then((res) => {
        if (res && res.data) {
          const toolData = res.data;
          if (toolData.httpHeaders) {
            const parsed = parseJsonToObject(toolData.httpHeaders);
            const headerList = Object.entries(parsed).map(([name, value]) => ({
              name,
              value: String(value),
            }));
            if (headerList.length > 0) {
              setHeaders(headerList);
            }
          }
          if (toolData.httpBodyTemplate) {
            try {
              const parsed = JSON.parse(toolData.httpBodyTemplate);
              const paramList = Object.entries(parsed).map(([key, value]) => {
                const strValue = String(value);
                const match = strValue.match(/^\$\{(.+)\}$/);
                return {
                  key,
                  value: match ? match[1] : strValue,
                };
              });
              if (paramList.length > 0) {
                setParams(paramList);
                setBodyMode('kv');
              }
            } catch {
              setJsonInput(toolData.httpBodyTemplate);
              setBodyMode('json');
            }
          }
          if (toolData.responseExtractRule) {
            if (toolData.responseExtractRule.startsWith('$')) {
              setResponseType('jsonpath');
            } else if (toolData.responseExtractRule) {
              setResponseType('regex');
            }
          }
        }
      });
    }
  }, [id, open]);

  const generateHeadersJson = (): string => {
    const obj: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.name) {
        obj[h.name] = h.value;
      }
    });
    return JSON.stringify(obj, null, 2);
  };

  const generateBodyJson = (): string => {
    if (bodyMode === 'json') {
      return jsonInput;
    }
    const obj: Record<string, string> = {};
    params.forEach((p) => {
      if (p.key) {
        obj[p.key] = `\${${p.key}}`;
      }
    });
    return JSON.stringify(obj, null, 2);
  };

  const handleHeadersChange = (newHeaders: HeaderItem[]) => {
    setHeaders(newHeaders);
    const obj: Record<string, string> = {};
    newHeaders.forEach((h) => {
      if (h.name) {
        obj[h.name] = h.value;
      }
    });
    form.setFieldsValue({httpHeaders: JSON.stringify(obj, null, 2)});
  };

  const handleHeaderNameChange = (index: number, name: string) => {
    const newHeaders = [...headers];
    newHeaders[index].name = name;
    if (name === 'Content-Type' && !newHeaders[index].value) {
      newHeaders[index].value = 'application/json';
    }
    handleHeadersChange(newHeaders);
  };

  const handleHeaderValueChange = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index].value = value;
    handleHeadersChange(newHeaders);
  };

  const addHeader = () => {
    handleHeadersChange([...headers, {name: '', value: ''}]);
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    handleHeadersChange(newHeaders.length > 0 ? newHeaders : [{name: '', value: ''}]);
  };

  const handleParamsChange = (newParams: ParamItem[]) => {
    setParams(newParams);
    if (bodyMode === 'kv') {
      const obj: Record<string, string> = {};
      newParams.forEach((p) => {
        if (p.key) {
          obj[p.key] = `\${${p.key}}`;
        }
      });
      form.setFieldsValue({httpBodyTemplate: JSON.stringify(obj, null, 2)});
    }
  };

  const addParam = () => {
    handleParamsChange([...params, {key: '', value: ''}]);
  };

  const removeParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    handleParamsChange(newParams.length > 0 ? newParams : [{key: '', value: ''}]);
  };

  const handleJsonInputChange = (value: string) => {
    setJsonInput(value);
    form.setFieldsValue({httpBodyTemplate: value});
  };

  const handleResponseTypeChange = (value: string) => {
    setResponseType(value);
    if (value === 'empty') {
      form.setFieldsValue({responseExtractRule: ''});
    } else if (value === 'jsonpath') {
      form.setFieldsValue({responseExtractRule: '$.data'});
    } else if (value === 'regex') {
      form.setFieldsValue({responseExtractRule: '"message":"([^"]+)"'});
    }
  };

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
      <ProFormTextArea name="description" label="描述" rules={[{required: true}]} />
      <ProFormSelect
        name="type"
        label="工具类型"
        request={async () => getOptionList('Agent_Tool_Type')}
        rules={[{required: true}]}
        initialValue="http"
      />
      <ProFormSelect
        name="httpMethod"
        label="HTTP 方法"
        request={async () => getOptionList('Agent_Http_Method')}
        rules={[{required: true}]}
      />
      <ProFormText
        name="httpUrl"
        label="HTTP URL"
        rules={toolType === 'http' ? [{required: true, message: '请输入 HTTP URL'}] : []}
      />
      <Form.Item label="HTTP Headers">
        <Typography.Text type="secondary" style={{display: 'block', marginBottom: 8}}>
          配置 HTTP 请求头，支持 ${'{token}'} 等占位符
        </Typography.Text>
        {headers.map((header, index) => (
          <Row key={index} gutter={8} style={{marginBottom: 8}}>
            <Col span={10}>
              <Select
                showSearch
                placeholder="选择请求头"
                value={header.name || undefined}
                onChange={(value) => handleHeaderNameChange(index, value)}
                options={headerOptions}
                style={{width: '100%'}}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
            </Col>
            <Col span={12}>
              {header.name === 'Content-Type' ? (
                <Select
                  placeholder="选择值"
                  value={header.value || undefined}
                  onChange={(value) => handleHeaderValueChange(index, value)}
                  options={contentTypeOptions}
                  style={{width: '100%'}}
                />
              ) : (
                <Input
                  placeholder="值（支持 ${'{paramName}'} 占位符）"
                  value={header.value}
                  onChange={(e) => handleHeaderValueChange(index, e.target.value)}
                />
              )}
            </Col>
            <Col span={2}>
              <Button
                type="link"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => removeHeader(index)}
                disabled={headers.length === 1}
              />
            </Col>
          </Row>
        ))}
        <Button type="dashed" onClick={addHeader} block icon={<PlusOutlined />}>
          添加请求头
        </Button>
      </Form.Item>
      <Form.Item name="httpHeaders" hidden>
        <Input />
      </Form.Item>

      <Form.Item label="请求体模板">
        <div style={{marginBottom: 8}}>
          <Space>
            <Button
              type={bodyMode === 'kv' ? 'primary' : 'default'}
              size="small"
              onClick={() => setBodyMode('kv')}
            >
              键值对编辑
            </Button>
            <Button
              type={bodyMode === 'json' ? 'primary' : 'default'}
              size="small"
              onClick={() => setBodyMode('json')}
            >
              JSON 编辑
            </Button>
          </Space>
        </div>
        {bodyMode === 'kv' ? (
          <>
            <Typography.Text type="secondary" style={{display: 'block', marginBottom: 8}}>
              添加参数后自动生成带 ${'{paramName}'} 占位符的 JSON 模板
            </Typography.Text>
            {params.map((param, index) => (
              <Row key={index} gutter={8} style={{marginBottom: 8}}>
                <Col span={10}>
                  <Input
                    placeholder="参数名"
                    value={param.key}
                    onChange={(e) => {
                      const newParams = [...params];
                      newParams[index].key = e.target.value;
                      handleParamsChange(newParams);
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Input
                    placeholder="值（支持嵌套 JSON）"
                    value={param.value}
                    onChange={(e) => {
                      const newParams = [...params];
                      newParams[index].value = e.target.value;
                      handleParamsChange(newParams);
                    }}
                  />
                </Col>
                <Col span={2}>
                  <Button
                    type="link"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => removeParam(index)}
                    disabled={params.length === 1}
                  />
                </Col>
              </Row>
            ))}
            <Button type="dashed" onClick={addParam} block icon={<PlusOutlined />}>
              添加参数
            </Button>
          </>
        ) : (
          <ProFormTextArea
            name="httpBodyTemplate"
            label=""
            fieldProps={{
              rows: 6,
              placeholder: '请输入 JSON 模板',
              onChange: (e) => handleJsonInputChange(e.target.value),
            }}
          />
        )}
      </Form.Item>
      <Form.Item name="httpBodyTemplate" hidden>
        <Input />
      </Form.Item>

      <Form.Item label="响应提取规则">
        <Space direction="vertical" style={{width: '100%'}}>
          <Select
            placeholder="选择提取类型"
            value={responseType || undefined}
            onChange={handleResponseTypeChange}
            options={responseTypeOptions}
            style={{width: '100%'}}
          />
          {responseType === 'jsonpath' && (
            <div>
              <Typography.Text type="secondary" style={{display: 'block', marginBottom: 8}}>
                JSONPath 示例（$ 开头）：
              </Typography.Text>
              <Space wrap>
                {jsonpathExamples.map((item) => (
                  <Button
                    key={item.value}
                    size="small"
                    onClick={() => form.setFieldsValue({responseExtractRule: item.value})}
                  >
                    {item.label}
                  </Button>
                ))}
              </Space>
            </div>
          )}
          {responseType === 'regex' && (
            <div>
              <Typography.Text type="secondary" style={{display: 'block', marginBottom: 8}}>
                正则示例（使用括号分组提取）：
              </Typography.Text>
              <Space wrap>
                {regexExamples.map((item) => (
                  <Button
                    key={item.value}
                    size="small"
                    onClick={() => form.setFieldsValue({responseExtractRule: item.value})}
                  >
                    {item.label}
                  </Button>
                ))}
              </Space>
            </div>
          )}
          {responseType && responseType !== 'empty' && (
            <ProFormTextArea
              name="responseExtractRule"
              label=""
              fieldProps={{
                placeholder:
                  responseType === 'jsonpath'
                    ? '例如: $.data.list[0].name'
                    : '例如: "message":"([^"]+)"',
              }}
            />
          )}
          {responseType === 'empty' && (
            <Typography.Text type="secondary">不填则返回完整响应</Typography.Text>
          )}
        </Space>
      </Form.Item>

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
        request={async () => getOptionList('Agent_Status')}
        rules={[{required: true}]}
        initialValue={1}
      />
    </DrawerForm>
  );
};

export default AgentToolForm;
