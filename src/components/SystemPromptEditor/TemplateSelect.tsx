import React, { useState } from 'react';
import { Dropdown, Modal, Input, Button, List, Tag, Space, Typography, message } from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  PromptTemplate,
  getAllTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
} from './promptTemplates';

const { Text } = Typography;

interface TemplateSelectProps {
  onSelect: (content: string) => void;
}

const TemplateSelect: React.FC<TemplateSelectProps> = ({ onSelect }) => {
  const [manageOpen, setManageOpen] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>(getAllTemplates());
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');

  const presetTemplates = templates.filter((t) => t.category === 'preset');
  const customTemplates = templates.filter((t) => t.category === 'custom');

  const handleSelect = (template: PromptTemplate) => {
    Modal.confirm({
      title: '使用模板',
      content: `确定要使用「${template.name}」模板吗？当前内容将被替换。`,
      onOk: () => {
        onSelect(template.content);
        message.success('已应用模板');
      },
    });
  };

  const handleAdd = () => {
    if (!newName.trim() || !newContent.trim()) {
      message.warning('请填写完整信息');
      return;
    }

    const template: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: newName,
      category: 'custom',
      content: newContent,
    };

    saveCustomTemplate(template);
    setTemplates(getAllTemplates());
    setAddOpen(false);
    setNewName('');
    setNewContent('');
    message.success('模板已保存');
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '删除模板',
      content: '确定要删除这个自定义模板吗？',
      onOk: () => {
        deleteCustomTemplate(id);
        setTemplates(getAllTemplates());
        message.success('模板已删除');
      },
    });
  };

  const menuItems = [
    ...presetTemplates.map((t) => ({
      key: t.id,
      label: t.name,
      onClick: () => handleSelect(t),
    })),
    { type: 'divider' as const },
    {
      key: 'manage',
      label: '管理模板',
      icon: <EditOutlined />,
      onClick: () => setManageOpen(true),
    },
  ];

  return (
    <>
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button icon={<BookOutlined />}>模板</Button>
      </Dropdown>

      <Modal
        title="模板管理"
        open={manageOpen}
        onCancel={() => setManageOpen(false)}
        footer={null}
        width={640}
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            新建自定义模板
          </Button>
        </div>

        <List
          dataSource={customTemplates}
          locale={{ emptyText: '暂无自定义模板' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button size="small" onClick={() => handleSelect(item)}>
                  使用
                </Button>,
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)}>
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={
                  <Text type="secondary" ellipsis style={{ maxWidth: 400 }}>
                    {item.content.substring(0, 80)}...
                  </Text>
                }
              />
            </List.Item>
          )}
        />

        <div style={{ marginTop: 24 }}>
          <Text type="secondary">预设模板 ({presetTemplates.length})</Text>
          <List
            size="small"
            dataSource={presetTemplates}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button size="small" onClick={() => handleSelect(item)}>
                    使用
                  </Button>,
                ]}
              >
                <List.Item.Meta title={item.name} />
              </List.Item>
            )}
          />
        </div>
      </Modal>

      <Modal
        title="新建自定义模板"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>模板名称</Text>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入模板名称"
            />
          </div>
          <div>
            <Text>模板内容</Text>
            <Input.TextArea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="输入系统提示词内容"
              autoSize={{ minRows: 8, maxRows: 16 }}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default TemplateSelect;
