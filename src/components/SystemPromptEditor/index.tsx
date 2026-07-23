import React, { useState, useCallback, useMemo } from 'react';
import { useIntl } from '@umijs/max';
import { Input, Button, Tabs } from 'antd';
import { RocketOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import MarkdownText from '@/components/MarkdownText';
import PromptGenerateModal from './PromptGenerateModal';
import TemplateSelect from './TemplateSelect';
import OptimizerButton from './OptimizerButton';
import './index.less';

const { TextArea } = Input;

interface SystemPromptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  agentName?: string;
  placeholder?: string;
  disabled?: boolean;
}

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars / 4);
};

const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  value = '',
  onChange,
  agentName,
  placeholder: placeholderProp,
  disabled,
}) => {
  const intl = useIntl();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('edit');
  const placeholder =
    placeholderProp ??
    intl.formatMessage({ id: 'pages.components.systemPromptEditor.placeholder' });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  const handleGenerated = useCallback(
    (prompt: string) => {
      onChange?.(prompt);
    },
    [onChange],
  );

  const handleTemplateSelect = useCallback(
    (content: string) => {
      onChange?.(content);
    },
    [onChange],
  );

  const handleOptimized = useCallback(
    (optimized: string) => {
      onChange?.(optimized);
    },
    [onChange],
  );

  const stats = useMemo(() => {
    const chars = value?.length || 0;
    const tokens = estimateTokens(value || '');
    return { chars, tokens };
  }, [value]);

  return (
    <div className="system-prompt-editor-wrapper">
      <div className="system-prompt-editor-toolbar">
        <div className="system-prompt-editor-toolbar-left">
          <Button
            icon={<RocketOutlined />}
            onClick={() => setGenerateOpen(true)}
            disabled={disabled}
          >
            {intl.formatMessage({ id: 'pages.components.systemPromptEditor.aiGenerate' })}
          </Button>
          <TemplateSelect onSelect={handleTemplateSelect} />
        </div>
        <div className="system-prompt-editor-toolbar-right">
          <OptimizerButton prompt={value || ''} onOptimized={handleOptimized} disabled={disabled} />
        </div>
      </div>

      <div className="system-prompt-editor-content">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          items={[
            {
              key: 'edit',
              label: (
                <span>
                  <EditOutlined /> {intl.formatMessage({ id: 'pages.common.edit' })}
                </span>
              ),
              children: (
                <TextArea
                  className="system-prompt-editor-textarea"
                  value={value}
                  onChange={handleChange}
                  placeholder={placeholder}
                  autoSize={{ minRows: 8, maxRows: 20 }}
                  disabled={disabled}
                />
              ),
            },
            {
              key: 'preview',
              label: (
                <span>
                  <EyeOutlined /> {intl.formatMessage({ id: 'pages.common.preview' })}
                </span>
              ),
              children: (
                <div className="system-prompt-editor-preview">
                  <MarkdownText content={value} />
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="system-prompt-editor-status">
        <span>
          {intl.formatMessage(
            { id: 'pages.components.systemPromptEditor.characters' },
            { count: stats.chars },
          )}
        </span>
        <span>
          {intl.formatMessage(
            { id: 'pages.components.systemPromptEditor.tokens' },
            { count: stats.tokens },
          )}
        </span>
      </div>

      <PromptGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={handleGenerated}
        agentName={agentName}
      />
    </div>
  );
};

export default SystemPromptEditor;
