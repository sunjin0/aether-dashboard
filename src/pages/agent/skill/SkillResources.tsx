import React, { useEffect, useState } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Drawer,
  Empty,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd'
import { useIntl } from '@umijs/max'
import {
  getSkillResources,
  previewSkill,
  removeSkillResource,
  uploadSkillResource,
} from '@/services/agent/SkillController'
import { AgentSkillPreviewVo, AgentSkillResource } from '@/services/entity/Agent'

interface SkillResourcesProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const { Paragraph, Text } = Typography

const TYPE_OPTIONS = [
  { label: 'MARKDOWN', value: 'MARKDOWN' },
  { label: 'SCRIPT', value: 'SCRIPT' },
  { label: 'TEMPLATE', value: 'TEMPLATE' },
]

const formatSize = (size?: number) => {
  if (size == null) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const SkillResources: React.FC<SkillResourcesProps> = ({ id, open, setOpen }) => {
  const intl = useIntl()
  const format = (key: string, values?: Record<string, number | string>) =>
    intl.formatMessage({ id: key }, values)
  const [loading, setLoading] = useState(false)
  const [resources, setResources] = useState<AgentSkillResource[]>([])
  const [uploading, setUploading] = useState(false)
  const [purpose, setPurpose] = useState<string>()
  const [type, setType] = useState<string>()
  const [preview, setPreview] = useState<AgentSkillPreviewVo>()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    getSkillResources(id)
      .then(({ data }) => setResources(data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!open || !id) return
    setResources([])
    setPreview(undefined)
    setLoading(true)
    getSkillResources(id)
      .then(({ data }) => setResources(data || []))
      .finally(() => setLoading(false))
  }, [id, open])

  const handleUpload = async (file: File) => {
    if (!id) return
    setUploading(true)
    try {
      const { code } = await uploadSkillResource(id, file, purpose, type)
      if (code === 200) {
        message.success(format('pages.agent.skill.resourceUploadSuccess'))
        load()
      }
    } catch {
      // API failures are displayed by the global request handler.
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (resourceId: string) => {
    if (!id) return
    try {
      const { code } = await removeSkillResource(id, resourceId)
      if (code === 200) {
        message.success(format('pages.agent.skill.resourceDeleteSuccess'))
        load()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const handlePreview = async () => {
    if (!id) return
    setPreviewLoading(true)
    try {
      const { data } = await previewSkill(id, {})
      setPreview(data)
      setPreviewOpen(true)
    } catch {
      // API failures are displayed by the global request handler.
    } finally {
      setPreviewLoading(false)
    }
  }

  const columns: any[] = [
    {
      title: format('pages.agent.skill.resourceName'),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: format('pages.agent.skill.resourceType'),
      dataIndex: 'type',
      width: 110,
      render: (value?: string) => <Tag>{value || '-'}</Tag>,
    },
    {
      title: format('pages.agent.skill.resourceLanguage'),
      dataIndex: 'language',
      width: 100,
      render: (value?: string) => value || '-',
    },
    {
      title: format('pages.agent.skill.resourceSize'),
      dataIndex: 'size',
      width: 100,
      render: formatSize,
    },
    {
      title: format('pages.agent.skill.resourcePurpose'),
      dataIndex: 'purpose',
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: format('pages.agent.skill.resourceStatus'),
      dataIndex: 'status',
      width: 100,
      render: (value?: number) =>
        value === 1 ? (
          <Tag color="green">{format('pages.common.enabled')}</Tag>
        ) : (
          <Tag>{format('pages.common.disabled')}</Tag>
        ),
    },
    {
      title: format('pages.common.option'),
      key: 'option',
      width: 90,
      render: (_: unknown, record: AgentSkillResource) =>
        record.id ? (
          <Popconfirm
            title={format('pages.agent.skill.resourceDeleteConfirm')}
            onConfirm={() => handleDelete(record.id as string)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        ) : null,
    },
  ]

  const previewToolColumns: any[] = [
    {
      title: format('pages.agent.skill.tool'),
      dataIndex: 'toolName',
      render: (_: unknown, item: { toolId?: string; toolName?: string }) =>
        item.toolName || item.toolId || '-',
    },
    { title: format('pages.agent.skill.code'), dataIndex: 'toolCode', width: 140 },
    {
      title: format('pages.agent.skill.required'),
      dataIndex: 'required',
      width: 80,
      render: (value?: boolean) =>
        value ? <Tag color="red">{format('pages.agent.skill.required')}</Tag> : null,
    },
    { title: format('pages.agent.tool.priority'), dataIndex: 'priority', width: 80 },
    {
      title: format('pages.agent.skill.resourceStatus'),
      dataIndex: 'available',
      width: 100,
      render: (value?: boolean) =>
        value ? (
          <Tag color="green">{format('pages.agent.skill.toolAvailable')}</Tag>
        ) : (
          <Tag>{format('pages.agent.skill.toolUnavailable')}</Tag>
        ),
    },
  ]

  const previewResourceColumns: any[] = [
    { title: format('pages.agent.skill.resourceName'), dataIndex: 'name' },
    { title: format('pages.agent.skill.resourceType'), dataIndex: 'type', width: 100 },
    { title: format('pages.agent.skill.resourceLanguage'), dataIndex: 'language', width: 90 },
    { title: format('pages.agent.skill.resourceSize'), dataIndex: 'size', width: 90, render: formatSize },
    { title: format('pages.agent.skill.resourcePurpose'), dataIndex: 'purpose', ellipsis: true },
  ]

  return (
    <>
      <Drawer
        title={format('pages.agent.skill.resourceManage')}
        open={open}
        onClose={() => setOpen(false)}
        width={860}
        destroyOnClose
      >
        <Space style={{ display: 'flex', marginBottom: 16 }} wrap>
          <Upload
            accept=".md,.js,.py,.sh,.html,.hbs,.tpl,.ftl"
            showUploadList={false}
            disabled={uploading}
            beforeUpload={(file) => {
              handleUpload(file)
              return false
            }}
          >
            <Button type="primary" icon={<PlusOutlined />} loading={uploading}>
              {format('pages.agent.skill.resourceUpload')}
            </Button>
          </Upload>
          <Input
            style={{ width: 220 }}
            placeholder={format('pages.agent.skill.resourcePurposePlaceholder')}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          <Select
            style={{ width: 160 }}
            allowClear
            placeholder={format('pages.agent.skill.resourceTypePlaceholder')}
            options={TYPE_OPTIONS}
            value={type}
            onChange={setType}
          />
          <Button loading={previewLoading} onClick={handlePreview}>
            {format('pages.agent.skill.preview')}
          </Button>
        </Space>
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          pagination={false}
          dataSource={resources}
          columns={columns}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Drawer>

      <Modal
        title={format('pages.agent.skill.previewTitle')}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={720}
      >
        {preview ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Text strong>
                {preview.skillName || preview.skillCode || '-'}
              </Text>
              <Tag>{preview.versionNo == null ? format('pages.agent.skill.draft') : `v${preview.versionNo}`}</Tag>
              <Tag color="blue">
                {format('pages.agent.skill.previewTokens', { count: preview.estimatedTokens ?? 0 })}
              </Tag>
            </Space>
            <div>
              <Text strong>{format('pages.agent.skill.previewPrompt')}</Text>
              <Paragraph
                style={{
                  marginBottom: 0,
                  whiteSpace: 'pre-wrap',
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 6,
                  maxHeight: 260,
                  overflow: 'auto',
                }}
              >
                {preview.prompt || '-'}
              </Paragraph>
            </div>
            <div>
              <Text strong>{format('pages.agent.skill.previewTools')}</Text>
              <Table
                rowKey="toolId"
                size="small"
                pagination={false}
                dataSource={preview.tools || []}
                columns={previewToolColumns}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </div>
            <div>
              <Text strong>{format('pages.agent.skill.previewKnowledgeBases')}</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {(preview.knowledgeBaseIds || []).length === 0 ? (
                  <Text type="secondary">-</Text>
                ) : (
                  (preview.knowledgeBaseIds || []).map((item) => <Tag key={item}>{item}</Tag>)
                )}
              </Space>
            </div>
            <div>
              <Text strong>{format('pages.agent.skill.previewResources')}</Text>
              <Table
                rowKey="resourceId"
                size="small"
                pagination={false}
                dataSource={preview.resources || []}
                columns={previewResourceColumns}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </div>
          </Space>
        ) : (
          !previewLoading && <Empty />
        )}
      </Modal>
    </>
  )
}

export default SkillResources
