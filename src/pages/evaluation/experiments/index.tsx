import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history, useIntl, useLocation } from '@umijs/max';
import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Steps,
  Tag,
} from 'antd';
import {
  cancelEvaluationExperiment,
  deleteEvaluationExperiment,
  createEvaluationExperiment,
  createEvaluationSnapshot,
  listEvaluationDatasetVersions,
  listEvaluationDatasets,
  listEvaluationExperiments,
  precheckEvaluationExperiment,
  type EvaluationDataset,
  type EvaluationDatasetVersion,
  type EvaluationExperiment,
  type EvaluationPrecheck,
} from '@/services/evaluation/EvaluationController';
import { getAgentDefinitionList } from '@/services/agent/AgentDefinitionController';
import { getWorkflowList } from '@/services/workflow/workflow/WorkflowController';
import { evaluationStatusMessageId } from '../status';
import { useCreatorSearchColumn } from '@/components/CreatorSearchColumn';

type TargetOption = { value: string; label: string; source: Record<string, unknown> };
type ExperimentForm = {
  name: string;
  targetType: 'AGENT' | 'WORKFLOW';
  targetId: string;
  datasetId: string;
  datasetVersionId: string;
  repeats: number;
  parallelism: number;
  caseTimeoutSeconds: number;
  minimumScore: number;
  minimumPassRate: number;
};

const targetLabel = (target: TargetOption) => target.label;

export default function EvaluationExperimentsPage() {
  const actionRef = useRef<ActionType>();
  const intl = useIntl();
  const creatorColumn = useCreatorSearchColumn<EvaluationExperiment>();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form] = Form.useForm<ExperimentForm>();
  const [targets, setTargets] = useState<TargetOption[]>([]);
  const [datasetsByTargetType, setDatasetsByTargetType] = useState<Partial<Record<'AGENT' | 'WORKFLOW', EvaluationDataset[]>>>({});
  const [versions, setVersions] = useState<EvaluationDatasetVersion[]>([]);
  const [precheck, setPrecheck] = useState<EvaluationPrecheck>();
  const [confirmedValues, setConfirmedValues] = useState<ExperimentForm>();
  const [confirmedVersion, setConfirmedVersion] = useState<EvaluationDatasetVersion>();
  const [selectedTargetType, setSelectedTargetType] = useState<'AGENT' | 'WORKFLOW'>('AGENT');
  const [datasetTargetType, setDatasetTargetType] = useState<'AGENT' | 'WORKFLOW'>('AGENT');
  const datasets = datasetsByTargetType[datasetTargetType] || [];
  const datasetId = Form.useWatch('datasetId', form);
  const targetId = Form.useWatch('targetId', form);
  const datasetVersionId = Form.useWatch('datasetVersionId', form);
  const reload = () => actionRef.current?.reload();
  const evaluationConfig = (values: ExperimentForm) => ({
    repeats: values.repeats,
    parallelism: values.parallelism,
    caseTimeoutSeconds: values.caseTimeoutSeconds,
    minimumScore: values.minimumScore,
    minimumPassRate: values.minimumPassRate,
  });

  const loadTargets = async (type: 'AGENT' | 'WORKFLOW') => {
    const response =
      type === 'AGENT'
        ? await getAgentDefinitionList({ current: 1, pageSize: 200 })
        : await getWorkflowList({ current: 1, pageSize: 200 });
    const rows = response.data || [];
    setTargets(
      rows
        .filter((row: any) => row.id)
        .map((row: any) => ({
          value: row.id,
          label: row.code ? `${row.name || row.id} (${row.code})` : row.name || row.id,
          source: row,
        })),
    );
  };
  const loadDatasets = async (type: 'AGENT' | 'WORKFLOW') => {
    const response = await listEvaluationDatasets({ targetType: type });
    setDatasetsByTargetType((current) => ({
      ...current,
      [type]: (response.data || []).filter((item) => item.targetType === type),
    }));
  };
  const selectTargetType = (type: 'AGENT' | 'WORKFLOW') => {
    setSelectedTargetType(type);
    form.setFieldValue('targetType', type);
    void loadTargets(type);
    void loadDatasets(type);
  };
  useEffect(() => {
    if (open) {
      void loadTargets(selectedTargetType);
      void loadDatasets(selectedTargetType);
    }
  }, [open, selectedTargetType]);
  useEffect(() => {
    if (!datasetId) {
      setVersions([]);
      return;
    }
    void listEvaluationDatasetVersions(datasetId).then((result) => setVersions(result.data || []));
  }, [datasetId]);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const requestedType = query.get('targetType');
    const requestedId = query.get('targetId');
    if ((requestedType === 'AGENT' || requestedType === 'WORKFLOW') && requestedId) {
      form.setFieldsValue({
        targetType: requestedType,
        targetId: requestedId,
        repeats: 1,
        parallelism: 2,
        caseTimeoutSeconds: 300,
        minimumScore: 80,
        minimumPassRate: 100,
      });
      setSelectedTargetType(requestedType);
      setDatasetTargetType(requestedType);
      selectTargetType(requestedType);
      setStep(0);
      setOpen(true);
    }
  }, [form, location.search]);

  const create = async () => {
    const values = confirmedValues || (await form.validateFields());
    if (!values.datasetVersionId) {
      message.error(
        intl.formatMessage({ id: 'pages.agentEvaluation.experiments.datasetVersionRequired' }),
      );
      setStep(1);
      return;
    }
    const snapshot = await createEvaluationSnapshot({
      targetType: values.targetType,
      targetId: values.targetId,
    });
    if (!snapshot.data?.id) return;
    const response = await createEvaluationExperiment({
      name: values.name,
      targetType: values.targetType,
      targetId: values.targetId,
      snapshotId: snapshot.data.id,
      datasetVersionId: values.datasetVersionId,
      selectionJson: JSON.stringify({ mode: 'all' }),
      configJson: JSON.stringify(evaluationConfig(values)),
    });
    if (response.success) {
      message.success(intl.formatMessage({ id: 'pages.agentEvaluation.experiments.created' }));
      setOpen(false);
      form.resetFields();
      reload();
      if (response.data) history.push(`/evaluation/experiments/${response.data}`);
    }
  };
  const next = async () => {
    const names =
      step === 0
        ? ['name', 'targetType', 'targetId']
        : ['datasetId', 'datasetVersionId', 'repeats', 'parallelism', 'caseTimeoutSeconds', 'minimumScore', 'minimumPassRate'];
    await form.validateFields(names);
    // Form values must be copied before moving to the confirmation step. The step
    // changes unmount fields, and retaining the form-owned object can otherwise
    // lose datasetVersionId before the create request is issued.
    const values = { ...(form.getFieldsValue(true) as ExperimentForm) };
    if (step === 0) {
      const selectedType = selectedTargetType;
      values.targetType = selectedType;
      form.setFieldValue('targetType', selectedType);
      setDatasetTargetType(selectedType);
      await Promise.all([loadTargets(selectedType), loadDatasets(selectedType)]);
    }
    if (step === 1) {
      const result = await precheckEvaluationExperiment({
        targetType: values.targetType,
        targetId: values.targetId,
        datasetVersionId: values.datasetVersionId,
        configJson: JSON.stringify(evaluationConfig(values)),
      });
      if (!result.data?.ready) {
        message.error(
          intl.formatMessage({ id: 'pages.agentEvaluation.experiments.precheckFailed' }),
        );
        return;
      }
      setPrecheck(result.data);
      setConfirmedValues({ ...values });
      setConfirmedVersion(
        versions.find((item) => String(item.id) === String(values.datasetVersionId)),
      );
    }
    setStep(step + 1);
  };
  const columns = useMemo<ProColumns<EvaluationExperiment>[]>(
    () => [
      ...(creatorColumn ? [creatorColumn] : []),
      {
        title: intl.formatMessage({ id: 'pages.agentEvaluation.experiments.name' }),
        dataIndex: 'name',
      },
      {
        title: intl.formatMessage({ id: 'pages.agentEvaluation.experiments.targetType' }),
        dataIndex: 'targetType',
        valueEnum: {
          AGENT: intl.formatMessage({ id: 'pages.agentEvaluation.target.agent' }),
          WORKFLOW: intl.formatMessage({ id: 'pages.agentEvaluation.target.workflow' }),
        },
      },
      {
        title: intl.formatMessage({ id: 'pages.agentEvaluation.experiments.executionStatus' }),
        dataIndex: 'status',
        render: (_, row) => (
          <Tag color={row.status === 'COMPLETED' ? 'green' : 'blue'}>
            {intl.formatMessage({ id: evaluationStatusMessageId(row.status) })}
          </Tag>
        ),
      },
      {
        title: intl.formatMessage({ id: 'pages.agentEvaluation.experiments.qualityStatus' }),
        dataIndex: 'qualityStatus',
        render: (_, row) =>
          intl.formatMessage({ id: evaluationStatusMessageId(row.qualityStatus) }),
      },
      {
        title: intl.formatMessage({ id: 'pages.agentEvaluation.common.actions' }),
        valueType: 'option',
        render: (_, row) => (
          <>
            <Button
              type="link"
              onClick={() => row.id && history.push(`/evaluation/experiments/${row.id}`)}
            >
              {intl.formatMessage({ id: 'pages.agentEvaluation.experiments.viewDetail' })}
            </Button>
            {row.id && !['COMPLETED', 'CANCELLED'].includes(row.status || '') ? (
              <Button
                type="link"
                danger
                onClick={async () => {
                  await cancelEvaluationExperiment(row.id!);
                  reload();
                }}
              >
                {intl.formatMessage({ id: 'pages.agentEvaluation.experiments.cancel' })}
              </Button>
            ) : null}
            {row.id ? <Button type="link" danger onClick={() => Modal.confirm({ title: intl.formatMessage({ id: 'pages.agentEvaluation.common.deleteConfirmTitle' }), content: intl.formatMessage({ id: 'pages.agentEvaluation.common.deleteExperimentConfirm' }), okText: intl.formatMessage({ id: 'pages.agentEvaluation.common.delete' }), okButtonProps: { danger: true }, cancelText: intl.formatMessage({ id: 'pages.agentEvaluation.common.cancel' }), onOk: async () => { await deleteEvaluationExperiment(row.id!); message.success(intl.formatMessage({ id: 'pages.agentEvaluation.common.deleted' })); reload(); } })}>{intl.formatMessage({ id: 'pages.agentEvaluation.common.delete' })}</Button> : null}
          </>
        ),
      },
    ],
    [creatorColumn, intl],
  );
  const createButton = (
    <Button
      type="primary"
      onClick={() => {
        form.resetFields();
        setSelectedTargetType('AGENT');
        setDatasetTargetType('AGENT');
        form.setFieldsValue({
          targetType: 'AGENT',
          repeats: 1,
          parallelism: 2,
          caseTimeoutSeconds: 300,
          minimumScore: 80,
          minimumPassRate: 100,
        });
        setPrecheck(undefined);
        setConfirmedValues(undefined);
        setConfirmedVersion(undefined);
        setStep(0);
        setOpen(true);
      }}
    >
      {intl.formatMessage({ id: 'pages.agentEvaluation.experiments.create' })}
    </Button>
  );
  const selectedTarget = targets.find(
    (item) => String(item.value) === String(confirmedValues?.targetId || targetId),
  );
  const selectedVersion = confirmedVersion || versions.find(
    (item) => String(item.id) === String(confirmedValues?.datasetVersionId || datasetVersionId),
  );
  return (
    <PageContainer title={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.title' })}>
      <ProTable<EvaluationExperiment>
        rowKey="id"
        actionRef={actionRef}
        toolbar={{ actions: [createButton] }}
        columns={columns}
        request={async (params) => {
          const response = await listEvaluationExperiments(params);
          return { data: response.data || [], success: response.success, total: response.total };
        }}
      />
      <Modal
        open={open}
        title={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.create' })}
        width={760}
        onCancel={() => setOpen(false)}
        footer={
          <>
            {step > 0 && (
              <Button onClick={() => setStep(step - 1)}>
                {intl.formatMessage({ id: 'pages.agentEvaluation.common.previous' })}
              </Button>
            )}
            {step < 2 ? (
              <Button type="primary" onClick={next}>
                {intl.formatMessage({ id: 'pages.agentEvaluation.common.next' })}
              </Button>
            ) : (
              <Button type="primary" onClick={create}>
                {intl.formatMessage({ id: 'pages.agentEvaluation.experiments.confirmCreate' })}
              </Button>
            )}
          </>
        }
      >
        <Steps
          current={step}
          items={[
            { title: intl.formatMessage({ id: 'pages.agentEvaluation.experiments.steps.target' }) },
            {
              title: intl.formatMessage({ id: 'pages.agentEvaluation.experiments.steps.dataset' }),
            },
            {
              title: intl.formatMessage({ id: 'pages.agentEvaluation.experiments.steps.confirm' }),
            },
          ]}
          style={{ marginBottom: 24 }}
        />
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if (changed.datasetId) form.setFieldValue('datasetVersionId', undefined);
          }}
        >
          {step === 0 && (
            <>
              <Form.Item
                name="name"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.name' })}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.targetType' })}
                required
              >
                <Select
                  value={selectedTargetType}
                  onChange={(value) => {
                    selectTargetType(value);
                    form.setFieldsValue({
                      targetId: undefined,
                      datasetId: undefined,
                      datasetVersionId: undefined,
                    });
                  }}
                  options={[
                    {
                      value: 'AGENT',
                      label: intl.formatMessage({ id: 'pages.agentEvaluation.target.agent' }),
                    },
                    {
                      value: 'WORKFLOW',
                      label: intl.formatMessage({ id: 'pages.agentEvaluation.target.workflow' }),
                    },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="targetId"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.target' })}
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={targets.map((item) => ({ value: item.value, label: targetLabel(item) }))}
                />
              </Form.Item>
            </>
          )}
          {step === 1 && (
            <>
              <Form.Item
                name="datasetId"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.dataset' })}
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={datasets.map((item) => ({ value: item.id!, label: item.name }))}
                />
              </Form.Item>
              <Form.Item
                name="datasetVersionId"
                label={intl.formatMessage({
                  id: 'pages.agentEvaluation.experiments.datasetVersion',
                })}
                rules={[{ required: true }]}
              >
                <Select
                  options={versions.map((item) => ({
                    value: item.id,
                    label: `v${item.versionNo} · ${item.caseCount || 0}`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="repeats"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.repeats' })}
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="parallelism"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.parallelism' })}
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="caseTimeoutSeconds"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.timeout' })}
                rules={[{ required: true }]}
              >
                <InputNumber min={30} max={3600} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="minimumScore"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.minimumScore' })}
                tooltip={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.minimumScoreHelp' })}
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="minimumPassRate"
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.minimumPassRate' })}
                tooltip={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.minimumPassRateHelp' })}
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
          {step === 2 && (
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.target' })}
              >
                {selectedTarget?.label || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'pages.agentEvaluation.experiments.datasetVersion',
                })}
              >
                {selectedVersion ? `v${selectedVersion.versionNo}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.minimumScore' })}>
                {confirmedValues?.minimumScore ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.minimumPassRate' })}>
                {confirmedValues?.minimumPassRate ?? '-'}%
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'pages.agentEvaluation.experiments.precheck' })}
              >
                {precheck
                  ? intl.formatMessage(
                      { id: 'pages.agentEvaluation.experiments.precheckPassed' },
                      { cases: precheck.caseCount || 0, units: precheck.executionUnits || 0 },
                    )
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
}
