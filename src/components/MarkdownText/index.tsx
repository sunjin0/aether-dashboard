import React from 'react';
import ReactMarkdown from 'react-markdown';
import {Empty} from 'antd';
import './index.less';

export interface MarkdownTextProps {
  content?: string;
  error?: boolean;
  className?: string;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({content, error, className}) => {
  if (!content) {
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
