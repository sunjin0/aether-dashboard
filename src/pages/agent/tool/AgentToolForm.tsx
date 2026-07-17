import DrawerForm from '@/components/DrawerForm'
import {
  addAgentToolInfo,
  getAgentToolInfo,
  updateAgentToolInfo,
} from '@/services/agent/ToolController'
import { getMcpServerList } from '@/services/agent/McpServerController'
import { getOptionList } from '@/services/sys/DictController'
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import { Form, Segmented } from 'antd'
import { useIntl } from '@umijs/max'
import JsonDisplay from '@/components/JsonDisplay'
import React, { useState } from 'react'

const toolTypeOptions = [
  { label: '信息库', value: 'knowledge' },
  { label: '运维', value: 'ops' },
  { label: '开发', value: 'dev' },
  { label: '通用', value: 'general' },
]

const AgentToolForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props
  const intl = useIntl()
  const [form] = Form.useForm()
  const schema = Form.useWatch('mcpInputSchema', { form, preserve: true })
  const [schemaMode, setSchemaMode] = useState<'edit' | 'preview'>('edit')
  const format = (key: string, values?: Record<string, string>) =>
    intl.formatMessage({ id: key }, values)
  const validateJson = async (_: unknown, value?: string) => {
    if (!value?.trim()) return Promise.resolve()
    try {
      JSON.parse(value)
      return Promise.resolve()
    } catch {
      return Promise.reject(
        new Error(
          format('pages.agent.tool.invalidJson', { label: format('pages.agent.tool.inputSchema') }),
        ),
      )
    }
  }
  const formatSchema = (value?: string) => {
    if (!value?.trim()) return
    try {
      form.setFieldValue('mcpInputSchema', JSON.stringify(JSON.parse(value), null, 2))
    } catch {
      // Keep invalid JSON unchanged so the form validator can show the error.
    }
  }

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      request={getAgentToolInfo}
      form={form}
      onSuccess={async (values) => {
        const payload = { ...values, status: Number(values.status) }
        if (id) await updateAgentToolInfo(payload)
        else await addAgentToolInfo(payload)
        onSuccess()
        return true
      }}
    >
      <ProFormText name="id" hidden />
      <ProFormText
        name="name"
        label={format('pages.agent.tool.name')}
        rules={[{ required: true }]}
      />
      <ProFormText
        name="code"
        label={format('pages.agent.tool.code')}
        rules={[{ required: true }]}
      />
      <ProFormTextArea name="description" label={format('pages.common.description')} />
      <ProFormSelect
        name="toolType"
        label="业务类型"
        request={async () => getOptionList('Agent_Tool_Business_Type')}
        placeholder="请选择业务类型"
      />
      <ProFormSelect
        name="mcpServerId"
        label={format('pages.agent.tool.mcpServer')}
        rules={[{ required: true }]}
        request={async () => {
          const { code, data } = await getMcpServerList({ current: 1, pageSize: 1000, status: 1 })
          return code === 200
            ? (data || []).map((item) => ({ label: `${item.name} (${item.code})`, value: item.id }))
            : []
        }}
      />
      <ProFormText
        name="mcpToolName"
        label={format('pages.agent.tool.mcpToolName')}
        rules={[{ required: true }]}
      />
      <Form.Item label={format('pages.agent.tool.inputSchema')}>
        <Segmented
          options={[
            { label: '编辑', value: 'edit' },
            { label: format('pages.agent.tool.schemaPreview'), value: 'preview' },
          ]}
          value={schemaMode}
          onChange={(value) => setSchemaMode(value as 'edit' | 'preview')}
        />
      </Form.Item>
      {schemaMode === 'edit' ? (
        <ProFormTextArea
          name="mcpInputSchema"
          initialValue="{}"
          fieldProps={{ rows: 8, onBlur: (event) => formatSchema(event.target.value) }}
          rules={[{ validator: validateJson }]}
        />
      ) : (
        <Form.Item>
          <JsonDisplay content={schema} />
        </Form.Item>
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
  )
}

export default AgentToolForm
