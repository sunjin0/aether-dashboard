import React, { useState } from 'react'
import { Button, Input, InputNumber, Radio, Select, Space, Tooltip } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

/**
 * 结构化变量编辑器：把工作流运行中的共享变量（可含嵌套对象/数组）递归渲染为
 * 可编辑字段，替换原先整段 JSON 文本编辑，避免用户手写大括号、漏引号破坏状态。
 *
 * 受控用法：<VariableStructEditor value={variablesDraft} onChange={setVariablesDraft} />
 * value 必须是非数组的对象（共享变量顶层键）。
 */

type Kind = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'null', label: '空值' },
  { value: 'object', label: '对象' },
  { value: 'array', label: '数组' },
]

const kindOf = (value: unknown): Kind => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return typeof value as Kind
}

const emptyOf = (kind: Kind): unknown => {
  switch (kind) {
    case 'string': return ''
    case 'number': return 0
    case 'boolean': return false
    case 'null': return null
    case 'array': return []
    case 'object': return {}
  }
}

/** 叶子值控件：左侧类型选择（可在 string/number/boolean/null 间互转），右侧按类型编辑。 */
const LeafEditor: React.FC<{ value: unknown; onChange: (next: unknown) => void }> = ({ value, onChange }) => {
  const kind = kindOf(value)
  const editable = kind === 'string' || kind === 'number' || kind === 'boolean'
  const input =
    kind === 'string' ? (
      <Input
        allowClear
        value={value as string}
        placeholder="(空字符串)"
        onChange={(event) => onChange(event.target.value)}
      />
    ) : kind === 'number' ? (
      <InputNumber
        style={{ width: '100%' }}
        value={value as number}
        onChange={(next) => onChange(next ?? 0)}
      />
    ) : kind === 'boolean' ? (
      <Radio.Group
        value={value as boolean}
        onChange={(event) => onChange(event.target.value === true)}
        optionType="button"
        buttonStyle="solid"
        options={[
          { value: true, label: 'true' },
          { value: false, label: 'false' },
        ]}
      />
    ) : null
  return (
    <Space.Compact block style={{ width: '100%' }}>
      <Select
        value={kind}
        style={{ width: 96 }}
        onChange={(next: Kind) => onChange(emptyOf(next))}
        options={KIND_OPTIONS.filter((option) => option.value !== 'object' && option.value !== 'array')}
      />
      {editable ? <div style={{ flex: 1 }}>{input}</div> : <span style={{ padding: '0 12px', lineHeight: '32px' }}>(空值)</span>}
    </Space.Compact>
  )
}

const JsonEditor: React.FC<{ value: unknown; onChange: (next: unknown) => void; depth: number }> = ({ value, onChange, depth }) => {
  const kind = kindOf(value)
  if (kind === 'string' || kind === 'number' || kind === 'boolean' || kind === 'null') {
    return <LeafEditor value={value} onChange={onChange} />
  }
  if (kind === 'array') {
    return <ArrayEditor value={value as unknown[]} onChange={onChange} depth={depth} />
  }
  return <ObjectEditor value={value as Record<string, unknown>} onChange={onChange} depth={depth} />
}

const indentStyle = (depth: number): React.CSSProperties => ({
  marginLeft: depth > 0 ? 16 : 0,
  paddingLeft: 8,
  borderLeft: depth > 0 ? '1px dashed #d9d9d9' : undefined,
})

const ObjectEditor: React.FC<{
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  depth: number
}> = ({ value, onChange, depth }) => {
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newKind, setNewKind] = useState<Kind>('string')
  const entries = Object.entries(value)
  const confirmAdd = () => {
    const key = newKey.trim()
    if (!key) return
    if (Object.prototype.hasOwnProperty.call(value, key)) return
    onChange({ ...value, [key]: emptyOf(newKind) })
    setNewKey('')
    setNewKind('string')
    setAdding(false)
  }
  return (
    <div style={indentStyle(depth)}>
      {entries.map(([key, child]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <Tooltip title="键名">
            <div style={{ fontWeight: 600, minWidth: 96, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '32px', flexShrink: 0 }}>
              {key}
            </div>
          </Tooltip>
          <div style={{ flex: 1 }}>
            <JsonEditor value={child} depth={depth + 1} onChange={(next) => onChange({ ...value, [key]: next })} />
          </div>
          <Tooltip title="删除该字段">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                const rest: Record<string, unknown> = {}
                Object.entries(value).forEach(([k, v]) => { if (k !== key) rest[k] = v })
                onChange(rest)
              }}
            />
          </Tooltip>
        </div>
      ))}
      {adding ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <Input
            autoFocus
            style={{ minWidth: 96, maxWidth: 160, flexShrink: 0 }}
            placeholder="新键名"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            onPressEnter={confirmAdd}
          />
          <Space.Compact style={{ flex: 1 }}>
            <Select style={{ width: 96 }} value={newKind} onChange={setNewKind} options={KIND_OPTIONS} />
            <Button type="primary" onClick={confirmAdd} disabled={!newKey.trim()}>添加</Button>
            <Button onClick={() => setAdding(false)}>取消</Button>
          </Space.Compact>
        </div>
      ) : (
        <Button size="small" type="dashed" block icon={<PlusOutlined />} onClick={() => setAdding(true)} style={{ marginBottom: 8 }}>
          新增字段
        </Button>
      )}
    </div>
  )
}

const ArrayEditor: React.FC<{
  value: unknown[]
  onChange: (next: unknown[]) => void
  depth: number
}> = ({ value, onChange, depth }) => {
  const [newKind, setNewKind] = useState<Kind>('string')
  const append = () => onChange([...value, emptyOf(newKind)])
  return (
    <div style={indentStyle(depth)}>
      {value.map((item, index) => (
        <div key={`${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, minWidth: 40, lineHeight: '32px', flexShrink: 0, color: '#8c8c8c' }}>
            [{index}]
          </div>
          <div style={{ flex: 1 }}>
            <JsonEditor value={item} depth={depth + 1} onChange={(next) => onChange(value.map((it, i) => (i === index ? next : it)))} />
          </div>
          <Tooltip title="删除该元素">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            />
          </Tooltip>
        </div>
      ))}
      <Space.Compact block>
        <Select style={{ width: 96 }} value={newKind} onChange={setNewKind} options={KIND_OPTIONS} />
        <Button type="dashed" icon={<PlusOutlined />} onClick={append}>新增元素</Button>
      </Space.Compact>
    </div>
  )
}

export type VariableStructEditorProps = {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

const VariableStructEditor: React.FC<VariableStructEditorProps> = ({ value, onChange }) => (
  <div>
    {Object.keys(value).length === 0 && (
      <div style={{ color: '#8c8c8c', marginBottom: 12 }}>暂无共享变量，可在下方新增字段。</div>
    )}
    <ObjectEditor value={value} onChange={onChange} depth={0} />
  </div>
)

export default VariableStructEditor
