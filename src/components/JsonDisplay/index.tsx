import React from 'react'
import { Empty } from 'antd'
import './index.less'

export interface JsonDisplayProps {
  content?: string;
  error?: boolean;
  className?: string;
}

const formatJson = (str: string): string => {
  try {
    const obj = JSON.parse(str)
    return JSON.stringify(obj, null, 2)
  } catch {
    return str
  }
}

const syntaxHighlight = (json: string): React.ReactNode[] => {
  const lines = json.split('\n')
  return lines.map((line, index) => {
    const highlighted = line
      .replace(/"([^"]+)"(?=\s*:)/g, '<span class="json-key">"$1"</span>')
      .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
    return <div key={index} dangerouslySetInnerHTML={{ __html: highlighted }} />
  })
}

const JsonDisplay: React.FC<JsonDisplayProps> = ({ content, error, className }) => {
  if (!content) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" />
  }

  const formatted = formatJson(content)

  return (
    <div
      className={`json-display-block${error ? ' json-display-error' : ''}${className ? ` ${className}` : ''}`}
    >
      <div className="json-display-content">{syntaxHighlight(formatted)}</div>
    </div>
  )
}

export default JsonDisplay
