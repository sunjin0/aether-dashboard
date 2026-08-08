import React from 'react'
import { Handle, NodeProps, Position } from '@xyflow/react'
import { Node } from '@xyflow/react'

type WorkflowData = { workflowNode: { id: string; type: string; name?: string } }
const color = '#fa8c16'

const ConditionNode: React.FC<NodeProps<Node<WorkflowData>>> = ({ data, selected }) => {
  const item = data.workflowNode
  return (
    <div
      style={{
        minWidth: 160,
        border: `2px solid ${selected ? '#1677ff' : color}`,
        borderRadius: 10,
        overflow: 'visible',
        background: '#fff',
        boxShadow: selected ? '0 0 0 3px #91caff66' : '0 3px 12px #0000001a',
      }}
    >
      <Handle type="target" position={Position.Top} id="target-top" style={{ background: color, width: 12, height: 12 }} />
      <Handle type="target" position={Position.Left} id="target-left" style={{ background: color, width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ background: color, width: 12, height: 12 }} />
      <Handle type="source" position={Position.Right} id="source-right" style={{ background: color, width: 12, height: 12 }} />
      <div
        style={{
          padding: '6px 10px',
          background: `${color}18`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color, fontWeight: 600, fontSize: 12 }}>🔀 条件分支</span>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>拖拽移动</span>
      </div>
      <div style={{ padding: '11px 12px', fontWeight: 600 }}>
        {item.name || '条件分支'}
      </div>
    </div>
  )
}

export default ConditionNode
