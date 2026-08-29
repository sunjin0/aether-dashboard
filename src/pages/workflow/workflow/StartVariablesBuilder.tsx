import React, { useEffect, useState } from 'react'
import { Button, Checkbox, Input, Space, Tooltip } from 'antd'
import {
  CodeOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  PlusOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { useIntl } from '@umijs/max'

export interface StartVariableField {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

const parseFields = (value?: string): StartVariableField[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : []
  } catch {
    return []
  }
}

export interface StartVariablesBuilderProps {
  value?: string;
  onChange?: (value: string) => void;
  mode?: 'input' | 'output';
}

const StartVariablesBuilder: React.FC<StartVariablesBuilderProps> = ({ value, onChange, mode = 'input' }) => {
  const intl = useIntl()
  const outputMode = mode === 'output'
  const [fields, setFields] = useState<StartVariableField[]>(() => parseFields(value))
  const [jsonMode, setJsonMode] = useState(false)
  useEffect(() => {
    setFields(parseFields(value))
  }, [value])
  const emit = (next: StartVariableField[]) => {
    setFields(next)
    onChange?.(JSON.stringify(next, null, 2))
  }
  const update = (index: number, patch: Partial<StartVariableField>) =>
    emit(fields.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const add = () => {
    let n = 1
    const used = new Set(fields.map((f) => f.name))
    const prefix = outputMode ? 'output' : 'input'
    while (used.has(`${prefix}_${n}`)) n += 1
    emit([
      ...fields,
      {
        name: `${prefix}_${n}`,
        label: intl.formatMessage(
          { id: outputMode ? 'pages.agent.workflow.schemaBuilder.defaultOutputLabel' : 'pages.agent.workflow.schemaBuilder.defaultInputLabel' },
          { number: n },
        ),
      },
    ])
  }
  const remove = (index: number) => emit(fields.filter((_, i) => i !== index))
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= fields.length) return
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]]
    emit(next)
  }
  if (jsonMode) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Input.TextArea
          value={value || '[]'}
          rows={6}
          style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 12 }}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={intl.formatMessage({
            id: outputMode
              ? 'pages.agent.workflow.schemaBuilder.outputJsonPlaceholder'
              : 'pages.agent.workflow.schemaBuilder.inputJsonPlaceholder',
          })}
        />
        <Button
          block
          icon={<EyeOutlined />}
          onClick={() => {
            setJsonMode(false)
            setFields(parseFields(value))
          }}
        >
          {intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.backToVisualEditor' })}
        </Button>
      </Space>
    )
  }
  const nameCount = fields.reduce<Record<string, number>>((acc, f) => {
    const k = (f.name || '').trim()
    if (k) acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#8c8c8c',
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: fields.length > 0 ? '#1677ff' : '#d9d9d9',
            }}
          />
          {fields.length > 0
            ? intl.formatMessage(
                { id: 'pages.agent.workflow.schemaBuilder.fieldCount' },
                {
                  count: fields.length,
                  type: intl.formatMessage({
                    id: outputMode
                      ? 'pages.agent.workflow.schemaBuilder.outputFields'
                      : 'pages.agent.workflow.schemaBuilder.inputVariables',
                  }),
                },
              )
            : intl.formatMessage({
                id: outputMode
                  ? 'pages.agent.workflow.schemaBuilder.noOutputFields'
                  : 'pages.agent.workflow.schemaBuilder.noInputVariables',
              })}
        </span>
        <Tooltip title={intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.switchJsonEditor' })}>
          <Button
            size="small"
            type="text"
            icon={<CodeOutlined />}
            onClick={() => setJsonMode(true)}
          />
        </Tooltip>
      </Space>
      {fields.map((field, index) => {
        const duplicated = !!(field.name && nameCount[field.name.trim()] > 1)
        return (
          <div
            key={index}
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 auto',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#e6f4ff',
                  color: '#1677ff',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {index + 1}
              </span>
              <Input
                size="small"
                style={{ flex: 1, minWidth: 0 }}
                value={field.name}
                placeholder={intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.variableNamePlaceholder' })}
                status={duplicated ? 'error' : undefined}
                onChange={(e) => update(index, { name: e.target.value })}
              />
              <Input
                size="small"
                style={{ flex: 1, minWidth: 0 }}
                value={field.label}
                placeholder={intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.displayNamePlaceholder' })}
                onChange={(e) => update(index, { label: e.target.value })}
              />
              <Tooltip title={intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.moveUp' })}>
                <Button
                  size="small"
                  type="text"
                  icon={<UpOutlined />}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
              </Tooltip>
              <Tooltip title={intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.moveDown' })}>
                <Button
                  size="small"
                  type="text"
                  icon={<DownOutlined />}
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, 1)}
                />
              </Tooltip>
              <Tooltip title={intl.formatMessage({ id: 'pages.common.delete' })}>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(index)}
                />
              </Tooltip>
            </div>
            {!outputMode && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <Input
                  size="small"
                  style={{ flex: 1, minWidth: 0 }}
                  value={field.placeholder}
                  placeholder={intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.placeholderHint' })}
                  onChange={(e) => update(index, { placeholder: e.target.value })}
                />
                <Checkbox
                  style={{ flex: '0 0 auto' }}
                  checked={!!field.required}
                  onChange={(e) => update(index, { required: e.target.checked })}
                >
                  {intl.formatMessage({ id: 'pages.common.required' })}
                </Checkbox>
              </div>
            )}
            {duplicated && (
              <span
                style={{
                  color: '#ff4d4f',
                  fontSize: 12,
                  marginTop: 6,
                  display: 'block',
                  paddingLeft: 26,
                }}
              >
                {intl.formatMessage(
                  { id: 'pages.agent.workflow.schemaBuilder.duplicateVariable' },
                  { name: field.name },
                )}
              </span>
            )}
          </div>
        )
      })}
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        style={{ color: '#1677ff' }}
        onClick={add}
      >
        {intl.formatMessage({ id: 'pages.agent.workflow.schemaBuilder.addField' })}
      </Button>
    </Space>
  )
}

export default StartVariablesBuilder
