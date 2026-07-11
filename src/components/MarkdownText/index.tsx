import React from 'react';
import ReactMarkdown from 'react-markdown';
import {Empty, Spin} from 'antd';
import './index.less';

export interface MarkdownTextProps {
  content?: string;
  error?: boolean;
  className?: string;
  loading?: boolean;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({content, error, className, loading}) => {
  if (!content) {
    if (loading) {
      return (
        <div className="markdown-text-loading">
          <Spin />
          <span>思考中...</span>
        </div>
      );
    }
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" />;
  }

  return (
    <div
      className={`markdown-text-block${error ? ' markdown-text-error' : ''}${className ? ` ${className}` : ''}`}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownText;
