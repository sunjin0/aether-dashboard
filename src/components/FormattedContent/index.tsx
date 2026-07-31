import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './index.less'

export interface FormattedContentProps {
  content?: string
  maxHeight?: number
}

type ContentFormat = 'json' | 'markdown' | 'text'

const detectFormat = (text: string): ContentFormat => {
  const trimmed = text.trim()
  if (!trimmed) return 'text'
  if (/^[{[]/.test(trimmed)) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // not strict JSON, fall through to markdown/text detection
    }
  }
  if (
    /(?:^|\n)\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|---+|\|.*\|)/.test(trimmed) ||
    /[*_]{1,2}[^*_]+[*_]{1,2}|`[^`\n]+`|\[[^\]]+\]\([^)]+\)|!\[[^\]]*\]\([^)]*\)/.test(trimmed)
  ) {
    return 'markdown'
  }
  return 'text'
}

const formatJson = (text: string): string => {
  try {
    return JSON.stringify(JSON.parse(text.trim()), null, 2)
  } catch {
    return text
  }
}

const FormattedContent: React.FC<FormattedContentProps> = ({ content, maxHeight = 180 }) => {
  if (!content) return null
  const format = detectFormat(content)
  const containerStyle: React.CSSProperties = { maxHeight, overflow: 'auto' }
  if (format === 'json') {
    return (
      <pre className="formatted-content-json" style={containerStyle}>
        {formatJson(content)}
      </pre>
    )
  }
  if (format === 'markdown') {
    return (
      <div className="formatted-content-markdown" style={containerStyle}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    )
  }
  return (
    <pre className="formatted-content-text" style={containerStyle}>
      {content}
    </pre>
  )
}

export default FormattedContent
