import React, { useEffect, useRef, useState } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, Select, Empty } from 'antd'
import { useIntl } from '@umijs/max'

interface SchemaField {
  key: string;
  type: string;
}

interface SchemaFieldsProps {
  value?: string;
  onChange?: (value: string) => void;
}

const TYPE_OPTIONS = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'].map(
  (item) => ({ label: item, value: item }),
)

/** 将 JSON 序列化为 K-V 行；兼容 {properties:{...}} 与平铺对象两种结构。 */
const parseSchema = (text?: string): SchemaField[] => {
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const properties = parsed?.properties
    const source: Record<string, unknown> =
      properties && typeof properties === 'object'
        ? (properties as Record<string, unknown>)
        : parsed
    if (source && typeof source === 'object') {
      return Object.entries(source).map(([key, value]) => ({
        key,
        type:
          value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string'
            ? (value as { type: string }).type
            : String(value),
      }))
    }
  } catch {
    // 旧的自由文本无法解析时保留空列表，允许用户重新录入
  }
  return []
}

/** 将 K-V 行序列化为 {"type":"object","properties":{...}}。 */
const serializeSchema = (rows: SchemaField[]): string => {
  const properties: Record<string, { type: string }> = {}
  rows.forEach((row) => {
    const key = row.key.trim()
    if (key) properties[key] = { type: row.type.trim() || 'string' }
  })
  return JSON.stringify({ type: 'object', properties })
}

const SchemaFields: React.FC<SchemaFieldsProps> = ({ value, onChange }) => {
  const intl = useIntl()
  const format = (key: string) => intl.formatMessage({ id: key })
  const [rows, setRows] = useState<SchemaField[]>([])
  const lastValueRef = useRef(value)

  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value
      setRows(parseSchema(value))
    }
  }, [value])

  const update = (next: SchemaField[]) => {
    lastValueRef.current = serializeSchema(next)
    onChange?.(lastValueRef.current)
    setRows(next)
  }

  const updateRow = (index: number, patch: Partial<SchemaField>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    update(next)
  }

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    update(next)
  }

  return (
    <div
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} style={{ margin: '4px 0' }} />
      ) : (
        rows.map((row, index) => (
          <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              style={{ flex: 1 }}
              placeholder={format('pages.agent.skill.schemaFieldPlaceholder')}
              value={row.key}
              onChange={(e) => updateRow(index, { key: e.target.value })}
            />
            <Select
              style={{ width: 140 }}
              options={TYPE_OPTIONS}
              value={row.type}
              onChange={(type) => updateRow(index, { type })}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeRow(index)}
            />
          </div>
        ))
      )}
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={() => update([...rows, { key: '', type: 'string' }])}
      >
        {format('pages.agent.skill.schemaAddField')}
      </Button>
    </div>
  )
}

export default SchemaFields