import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Space, Switch, Tooltip } from 'antd';
import {
  CodeOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  PlusOutlined,
  UpOutlined,
} from '@ant-design/icons';

export interface StartVariableField {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

const parseFields = (value?: string): StartVariableField[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
};

export interface StartVariablesBuilderProps {
  value?: string;
  onChange?: (value: string) => void;
}

const StartVariablesBuilder: React.FC<StartVariablesBuilderProps> = ({ value, onChange }) => {
  const [fields, setFields] = useState<StartVariableField[]>(() => parseFields(value));
  const [jsonMode, setJsonMode] = useState(false);
  useEffect(() => {
    setFields(parseFields(value));
  }, [value]);
  const emit = (next: StartVariableField[]) => {
    setFields(next);
    onChange?.(JSON.stringify(next, null, 2));
  };
  const update = (index: number, patch: Partial<StartVariableField>) =>
    emit(fields.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const add = () =>
    emit([...fields, { name: `input_${fields.length + 1}`, label: `输入${fields.length + 1}` }]);
  const remove = (index: number) => emit(fields.filter((_, i) => i !== index));
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  };
  const labels: { name: string; label: string } = {
    name: '变量名（name）',
    label: '显示名称（label）',
  };
  if (jsonMode) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Input.TextArea
          value={value || '[]'}
          rows={6}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={'[{"name":"input","label":"任务说明","required":true}]'}
        />
        <Button
          block
          icon={<EyeOutlined />}
          onClick={() => {
            setJsonMode(false);
            setFields(parseFields(value));
          }}
        >
          返回可视化编辑
        </Button>
      </Space>
    );
  }
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
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
      {fields.map((field, index) => (
        <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>字段 {index + 1}</span>
              <Space size={0}>
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
              </Space>
            </Space>
            <label>{labels.name}</label>
            <Input
              value={field.name}
              placeholder="如 input"
              onChange={(e) => update(index, { name: e.target.value })}
            />
            <label>{labels.label}</label>
            <Input
              value={field.label}
              placeholder="如 任务说明"
              onChange={(e) => update(index, { label: e.target.value })}
            />
            <label>占位提示（placeholder）</label>
            <Input
              value={field.placeholder}
              placeholder="如 请输入任务说明"
              onChange={(e) => update(index, { placeholder: e.target.value })}
            />
            <Space>
              <Checkbox
                checked={!!field.required}
                onChange={(e) => update(index, { required: e.target.checked })}
              >
                必填
              </Checkbox>
              <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                在提示词/参数模板中用 {'${name}'} 引用
              </span>
            </Space>
          </Space>
        </div>
      ))}
      <Button type="dashed" block icon={<PlusOutlined />} onClick={add}>
        添加字段
      </Button>
    </Space>
  );
};

export default StartVariablesBuilder;
