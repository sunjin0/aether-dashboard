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
}

const StartVariablesBuilder: React.FC<StartVariablesBuilderProps> = ({ value, onChange }) => {
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
    while (used.has(`input_${n}`)) n += 1
    emit([...fields, { name: `input_${n}`, label: `输入${n}` }])
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
          placeholder={'[{"name":"input","label":"任务说明","required":true}]'}
        />
        <Button
          block
          icon={<EyeOutlined />}
          onClick={() => {
            setJsonMode(false)
            setFields(parseFields(value))
          }}
        >
          返回可视化编辑
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
            ? `${fields.length} 个开始变量`
            : '暂无开始变量，启动流程时不显示输入表单'}
        </span>
        <Tooltip title="切换 JSON 编辑">
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
                placeholder="变量名 name"
                status={duplicated ? 'error' : undefined}
                onChange={(e) => update(index, { name: e.target.value })}
              />
              <Input
                size="small"
                style={{ flex: 1, minWidth: 0 }}
                value={field.label}
                placeholder="显示名称 label"
                onChange={(e) => update(index, { label: e.target.value })}
              />
              <Tooltip title="上移">
                <Button
                  size="small"
                  type="text"
                  icon={<UpOutlined />}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
              </Tooltip>
              <Tooltip title="下移">
                <Button
                  size="small"
                  type="text"
                  icon={<DownOutlined />}
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, 1)}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(index)}
                />
              </Tooltip>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <Input
                size="small"
                style={{ flex: 1, minWidth: 0 }}
                value={field.placeholder}
                placeholder="占位提示 placeholder（可选）"
                onChange={(e) => update(index, { placeholder: e.target.value })}
              />
              <Checkbox
                style={{ flex: '0 0 auto' }}
                checked={!!field.required}
                onChange={(e) => update(index, { required: e.target.checked })}
              >
                必填
              </Checkbox>
            </div>
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
                变量名重复，{'${'}{field.name}{'}'} 引用会冲突
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
        添加字段
      </Button>
    </Space>
  )
}

export default StartVariablesBuilder
