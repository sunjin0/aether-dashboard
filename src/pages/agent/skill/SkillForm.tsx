import React, { useEffect, useRef, useState } from 'react'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Typography,
} from 'antd'
import { useIntl } from '@umijs/max'
import {
  createSkillDraft,
  getSkillDetail,
  updateSkillDraft,
} from '@/services/agent/SkillController'
import {
  AgentSkillDetail,
  AgentSkillDraftDto,
  AgentSkillToolDto,
} from '@/services/entity/Agent'
import { Option } from '@/services/entity/Common'
import { loadKnowledgeBaseOptions, loadToolOptions } from './options'
import { getOptionList } from '@/services/sys/DictController'
import SchemaFields from './SchemaFields'
import SystemIconPicker from '@/components/SystemIconPicker'

interface SkillFormProps {
  /** 技能 ID，为空表示新建技能 */
  id?: string;
  /** 打开前已获取的详情（列表页已拉取且存在草稿时透传，避免重复请求） */
  initialDetail?: AgentSkillDetail | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const { Text } = Typography

/** 标签字符串 <-> 标签数组：兼容逗号/顿号/空白分隔。 */
const splitTags = (value?: string): string[] =>
  value
    ? value
      .split(/[,，、\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    : []

const joinTags = (value?: string[]): string => (value || []).join(',')
const parseRoutingList = (value?: string | string[]): string[] => {
  if (Array.isArray(value)) return value
  try { return value ? JSON.parse(value) : [] } catch { return [] }
}
const parseRoutingTerms = (value?: string | string[]): string[] =>
  Array.isArray(value) ? value : (value || '').split(/[,，、\n]+/).map((item) => item.trim()).filter(Boolean)

const SkillForm: React.FC<SkillFormProps> = ({ id, initialDetail, open, setOpen, onSuccess }) => {
  const intl = useIntl()
  const format = (key: string, values?: Record<string, number | string>) =>
    intl.formatMessage({ id: key }, values)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [toolOptions, setToolOptions] = useState<Option[]>([])
  const [knowledgeBaseOptions, setKnowledgeBaseOptions] = useState<Option[]>([])
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([])
  const [tagOptions, setTagOptions] = useState<Option[]>([])
  const [toolPolicyOptions, setToolPolicyOptions] = useState<Option[]>([])
  const [optionsFailed, setOptionsFailed] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const optionsInited = useRef(false)

  useEffect(() => {
    Promise.all([
      getOptionList('Agent_Skill_Category'),
      getOptionList('Agent_Skill_Tag'),
      getOptionList('Agent_Skill_Tool_Policy'),
    ])
      .then(([categories, tags, policies]) => {
        setCategoryOptions(categories)
        setTagOptions(tags)
        setToolPolicyOptions(policies)
      })
      .catch(() => {
        // 字典加载失败由全局请求处理器提示，表单仍可手动填写
      })
  }, [])

  useEffect(() => {
    if (!open) return
    form.resetFields()
    setActiveStep(0)
    setOptionsFailed(false)
    // 选项接口仅首次打开时请求，之后复用缓存，避免反复请求。
    if (!optionsInited.current) {
      optionsInited.current = true
      setOptionsLoading(true)
      Promise.all([loadToolOptions(), loadKnowledgeBaseOptions()])
        .then(([tools, bases]) => {
          setToolOptions(tools)
          setKnowledgeBaseOptions(bases)
        })
        .catch(() => setOptionsFailed(true))
        .finally(() => setOptionsLoading(false))
    }

    if (id) {
      setDetailLoading(true)
      const applyDetail = (data: AgentSkillDetail | undefined) => {
        if (!data) return
        form.setFieldsValue({
          name: data.skill?.name,
          code: data.skill?.code,
          category: data.skill?.category,
          icon: data.skill?.icon,
          tags: splitTags(data.skill?.tags),
          description: data.skill?.description,
          instruction: data.draft?.instruction,
          routingSummary: data.draft?.routingSummary,
          triggerTerms: parseRoutingList(data.draft?.triggerTerms).join('，'),
          excludeTerms: parseRoutingList(data.draft?.excludeTerms).join('，'),
          routingExamples: parseRoutingList(data.draft?.routingExamples).join('\n'),
          inputSchema: data.draft?.inputSchema,
          outputSchema: data.draft?.outputSchema,
          toolPolicy: data.draft?.toolPolicy,
          changeNote: data.draft?.changeNote,
          tools: mapTools(data),
          knowledgeBaseIds: (data.knowledgeBases || [])
            .map((item) => item.knowledgeBaseId)
            .filter((value): value is string => Boolean(value)),
        })
      }
      if (initialDetail?.draft) {
        applyDetail(initialDetail)
        setDetailLoading(false)
      } else {
        getSkillDetail(id)
          .then(({ data }) => applyDetail(data))
          .catch(() => {
            // API failures are displayed by the global request handler.
          })
          .finally(() => setDetailLoading(false))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form])

  const mapTools = (data: AgentSkillDetail): AgentSkillToolDto[] => {
    return (data.tools || [])
      .filter((item) => Boolean(item.toolId))
      .map((item) => ({
        toolId: item.toolId as string,
        required: Boolean(item.required),
        priority: item.priority,
      }))
  }

  const handleSubmit = async () => {
    let values: AgentSkillDraftDto
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    const params: AgentSkillDraftDto = {
      ...values,
      tags: joinTags(values.tags as unknown as string[]),
      triggerTerms: parseRoutingTerms(values.triggerTerms),
      excludeTerms: parseRoutingTerms(values.excludeTerms),
      routingExamples: parseRoutingTerms(values.routingExamples),
      tools: (values.tools || []).filter((item) => Boolean(item.toolId)),
    }
    setSubmitting(true)
    try {
      if (id) {
        const { code } = await updateSkillDraft(id, params)
        if (code === 200) {
          setOpen(false)
          onSuccess()
        }
      } else {
        const { code } = await createSkillDraft(params)
        if (code === 200) {
          setOpen(false)
          onSuccess()
        }
      }
    } catch {
      // API failures are displayed by the global request handler.
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = async () => {
    const fields = activeStep === 0 ? ['name', 'code'] : activeStep === 1 ? ['instruction'] : []
    try {
      await form.validateFields(fields)
      setActiveStep((current) => Math.min(current + 1, 2))
    } catch {
      // 当前步骤的必填项尚未完成。
    }
  }

  return (
    <Modal
      title={format(id ? 'pages.agent.skill.editDraft' : 'pages.agent.skill.create')}
      open={open}
      onOk={handleSubmit}
      confirmLoading={submitting}
      onCancel={() => setOpen(false)}
      footer={[
        <Button key="cancel" onClick={() => setOpen(false)}>{format('pages.common.cancel')}</Button>,
        activeStep > 0 && <Button key="back" onClick={() => setActiveStep((current) => current - 1)}>{format('pages.agent.skill.previousStep')}</Button>,
        activeStep < 2
          ? <Button key="next" type="primary" onClick={handleNext}>{format('pages.agent.skill.nextStep')}</Button>
          : <Button key="save" type="primary" loading={submitting} onClick={handleSubmit}>{format('pages.agent.skill.saveDraft')}</Button>,
      ]}
      width={960}
      destroyOnClose={false}
      bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
    >
      <Spin spinning={detailLoading}>
        <Form form={form} layout="vertical">
          <Steps
            current={activeStep}
            size="small"
            style={{ marginBottom: 20 }}
            items={[
              { title: format('pages.agent.skill.stepBasic'), description: format('pages.agent.skill.stepBasicHint') },
              { title: format('pages.agent.skill.stepBehavior'), description: format('pages.agent.skill.stepBehaviorHint') },
              { title: format('pages.agent.skill.stepDependencies'), description: format('pages.agent.skill.stepDependenciesHint') },
            ]}
          />
          {optionsFailed && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={format('pages.agent.skill.optionsFailed')}
            />
          )}

          <div hidden={activeStep !== 0}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {format('pages.agent.skill.basicInfo')}
          </Text>
          <Space style={{ display: 'flex' }} align="baseline" wrap>
            <Form.Item
              name="name"
              label={format('pages.agent.skill.name')}
              rules={[{ required: true, message: format('pages.agent.skill.requiredName') }]}
              style={{ width: 280 }}
            >
              <Input placeholder={format('pages.agent.skill.namePlaceholder')} />
            </Form.Item>
            <Form.Item
              name="code"
              label={format('pages.agent.skill.code')}
              rules={[{ required: true, message: format('pages.agent.skill.requiredCode') }]}
              style={{ width: 280 }}
            >
              <Input
                disabled={Boolean(id)}
                placeholder={format('pages.agent.skill.codePlaceholder')}
              />
            </Form.Item>
            <Form.Item
              name="category"
              label={format('pages.agent.skill.category')}
              style={{ width: 180 }}
            >
              <Select
                showSearch
                allowClear
                options={categoryOptions}
                placeholder={format('pages.agent.skill.categoryPlaceholder')}
              />
            </Form.Item>
            <Form.Item name="icon" label={format('pages.agent.skill.icon')} style={{ width: 280 }}>
              <SystemIconPicker />
            </Form.Item>
          </Space>
          <Form.Item name="tags" label={format('pages.agent.skill.tags')}>
            <Select
              mode="tags"
              allowClear
              tokenSeparators={[',', '，', '、']}
              options={tagOptions}
              placeholder={format('pages.agent.skill.tagsPlaceholder')}
            />
          </Form.Item>
          <Form.Item name="description" label={format('pages.agent.skill.description')}>
            <Input.TextArea
              rows={2}
              placeholder={format('pages.agent.skill.descriptionPlaceholder')}
            />
          </Form.Item>
          </div>

          <div hidden={activeStep !== 1}>
          <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>
            {format('pages.agent.skill.sectionContent')}
          </Text>
          <Form.Item
            name="instruction"
            label={format('pages.agent.skill.instruction')}
            rules={[{ required: true, message: format('pages.agent.skill.requiredInstruction') }]}
          >
            <Input.TextArea
              rows={5}
              placeholder={format('pages.agent.skill.instructionPlaceholder')}
            />
          </Form.Item>
          <Form.Item name="inputSchema" label={format('pages.agent.skill.inputSchema')}>
            <SchemaFields />
          </Form.Item>
          <Form.Item name="outputSchema" label={format('pages.agent.skill.outputSchema')}>
            <SchemaFields />
          </Form.Item>
          <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>Skill 发现配置</Text>
          <Form.Item name="routingSummary" label={format('pages.agent.skill.routingSummary')} rules={[{ required: true, message: format('pages.agent.skill.routingSummaryRequired') }]}>
            <Input.TextArea maxLength={200} rows={2} placeholder={format('pages.agent.skill.routingSummaryPlaceholder')} />
          </Form.Item>
          <Form.Item name="triggerTerms" label={format('pages.agent.skill.triggerTerms')}>
            <Input placeholder={format('pages.agent.skill.triggerTermsPlaceholder')} />
          </Form.Item>
          <Form.Item name="excludeTerms" label={format('pages.agent.skill.excludeTerms')}>
            <Input placeholder={format('pages.agent.skill.excludeTermsPlaceholder')} />
          </Form.Item>
          <Form.Item name="routingExamples" label={format('pages.agent.skill.routingExamples')}>
            <Input.TextArea rows={3} placeholder={format('pages.agent.skill.routingExamplesPlaceholder')} />
          </Form.Item>
          <Form.Item name="toolPolicy" label={format('pages.agent.skill.toolPolicy')}>
            <Select
              allowClear
              options={toolPolicyOptions}
              placeholder={format('pages.agent.skill.toolPolicyPlaceholder')}
            />
          </Form.Item>
          <Form.Item name="changeNote" label={format('pages.agent.skill.changeNote')}>
            <Input placeholder={format('pages.agent.skill.changeNotePlaceholder')} />
          </Form.Item>
          </div>

          <div hidden={activeStep !== 2}>
          <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>
            {format('pages.agent.skill.sectionDependencies')}
          </Text>
          <Form.Item
            name="knowledgeBaseIds"
            label={format('pages.agent.skill.knowledgeBaseIds')}
            tooltip={format('pages.agent.skill.knowledgeBaseHint')}
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={optionsLoading}
              options={knowledgeBaseOptions}
              placeholder={format('pages.agent.skill.selectKnowledgeBase')}
            />
          </Form.Item>

          <Form.Item
            label={format('pages.agent.skill.tools')}
            tooltip={format('pages.agent.skill.toolsHint')}
          >
            <Form.List name="tools">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="center">
                      <Form.Item
                        {...restField}
                        name={[name, 'toolId']}
                        rules={[
                          {
                            required: true,
                            message: format('pages.agent.skill.selectTool'),
                          },
                        ]}
                        style={{ width: 320 }}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          options={toolOptions}
                          loading={optionsLoading}
                          placeholder={format('pages.agent.skill.selectTool')}
                        />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'required']}
                        valuePropName="checked"
                        initialValue={false}
                      >
                        <Switch
                          checkedChildren={format('pages.agent.skill.required')}
                          unCheckedChildren={format('pages.agent.skill.optional')}
                        />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'priority']}
                        initialValue={0}
                      >
                        <InputNumber
                          min={0}
                          max={999}
                          style={{ width: 132 }}
                          addonBefore={format('pages.agent.tool.priority')}
                        />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    {format('pages.agent.skill.addTool')}
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
          </div>
        </Form>
      </Spin>
    </Modal>
  )
}

export default SkillForm
