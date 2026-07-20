import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Empty, Spin } from 'antd'
import { useIntl } from '@umijs/max'
import './index.less'

export interface MarkdownTextProps {
  content?: string;
  error?: boolean;
  className?: string;
  loading?: boolean;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ content, error, className, loading }) => {
  const intl = useIntl()
  if (!content) {
    if (loading) {
      return (
        <div className="markdown-text-loading">
          <Spin />
          <span>{intl.formatMessage({ id: 'components.markdownText.thinking' })}</span>
        </div>
      )
    }
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.formatMessage({ id: 'components.markdownText.empty' })} />
  }

  return (
    <div
      className={`markdown-text-block${error ? ' markdown-text-error' : ''}${className ? ` ${className}` : ''}`}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

export default MarkdownText
