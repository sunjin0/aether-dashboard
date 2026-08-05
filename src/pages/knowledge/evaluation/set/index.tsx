import React, { useEffect, useRef, useState } from 'react';
import {
  PageContainer,
  ModalForm,
  ProFormSelect,
  ProFormTextArea,
  ProFormDependency,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { history, useAccess, useIntl, useParams } from '@umijs/max';
import {
  EvaluationCase,
  EvaluationHealth,
  EvaluationCaseTransfer,
  EvaluationImportPreview,
  EvaluationLabel,
  EvaluationRunComparison,
  EvaluationRunProgress,
  EvaluationRun,
  EvaluationSet,
  EvaluationSetVersion,
  deleteEvaluationCaseLabel,
  deleteEvaluationCase,
  exportEvaluationCases,
  getEvaluationCases,
  getEvaluationRuns,
  getEvaluationDocuments,
  getEvaluationDocumentSections,
  getEvaluationDocumentChunks,
  getEvaluationCaseLabels,
  getEvaluationSetHealth,
  getEvaluationSetVersions,
  getEvaluationTrend,
  importEvaluationCases,
  getEvaluationSets,
  getEvaluationSet,
  cancelEvaluationRun,
  compareEvaluationRuns,
  createEvaluationRun,
  getEvaluationRunProgress,
  retryEvaluationRunFailures,
  publishEvaluationSetVersion,
  previewEvaluationCaseImport,
  saveEvaluationCase,
  saveEvaluationCaseLabel,
  updateEvaluationCase,
  updateEvaluationCaseStatuses,
  setEvaluationRunBaseline,
} from '@/services/knowledge/EvaluationController';
import '../evaluation.less';
const pct = (v?: number) => (v === undefined ? '-' : `${(v * 100).toFixed(1)}%`);
export default function EvaluationPage() {
  const access = useAccess();
  const intl = useIntl();
  const { setId } = useParams<{ setId: string }>();
  const evaluationStatus = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.status.${value || 'UNKNOWN'}` });
  const targetType = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.targetType.${value || 'DOCUMENT'}` });
  const canWrite = Boolean(access['/knowledge/evaluation']);
  const [selected, setSelected] = useState<EvaluationSet>(),
    [runs, setRuns] = useState<EvaluationRun[]>([]),
    [cases, setCases] = useState<EvaluationCase[]>([]),
    [compareRunIds, setCompareRunIds] = useState<React.Key[]>([]),
    [progress, setProgress] = useState<EvaluationRunProgress>(),
    [comparison, setComparison] = useState<EvaluationRunComparison>(),
    [health, setHealth] = useState<EvaluationHealth>(),
    [versions, setVersions] = useState<EvaluationSetVersion[]>([]),
    [trend, setTrend] = useState<EvaluationRun[]>([]),
    [runVersionId, setRunVersionId] = useState<string>(),
    [labelCase, setLabelCase] = useState<EvaluationCase>(),
    [labels, setLabels] = useState<EvaluationLabel[]>([]),
    [editingCase, setEditingCase] = useState<EvaluationCase>(),
    [caseIds, setCaseIds] = useState<React.Key[]>([]),
    [importItems, setImportItems] = useState<EvaluationCaseTransfer[]>([]),
    [importPreview, setImportPreview] = useState<EvaluationImportPreview>();
  const selectedRef = useRef<EvaluationSet>();
  const importInputRef = useRef<HTMLInputElement>(null);
  const healthIssue = (code: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.health.${code}` });
  useEffect(() => {
    if (!setId) return;
    getEvaluationSet(setId)
      .then((response) => response.data && open(response.data))
      .catch(() => history.replace('/knowledge/evaluation'));
  }, []);
  const open = async (s: EvaluationSet) => {
    selectedRef.current = s;
    setSelected(s);
    setCases((await getEvaluationCases(s.id!)).data || []);
    setRuns((await getEvaluationRuns(s.id!)).data || []);
    setHealth((await getEvaluationSetHealth(s.id!)).data);
    setVersions((await getEvaluationSetVersions(s.id!)).data || []);
    setTrend((await getEvaluationTrend(s.id!)).data || []);
    setCompareRunIds([]);
    setComparison(undefined);
    setCaseIds([]);
  };
  useEffect(() => {
    if (!selected || !progress || progress.finished) return undefined;
    const timer = window.setInterval(async () => {
      const current = selectedRef.current;
      if (!current) return;
      const next = (await getEvaluationRunProgress(current.id!, progress.runId)).data;
      setProgress(next);
      if (next?.finished) {
        const [nextRuns, nextTrend, nextHealth] = await Promise.all([
          getEvaluationRuns(current.id!),
          getEvaluationTrend(current.id!),
          getEvaluationSetHealth(current.id!),
        ]);
        setRuns(nextRuns.data || []);
        setTrend(nextTrend.data || []);
        setHealth(nextHealth.data);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selected, progress?.runId, progress?.finished]);
  return (
    <PageContainer
      className="evaluation-page"
      title={selected?.name}
      onBack={() => history.push('/knowledge/evaluation')}
    >
      {selected && (
        <>
          <div className="evaluation-toolbar">
            <Tag color={health?.healthy ? 'success' : 'warning'}>
              {health?.healthy
                ? intl.formatMessage(
                    { id: 'pages.knowledge.evaluation.datasetHealthy' },
                    { count: health.enabledCaseCount },
                  )
                : intl.formatMessage({ id: 'pages.knowledge.evaluation.datasetBlockingIssues' })}
            </Tag>
            <div className="evaluation-toolbar-actions">
              {canWrite && (
                <>
                  <Button
                    type="primary"
                    onClick={async () => {
                      const response = await createEvaluationRun(selected!.id!, runVersionId);
                      const runId = response.data;
                      if (!runId) return;
                      setProgress((await getEvaluationRunProgress(selected!.id!, runId)).data);
                      setRuns((await getEvaluationRuns(selected!.id!)).data || []);
                      message.success(
                        intl.formatMessage({ id: 'pages.knowledge.evaluation.runStarted' }),
                      );
                    }}
                  >
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.run' })}
                  </Button>
                  <Select
                    allowClear
                    value={runVersionId}
                    onChange={setRunVersionId}
                    placeholder={intl.formatMessage({
                      id: 'pages.knowledge.evaluation.currentDraft',
                    })}
                    style={{ width: 160 }}
                    options={versions.map((version) => ({
                      value: version.id,
                      label: intl.formatMessage(
                        { id: 'pages.knowledge.evaluation.version' },
                        { version: version.versionNo },
                      ),
                    }))}
                  />
                  <Popconfirm
                    title={intl.formatMessage({
                      id: 'pages.knowledge.evaluation.publishVersionConfirm',
                    })}
                    onConfirm={async () => {
                      await publishEvaluationSetVersion(selected!.id!);
                      await open(selected!);
                      message.success(
                        intl.formatMessage({ id: 'pages.knowledge.evaluation.versionPublished' }),
                      );
                    }}
                  >
                    <Button>
                      {intl.formatMessage({ id: 'pages.knowledge.evaluation.publishVersion' })}
                    </Button>
                  </Popconfirm>
                  <Button
                    onClick={async () => {
                      const items = (await exportEvaluationCases(selected!.id!)).data || [];
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(
                        new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }),
                      );
                      link.download = `${selected!.name || 'evaluation-cases'}.json`;
                      link.click();
                      URL.revokeObjectURL(link.href);
                    }}
                  >
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.exportCases' })}
                  </Button>
                  <Button onClick={() => importInputRef.current?.click()}>
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.importCases' })}
                  </Button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      try {
                        const items = JSON.parse(await file.text()) as EvaluationCaseTransfer[];
                        if (!Array.isArray(items)) throw new Error('Invalid import');
                        const preview = (await previewEvaluationCaseImport(selected!.id!, items))
                          .data;
                        setImportItems(items);
                        setImportPreview(preview);
                      } catch {
                        message.error(
                          intl.formatMessage({
                            id: 'pages.knowledge.evaluation.invalidImportFile',
                          }),
                        );
                      }
                    }}
                  />
                  <ModalForm
                    title={intl.formatMessage({ id: 'pages.knowledge.evaluation.addQuestion' })}
                    modalProps={{ destroyOnClose: true }}
                    onFinish={async (v) => {
                      await saveEvaluationCase(selected!.id!, v as EvaluationCase);
                      await open(selected!);
                      return true;
                    }}
                    trigger={
                      <Button>
                        {intl.formatMessage({ id: 'pages.knowledge.evaluation.addQuestion' })}
                      </Button>
                    }
                  >
                    <ProFormTextArea
                      name="question"
                      label={intl.formatMessage({ id: 'pages.knowledge.evaluation.question' })}
                      rules={[{ required: true }]}
                    />
                    <ProFormSelect
                      name="documentId"
                      label={intl.formatMessage({
                        id: 'pages.knowledge.evaluation.expectedDocument',
                      })}
                      rules={[
                        {
                          required: true,
                          message: intl.formatMessage({
                            id: 'pages.knowledge.evaluation.selectExpectedDocument',
                          }),
                        },
                      ]}
                      showSearch
                      request={async () =>
                        ((await getEvaluationDocuments()).data || []).map((x) => ({
                          label: x.title,
                          value: x.id,
                        }))
                      }
                    />
                    <ProFormDependency name={['documentId']}>
                      {({ documentId }) => (
                        <ProFormSelect
                          name="sectionPath"
                          label={intl.formatMessage({
                            id: 'pages.knowledge.evaluation.expectedSection',
                          })}
                          placeholder={intl.formatMessage({
                            id: 'pages.knowledge.evaluation.expectedSectionPlaceholder',
                          })}
                          disabled={!documentId}
                          request={async () =>
                            documentId
                              ? ((await getEvaluationDocumentSections(documentId)).data || []).map(
                                  (x) => ({ label: x, value: x }),
                                )
                              : []
                          }
                        />
                      )}
                    </ProFormDependency>
                  </ModalForm>
                </>
              )}
            </div>
          </div>
          {health && (
            <Alert
              style={{ marginTop: 16 }}
              type={health.healthy ? 'success' : 'error'}
              showIcon
              message={
                health.healthy
                  ? intl.formatMessage(
                      { id: 'pages.knowledge.evaluation.datasetHealthy' },
                      { count: health.enabledCaseCount },
                    )
                  : intl.formatMessage({ id: 'pages.knowledge.evaluation.datasetBlockingIssues' })
              }
              description={
                health.issues.map((issue) => healthIssue(issue.code)).join(' ') || undefined
              }
            />
          )}
          {progress && !progress.finished && (
            <Card
              size="small"
              style={{ marginTop: 16 }}
              title={intl.formatMessage({ id: 'pages.knowledge.evaluation.progress' })}
              extra={
                <Space>
                  <Tag color="processing">{evaluationStatus(progress.status)}</Tag>
                  <Button
                    size="small"
                    onClick={async () => {
                      await cancelEvaluationRun(selected!.id!, progress.runId);
                      setProgress(
                        (await getEvaluationRunProgress(selected!.id!, progress.runId)).data,
                      );
                    }}
                  >
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.cancel' })}
                  </Button>
                </Space>
              }
            >
              <Progress
                percent={
                  progress.total
                    ? Math.round(
                        ((progress.succeeded +
                          progress.failed +
                          progress.invalid +
                          progress.cancelled) /
                          progress.total) *
                          100,
                      )
                    : 100
                }
              />
              <Descriptions
                size="small"
                column={4}
                items={[
                  {
                    key: 'q',
                    label: intl.formatMessage({ id: 'pages.knowledge.evaluation.queued' }),
                    children: progress.queued,
                  },
                  {
                    key: 'r',
                    label: intl.formatMessage({ id: 'pages.knowledge.evaluation.running' }),
                    children: progress.running,
                  },
                  {
                    key: 's',
                    label: intl.formatMessage({ id: 'pages.knowledge.evaluation.succeeded' }),
                    children: progress.succeeded,
                  },
                  {
                    key: 'f',
                    label: intl.formatMessage({ id: 'pages.knowledge.evaluation.failed' }),
                    children: progress.failed,
                  },
                ]}
              />
            </Card>
          )}
          <Card
            className="evaluation-card evaluation-metric-card"
            title={intl.formatMessage({ id: 'pages.knowledge.evaluation.latestMetrics' })}
          >
            <Descriptions
              items={
                runs[0]
                  ? [
                      { key: 'r', label: 'Recall@K', children: pct(runs[0].recallAtK) },
                      { key: 'm', label: 'MRR', children: pct(runs[0].mrr) },
                      { key: 'n', label: 'nDCG', children: pct(runs[0].ndcg) },
                      {
                        key: 'i',
                        label: intl.formatMessage({
                          id: 'pages.knowledge.evaluation.invalidAnnotations',
                        }),
                        children: runs[0].invalidCount,
                      },
                    ]
                  : []
              }
            />
          </Card>
          <Card
            className="evaluation-card"
            title={intl.formatMessage({ id: 'pages.knowledge.evaluation.trend' })}
            size="small"
          >
            <Table<EvaluationRun>
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={trend}
              columns={[
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.runTime' }),
                  dataIndex: 'startedAt',
                  render: (value) => (value ? new Date(value).toLocaleString(intl.locale) : '-'),
                },
                { title: 'Recall@K', dataIndex: 'recallAtK', render: pct },
                { title: 'MRR', dataIndex: 'mrr', render: pct },
                { title: 'nDCG', dataIndex: 'ndcg', render: pct },
                {
                  title: intl.formatMessage({ id: 'pages.common.status' }),
                  dataIndex: 'status',
                  render: evaluationStatus,
                },
              ]}
            />
          </Card>
          <Card
            className="evaluation-card"
            title={intl.formatMessage({ id: 'pages.knowledge.evaluation.addQuestion' })}
            size="small"
            extra={
              canWrite && (
                <Space wrap>
                  <Button
                    onClick={async () => {
                      if (!caseIds.length)
                        return message.warning(
                          intl.formatMessage({ id: 'pages.knowledge.evaluation.noCasesSelected' }),
                        );
                      await updateEvaluationCaseStatuses(selected!.id!, caseIds.map(String), 1);
                      await open(selected!);
                    }}
                  >
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.enableSelected' })}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!caseIds.length)
                        return message.warning(
                          intl.formatMessage({ id: 'pages.knowledge.evaluation.noCasesSelected' }),
                        );
                      await updateEvaluationCaseStatuses(selected!.id!, caseIds.map(String), 0);
                      await open(selected!);
                    }}
                  >
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.disableSelected' })}
                  </Button>
                </Space>
              )
            }
          >
            <Table
              rowKey="id"
              className="evaluation-table"
              dataSource={cases}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total}` }}
              rowSelection={
                canWrite ? { selectedRowKeys: caseIds, onChange: setCaseIds } : undefined
              }
              columns={[
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.question' }),
                  dataIndex: 'question',
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.document' }),
                  dataIndex: 'documentId',
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.section' }),
                  dataIndex: 'sectionPath',
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.labels' }),
                  render: (_, item) => (
                    <Button
                      type="link"
                      onClick={async () => {
                        setLabelCase(item);
                        setLabels(
                          (await getEvaluationCaseLabels(selected!.id!, item.id!)).data || [],
                        );
                      }}
                    >
                      {intl.formatMessage({ id: 'pages.knowledge.evaluation.manageLabels' })}
                    </Button>
                  ),
                },
                {
                  title: intl.formatMessage({ id: 'pages.common.status' }),
                  dataIndex: 'status',
                  render: (value) => (
                    <Tag color={value === 1 ? 'green' : 'default'}>
                      {intl.formatMessage({
                        id:
                          value === 1
                            ? 'pages.knowledge.evaluation.enabled'
                            : 'pages.knowledge.evaluation.disabled',
                      })}
                    </Tag>
                  ),
                },
                {
                  title: intl.formatMessage({ id: 'pages.common.option' }),
                  render: (_, item) =>
                    canWrite && (
                      <Space>
                        <Button type="link" onClick={() => setEditingCase(item)}>
                          {intl.formatMessage({ id: 'pages.common.edit' })}
                        </Button>
                        <Popconfirm
                          title={intl.formatMessage({
                            id: 'pages.knowledge.evaluation.deleteQuestionConfirm',
                          })}
                          onConfirm={async () => {
                            await deleteEvaluationCase(selected!.id!, item.id!);
                            await open(selected!);
                          }}
                        >
                          <Button type="link" danger>
                            {intl.formatMessage({ id: 'pages.common.delete' })}
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                },
              ]}
            />
          </Card>
          {compareRunIds.length === 2 && comparison && (
            <Card
              className="evaluation-card"
              title={intl.formatMessage({ id: 'pages.knowledge.evaluation.runComparison' })}
              size="small"
            >
              {!comparison.comparable && (
                <Alert
                  type="warning"
                  showIcon
                  message={
                    comparison.nonComparableReason ||
                    intl.formatMessage({ id: 'pages.knowledge.evaluation.nonComparable' })
                  }
                  style={{ marginBottom: 12 }}
                />
              )}
              <Descriptions
                items={[
                  {
                    key: 'recall',
                    label: intl.formatMessage({ id: 'pages.knowledge.evaluation.recallChange' }),
                    children: pct(comparison.metrics.recallAtKDelta),
                  },
                  {
                    key: 'mrr',
                    label: intl.formatMessage({ id: 'pages.knowledge.evaluation.mrrChange' }),
                    children: pct(comparison.metrics.mrrDelta),
                  },
                  {
                    key: 'ndcg',
                    label: intl.formatMessage({ id: 'pages.knowledge.evaluation.ndcgChange' }),
                    children: pct(comparison.metrics.ndcgDelta),
                  },
                ]}
              />
            </Card>
          )}
          <Table
            rowKey="id"
            className="evaluation-card evaluation-table"
            dataSource={runs}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total}` }}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: compareRunIds,
              onChange: async (keys) => {
                if (keys.length > 2) {
                  message.warning(
                    intl.formatMessage({ id: 'pages.knowledge.evaluation.maxTwoRuns' }),
                  );
                  return;
                }
                setCompareRunIds(keys);
                if (keys.length === 2) {
                  const response = await compareEvaluationRuns(
                    selected!.id!,
                    String(keys[0]),
                    String(keys[1]),
                  );
                  setComparison(response.data);
                } else setComparison(undefined);
              },
            }}
            columns={[
              {
                title: intl.formatMessage({ id: 'pages.knowledge.evaluation.runTime' }),
                dataIndex: 'startedAt',
                render: (v) => (v ? new Date(v).toLocaleString(intl.locale) : '-'),
              },
              { title: 'Recall@K', dataIndex: 'recallAtK', render: pct },
              { title: 'MRR', dataIndex: 'mrr', render: pct },
              { title: 'nDCG', dataIndex: 'ndcg', render: pct },
              {
                title: intl.formatMessage({ id: 'pages.common.status' }),
                dataIndex: 'status',
                render: (value) => (
                  <Tag
                    color={
                      value === 'SUCCEEDED'
                        ? 'green'
                        : value === 'RUNNING'
                          ? 'processing'
                          : 'default'
                    }
                  >
                    {evaluationStatus(value)}
                  </Tag>
                ),
              },
              {
                title: intl.formatMessage({ id: 'pages.knowledge.evaluation.baseline' }),
                dataIndex: 'isBaseline',
                render: (value) =>
                  value ? (
                    <Tag color="gold">
                      {intl.formatMessage({ id: 'pages.knowledge.evaluation.baseline' })}
                    </Tag>
                  ) : (
                    '-'
                  ),
              },
              {
                title: intl.formatMessage({ id: 'pages.knowledge.evaluation.details' }),
                render: (_, run) => (
                  <Space>
                    <Button
                      type="link"
                      onClick={() =>
                        history.push(`/knowledge/evaluation/sets/${selected!.id}/runs/${run.id}`)
                      }
                    >
                      {intl.formatMessage({ id: 'pages.knowledge.evaluation.viewQuestionResults' })}
                    </Button>
                    {canWrite && (
                      <Popconfirm
                        title={intl.formatMessage({
                          id: 'pages.knowledge.evaluation.setBaselineConfirm',
                        })}
                        onConfirm={async () => {
                          await setEvaluationRunBaseline(selected!.id!, run.id);
                          await open(selected!);
                        }}
                      >
                        <Button
                          type="link"
                          disabled={run.status !== 'SUCCEEDED' && run.status !== 'PARTIAL_FAILED'}
                        >
                          {intl.formatMessage({ id: 'pages.knowledge.evaluation.setBaseline' })}
                        </Button>
                      </Popconfirm>
                    )}
                    {canWrite && run.status === 'FAILED' && (
                      <Button
                        type="link"
                        onClick={async () => {
                          await retryEvaluationRunFailures(selected!.id!, run.id);
                          setProgress((await getEvaluationRunProgress(selected!.id!, run.id)).data);
                        }}
                      >
                        {intl.formatMessage({ id: 'pages.knowledge.evaluation.retryFailures' })}
                      </Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </>
      )}
      <ModalForm<EvaluationCase>
        open={!!editingCase}
        onOpenChange={(open) => !open && setEditingCase(undefined)}
        initialValues={editingCase}
        title={intl.formatMessage({ id: 'pages.knowledge.evaluation.editQuestion' })}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (value) => {
          await updateEvaluationCase(selected!.id!, editingCase!.id!, value);
          await open(selected!);
          setEditingCase(undefined);
          return true;
        }}
      >
        <ProFormTextArea
          name="question"
          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.question' })}
          rules={[{ required: true }]}
        />
        <ProFormSelect
          name="documentId"
          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedDocument' })}
          showSearch
          request={async () =>
            ((await getEvaluationDocuments()).data || []).map((item) => ({
              label: item.title,
              value: item.id,
            }))
          }
          rules={[{ required: true }]}
        />
        <ProFormDependency name={['documentId']}>
          {({ documentId }) => (
            <ProFormSelect
              name="sectionPath"
              label={intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedSection' })}
              disabled={!documentId}
              request={async () =>
                documentId
                  ? ((await getEvaluationDocumentSections(documentId)).data || []).map((value) => ({
                      label: value,
                      value,
                    }))
                  : []
              }
            />
          )}
        </ProFormDependency>
      </ModalForm>
      <Modal
        open={!!importPreview}
        title={intl.formatMessage({ id: 'pages.knowledge.evaluation.importPreview' })}
        onCancel={() => setImportPreview(undefined)}
        footer={
          importPreview?.valid ? (
            <Button
              type="primary"
              onClick={async () => {
                const response = await importEvaluationCases(selected!.id!, importItems);
                await open(selected!);
                setImportPreview(undefined);
                message.success(
                  intl.formatMessage(
                    { id: 'pages.knowledge.evaluation.importCompleted' },
                    { count: response.data || 0 },
                  ),
                );
              }}
            >
              {intl.formatMessage({ id: 'pages.knowledge.evaluation.confirmImport' })}
            </Button>
          ) : null
        }
      >
        {importPreview && (
          <>
            <Alert
              type={importPreview.valid ? 'success' : 'error'}
              showIcon
              message={
                importPreview.valid
                  ? intl.formatMessage(
                      { id: 'pages.knowledge.evaluation.importValid' },
                      { count: importPreview.acceptedCount },
                    )
                  : intl.formatMessage({ id: 'pages.knowledge.evaluation.importInvalid' })
              }
            />
            {!importPreview.valid && (
              <Table
                size="small"
                style={{ marginTop: 16 }}
                rowKey={(item) => `${item.row}-${item.code}`}
                pagination={false}
                dataSource={importPreview.issues}
                columns={[
                  {
                    title: intl.formatMessage(
                      { id: 'pages.knowledge.evaluation.importRow' },
                      { row: '' },
                    ),
                    dataIndex: 'row',
                  },
                  { title: 'Code', dataIndex: 'code' },
                  {
                    title: intl.formatMessage({ id: 'pages.knowledge.evaluation.error' }),
                    dataIndex: 'message',
                  },
                ]}
              />
            )}
          </>
        )}
      </Modal>
      <Modal
        width={760}
        footer={null}
        open={!!labelCase}
        onCancel={() => setLabelCase(undefined)}
        title={intl.formatMessage(
          { id: 'pages.knowledge.evaluation.labelsTitle' },
          { question: labelCase?.question || '' },
        )}
      >
        {labelCase && (
          <>
            <Table<EvaluationLabel>
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={labels}
              columns={[
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.type' }),
                  dataIndex: 'targetType',
                  render: targetType,
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.document' }),
                  dataIndex: 'documentId',
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.section' }),
                  dataIndex: 'sectionPath',
                  render: (value) => value || '-',
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.chunk' }),
                  dataIndex: 'chunkId',
                  render: (value) => value || '-',
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.action' }),
                  render: (_, label) =>
                    canWrite ? (
                      <Popconfirm
                        title={intl.formatMessage({
                          id: 'pages.knowledge.evaluation.deleteLabelConfirm',
                        })}
                        onConfirm={async () => {
                          await deleteEvaluationCaseLabel(selected!.id!, labelCase.id!, label.id!);
                          setLabels(
                            (await getEvaluationCaseLabels(selected!.id!, labelCase.id!)).data ||
                              [],
                          );
                          await open(selected!);
                        }}
                      >
                        <Button type="link" danger>
                          {intl.formatMessage({ id: 'pages.knowledge.evaluation.delete' })}
                        </Button>
                      </Popconfirm>
                    ) : (
                      '-'
                    ),
                },
              ]}
            />
            {canWrite && (
              <ModalForm<EvaluationLabel>
                title={intl.formatMessage({ id: 'pages.knowledge.evaluation.addPositiveLabel' })}
                modalProps={{ destroyOnClose: true }}
                onFinish={async (value) => {
                  await saveEvaluationCaseLabel(selected!.id!, labelCase.id!, value);
                  setLabels(
                    (await getEvaluationCaseLabels(selected!.id!, labelCase.id!)).data || [],
                  );
                  await open(selected!);
                  return true;
                }}
                trigger={
                  <Button style={{ marginTop: 16 }}>
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.addLabel' })}
                  </Button>
                }
              >
                <ProFormSelect
                  name="targetType"
                  label={intl.formatMessage({ id: 'pages.knowledge.evaluation.targetType' })}
                  initialValue={labels[0]?.targetType || 'DOCUMENT'}
                  options={['DOCUMENT', 'SECTION', 'CHUNK'].map((value) => ({
                    label: targetType(value),
                    value,
                  }))}
                  rules={[{ required: true }]}
                />
                <ProFormSelect
                  name="documentId"
                  label={intl.formatMessage({ id: 'pages.knowledge.evaluation.document' })}
                  showSearch
                  request={async () =>
                    ((await getEvaluationDocuments()).data || []).map((item) => ({
                      label: item.title,
                      value: item.id,
                    }))
                  }
                  rules={[{ required: true }]}
                />
                <ProFormDependency name={['targetType', 'documentId']}>
                  {({ targetType, documentId }) => (
                    <>
                      {targetType === 'SECTION' && (
                        <ProFormSelect
                          name="sectionPath"
                          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.section' })}
                          disabled={!documentId}
                          request={async () =>
                            documentId
                              ? ((await getEvaluationDocumentSections(documentId)).data || []).map(
                                  (value) => ({ label: value, value }),
                                )
                              : []
                          }
                          rules={[{ required: true }]}
                        />
                      )}
                      {targetType === 'CHUNK' && (
                        <ProFormSelect
                          name="chunkId"
                          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.chunk' })}
                          disabled={!documentId}
                          request={async () =>
                            documentId
                              ? ((await getEvaluationDocumentChunks(documentId)).data || []).map(
                                  (item) => ({
                                    label: `#${item.chunkIndex ?? '-'} ${item.sectionPath || ''}`,
                                    value: item.id,
                                  }),
                                )
                              : []
                          }
                          rules={[{ required: true }]}
                        />
                      )}
                    </>
                  )}
                </ProFormDependency>
              </ModalForm>
            )}
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
