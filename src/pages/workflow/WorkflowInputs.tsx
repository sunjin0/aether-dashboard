import { useIntl } from '@umijs/max';
import { Form, Input, InputNumber, Select, Switch } from 'antd';
import React from 'react';

export type WorkflowField = {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  default?: unknown;
  enum?: Array<string | number>;
};
export function parseWorkflowFields(schema?: string): WorkflowField[] {
  try {
    const fields = JSON.parse(schema || '[]');
    return Array.isArray(fields)
      ? fields.filter((field) => field && typeof field.name === 'string')
      : [];
  } catch {
    return [];
  }
}
export function inputValue(field: WorkflowField, value: unknown) {
  return ['object', 'array'].includes(field.type || '') &&
    typeof value !== 'string' &&
    value != null
    ? JSON.stringify(value, null, 2)
    : value;
}
export function submittedValue(field: WorkflowField, value: unknown) {
  return ['object', 'array'].includes(field.type || '') && typeof value === 'string' && value.trim()
    ? JSON.parse(value)
    : value;
}
export default function WorkflowInputs({
  fields,
  prefix,
}: {
  fields: WorkflowField[];
  prefix?: string;
}) {
  const intl = useIntl();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
        gap: '0 20px',
      }}
    >
      {fields.map((field) => {
        const structured = ['object', 'array'].includes(field.type || '');
        return (
          <Form.Item
            key={field.name}
            name={prefix ? [prefix, field.name] : field.name}
            label={field.label || field.name}
            initialValue={inputValue(
              field,
              field.default ?? (field.type === 'boolean' ? false : undefined),
            )}
            valuePropName={field.type === 'boolean' ? 'checked' : 'value'}
            rules={[
              {
                required: field.required,
                message: intl.formatMessage(
                  { id: 'pages.workflowUX.requiredField' },
                  { name: field.label || field.name },
                ),
              },
              {
                validator: async (_, value) => {
                  if (!structured || value == null || value === '') return;
                  try {
                    const parsed = submittedValue(field, value);
                    if (
                      field.type === 'array'
                        ? !Array.isArray(parsed)
                        : !parsed || typeof parsed !== 'object' || Array.isArray(parsed)
                    )
                      throw new Error();
                  } catch {
                    throw new Error(intl.formatMessage({ id: 'pages.workflowUX.invalidJson' }));
                  }
                },
              },
            ]}
          >
            {field.enum?.length ? (
              <Select options={field.enum.map((value) => ({ value, label: String(value) }))} />
            ) : field.type === 'boolean' ? (
              <Switch />
            ) : ['number', 'integer'].includes(field.type || '') ? (
              <InputNumber
                precision={field.type === 'integer' ? 0 : undefined}
                style={{ width: '100%' }}
                placeholder={field.placeholder}
              />
            ) : structured ? (
              <Input.TextArea rows={4} placeholder={field.placeholder} />
            ) : (
              <Input placeholder={field.placeholder} />
            )}
          </Form.Item>
        );
      })}
    </div>
  );
}
