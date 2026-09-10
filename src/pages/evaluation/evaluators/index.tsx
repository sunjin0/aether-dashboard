import React, { useMemo, useRef, useState } from 'react';
import { useIntl } from '@umijs/max';
import { ModalForm, PageContainer, ProFormDependency, ProFormList, ProFormSelect, ProFormSwitch, ProFormText, ProFormTextArea, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Descriptions, Modal, Table, Tag, message } from 'antd';
import { createEvaluationEvaluator, deleteEvaluationEvaluator, listEvaluationEvaluatorVersions, listEvaluationEvaluators, publishEvaluationEvaluatorVersion, updateEvaluationEvaluator, type EvaluationEvaluator, type EvaluationEvaluatorVersion } from '@/services/evaluation/EvaluationController';
import { getModelCatalogOptions } from '@/services/agent/ModelProviderController';

type SchemaField = { name?: string; type?: 'string' | 'number' | 'integer' | 'boolean'; required?: boolean };
type EvaluatorForm = { name: string; kind: 'RULE' | 'LLM'; operator?: 'EQUALS' | 'CONTAINS' | 'REGEX' | 'JSON_PATH_EQUALS' | 'JSON_SCHEMA'; expected?: string; jsonPath?: string; schemaFields?: SchemaField[]; modelId?: string; rubric?: string };
const readConfig = (value?: string): Record<string, unknown> => {
  try {
    const config = JSON.parse(value || '{}') as Record<string, unknown>;
    return { ...config, operator: typeof config.operator === 'string' ? config.operator.toUpperCase() : undefined };
  } catch {
    return {};
  }
};
const schemaFieldsFromConfig = (config: Record<string, unknown>): SchemaField[] => {
  const schema = config.schema as { properties?: Record<string, { type?: SchemaField['type'] }>; required?: string[] } | undefined;
  if (!schema?.properties) return [];
  return Object.entries(schema.properties).map(([name, definition]) => ({ name, type: definition.type || 'string', required: schema.required?.includes(name) }));
};
const displayValue = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '-';

export default function EvaluationEvaluatorsPage() {
  const actionRef = useRef<ActionType>();
  const intl = useIntl();
  const [editing, setEditing] = useState<EvaluationEvaluator>();
  const [detail, setDetail] = useState<EvaluationEvaluator>();
  const [versions, setVersions] = useState<EvaluationEvaluatorVersion[]>([]);
  const reload = () => actionRef.current?.reload();
  const initialValues = editing ? (() => { const config = readConfig(editing.draftConfigJson); return { name: editing.name, kind: editing.kind, ...config, schemaFields: schemaFieldsFromConfig(config) }; })() : { kind: 'RULE' as const, operator: 'CONTAINS' as const };
  const save = async (values: EvaluatorForm) => {
    const fields = (values.schemaFields || []).filter(field => field.name?.trim());
    if (values.operator === 'JSON_SCHEMA' && !fields.length) {
      message.error(intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.schemaFieldRequired' }));
      return false;
    }
    const config = values.kind === 'LLM' ? { modelId: values.modelId, rubric: values.rubric } : values.operator === 'JSON_SCHEMA' ? {
      operator: values.operator,
      schema: {
        type: 'object',
        properties: Object.fromEntries(fields.map(field => [field.name!.trim(), { type: field.type || 'string' }])),
        required: fields.filter(field => field.required).map(field => field.name!.trim()),
      },
    } : { operator: values.operator, expected: values.expected, ...(values.operator === 'JSON_PATH_EQUALS' ? { jsonPath: values.jsonPath } : {}) };
    const data = { name: values.name, kind: values.kind, draftConfigJson: JSON.stringify(config) };
    if (editing?.id) await updateEvaluationEvaluator(editing.id, data); else await createEvaluationEvaluator(data);
    message.success(intl.formatMessage({ id: editing ? 'pages.agentEvaluation.evaluators.updated' : 'pages.agentEvaluation.evaluators.created' }));
    setEditing(undefined); reload(); return true;
  };
  const showDetail = async (row: EvaluationEvaluator) => { if (!row.id) return; const result = await listEvaluationEvaluatorVersions(row.id); setVersions(result.data || []); setDetail(row); };
  const columns = useMemo<ProColumns<EvaluationEvaluator>[]>(() => [
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.name' }), dataIndex: 'name' },
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.kind' }), dataIndex: 'kind', valueEnum: { RULE: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.rule' }), LLM: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.llm' }) } },
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.ruleSummary' }), render: (_, row) => { const config = readConfig(row.draftConfigJson); return row.kind === 'LLM' ? `${intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.model' })} · ${displayValue(config.modelId)}` : config.operator ? `${intl.formatMessage({ id: `pages.agentEvaluation.evaluators.operator.${config.operator}` })} · ${config.operator === 'JSON_SCHEMA' ? intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.schemaFieldCount' }, { count: schemaFieldsFromConfig(config).length }) : displayValue(config.expected)}${config.operator === 'JSON_PATH_EQUALS' ? ` · ${displayValue(config.jsonPath)}` : ''}` : '-'; } },
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.configStatus' }), render: (_, row) => <Tag color={row.revision && row.revision > 0 ? 'green' : 'default'}>{row.revision && row.revision > 0 ? intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.published' }, { version: row.revision }) : intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.draft' })}</Tag> },
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.common.actions' }), valueType: 'option', render: (_, row) => row.id && <><Button type="link" onClick={() => showDetail(row)}>{intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.viewDetail' })}</Button><Button type="link" onClick={() => setEditing(row)}>{intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.edit' })}</Button><Button type="link" onClick={async () => { await publishEvaluationEvaluatorVersion(row.id!); message.success(intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.versionPublished' })); reload(); }}>{intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.publishVersion' })}</Button><Button type="link" danger onClick={() => Modal.confirm({ title: intl.formatMessage({ id: 'pages.agentEvaluation.common.deleteConfirmTitle' }), content: intl.formatMessage({ id: 'pages.agentEvaluation.common.deleteEvaluatorConfirm' }), okText: intl.formatMessage({ id: 'pages.agentEvaluation.common.delete' }), okButtonProps: { danger: true }, cancelText: intl.formatMessage({ id: 'pages.agentEvaluation.common.cancel' }), onOk: async () => { await deleteEvaluationEvaluator(row.id!); message.success(intl.formatMessage({ id: 'pages.agentEvaluation.common.deleted' })); reload(); } })}>{intl.formatMessage({ id: 'pages.agentEvaluation.common.delete' })}</Button></> },
  ], [intl]);
  const form = <ModalForm<EvaluatorForm> open={!!editing} initialValues={initialValues} title={intl.formatMessage({ id: editing?.id ? 'pages.agentEvaluation.evaluators.edit' : 'pages.agentEvaluation.evaluators.create' })} onOpenChange={open => !open && setEditing(undefined)} onFinish={save}><ProFormText name="name" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.name' })} rules={[{ required: true }]} /><ProFormSelect name="kind" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.kind' })} options={['RULE', 'LLM'].map(value => ({ value, label: intl.formatMessage({ id: `pages.agentEvaluation.evaluators.${value === 'RULE' ? 'rule' : 'llm'}` }) }))} rules={[{ required: true }]} /><ProFormDependency name={['kind', 'operator']}>{({ kind, operator }) => kind === 'LLM' ? <><ProFormSelect name="modelId" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.model' })} request={() => getModelCatalogOptions('CHAT')} rules={[{ required: true }]} /><ProFormTextArea name="rubric" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.rubric' })} rules={[{ required: true }]} fieldProps={{ rows: 5 }} /></> : <><ProFormSelect name="operator" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.operator' })} options={['EQUALS', 'CONTAINS', 'REGEX', 'JSON_PATH_EQUALS', 'JSON_SCHEMA'].map(value => ({ value, label: intl.formatMessage({ id: `pages.agentEvaluation.evaluators.operator.${value}` }) }))} rules={[{ required: true }]} />{operator === 'JSON_PATH_EQUALS' && <ProFormText name="jsonPath" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.jsonPath' })} tooltip={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.jsonPathHelp' })} rules={[{ required: true }]} />}{operator === 'JSON_SCHEMA' ? <ProFormList name="schemaFields" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.schemaFields' })} creatorButtonProps={{ creatorButtonText: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.addSchemaField' }) }}><ProFormText name="name" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.schemaFieldName' })} rules={[{ required: true }]} /><ProFormSelect name="type" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.schemaFieldType' })} initialValue="string" options={['string', 'number', 'integer', 'boolean'].map(value => ({ value, label: intl.formatMessage({ id: `pages.agentEvaluation.evaluators.schemaType.${value}` }) }))} /><ProFormSwitch name="required" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.schemaRequired' })} /></ProFormList> : <ProFormText name="expected" label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.expected' })} rules={[{ required: true }]} />}</>}</ProFormDependency></ModalForm>;
  return <PageContainer title={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.title' })}>{form}<ProTable<EvaluationEvaluator> rowKey="id" actionRef={actionRef} toolBarRender={() => [<Button key="create" type="primary" onClick={() => setEditing({ name: '', kind: 'RULE' })}>{intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.create' })}</Button>]} columns={columns} request={async () => { const response = await listEvaluationEvaluators(); return { data: response.data || [], success: response.success, total: response.data?.length || 0 }; }} /><Modal open={!!detail} title={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.detailTitle' })} footer={null} onCancel={() => setDetail(undefined)} width={760}><Descriptions bordered column={1}><Descriptions.Item label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.name' })}>{detail?.name}</Descriptions.Item><Descriptions.Item label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.kind' })}>{detail?.kind === 'RULE' ? intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.rule' }) : intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.llm' })}</Descriptions.Item><Descriptions.Item label={intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.ruleSummary' })}>{(() => { const config = readConfig(detail?.draftConfigJson); return detail?.kind === 'LLM' ? `${intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.model' })} · ${displayValue(config.modelId)}` : config.operator ? `${intl.formatMessage({ id: `pages.agentEvaluation.evaluators.operator.${config.operator}` })} · ${config.operator === 'JSON_SCHEMA' ? intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.schemaFieldCount' }, { count: schemaFieldsFromConfig(config).length }) : displayValue(config.expected)}` : '-'; })()}</Descriptions.Item></Descriptions><Table<EvaluationEvaluatorVersion> style={{ marginTop: 16 }} rowKey="id" pagination={false} dataSource={versions} columns={[{ title: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.version' }), dataIndex: 'versionNo', render: value => `v${value}` }, { title: intl.formatMessage({ id: 'pages.agentEvaluation.evaluators.publishedAt' }), dataIndex: 'publishedAt', render: value => value ? new Date(Number(value)).toLocaleString() : '-' }]} /></Modal></PageContainer>;
}
