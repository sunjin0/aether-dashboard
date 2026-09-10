import React, { useEffect, useMemo, useState } from 'react';
import { history, useIntl, useLocation } from '@umijs/max';
import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Card, Descriptions, Empty, Select, Statistic } from 'antd';
import { getEvaluationComparison, getEvaluationExperiment, listEvaluationBaselines, type EvaluationBaseline, type EvaluationComparison, type EvaluationExperiment } from '@/services/evaluation/EvaluationController';

const readMetrics = (value?: string) => { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } };

export default function EvaluationComparePage() {
  const intl = useIntl();
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const candidateId = query.get('candidateId') || '';
  const [candidate, setCandidate] = useState<EvaluationExperiment>();
  const [baselines, setBaselines] = useState<EvaluationBaseline[]>([]);
  const [baselineId, setBaselineId] = useState(query.get('baselineId') || '');
  const [comparison, setComparison] = useState<EvaluationComparison>();

  useEffect(() => { if (candidateId) void getEvaluationExperiment(candidateId).then(result => setCandidate(result.data)); }, [candidateId]);
  useEffect(() => {
    if (!candidate) return;
    void listEvaluationBaselines({ targetType: candidate.targetType, targetId: candidate.targetId, datasetVersionId: candidate.datasetVersionId }).then(result => {
      setBaselines(result.data || []);
      if (!baselineId && result.data?.length === 1) setBaselineId(result.data[0].id);
    });
  }, [candidate]);
  useEffect(() => { if (baselineId && candidateId) void getEvaluationComparison(baselineId, candidateId).then(result => setComparison(result.data)); }, [baselineId, candidateId]);
  const baselineMetrics = readMetrics(comparison?.baselineMetrics);
  const candidateMetrics = readMetrics(comparison?.candidateMetrics);
  const columns = useMemo<ProColumns<NonNullable<EvaluationComparison['caseDifferences']>[number]>[]>(() => [
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.compare.caseKey' }), dataIndex: 'caseKey' },
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.compare.baselineScore' }), dataIndex: 'baselineScore' },
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.compare.candidateScore' }), dataIndex: 'candidateScore' },
    { title: intl.formatMessage({ id: 'pages.agentEvaluation.compare.delta' }), dataIndex: 'scoreDelta', render: value => value === undefined || value === null ? '-' : `${Number(value) > 0 ? '+' : ''}${value}` },
  ], [intl]);
  if (!candidateId) return <PageContainer title={intl.formatMessage({ id: 'pages.agentEvaluation.compare.title' })}><Empty description={intl.formatMessage({ id: 'pages.agentEvaluation.compare.noCandidate' })} /></PageContainer>;
  return <PageContainer title={intl.formatMessage({ id: 'pages.agentEvaluation.compare.title' })} onBack={() => history.push(`/evaluation/experiments/${candidateId}`)}>
    <Card><Descriptions column={1} size="small"><Descriptions.Item label={intl.formatMessage({ id: 'pages.agentEvaluation.compare.candidate' })}>{candidate?.name || candidateId}</Descriptions.Item><Descriptions.Item label={intl.formatMessage({ id: 'pages.agentEvaluation.compare.baseline' })}><Select style={{ minWidth: 360 }} value={baselineId || undefined} onChange={setBaselineId} placeholder={intl.formatMessage({ id: 'pages.agentEvaluation.compare.selectBaseline' })} options={baselines.map(item => ({ value: item.id, label: item.experimentId }))} /></Descriptions.Item></Descriptions></Card>
    {comparison && !comparison.comparable && <Alert style={{ marginTop: 16 }} type="warning" showIcon message={intl.formatMessage({ id: 'pages.agentEvaluation.compare.notComparable' })} description={intl.formatMessage({ id: 'pages.agentEvaluation.compare.configMismatch' })} />}
    {comparison?.comparable && <><Card style={{ marginTop: 16 }}><Statistic title={intl.formatMessage({ id: 'pages.agentEvaluation.compare.averageScoreDelta' })} value={Number(candidateMetrics.averageScore || 0) - Number(baselineMetrics.averageScore || 0)} precision={2} /></Card><ProTable rowKey="caseKey" style={{ marginTop: 16 }} search={false} toolBarRender={false} columns={columns} dataSource={comparison.caseDifferences || []} pagination={false} /></>}
  </PageContainer>;
}
