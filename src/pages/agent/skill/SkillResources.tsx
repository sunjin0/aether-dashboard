import React, { useEffect, useState } from 'react'
import { DeleteOutlined, EyeOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Select,
  Table,
  Tag,
  Typography,
  Upload,
  Col,
  Row,
} from 'antd';
import { useIntl } from '@umijs/max'
import Editor from '@monaco-editor/react'
import {
  getSkillResources,
  getSkillDetail,
  previewSkill,
  removeSkillResource,
  uploadSkillResource,
  getSkillResourceContent,
  generateSkillResource,
  updateSkillResource,
} from '@/services/agent/SkillController'
import { AgentSkillPreviewVo, AgentSkillResource } from '@/services/entity/Agent'
import { Option } from '@/services/entity/Common'
import MarkdownText from '@/components/MarkdownText'
import { getModelCatalogOptions } from '@/services/agent/ModelProviderController'
import { loadKnowledgeBaseOptions } from './options'
import './SkillResources.less'

interface SkillResourcesProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const { Paragraph, Text } = Typography

const formatSize = (size?: number) => {
  if (size == null) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const inferResourceType = (fileName: string): 'MARKDOWN' | 'SCRIPT' | 'TEMPLATE' | undefined => {
  const name = fileName.toLowerCase()
  if (name.endsWith('.md')) return 'MARKDOWN'
  if (name.endsWith('.js') || name.endsWith('.py')) return 'SCRIPT'
  if (['.html', '.hbs', '.tpl', '.ftl'].some((extension) => name.endsWith(extension))) return 'TEMPLATE'
  return undefined
}

const previewLanguage = (resource?: AgentSkillResource) => {
  const language = resource?.language?.toLowerCase()
  if (language === 'python' || language === 'py') return 'python'
  if (language === 'javascript' || language === 'js') return 'javascript'
  if (language === 'typescript' || language === 'ts') return 'typescript'
  if (language === 'json') return 'json'
  const name = resource?.name?.toLowerCase() || ''
  if (name.endsWith('.py')) return 'python'
  if (name.endsWith('.js')) return 'javascript'
  if (name.endsWith('.ts')) return 'typescript'
  return 'plaintext'
}

type TemplatePreviewValue = string | boolean | TemplatePreviewData | TemplatePreviewValue[] | undefined
interface TemplatePreviewData { [key: string]: TemplatePreviewValue }

const templatePreviewData: TemplatePreviewData = {
  name: '王小雨', targetTitle: '高级后端工程师', phone: '138 0013 8000', email: 'wang@example.com', city: '上海',
  summary: '5 年 Java 后端开发经验，专注高并发系统与微服务架构，具备从需求分析到稳定交付的全流程经验。',
  experiences: [{ company: '星云科技', title: '高级后端工程师', period: '2022.03 - 至今', location: '上海', achievements: ['主导交易服务重构，接口 P99 延迟降低 38%。', '搭建可观测体系，线上故障平均恢复时间缩短 45%。'] }],
  projects: [{ name: '智能客户服务平台', role: '核心开发', period: '2023.06 - 至今', description: '负责高并发会话服务和知识检索链路的设计与交付。', achievements: ['日均处理 100 万次会话请求。', '支持多租户权限隔离与审计追踪。'] }],
  education: [{ school: '华东理工大学', major: '计算机科学与技术', degree: '本科', period: '2016.09 - 2020.06' }],
  skills: ['Java / Spring Boot / MySQL', 'Redis / Kafka / Elasticsearch', 'Docker / Kubernetes / CI/CD'],
  certificates: ['AWS Solutions Architect Associate', '软考：系统架构设计师'],
}

const escapeTemplateValue = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))

const getTemplateValue = (path: string, context: TemplatePreviewValue, root: TemplatePreviewData): TemplatePreviewValue => {
  const normalized = path.trim()
  if (normalized === 'this' || normalized === '.') return context
  const from = (source: TemplatePreviewValue, keyPath: string): TemplatePreviewValue => keyPath.split('.').reduce<TemplatePreviewValue>((value, key) => (
    value && typeof value === 'object' && !Array.isArray(value) ? (value as TemplatePreviewData)[key] : undefined
  ), source)
  if (normalized.startsWith('../')) return from(root, normalized.replace(/^(\.\.\/)+/, ''))
  return from(context, normalized) ?? from(root, normalized)
}

interface TemplateBlock { body: string; inverse: string; end: number }

const findTemplateBlock = (source: string, start: number): TemplateBlock | undefined => {
  const tokens = /{{(#(?:each|if)\s+[^}]+|\/(?:each|if)|else)}}/g
  tokens.lastIndex = start
  let depth = 1
  let inverseStart = -1
  let token: RegExpExecArray | null
  while ((token = tokens.exec(source))) {
    const content = token[1]
    if (content.startsWith('#')) depth += 1
    else if (content.startsWith('/')) {
      depth -= 1
      if (depth === 0) {
        return {
          body: source.slice(start, inverseStart < 0 ? token.index : inverseStart),
          inverse: inverseStart < 0 ? '' : source.slice(inverseStart + '{{else}}'.length, token.index),
          end: tokens.lastIndex,
        }
      }
    } else if (content === 'else' && depth === 1 && inverseStart < 0) inverseStart = token.index
  }
  return undefined
}

const renderTemplateInline = (source: string, root: TemplatePreviewData, context: TemplatePreviewValue) => source
  .replace(/{{{\s*([\w./]+)\s*}}}/g, (_match, expression) => String(getTemplateValue(expression, context, root) ?? ''))
  .replace(/{{\s*([\w./]+)\s*}}/g, (_match, expression) => escapeTemplateValue(getTemplateValue(expression, context, root)))
  .replace(/{{[^}]+}}/g, '')

const renderTemplatePreview = (source: string, root: TemplatePreviewData, context: TemplatePreviewValue = root): string => {
  const blockStart = /{{#(each|if)\s+([^}]+)}}/g
  let cursor = 0
  let rendered = ''
  let match: RegExpExecArray | null
  while ((match = blockStart.exec(source))) {
    rendered += renderTemplateInline(source.slice(cursor, match.index), root, context)
    const block = findTemplateBlock(source, blockStart.lastIndex)
    if (!block) {
      rendered += renderTemplateInline(source.slice(match.index), root, context)
      return rendered
    }
    const value = getTemplateValue(match[2], context, root)
    if (match[1] === 'each') {
      rendered += Array.isArray(value) ? value.map((item) => renderTemplatePreview(block.body, root, item)).join('') : ''
    } else {
      rendered += renderTemplatePreview(value ? block.body : block.inverse, root, context)
    }
    cursor = block.end
    blockStart.lastIndex = cursor
  }
  return rendered + renderTemplateInline(source.slice(cursor), root, context)
}

const templatePreviewHtml = (template: string) => {
  const rendered = renderTemplatePreview(template, templatePreviewData)
  // Resources are user-authored. The sandboxed document cannot execute scripts
  // or load external content; only the template's markup and inline styling are rendered.
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">${rendered}`
}

const SkillResources: React.FC<SkillResourcesProps> = ({ id, open, setOpen }) => {
  const intl = useIntl()
  const format = (key: string, values?: Record<string, number | string>) =>
    intl.formatMessage({ id: key }, values)
  const [loading, setLoading] = useState(false)
  const [resources, setResources] = useState<AgentSkillResource[]>([])
  const [uploading, setUploading] = useState(false)
  const [resourceType, setResourceType] = useState<string>()
  const [purpose, setPurpose] = useState<string>()
  const [editable, setEditable] = useState(false)
  const [knowledgeBaseNames, setKnowledgeBaseNames] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<AgentSkillPreviewVo>()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioLoading, setStudioLoading] = useState(false)
  const [studioResource, setStudioResource] = useState<Partial<AgentSkillResource>>({ type: 'MARKDOWN' })
  const [studioPrompt, setStudioPrompt] = useState('')
  const [studioModelId, setStudioModelId] = useState('')
  const [studioContent, setStudioContent] = useState('')
  const [providerOptions, setProviderOptions] = useState<Option[]>([])
  const [providerLoading, setProviderLoading] = useState(false)
  const [resourcePreview, setResourcePreview] = useState<AgentSkillResource>()
  const [resourcePreviewContent, setResourcePreviewContent] = useState('')
  const [resourcePreviewLoading, setResourcePreviewLoading] = useState(false)

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
    setPreviewOpen(false)
    setResourcePreview(undefined)
    setResourceType(undefined)
    setPurpose(undefined)
    setLoading(true)
    setProviderLoading(true)
    Promise.all([getSkillResources(id), getSkillDetail(id), loadKnowledgeBaseOptions(), getModelCatalogOptions('CHAT,MULTIMODAL')])
      .then(([resourcesRes, detailRes, knowledgeBases, providers]) => {
        setResources(resourcesRes.data || [])
        setEditable(Boolean(detailRes.data?.draft?.id))
        setKnowledgeBaseNames(Object.fromEntries(knowledgeBases.map((item) => [String(item.value), item.label])))
        setProviderOptions(providers)
      })
      .finally(() => { setLoading(false); setProviderLoading(false) })
  }, [id, open])

  const handleUpload = async (file: File) => {
    if (!id) return
    const inferredType = inferResourceType(file.name)
    if (!resourceType) {
      message.warning(format('pages.agent.skill.resourceTypeRequired'))
      return
    }
    if (inferredType !== resourceType) {
      message.error(format('pages.agent.skill.resourceTypeMismatch', { expected: format(`pages.agent.skill.resourceType.${inferredType || 'unsupported'}`) }))
      return
    }
    setUploading(true)
    try {
      await uploadSkillResource(id, file, purpose, resourceType)
      setResourceType(undefined)
      setPurpose(undefined)
      load()
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
        load()
      }
    } catch {
      // API failures are displayed by the global request handler.
    }
  }

  const openResourceStudio = async (resource?: AgentSkillResource) => {
    if (!id) return
    setStudioLoading(true)
    try {
      setStudioPrompt('')
      if (resource) {
        const { data } = await getSkillResourceContent(id, resource.id as string)
        setStudioResource(resource); setStudioContent(data || '')
      } else { setStudioResource({ type: 'MARKDOWN', name: '', purpose: '' }); setStudioContent('') }
      setStudioOpen(true)
    } finally { setStudioLoading(false) }
  }

  const openResourcePreview = async (resource: AgentSkillResource) => {
    if (!id || !resource.id) return
    setResourcePreview(resource)
    setResourcePreviewContent('')
    setResourcePreviewLoading(true)
    try {
      const { data } = await getSkillResourceContent(id, resource.id as string)
      setResourcePreviewContent(data || '')
    } finally {
      setResourcePreviewLoading(false)
    }
  }

  const generateResourceDraft = async () => {
    if (!id || !studioModelId || !studioPrompt.trim()) { message.warning(format('pages.agent.skill.studio.providerRequired')); return }
    setStudioLoading(true)
    try {
      const { data } = await generateSkillResource(id, { modelId: studioModelId, type: (studioResource.type || 'MARKDOWN') as 'MARKDOWN' | 'TEMPLATE' | 'SCRIPT', name: studioResource.name, purpose: studioResource.purpose, prompt: studioPrompt })
      if (data) { setStudioResource({ ...studioResource, name: data.name, type: data.type }); setStudioContent(data.content) }
    } finally { setStudioLoading(false) }
  }

  const saveResourceDraft = async () => {
    if (!id || !studioContent.trim() || !studioResource.name) return
    const type = studioResource.type as 'MARKDOWN' | 'TEMPLATE' | 'SCRIPT'
    if (inferResourceType(studioResource.name) !== type) { message.error(format('pages.agent.skill.studio.typeMismatch')); return }
    setStudioLoading(true)
    try {
      const file = new File([studioContent], studioResource.name, { type: type === 'MARKDOWN' ? 'text/markdown' : 'text/plain' })
      const { code } = studioResource.id
        ? await updateSkillResource(id, String(studioResource.id), file, studioResource.purpose, type)
        : await uploadSkillResource(id, file, studioResource.purpose, type)
      if (code === 200) { setStudioOpen(false); load() }
    } finally { setStudioLoading(false) }
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
      render: (value?: string) => <Tag>{value ? format(`pages.agent.skill.resourceType.${value.toLowerCase()}`) : '-'}</Tag>,
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
      width: 190,
      render: (_: unknown, record: AgentSkillResource) => <Space size={0}>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openResourcePreview(record)}>查看</Button>
        {editable && <Button type="link" size="small" onClick={() => openResourceStudio(record)}>{format('pages.common.edit')}</Button>}
        {editable && record.id && <Popconfirm title={format('pages.agent.skill.resourceDeleteConfirm')} onConfirm={() => handleDelete(record.id as string)}><Button type="link" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>}
      </Space>,
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
    { title: format('pages.agent.skill.resourceType'), dataIndex: 'type', width: 100, render: (value?: string) => value ? format(`pages.agent.skill.resourceType.${value.toLowerCase()}`) : '-' },
    { title: format('pages.agent.skill.resourceLanguage'), dataIndex: 'language', width: 90 },
    { title: format('pages.agent.skill.resourceSize'), dataIndex: 'size', width: 90, render: formatSize },
    { title: format('pages.agent.skill.resourcePurpose'), dataIndex: 'purpose', ellipsis: true },
  ]

  return (
    <>
      <Drawer
        title={format('pages.agent.skill.resourceManage')}
        open={open}
        onClose={() => {
          setPreviewOpen(false)
          setOpen(false)
        }}
        width={860}
        destroyOnClose
      >
        <Card size="small" title={format('pages.agent.skill.resourceUploadPanel')} style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Text type="secondary">{format('pages.agent.skill.resourceUploadHint')}</Text>
            <Space wrap>
              <Select disabled={!editable || uploading} style={{ width: 170 }} value={resourceType} placeholder={format('pages.agent.skill.resourceTypeSelect')} options={[
                { value: 'TEMPLATE', label: format('pages.agent.skill.resourceType.template') },
                { value: 'SCRIPT', label: format('pages.agent.skill.resourceType.script') },
                { value: 'MARKDOWN', label: format('pages.agent.skill.resourceType.markdown') },
              ]} onChange={setResourceType} />
              <Input disabled={!editable || uploading} style={{ width: 260 }} placeholder={format('pages.agent.skill.resourcePurposePlaceholder')} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          <Upload
            accept={resourceType === 'SCRIPT' ? '.js,.py' : resourceType === 'MARKDOWN' ? '.md' : '.html,.hbs,.tpl,.ftl'}
            showUploadList={false}
            disabled={uploading || !editable || !resourceType}
            beforeUpload={(file) => {
              handleUpload(file)
              return false
            }}
          >
            <Button type="primary" icon={<PlusOutlined />} loading={uploading}>
              {format('pages.agent.skill.resourceUpload')}
            </Button>
          </Upload>
            </Space>
          </Space>
        </Card>
        <Card size="small" title={format('pages.agent.skill.studio.generate')} style={{ marginBottom: 16 }}>
          <Text type="secondary">通过已配置的 AI 服务商生成资源草稿；请先查看、编辑和测试内容，再保存到当前 Skill 草稿。</Text>
          <div style={{ marginTop: 12 }}><Button disabled={!editable} icon={<RobotOutlined />} onClick={() => openResourceStudio()}>生成资源草稿</Button></div>
        </Card>
        <Space style={{ display: 'flex', marginBottom: 16 }}>
          <Button loading={previewLoading} onClick={handlePreview}>{format('pages.agent.skill.preview')}</Button>
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
        {!editable && <Text type="secondary">{format('pages.agent.skill.resourceReadonly')}</Text>}
      </Drawer>

      <Modal
        title={resourcePreview?.name || '资源预览'}
        open={Boolean(resourcePreview)}
        onCancel={() => setResourcePreview(undefined)}
        width={resourcePreview?.type === 'TEMPLATE' ? 1060 : 960}
        zIndex={1300}
        destroyOnClose
        footer={editable && resourcePreview ? <Space><Button onClick={() => setResourcePreview(undefined)}>关闭</Button><Button type="primary" onClick={() => { const resource = resourcePreview; setResourcePreview(undefined); openResourceStudio(resource) }}>编辑资源</Button></Space> : null}
      >
        <Space className="skill-resource-preview-meta" wrap>
          <Tag color="blue">{resourcePreview?.type ? format(`pages.agent.skill.resourceType.${resourcePreview.type.toLowerCase()}`) : '-'}</Tag>
          {resourcePreview?.language && <Tag>{resourcePreview.language}</Tag>}
          <Text type="secondary">{resourcePreview?.purpose || '未填写用途'}</Text>
        </Space>
        {resourcePreview?.type === 'MARKDOWN' ? (
          <div className="skill-resource-preview skill-resource-preview-markdown"><MarkdownText content={resourcePreviewContent} loading={resourcePreviewLoading} /></div>
        ) : resourcePreview?.type === 'TEMPLATE' ? (
          <div className="skill-resource-preview skill-resource-preview-template">
            <div className="skill-resource-preview-template-header">模板渲染预览 · 使用示例简历数据</div>
            {resourcePreviewLoading ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={format('pages.agent.skill.studio.loadingContent')} /> : (
              <div className="skill-resource-preview-template-canvas">
                <iframe title={`${resourcePreview.name} 模板预览`} sandbox="" srcDoc={templatePreviewHtml(resourcePreviewContent)} />
              </div>
            )}
          </div>
        ) : (
          <div className="skill-resource-preview skill-resource-preview-code">
            <div className="skill-resource-preview-code-header">{resourcePreview?.type === 'SCRIPT' ? '脚本源码' : '模板源码'}</div>
            {resourcePreviewLoading ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={format('pages.agent.skill.studio.loadingContent')} /> : (
              <Editor
                height="calc(60vh - 38px)"
                language={previewLanguage(resourcePreview)}
                theme="vs-dark"
                value={resourcePreviewContent || '// 暂无内容'}
                options={{ readOnly: true, domReadOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', fontSize: 13, lineNumbersMinChars: 3, padding: { top: 14, bottom: 14 } }}
              />
            )}
          </div>
        )}
      </Modal>

      <Modal open={studioOpen} title={format('pages.agent.skill.studio.title')} width={900} zIndex={1200} destroyOnClose
        onCancel={() => setStudioOpen(false)}
        footer={<Space><Button onClick={() => setStudioOpen(false)}>取消</Button><Button type="primary" disabled={!editable} loading={studioLoading} onClick={saveResourceDraft}>{studioResource.id ? format('pages.common.edit') : format('pages.agent.skill.resourceSaveAsNew')}</Button></Space>}>
        <Form layout="vertical">
          <Row gutter={12}>
            <Col span={8}><Form.Item label={format('pages.agent.skill.studio.type')}><Select disabled={!editable} value={studioResource.type} options={['MARKDOWN', 'TEMPLATE', 'SCRIPT'].map((value) => ({ value, label: format(`pages.agent.skill.resourceType.${value.toLowerCase()}`) }))} onChange={(type) => setStudioResource({ ...studioResource, type })} /></Form.Item></Col>
            <Col span={8}><Form.Item label={format('pages.agent.skill.studio.fileName')}><Input disabled={!editable} value={studioResource.name} placeholder={format('pages.agent.skill.studio.fileNamePlaceholder')} onChange={(event) => setStudioResource({ ...studioResource, name: event.target.value })} /></Form.Item></Col>
            <Col span={8}><Form.Item label={format('pages.agent.skill.studio.purpose')}><Input disabled={!editable} value={studioResource.purpose} onChange={(event) => setStudioResource({ ...studioResource, purpose: event.target.value })} /></Form.Item></Col>
          </Row>
          {editable && <Card size="small" title={format('pages.agent.skill.studio.generateTest')} style={{ marginBottom: 16 }}>
            <Row gutter={12}><Col span={8}><Select showSearch loading={providerLoading} value={studioModelId || undefined} placeholder={format('pages.agent.skill.studio.selectProvider')} optionFilterProp="label" options={providerOptions} onChange={(value) => setStudioModelId(String(value))} /></Col><Col span={16}><Input.TextArea rows={2} value={studioPrompt} placeholder={format('pages.agent.skill.studio.promptPlaceholder')} onChange={(event) => setStudioPrompt(event.target.value)} /></Col></Row>
            <Button style={{ marginTop: 12 }} icon={<RobotOutlined />} loading={studioLoading} onClick={generateResourceDraft}>生成并测试草稿</Button>
          </Card>}
          <Form.Item label={format('pages.agent.skill.studio.content')}><Input.TextArea rows={16} readOnly={!editable} value={studioContent} onChange={(event) => setStudioContent(event.target.value)} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={format('pages.agent.skill.previewTitle')}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={720}
        zIndex={1100}
        destroyOnClose
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
                  (preview.knowledgeBaseIds || []).map((item) => <Tag key={item}>{knowledgeBaseNames[item] || item}</Tag>)
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
