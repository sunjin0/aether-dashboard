import React, {useRef, useState} from 'react';
import {PlusOutlined} from '@ant-design/icons';
import {ActionType, ProTable} from '@ant-design/pro-components';
import {Button, message, Modal, Popconfirm, Space, Form, Select, InputNumber} from 'antd';
import {
  getAgentBoundTools,
  bindToolToAgent,
  unbindToolFromAgent,
  updateToolPriority,
} from '@/services/agent/AgentDefinitionController';
import {getAgentToolList} from '@/services/agent/ToolController';
import {AgentToolBinding, BindToolRequest, AgentTool} from '@/services/entity/Agent';

const statusValueEnum = {
  0: {text: '禁用', status: 'Default'},
  1: {text: '启用', status: 'Success'},
};

interface AgentToolBindingProps {
  agentId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AgentToolBinding: React.FC<AgentToolBindingProps> = ({agentId, open, setOpen}) => {
  const actionRef = useRef<ActionType>();
  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [toolOptions, setToolOptions] = useState<{label: string; value: string}[]>([]);
  const [form] = Form.useForm();

  // 加载可用工具列表
  const loadToolOptions = async () => {
    const {data, code} = await getAgentToolList({
      current: 1,
      pageSize: 1000,
      status: 1,
    });
    
    if (code === 200 && data) {
      const options = data
        .filter((item) => item.id)
        .map((item) => ({
          label: `${item.name || item.id} (${item.code})`,
          value: item.id as string,
        }));
      setToolOptions(options);
    }
  };

  const handleOpenBindModal = () => {
    loadToolOptions();
    form.resetFields();
    setBindModalVisible(true);
  };

  const handleBindTool = async () => {
    try {
      const values = await form.validateFields();
      
      const params: BindToolRequest = {
        toolId: values.toolId,
        priority: values.priority || 0,
        status: 1,
      };

      const {code, message: msg} = await bindToolToAgent(agentId, params);
      if (code === 200) {
        message.success(msg || '绑定成功');
        setBindModalVisible(false);
        form.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(msg || '绑定失败');
      }
    } catch (error) {
      message.error('请检查表单填写');
    }
  };

  const handleUnbind = async (toolId: string) => {
    const {code, message: msg} = await unbindToolFromAgent(agentId, toolId);
    if (code === 200) {
      message.success(msg || '解绑成功');
      actionRef.current?.reload();
    } else {
      message.error(msg || '解绑失败');
    }
  };

  const handlePriorityChange = async (toolId: string, newPriority: number) => {
    const {code, message: msg} = await updateToolPriority(agentId, toolId, {
      priority: newPriority,
    });
    if (code === 200) {
      message.success(msg || '优先级调整成功');
      actionRef.current?.reload();
    } else {
      message.error(msg || '优先级调整失败');
    }
  };

  const columns: any[] = [
    {
      title: '工具名称',
      dataIndex: 'toolName',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '工具编码',
      dataIndex: 'toolCode',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      valueType: 'digit',
      width: 120,
      render: (text: number, record: AgentToolBinding) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            Modal.confirm({
              title: '调整优先级',
              content: (
                <div style={{marginTop: 16}}>
                  <span>新的优先级：</span>
                  <input
                    type="number"
                    defaultValue={record.priority}
                    style={{width: 80, marginLeft: 8}}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseInt((e.target as HTMLInputElement).value);
                        if (record.toolId) {
                          handlePriorityChange(record.toolId, value);
                          Modal.destroyAll();
                        }
                      }
                    }}
                  />
                </div>
              ),
              footer: null,
            });
          }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      width: 100,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentToolBinding) => [
        <Popconfirm
          key="unbind"
          title="确认解绑该工具？"
          onConfirm={() => record.toolId && handleUnbind(record.toolId)}
        >
          <Button type="link" danger size="small">
            解绑
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<AgentToolBinding>
        actionRef={actionRef}
        rowKey="toolId"
        request={async () => {
          if (!agentId) {
            return {data: [], total: 0, success: true};
          }
          const {data, code} = await getAgentBoundTools(agentId);
          return {data: data || [], total: (data || []).length, success: code === 200};
        }}
        toolBarRender={() => [
          <Button
            key="bind"
            icon={<PlusOutlined />}
            type="primary"
            onClick={handleOpenBindModal}
          >
            绑定工具
          </Button>,
        ]}
        columns={columns}
        search={false}
        pagination={false}
      />

      <Modal
        title="绑定工具"
        open={bindModalVisible}
        onOk={handleBindTool}
        onCancel={() => {
          setBindModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="toolId"
            label="选择工具"
            rules={[{required: true, message: '请选择工具'}]}
          >
            <Select
              placeholder="请选择要绑定的工具"
              options={toolOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            initialValue={0}
            rules={[{required: true, message: '请输入优先级'}]}
          >
            <InputNumber
              min={0}
              max={999}
              style={{width: '100%'}}
              placeholder="数字越小优先级越高"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AgentToolBinding;
