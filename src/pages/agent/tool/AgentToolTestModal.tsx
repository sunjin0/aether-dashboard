import { getAgentToolInfo, testAgentTool } from '@/services/agent/ToolController'
import { AgentToolTestResult } from '@/services/entity/Agent'
import { useIntl } from '@umijs/max'
import { Button, Form, Input, message, Modal, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'

const formatJson = (value: unknown) => JSON.stringify(value, null, 2)

const AgentToolTestModal = (props: { toolId?: string; open: boolean; onClose: () => void }) => {
  const { toolId, open, onClose } = props
  const intl = useIntl()
  const format = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)
  const [form] = Form.useForm()
  const [schema, setSchema] = useState('{}')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentToolTestResult>()

  useEffect(() => {
    if (!open || !toolId) {
      return
    }

    getAgentToolInfo(toolId).then(({ code, data, message: msg }) => {
      if (code !== 200 || !data) {
        message.error(msg || format('pages.agent.tool.getDetailFailed'))
        return
      }
      setSchema(data.mcpInputSchema || '{}')
      form.setFieldsValue({ arguments: '{}' })
      setResult(undefined)
    })
  }, [form, open, toolId])

  const handleTest = async () => {
    try {
      const values = await form.validateFields()
      const argumentsValue = JSON.parse(values.arguments)
      if (!argumentsValue || Array.isArray(argumentsValue) || typeof argumentsValue !== 'object') {
        message.error(format('pages.agent.tool.argumentsObject'))
        return
      }
      if (!toolId) {
        return
      }
      setLoading(true)
      const { code, data, message: msg } = await testAgentTool(toolId, argumentsValue)
      if (code === 200) {
        setResult(data)
      } else {
        message.error(msg || format('pages.agent.tool.testFailed'))
      }
    } catch {
      message.error(format('pages.agent.tool.invalidArguments'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={format('pages.agent.tool.testTitle')}
      open={open}
      onCancel={onClose}
      width={760}
      footer={
        <Space>
          <Button onClick={onClose}>{format('pages.common.close')}</Button>
          <Button type="primary" loading={loading} onClick={handleTest}>
            {format('pages.agent.tool.runTest')}
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph>
        <Typography.Text strong>{format('pages.agent.tool.inputSchema')}</Typography.Text>
      </Typography.Paragraph>
      <Input.TextArea value={schema} readOnly rows={6} />
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="arguments"
          label={format('pages.agent.tool.testArguments')}
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={8} placeholder={'{\n  "keyword": "test"\n}'} />
        </Form.Item>
      </Form>
      {result && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Typography.Text>
            {format('pages.agent.tool.latency')}：
            {typeof result.latencyMs === 'number'
              ? `${result.latencyMs} ms`
              : format('pages.agent.tool.notReturned')}
          </Typography.Text>
          {result.errorMsg && (
            <Typography.Text type="danger">
              {format('pages.agent.tool.error')}：{result.errorMsg}
            </Typography.Text>
          )}
          <div>
            <Typography.Text strong>{format('pages.agent.tool.result')}</Typography.Text>
            <Input.TextArea
              value={formatJson(result.content ?? result.rawResponse ?? result)}
              readOnly
              rows={10}
            />
          </div>
          {result.requestUrl && (
            <Typography.Text type="secondary">
              {result.requestMethod} {result.requestUrl}
            </Typography.Text>
          )}
        </Space>
      )}
    </Modal>
  )
}

export default AgentToolTestModal
