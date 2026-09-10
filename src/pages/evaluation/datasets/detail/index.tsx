import React, { useEffect, useRef, useState } from 'react';
import { history, useIntl, useParams } from '@umijs/max';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Card, Descriptions, message, Modal, Tabs, Tag } from 'antd';
import {
  createEvaluationCase,
  deleteEvaluationCase,
  exportEvaluationCases,
  importEvaluationCases,
  listEvaluationCases,
  listEvaluationDatasetVersions,
  listEvaluationDatasets,
  listEvaluationEvaluatorVersions,
  listEvaluationEvaluators,
  previewEvaluationCaseImport,
  publishEvaluationDatasetVersion,
  updateEvaluationCase,
  type EvaluationCase,
  type EvaluationCaseImportPreview,
  type EvaluationDataset,
  type EvaluationDatasetVersion,
  type EvaluationEvaluatorVersion,
} from '@/services/evaluation/EvaluationController';
import { evaluationImportErrorMessageId } from '@/pages/evaluation/status';

type CaseForm = {
  caseKey: string;
  name: string;
  input: string;
  inputKey?: string;
  expectedOutput?: string;
  evaluatorVersionId: string;
  passThreshold?: number;
  required?: boolean;
  enabled?: boolean;
  assertions?: Array<{ type: 'TOOL_CALLED' | 'TOOL_NOT_CALLED' | 'TOOL_SUCCEEDED' | 'TOOL_NOT_SUCCEEDED' | 'NODE_VISITED' | 'NODE_NOT_VISITED' | 'NODE_COMPLETED' | 'NODE_NOT_COMPLETED'; target: string }>;
};
const readValue = (json?: string, key = 'message') => {
  try {
    const value = JSON.parse(json || '{}');
    return (
      value[key] ||
      value.message ||
      value.question ||
      value.prompt ||
      value.input ||
      value.output ||
      ''
    );
  } catch {
    return json || '';
  }
};
const readInputKey = (json?: string) => {
  try {
    return Object.keys(JSON.parse(json || '{}'))[0] || 'input';
  } catch {
    return 'input';
  }
};
const readAssertions = (json?: string) => {
  try {
    const value = JSON.parse(json || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function EvaluationDatasetDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const intl = useIntl();
  const caseRef = useRef<ActionType>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState<EvaluationDataset>();
  const [versions, setVersions] = useState<EvaluationDatasetVersion[]>([]);
  const [evaluatorVersions, setEvaluatorVersions] = useState<EvaluationEvaluatorVersion[]>([]);
  const [importPreview, setImportPreview] = useState<EvaluationCaseImportPreview>();
  const isWorkflow = dataset?.targetType === 'WORKFLOW';
  const toInputJson = (values: CaseForm) =>
    JSON.stringify(isWorkflow ? { [values.inputKey || 'input']: values.input } : { message: values.input });
  const assertionOptions = isWorkflow
    ? ['NODE_VISITED', 'NODE_NOT_VISITED', 'NODE_COMPLETED', 'NODE_NOT_COMPLETED']
    : ['TOOL_CALLED', 'TOOL_NOT_CALLED', 'TOOL_SUCCEEDED', 'TOOL_NOT_SUCCEEDED'];
  const assertionFields = (
    <ProFormList
      name="assertions"
      label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.assertions' })}
      creatorButtonProps={{
        creatorButtonText: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.addAssertion' }),
      }}
    >
      {(field) => (
        <div style={{ display: 'flex', gap: 12 }}>
          <ProFormSelect
            name={[field.name, 'type']}
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.assertionType' })}
            options={assertionOptions.map((value) => ({
              value,
              label: intl.formatMessage({ id: `pages.agentEvaluation.datasets.assertion.${value}` }),
            }))}
            rules={[{ required: true }]}
            width="md"
          />
          <ProFormText
            name={[field.name, 'target']}
            label={intl.formatMessage({ id: isWorkflow ? 'pages.agentEvaluation.datasets.nodeId' : 'pages.agentEvaluation.datasets.toolId' })}
            tooltip={intl.formatMessage({ id: isWorkflow ? 'pages.agentEvaluation.datasets.nodeIdHelp' : 'pages.agentEvaluation.datasets.toolIdHelp' })}
            rules={[{ required: true }]}
            width="md"
          />
        </div>
      )}
    </ProFormList>
  );
  const reload = async () => {
    const [datasets, versionResponse] = await Promise.all([
      listEvaluationDatasets(),
      listEvaluationDatasetVersions(id),
    ]);
    setDataset((datasets.data || []).find((item) => item.id === id));
    setVersions(versionResponse.data || []);
    caseRef.current?.reload();
  };
  useEffect(() => {
    void reload();
  }, [id]);
  useEffect(() => {
    void (async () => {
      const evaluators = await listEvaluationEvaluators();
      const versions = await Promise.all(
        (evaluators.data || [])
          .filter((item) => item.id)
          .map((item) => listEvaluationEvaluatorVersions(item.id!)),
      );
      setEvaluatorVersions(versions.flatMap((item) => item.data || []));
    })();
  }, []);
  const columns: ProColumns<EvaluationCase>[] = [
    {
      title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseKey' }),
      dataIndex: 'caseKey',
    },
    {
      title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseName' }),
      dataIndex: 'name',
    },
    {
      title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.input' }),
      render: (_, row) => readValue(row.inputJson) || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.expectedOutput' }),
      render: (_, row) => readValue(row.referenceJson, 'output') || '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.passThreshold' }),
      dataIndex: 'passThreshold',
      width: 110,
    },
    {
      title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.required' }),
      dataIndex: 'required',
      render: (_, row) => (
        <Tag color={row.required ? 'red' : 'default'}>
          {intl.formatMessage({
            id: row.required
              ? 'pages.agentEvaluation.common.yes'
              : 'pages.agentEvaluation.common.no',
          })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.agentEvaluation.common.actions' }),
      valueType: 'option',
      render: (_, row) => (
        <>
        <ModalForm<CaseForm>
          title={intl.formatMessage({ id: 'pages.common.edit' })}
          trigger={<Button type="link">{intl.formatMessage({ id: 'pages.common.edit' })}</Button>}
          initialValues={{
            caseKey: row.caseKey,
            name: row.name,
            input: readValue(row.inputJson),
            inputKey: readInputKey(row.inputJson),
            expectedOutput: readValue(row.referenceJson, 'output'),
            evaluatorVersionId: (() => {
              try {
                return JSON.parse(row.evaluatorBindingsJson || '[]')[0]?.evaluatorVersionId;
              } catch {
                return undefined;
              }
            })(),
            assertions: readAssertions(row.assertionsJson),
            passThreshold: row.passThreshold,
            required: row.required,
            enabled: row.enabled,
          }}
          onFinish={async (values) => {
            const version = evaluatorVersions.find((item) => item.id === values.evaluatorVersionId);
            const config = version ? JSON.parse(version.configJson || '{}') : {};
            await updateEvaluationCase(id, row.id!, {
              ...row,
              caseKey: values.caseKey,
              name: values.name,
              inputJson: toInputJson(values),
              referenceJson: values.expectedOutput
                ? JSON.stringify({ output: values.expectedOutput })
                : undefined,
              assertionsJson: values.assertions?.length ? JSON.stringify(values.assertions) : undefined,
              evaluatorBindingsJson: JSON.stringify([
                {
                  bindingKey: values.evaluatorVersionId,
                  evaluatorVersionId: values.evaluatorVersionId,
                  operator: config.operator,
                  expected: config.expected,
                  weight: 1,
                },
              ]),
              passThreshold: values.passThreshold,
              required: values.required,
              enabled: values.enabled ?? true,
            });
            message.success(
              intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseUpdated' }),
            );
            await reload();
            return true;
          }}
        >
          <ProFormText
            name="caseKey"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseKey' })}
            rules={[{ required: true }]}
          />
          <ProFormText
            name="name"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseName' })}
            rules={[{ required: true }]}
          />
          {isWorkflow && <ProFormText name="inputKey" label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.workflowInputKey' })} rules={[{ required: true }]} />}
          <ProFormTextArea
            name="input"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.input' })}
            rules={[{ required: true }]}
          />
          <ProFormTextArea
            name="expectedOutput"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.expectedOutput' })}
          />
          {assertionFields}
          <ProFormSelect
            name="evaluatorVersionId"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.evaluator' })}
            options={evaluatorVersions.map((item) => ({
              value: item.id,
              label: `v${item.versionNo}`,
            }))}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="passThreshold"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.passThreshold' })}
            min={0}
            max={100}
          />
          <ProFormSwitch
            name="required"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.required' })}
          />
          <ProFormSwitch
            name="enabled"
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.enabled' })}
          />
        </ModalForm>
        <Button type="link" danger onClick={() => Modal.confirm({ title: intl.formatMessage({ id: 'pages.agentEvaluation.common.deleteConfirmTitle' }), content: intl.formatMessage({ id: 'pages.agentEvaluation.common.deleteCaseConfirm' }), okText: intl.formatMessage({ id: 'pages.agentEvaluation.common.delete' }), okButtonProps: { danger: true }, cancelText: intl.formatMessage({ id: 'pages.agentEvaluation.common.cancel' }), onOk: async () => { await deleteEvaluationCase(id, row.id!); message.success(intl.formatMessage({ id: 'pages.agentEvaluation.common.deleted' })); await reload(); } })}>{intl.formatMessage({ id: 'pages.agentEvaluation.common.delete' })}</Button>
        </>
      ),
    },
  ];
  const chooseImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const cases = Array.isArray(raw) ? raw : raw.cases;
      if (!Array.isArray(cases)) throw new Error();
      const response = await previewEvaluationCaseImport(id, cases);
      setImportPreview(response.data);
    } catch {
      message.error(intl.formatMessage({ id: 'pages.agentEvaluation.datasets.importFileInvalid' }));
    }
  };
  const exportCases = async () => {
    const response = await exportEvaluationCases(id);
    if (!response.data) return;
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `evaluation-dataset-${id}.json`;
    link.click();
    URL.revokeObjectURL(href);
  };
  return (
    <PageContainer
      title={
        dataset?.name || intl.formatMessage({ id: 'pages.agentEvaluation.datasets.detailTitle' })
      }
      onBack={() => history.push('/evaluation/datasets')}
      extra={[
        <Button key="export" onClick={exportCases}>
          {intl.formatMessage({ id: 'pages.agentEvaluation.datasets.exportCases' })}
        </Button>,
        <Button key="import" onClick={() => fileRef.current?.click()}>
          {intl.formatMessage({ id: 'pages.agentEvaluation.datasets.importCases' })}
        </Button>,
      ]}
    >
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={chooseImport} />
      <Card style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={3}>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.targetType' })}
          >
            {dataset?.targetType === 'WORKFLOW'
              ? intl.formatMessage({ id: 'pages.agentEvaluation.target.workflow' })
              : intl.formatMessage({ id: 'pages.agentEvaluation.target.agent' })}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.description' })}
          >
            {dataset?.description || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.versionCount' })}
          >
            {versions.length}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Tabs
        items={[
          {
            key: 'cases',
            label: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.cases' }),
            children: (
              <ProTable<EvaluationCase>
                rowKey="id"
                actionRef={caseRef}
                toolBarRender={() => [
                  <ModalForm<CaseForm>
                    key="create-case"
                    title={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.addCase' })}
                    trigger={
                      <Button type="primary">
                        {intl.formatMessage({ id: 'pages.agentEvaluation.datasets.addCase' })}
                      </Button>
                    }
                    onFinish={async (values) => {
                      const version = evaluatorVersions.find(
                        (item) => item.id === values.evaluatorVersionId,
                      );
                      const config = version ? JSON.parse(version.configJson || '{}') : {};
                      await createEvaluationCase(id, {
                        caseKey: values.caseKey,
                        name: values.name,
                        inputJson: toInputJson(values),
                        referenceJson: values.expectedOutput
                          ? JSON.stringify({ output: values.expectedOutput })
                          : undefined,
                        assertionsJson: values.assertions?.length ? JSON.stringify(values.assertions) : undefined,
                        evaluatorBindingsJson: JSON.stringify([
                          {
                            bindingKey: values.evaluatorVersionId,
                            evaluatorVersionId: values.evaluatorVersionId,
                            operator: config.operator,
                            expected: config.expected,
                            weight: 1,
                          },
                        ]),
                        passThreshold: values.passThreshold,
                        required: values.required,
                        enabled: values.enabled ?? true,
                      });
                      message.success(
                        intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseCreated' }),
                      );
                      await reload();
                      return true;
                    }}
                  >
                    <ProFormText
                      name="caseKey"
                      label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseKey' })}
                      rules={[{ required: true }]}
                    />
                    <ProFormText
                      name="name"
                      label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseName' })}
                      rules={[{ required: true }]}
                    />
                    {isWorkflow && <ProFormText name="inputKey" label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.workflowInputKey' })} initialValue="input" rules={[{ required: true }]} />}
                    <ProFormTextArea
                      name="input"
                      label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.input' })}
                      rules={[{ required: true }]}
                    />
                    <ProFormTextArea
                      name="expectedOutput"
                      label={intl.formatMessage({
                        id: 'pages.agentEvaluation.datasets.expectedOutput',
                      })}
                    />
                    {assertionFields}
                    <ProFormSelect
                      name="evaluatorVersionId"
                      label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.evaluator' })}
                      options={evaluatorVersions.map((item) => ({
                        value: item.id,
                        label: `v${item.versionNo}`,
                      }))}
                      rules={[{ required: true }]}
                    />
                    <ProFormDigit
                      name="passThreshold"
                      label={intl.formatMessage({
                        id: 'pages.agentEvaluation.datasets.passThreshold',
                      })}
                      initialValue={80}
                      min={0}
                      max={100}
                    />
                    <ProFormSwitch
                      name="required"
                      label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.required' })}
                    />
                    <ProFormSwitch
                      name="enabled"
                      label={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.enabled' })}
                      initialValue
                    />
                  </ModalForm>,
                ]}
                columns={columns}
                search={false}
                request={async () => {
                  const response = await listEvaluationCases(id);
                  return {
                    data: response.data || [],
                    success: response.success,
                    total: response.data?.length || 0,
                  };
                }}
              />
            ),
          },
          {
            key: 'versions',
            label: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.versions' }),
            children: (
              <ProTable<EvaluationDatasetVersion>
                rowKey="id"
                search={false}
                dataSource={versions}
                columns={[
                  {
                    title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.version' }),
                    dataIndex: 'versionNo',
                    render: (value) => `v${value}`,
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.caseCount' }),
                    dataIndex: 'caseCount',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agentEvaluation.datasets.publishedAt' }),
                    dataIndex: 'publishedAt',
                    valueType: 'dateTime',
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <Button
        style={{ marginTop: 16 }}
        onClick={async () => {
          await publishEvaluationDatasetVersion(id);
          message.success(
            intl.formatMessage({ id: 'pages.agentEvaluation.datasets.versionPublished' }),
          );
          await reload();
        }}
      >
        {intl.formatMessage({ id: 'pages.agentEvaluation.datasets.publishVersion' })}
      </Button>
      <Modal
        open={!!importPreview}
        title={intl.formatMessage({ id: 'pages.agentEvaluation.datasets.importPreview' })}
        onCancel={() => setImportPreview(undefined)}
        onOk={async () => {
          if (!importPreview?.valid) return;
          const result = await importEvaluationCases(id, importPreview.items);
          if (result.success) {
            message.success(intl.formatMessage({ id: 'pages.agentEvaluation.datasets.imported' }));
            setImportPreview(undefined);
            await reload();
          }
        }}
        okButtonProps={{ disabled: !importPreview?.valid }}
      >
        <p>
          {intl.formatMessage(
            {
              id: importPreview?.valid
                ? 'pages.agentEvaluation.datasets.importValid'
                : 'pages.agentEvaluation.datasets.importInvalid',
            },
            { total: importPreview?.total || 0, errors: importPreview?.errors?.length || 0 },
          )}
        </p>
        {importPreview?.errors?.map((error) => (
          <p
            key={`${error.index}-${error.code}`}
          >{`${error.index + 1}: ${intl.formatMessage({ id: evaluationImportErrorMessageId(error.code) })}`}</p>
        ))}
      </Modal>
    </PageContainer>
  );
}
