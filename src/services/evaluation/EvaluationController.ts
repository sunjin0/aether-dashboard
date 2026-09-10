import { request } from '@umijs/max';
import type { ResponseStructure } from '@/services/entity/Common';

export type EvaluationTargetType = 'AGENT' | 'WORKFLOW';
export interface EvaluationDataset { id?: string; name: string; description?: string; targetType: EvaluationTargetType; revision?: number; archived?: boolean; }
export interface EvaluationDatasetVersion { id: string; datasetId: string; versionNo: number; caseCount?: number; contentHash?: string; publishedAt?: number; }
export interface EvaluationCase { id?: string; datasetId?: string; caseKey: string; name?: string; inputJson: string; referenceJson?: string; assertionsJson?: string; evaluatorBindingsJson?: string; enabled?: boolean; required?: boolean; passThreshold?: number; }
export interface EvaluationExperiment { id?: string; name: string; targetType: EvaluationTargetType; targetId: string; snapshotId: string; datasetVersionId: string; selectionJson?: string; configJson?: string; countsJson?: string; metricsJson?: string; status?: string; qualityStatus?: string; revision?: number; reportRevision?: number; }
export interface EvaluationTargetSnapshot { id?: string; targetType: EvaluationTargetType; targetId: string; sourceKind?: string; sourceVersionId?: string; snapshotJson?: string; }
export interface EvaluationResult { id: string; experimentId: string; executionStatus?: string; gradingStatus?: string; reviewStatus?: string; reviewComment?: string; score?: number; errorCode?: string; outputJson?: string; evidenceJson?: string; }
export interface EvaluationScore { id: string; evaluatorVersionId?: string; bindingKey?: string; status?: string; score?: number; weight?: number; reason?: string; }
export interface EvaluationReview { id: string; experimentId: string; caseKey: string; resultId: string; reviewerId?: string; decision: 'APPROVED' | 'REJECTED'; reason?: string; reportRevision: number; previousReviewId?: string; createdAt?: number; }
export interface EvaluationProgress { total: number; queued: number; running: number; succeeded: number; failed: number; blocked: number; timedOut: number; cancelled: number; finished: boolean; }
export interface EvaluationPrecheck { ready: boolean; reasonCode: string; caseCount?: number; executionUnits?: number; parallelism?: number; caseTimeoutSeconds?: number; }
export interface EvaluationEvaluator { id?: string; name: string; kind: 'RULE' | 'LLM'; draftConfigJson?: string; revision?: number; archived?: boolean; }
export interface EvaluationEvaluatorVersion { id: string; evaluatorId: string; versionNo: number; configJson?: string; contentHash?: string; publishedAt?: number; }
export interface EvaluationPolicy { id?: string; targetType: EvaluationTargetType; targetId: string; required?: boolean; minimumScore?: number; datasetVersionId?: string; minimumPassRate?: number; requireReview?: boolean; repeats?: number; caseTimeoutSeconds?: number; parallelism?: number; revision?: number; }
export interface EvaluationGateResult { allowed: boolean; reasonCode: string; experimentId?: string; reportRevision?: number; }
export interface EvaluationBaseline { id: string; targetType: EvaluationTargetType; targetId: string; datasetVersionId: string; configHash: string; experimentId: string; revision?: number; }
export interface EvaluationComparison { comparable: boolean; reasonCode: string; baselineExperimentId: string; candidateExperimentId: string; baselineMetrics?: string; candidateMetrics?: string; caseDifferences?: Array<{ caseKey: string; baselineScore?: number; candidateScore?: number; scoreDelta?: number }>; }

export const listEvaluationDatasets = (params?: { targetType?: EvaluationTargetType; [key: string]: unknown }) => {
  const targetType = params?.targetType;
  const url = targetType ? `/api/evaluation/datasets?targetType=${encodeURIComponent(targetType)}` : '/api/evaluation/datasets';
  return request<ResponseStructure<EvaluationDataset[]>>(url, { params: targetType ? undefined : params });
};
export const createEvaluationDataset = (data: EvaluationDataset) => request<ResponseStructure<string>>('/api/evaluation/datasets', { method: 'POST', data });
export const updateEvaluationDataset = (id: string, data: Partial<EvaluationDataset>) => request<ResponseStructure<void>>(`/api/evaluation/datasets/${id}`, { method: 'PUT', data });
export const deleteEvaluationDataset = (id: string) => request<ResponseStructure<void>>(`/api/evaluation/datasets/${id}`, { method: 'DELETE' });
export const listEvaluationCases = (id: string) => request<ResponseStructure<EvaluationCase[]>>(`/api/evaluation/datasets/${id}/cases`);
export interface EvaluationCaseImportPreview { valid: boolean; total: number; errors: Array<{ index: number; code: string }>; items: EvaluationCase[]; }
export const exportEvaluationCases = (id: string) => request<ResponseStructure<{ schemaVersion: number; targetType: EvaluationTargetType; cases: EvaluationCase[] }>>(`/api/evaluation/datasets/${id}/cases/export`);
export const previewEvaluationCaseImport = (id: string, cases: EvaluationCase[]) => request<ResponseStructure<EvaluationCaseImportPreview>>(`/api/evaluation/datasets/${id}/cases/import/preview`, { method: 'POST', data: { cases } });
export const importEvaluationCases = (id: string, cases: EvaluationCase[]) => request<ResponseStructure<number>>(`/api/evaluation/datasets/${id}/cases/import`, { method: 'POST', data: { cases } });
export const createEvaluationCase = (id: string, data: EvaluationCase) => request<ResponseStructure<string>>(`/api/evaluation/datasets/${id}/cases`, { method: 'POST', data });
export const updateEvaluationCase = (id: string, caseId: string, data: EvaluationCase) => request<ResponseStructure<void>>(`/api/evaluation/datasets/${id}/cases/${caseId}`, { method: 'PUT', data });
export const deleteEvaluationCase = (id: string, caseId: string) => request<ResponseStructure<void>>(`/api/evaluation/datasets/${id}/cases/${caseId}`, { method: 'DELETE' });
export const publishEvaluationDatasetVersion = (id: string) => request<ResponseStructure<number>>(`/api/evaluation/datasets/${id}/versions`, { method: 'POST' });
export const listEvaluationDatasetVersions = (id: string) => request<ResponseStructure<EvaluationDatasetVersion[]>>(`/api/evaluation/datasets/${id}/versions`);
export const listEvaluationExperiments = (params?: { targetType?: EvaluationTargetType; targetId?: string; [key: string]: unknown }) => request<ResponseStructure<EvaluationExperiment[]>>('/api/evaluation/experiments', { params });
export const getEvaluationExperiment = (id: string) => request<ResponseStructure<EvaluationExperiment>>(`/api/evaluation/experiments/${id}`);
export const exportEvaluationExperiment = (id: string) => request<ResponseStructure<Record<string, unknown>>>(`/api/evaluation/experiments/${id}/export`);
export const createEvaluationExperiment = (data: EvaluationExperiment) => request<ResponseStructure<string>>('/api/evaluation/experiments', { method: 'POST', data });
export const precheckEvaluationExperiment = (data: Pick<EvaluationExperiment, 'targetType' | 'targetId' | 'datasetVersionId' | 'configJson'>) => request<ResponseStructure<EvaluationPrecheck>>('/api/evaluation/experiments/precheck', { method: 'POST', data });
export const createEvaluationSnapshot = (data: EvaluationTargetSnapshot) => request<ResponseStructure<EvaluationTargetSnapshot>>('/api/evaluation/snapshots', { method: 'POST', data });
export const cancelEvaluationExperiment = (id: string) => request<ResponseStructure<void>>(`/api/evaluation/experiments/${id}/cancel`, { method: 'POST' });
export const deleteEvaluationExperiment = (id: string) => request<ResponseStructure<void>>(`/api/evaluation/experiments/${id}`, { method: 'DELETE' });
export const getEvaluationProgress = (id: string) => request<ResponseStructure<EvaluationProgress>>(`/api/evaluation/experiments/${id}/progress`);
export const listEvaluationResults = (id: string, params?: { executionStatus?: string }) => request<ResponseStructure<EvaluationResult[]>>(`/api/evaluation/experiments/${id}/results`, { params });
export const getEvaluationResult = (id: string, resultId: string) => request<ResponseStructure<EvaluationResult>>(`/api/evaluation/experiments/${id}/results/${resultId}`);
export const listEvaluationScores = (id: string, resultId: string) => request<ResponseStructure<EvaluationScore[]>>(`/api/evaluation/experiments/${id}/results/${resultId}/scores`);
export const reviewEvaluationResult = (id: string, resultId: string, data: { status: 'APPROVED' | 'REJECTED'; comment?: string }) => request<ResponseStructure<void>>(`/api/evaluation/experiments/${id}/results/${resultId}/review`, { method: 'POST', data });
export const listEvaluationReviews = (id: string, resultId?: string) => request<ResponseStructure<EvaluationReview[]>>(`/api/evaluation/experiments/${id}/reviews`, { params: { resultId } });
export const retryEvaluationGrading = (id: string, data: { expectedReportRevision: number; resultIds?: string[] }) => request<ResponseStructure<number>>(`/api/evaluation/experiments/${id}/grading-retries`, { method: 'POST', data });
export const rerunFailedEvaluation = (id: string, data: { expectedReportRevision: number; resultIds?: string[] }) => request<ResponseStructure<string>>(`/api/evaluation/experiments/${id}/reruns`, { method: 'POST', data });
export const setEvaluationBaseline = (experimentId: string) => request<ResponseStructure<EvaluationBaseline>>('/api/evaluation/experiments/baselines', { method: 'PUT', data: { experimentId } });
export const listEvaluationBaselines = (params?: Partial<Pick<EvaluationBaseline, 'targetType' | 'targetId' | 'datasetVersionId' | 'configHash'>>) => request<ResponseStructure<EvaluationBaseline[]>>('/api/evaluation/experiments/baselines', { params });
export const getEvaluationComparison = (baselineId: string, candidateId: string) => request<ResponseStructure<EvaluationComparison>>('/api/evaluation/experiments/comparisons', { params: { baselineId, candidateId } });
export const listEvaluationEvaluators = () => request<ResponseStructure<EvaluationEvaluator[]>>('/api/evaluation/evaluators');
export const listEvaluationEvaluatorVersions = (id: string) => request<ResponseStructure<EvaluationEvaluatorVersion[]>>(`/api/evaluation/evaluators/${id}/versions`);
export const createEvaluationEvaluator = (data: EvaluationEvaluator) => request<ResponseStructure<string>>('/api/evaluation/evaluators', { method: 'POST', data });
export const updateEvaluationEvaluator = (id: string, data: Partial<EvaluationEvaluator>) => request<ResponseStructure<void>>(`/api/evaluation/evaluators/${id}`, { method: 'PUT', data });
export const deleteEvaluationEvaluator = (id: string) => request<ResponseStructure<void>>(`/api/evaluation/evaluators/${id}`, { method: 'DELETE' });
export const publishEvaluationEvaluatorVersion = (id: string) => request<ResponseStructure<number>>(`/api/evaluation/evaluators/${id}/versions`, { method: 'POST' });
export const getEvaluationPolicy = (targetType: EvaluationTargetType, targetId: string) => request<ResponseStructure<EvaluationPolicy>>('/api/agent/evaluation/policy', { params: { targetType, targetId } });
export const saveEvaluationPolicy = (data: EvaluationPolicy) => request<ResponseStructure<string>>('/api/agent/evaluation/policy', { method: 'POST', data });
export const checkEvaluationGate = (targetType: EvaluationTargetType, targetId: string, fingerprint?: string) => request<ResponseStructure<EvaluationGateResult>>('/api/agent/evaluation/policy/check', { params: { targetType, targetId, fingerprint } });
