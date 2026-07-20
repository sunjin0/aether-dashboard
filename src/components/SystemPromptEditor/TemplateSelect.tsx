import React, { useState } from 'react'
import { useIntl } from '@umijs/max'
import { Dropdown, Modal, Input, Button, List, Tag, Space, Typography, message } from 'antd'
import { BookOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import {
  PromptTemplate,
  getAllTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
} from './promptTemplates'

const { Text } = Typography

interface TemplateSelectProps {
  onSelect: (content: string) => void;
}

const TemplateSelect: React.FC<TemplateSelectProps> = ({ onSelect }) => {
  const intl = useIntl()
  const [manageOpen, setManageOpen] = useState(false)
  const [templates, setTemplates] = useState<PromptTemplate[]>(getAllTemplates())
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')

  const presetTemplates = templates.filter((t) => t.category === 'preset')
  const customTemplates = templates.filter((t) => t.category === 'custom')

  const handleSelect = (template: PromptTemplate) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.components.systemPromptEditor.useTemplate' }),
      content: intl.formatMessage({ id: 'pages.components.systemPromptEditor.confirmUseTemplate' }, { templateName: template.name }),
      onOk: () => {
        onSelect(template.content)
        message.success(intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateApplied' }))
      },
    })
  }

  const handleAdd = () => {
    if (!newName.trim() || !newContent.trim()) {
      message.warning(intl.formatMessage({ id: 'pages.components.systemPromptEditor.pleaseFillCompleteInfo' }))
      return
    }

    const template: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: newName,
      category: 'custom',
      content: newContent,
    }

    saveCustomTemplate(template)
    setTemplates(getAllTemplates())
    setAddOpen(false)
    setNewName('')
    setNewContent('')
    message.success(intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateSaved' }))
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.components.systemPromptEditor.deleteTemplateTitle' }),
      content: intl.formatMessage({ id: 'pages.components.systemPromptEditor.confirmDeleteTemplate' }),
      onOk: () => {
        deleteCustomTemplate(id)
        setTemplates(getAllTemplates())
        message.success(intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateDeleted' }))
      },
    })
  }

  const menuItems = [
    ...presetTemplates.map((t) => ({
      key: t.id,
      label: t.name,
      onClick: () => handleSelect(t),
    })),
    { type: 'divider' as const },
    {
      key: 'manage',
      label: intl.formatMessage({ id: 'pages.components.systemPromptEditor.manageTemplates' }),
      icon: <EditOutlined />,
      onClick: () => setManageOpen(true),
    },
  ]

  return (
    <>
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button icon={<BookOutlined />}>{intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateButton' })}</Button>
      </Dropdown>

      <Modal
        title={intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateManagement' })}
        open={manageOpen}
        onCancel={() => setManageOpen(false)}
        footer={null}
        width={640}
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            {intl.formatMessage({ id: 'pages.components.systemPromptEditor.newCustomTemplate' })}
          </Button>
        </div>

        <List
          dataSource={customTemplates}
          locale={{ emptyText: intl.formatMessage({ id: 'pages.components.systemPromptEditor.noCustomTemplates' }) }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button size="small" onClick={() => handleSelect(item)}>
                  {intl.formatMessage({ id: 'pages.components.systemPromptEditor.use' })}
                </Button>,
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(item.id)}
                >
                  {intl.formatMessage({ id: 'pages.common.delete' })}
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
          <Text type="secondary">{intl.formatMessage({ id: 'pages.components.systemPromptEditor.presetTemplates' }, { count: presetTemplates.length })}</Text>
          <List
            size="small"
            dataSource={presetTemplates}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button size="small" onClick={() => handleSelect(item)}>
                    {intl.formatMessage({ id: 'pages.components.systemPromptEditor.use' })}
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
        title={intl.formatMessage({ id: 'pages.components.systemPromptEditor.newCustomTemplate' })}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
        okText={intl.formatMessage({ id: 'pages.common.save' })}
        cancelText={intl.formatMessage({ id: 'pages.common.cancel' })}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>{intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateName' })}</Text>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateNamePlaceholder' })}
            />
          </div>
          <div>
            <Text>{intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateContent' })}</Text>
            <Input.TextArea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={intl.formatMessage({ id: 'pages.components.systemPromptEditor.templateContentPlaceholder' })}
              autoSize={{ minRows: 8, maxRows: 16 }}
            />
          </div>
        </Space>
      </Modal>
    </>
  )
}

export default TemplateSelect
