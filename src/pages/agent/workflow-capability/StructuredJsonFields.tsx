import React from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Select, Space, Switch, Typography } from 'antd'

export type SchemaField = { name: string; type?: string; description?: string; required?: boolean }
export type JsonObjectRow = { key: string; value: string }

export const arrayToRows = (value?: string): string[] => {
  if (!value?.trim()) return []
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
}
export const objectToRows = (value?: string): JsonObjectRow[] => {
  if (!value?.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.entries(parsed).map(([key, item]) => ({ key, value: typeof item === 'string' ? item : JSON.stringify(item) })) : []
  } catch { return [] }
}
export const schemaToRows = (value?: string): SchemaField[] => {
  if (!value?.trim()) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: item?.name || item?.key || item?.field || item?.id || '',
        type: item?.type || 'string',
        description: item?.description || item?.label || '',
        required: Boolean(item?.required),
      })).filter(item => item.name)
    }
    const properties = parsed?.properties || parsed
    const required = new Set(parsed?.required || [])
    return Object.entries(properties || {}).map(([name, item]: [string, any]) => ({ name, type: item?.type || 'string', description: item?.description || '', required: required.has(name) }))
  } catch { return [] }
}
export const rowsToObject = (rows: JsonObjectRow[] = []) => rows.reduce<Record<string, unknown>>((result, row) => {
  if (!row?.key?.trim()) return result
  try { result[row.key.trim()] = JSON.parse(row.value) } catch { result[row.key.trim()] = row.value }
  return result
}, {})
export const rowsToSchema = (rows: SchemaField[] = []) => ({
  type: 'object',
  properties: rows.filter(row => row?.name?.trim()).reduce<Record<string, unknown>>((result, row) => {
    result[row.name.trim()] = { type: row.type || 'string', ...(row.description ? { description: row.description } : {}) }
    return result
  }, {}),
  required: rows.filter(row => row?.name?.trim() && row.required).map(row => row.name.trim()),
})

type JsonMode = 'structured' | 'preview'
type JsonModeProps = { structuredLabel?: string; previewLabel?: string }

const ModeSwitch: React.FC<{ mode: JsonMode; setMode: (mode: JsonMode) => void } & JsonModeProps> = ({ mode, setMode, structuredLabel = '结构化添加', previewLabel = 'JSON 预览' }) => (
  <Button.Group size="small">
    <Button type={mode === 'structured' ? 'primary' : 'default'} onClick={() => setMode('structured')}>{structuredLabel}</Button>
    <Button type={mode === 'preview' ? 'primary' : 'default'} onClick={() => setMode('preview')}>{previewLabel}</Button>
  </Button.Group>
)

export const StructuredArrayField: React.FC<{ name: string; label: string; hint?: string } & JsonModeProps> = ({ name, label, hint, structuredLabel, previewLabel }) => {
  const form = Form.useFormInstance()
  const rows = Form.useWatch(name, form) || []
  const [mode, setMode] = React.useState<JsonMode>('structured')
  return <Form.Item extra={hint}><Card size="small" title={label} extra={<ModeSwitch mode={mode} setMode={setMode} structuredLabel={structuredLabel} previewLabel={previewLabel} />}>
    {mode === 'structured' ? <Form.List name={name}>{(fields, { add, remove }) => <>
      <Space direction="vertical" style={{ width: '100%' }} size={6}>{fields.map(field => <Space key={field.key} style={{ width: '100%' }} align="start"><Form.Item {...field} noStyle><Input placeholder="value" /></Form.Item><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></Space>)}</Space>
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add('')} style={{ marginTop: 8 }}>添加</Button>
    </>}</Form.List> : <Typography.Paragraph copyable={{ text: JSON.stringify(rows, null, 2) }} style={{ marginBottom: 0 }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(rows, null, 2)}</pre></Typography.Paragraph>}
  </Card></Form.Item>
}

export const StructuredObjectField: React.FC<{ name: string; label: string; hint?: string } & JsonModeProps> = ({ name, label, hint, structuredLabel, previewLabel }) => {
  const form = Form.useFormInstance()
  const rows = Form.useWatch(name, form) || []
  const [mode, setMode] = React.useState<JsonMode>('structured')
  const preview = rowsToObject(rows)
  return <Form.Item extra={hint}><Card size="small" title={label} extra={<ModeSwitch mode={mode} setMode={setMode} structuredLabel={structuredLabel} previewLabel={previewLabel} />}>
    {mode === 'structured' ? <Form.List name={name}>{(fields, { add, remove }) => <>
      {fields.map(field => <Space key={field.key} style={{ display: 'flex', width: '100%', marginBottom: 6 }} align="start"><Form.Item {...field} name={[field.name, 'key']} noStyle><Input placeholder="key" style={{ width: '32%' }} /></Form.Item><Form.Item {...field} name={[field.name, 'value']} noStyle><Input placeholder="value / JSON" style={{ flex: 1 }} /></Form.Item><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></Space>)}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ key: '', value: '' })}>添加字段</Button>
    </>}</Form.List> : <Typography.Paragraph copyable={{ text: JSON.stringify(preview, null, 2) }} style={{ marginBottom: 0 }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre></Typography.Paragraph>}
  </Card></Form.Item>
}

export const StructuredSchemaField: React.FC<{ name: string; label: string; hint?: string } & JsonModeProps> = ({ name, label, hint, structuredLabel, previewLabel }) => {
  const form = Form.useFormInstance()
  const rows: SchemaField[] = Form.useWatch(name, form) || []
  const [mode, setMode] = React.useState<JsonMode>('structured')
  const preview = rowsToSchema(rows)
  return <Form.Item extra={hint}><Card size="small" title={label} extra={<ModeSwitch mode={mode} setMode={setMode} structuredLabel={structuredLabel} previewLabel={previewLabel} />}>
    {mode === 'structured' ? <Form.List name={name}>{(fields, { add, remove }) => <>
      {fields.map(field => <Card key={field.key} size="small" style={{ marginBottom: 8 }}><Space direction="vertical" style={{ width: '100%' }}><Space style={{ width: '100%' }}><Form.Item {...field} name={[field.name, 'name']} noStyle><Input placeholder="字段名" /></Form.Item><Form.Item {...field} name={[field.name, 'type']} noStyle><Select style={{ width: 120 }} options={['string', 'number', 'integer', 'boolean', 'array', 'object'].map(type => ({ label: type, value: type }))} /></Form.Item><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></Space><Form.Item {...field} name={[field.name, 'description']} noStyle><Input placeholder="字段说明" /></Form.Item><Form.Item {...field} name={[field.name, 'required']} valuePropName="checked" noStyle><Switch checkedChildren="必填" unCheckedChildren="可选" /></Form.Item></Space></Card>)}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name: '', type: 'string', required: false })}>添加字段</Button>
    </>}</Form.List> : <Typography.Paragraph copyable={{ text: JSON.stringify(preview, null, 2) }} style={{ marginBottom: 0 }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre></Typography.Paragraph>}
  </Card></Form.Item>
}
