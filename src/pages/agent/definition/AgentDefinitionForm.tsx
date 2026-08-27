import DrawerForm from '@/components/DrawerForm'
import SystemPromptEditor from '@/components/SystemPromptEditor'
import {
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormDependency,
  ProCard,
} from '@ant-design/pro-components'
import { Form } from 'antd'
import {
  addAgentDefinitionInfo,
  getAgentDefinitionInfo,
  updateAgentDefinitionInfo,
} from '@/services/agent/AgentDefinitionController'
import { getModelCatalogOptions } from '@/services/agent/ModelProviderController'
import { getAgentToolOptions } from '@/services/agent/ToolController'
import { getOptionList } from '@/services/sys/DictController'
import { AgentApplication } from '@/services/agent/AgentApplicationController'
import { useIntl } from '@umijs/max'

const AgentDefinitionForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
  applications: AgentApplication[];
}) => {
  const { id, open, setOpen, onSuccess, applications } = props
  const intl = useIntl()
  const format = (id: string) => intl.formatMessage({ id })
  const [form] = Form.useForm()

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      request={async (params) => getAgentDefinitionInfo(params)}
      onSuccess={async (values) => {
        if (id) {
          await updateAgentDefinitionInfo(values)
        } else {
          await addAgentDefinitionInfo(values)
        }
        onSuccess()
        return true
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormSelect
        name="applicationId"
        label="业务应用空间"
        options={applications.map((item) => ({ label: item.name, value: item.id }))}
        initialValue="0"
        rules={[{ required: true }]}
      />
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
      <ProFormSelect
        name="executionMode"
        label={format('pages.agent.definition.executionMode')}
        initialValue="STANDARD"
        rules={[{ required: true }]}
        options={[
          {
            label: format('pages.agent.definition.executionMode.standard'),
            value: 'STANDARD',
          },
          {
            label: format('pages.agent.definition.executionMode.deep'),
            value: 'DEEP',
          },
        ]}
      />
      <ProFormDependency name={['executionMode']}>
        {({ executionMode }) => (
          <Form.Item
            name="systemPrompt"
            label={format(
              executionMode === 'DEEP'
                ? 'pages.agent.definition.deep.systemPrompt'
                : 'pages.agent.definition.systemPrompt',
            )}
          >
            <SystemPromptEditor
              agentName={form.getFieldValue('name')}
              placeholder={format(
                executionMode === 'DEEP'
                  ? 'pages.agent.definition.deep.systemPromptPlaceholder'
                  : 'pages.agent.definition.systemPromptPlaceholder',
              )}
            />
          </Form.Item>
        )}
      </ProFormDependency>
      {/* 模型设置：标准与 Deep 模式均展示。Deep Agent 的模型由 Admin 的
          agent/model-provider 配置解析，因此 DEEP 模式也需要可配置。 */}
      <ProFormDependency name={['executionMode']}>
        {() => (
          <ProFormSelect
            name="modelId"
            label={format('pages.agent.definition.modelProvider')}
            showSearch={true}
            rules={[{ required: true }]}
            request={() => getModelCatalogOptions('CHAT,MULTIMODAL')}
          />
        )}
      </ProFormDependency>
      <ProFormSelect
        name="contextCompressionModelId"
        label={format('pages.agent.definition.contextCompressionModel')}
        tooltip={format('pages.agent.definition.contextCompressionModelTip')}
        showSearch={true}
        allowClear={true}
        placeholder={format('pages.agent.definition.contextCompressionModelFollow')}
        request={() => getModelCatalogOptions('CHAT,MULTIMODAL')}
      />
      <ProFormSelect
        name="status"
        label={format('pages.common.status')}
        request={async () => getOptionList('Agent_Definition_Status')}
        rules={[{ required: true }]}
      />
      <ProFormSelect
        name="accessType"
        label={format('pages.agent.definition.accessType')}
        request={async () => getOptionList('Agent_Access_Type')}
      />
      <ProFormDependency name={['executionMode', 'defaultThinking']}>
        {({ executionMode, defaultThinking }) => (
          <>
            {executionMode === 'DEEP' ? (
              <ProFormDigit
                name="maxToolRounds"
                label={format('pages.agent.definition.deep.maxSteps')}
                tooltip={format('pages.agent.definition.deep.maxStepsTip')}
                min={1}
                fieldProps={{ precision: 0 }}
              />
            ) : (
              <>
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
                <ProFormDigit
                  name="maxToolRounds"
                  label={format('pages.agent.definition.maxToolRounds')}
                  min={0}
                  fieldProps={{ precision: 0 }}
                />
                <ProFormSwitch
                  name="defaultThinking"
                  label={format('pages.agent.definition.defaultThinking')}
                />
                {defaultThinking && (
                  <ProFormSelect
                    name="defaultReasoningEffort"
                    label={format('pages.agent.definition.defaultReasoningEffort')}
                    request={async () => getOptionList('Agent_Reasoning_Effort')}
                    placeholder={format('pages.agent.definition.selectDefaultReasoningEffort')}
                  />
                )}
              </>
            )}
          </>
        )}
      </ProFormDependency>

      <ProCard title="邮箱发送配置" bordered collapsible defaultCollapsed={!!id} style={{ marginBottom: 16 }}>
        <ProFormSwitch
          name="smtpEnabled"
          label="启用邮件发送"
          initialValue={false}
          extra="关闭后该 Agent 不会调用 send_email，也不会使用用户邮箱配置。"
        />
        <ProFormDependency name={['smtpEnabled']}>
          {({ smtpEnabled }) => smtpEnabled ? <>
        <ProFormText
          name="smtpSenderEmail"
          label="发件邮箱"
          placeholder="business@example.com"
          rules={[{ type: 'email', message: '请输入有效的发件邮箱' }]}
        />
        <ProFormSelect
          name="smtpProvider"
          label="邮件服务商"
          placeholder="选择后自动填充 SMTP 配置"
          options={[
            { label: 'QQ 邮箱', value: 'qq' }, { label: '网易 163 邮箱', value: '163' },
            { label: '网易 126 邮箱', value: '126' }, { label: 'Gmail', value: 'gmail' },
            { label: 'Microsoft Outlook / 365', value: 'outlook' }, { label: 'iCloud Mail', value: 'icloud' },
            { label: '自定义', value: 'custom' },
          ]}
          fieldProps={{ onChange: (provider: string) => {
            const presets: Record<string, { smtpHost: string; smtpPort: number; smtpSecurity: 'ssl' | 'starttls' }> = {
              qq: { smtpHost: 'smtp.qq.com', smtpPort: 465, smtpSecurity: 'ssl' },
              '163': { smtpHost: 'smtp.163.com', smtpPort: 465, smtpSecurity: 'ssl' },
              '126': { smtpHost: 'smtp.126.com', smtpPort: 465, smtpSecurity: 'ssl' },
              gmail: { smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecurity: 'starttls' },
              outlook: { smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecurity: 'starttls' },
              icloud: { smtpHost: 'smtp.mail.me.com', smtpPort: 587, smtpSecurity: 'starttls' },
            }
            if (presets[provider]) form.setFieldsValue(presets[provider])
          } }}
        />
        <ProFormText name="smtpHost" label="SMTP 主机" placeholder="smtp.example.com" rules={[{ max: 255 }]} />
        <ProFormDigit name="smtpPort" label="SMTP 端口" min={1} max={65535} />
        <ProFormSelect name="smtpSecurity" label="SMTP 加密方式" options={[{ label: 'SSL/TLS', value: 'ssl' }, { label: 'STARTTLS', value: 'starttls' }]} />
        <ProFormText.Password
          name="smtpAuthorizationCode"
          label="SMTP 授权码"
          placeholder={id ? '留空则保留原授权码' : '邮箱服务商提供的授权码'}
          rules={[{ max: 512 }]}
          extra="仅写入并加密保存，不会再次展示；该 Agent 发送邮件时优先使用此配置。"
        />
          </> : null}
        </ProFormDependency>
      </ProCard>

      <ProFormDependency name={['id']}>
        {(values) => {
          // 只有在编辑模式下才显示工具绑定选项
          if (!values.id) {
            return null
          }

          return (
            <ProFormSelect
              name="toolIds"
              label={format('pages.agent.tool.bind')}
              mode="multiple"
              showSearch
              request={async () => {
                return getAgentToolOptions()
              }}
              placeholder={format('pages.agent.definition.selectToolsToBind')}
            />
          )
        }}
      </ProFormDependency>
    </DrawerForm>
  )
}

export default AgentDefinitionForm
