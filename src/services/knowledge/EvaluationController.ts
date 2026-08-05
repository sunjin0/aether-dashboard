import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
export interface EvaluationSet {
  id?: string;
  agentDefinitionId: string;
  name: string;
  description?: string;
  status?: number;
}
export interface EvaluationCase {
  id?: string;
  question: string;
  documentId?: string;
  sectionPath?: string;
  chunkId?: string;
  targetType?: 'DOCUMENT' | 'SECTION' | 'CHUNK';
  remark?: string;
  status?: number;
}
export interface EvaluationLabel {
  id?: string;
  evaluationCaseId?: string;
  targetType: 'DOCUMENT' | 'SECTION' | 'CHUNK';
  documentId: string;
  sectionPath?: string;
  chunkId?: string;
  relevanceGrade?: number;
  isRequired?: boolean;
  remark?: string;
  status?: number;
}
export interface EvaluationSetVersion {
  id: string;
  versionNo: number;
  publishedAt?: number;
}
export interface EvaluationHealthIssue {
  severity: string;
  code: string;
  evaluationCaseId?: string;
  message: string;
}
export interface EvaluationHealth {
  healthy: boolean;
  enabledCaseCount: number;
  issues: EvaluationHealthIssue[];
}
export interface EvaluationCaseTransfer {
  item: EvaluationCase;
  labels: EvaluationLabel[];
}
export interface EvaluationImportPreview {
  valid: boolean;
  acceptedCount: number;
  issues: { row: number; code: string; message: string }[];
}
export interface EvaluationRun {
  id: string;
  status?: string;
  isBaseline?: boolean;
  recallAtK?: number;
  mrr?: number;
  ndcg?: number;
  totalCount?: number;
  invalidCount?: number;
  failedCount?: number;
  startedAt?: number;
  finishedAt?: number;
  retrievalConfigSnapshot?: string;
}
export interface EvaluationRunProgress {
  runId: string;
  status: string;
  total: number;
  invalid: number;
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  finished: boolean;
}
export interface EvaluationRunComparison {
  baselineRunId: string;
  candidateRunId: string;
  comparable: boolean;
  nonComparableReason?: string;
  metrics: {
    baselineRecallAtK?: number;
    candidateRecallAtK?: number;
    recallAtKDelta?: number;
    baselineMrr?: number;
    candidateMrr?: number;
    mrrDelta?: number;
    baselineNdcg?: number;
    candidateNdcg?: number;
    ndcgDelta?: number;
  };
}
export interface EvaluationDocument {
  id: string;
  title: string;
  knowledgeBaseId?: string;
}
export interface EvaluationRetrievedChunk {
  id: string;
  documentId: string;
  documentTitle?: string;
  sectionPath?: string;
  chunkIndex?: number;
  rank: number;
}
export interface EvaluationRunResult {
  id: string;
  evaluationCaseId: string;
  question: string;
  expectedDocumentId?: string;
  expectedDocumentTitle?: string;
  expectedSectionPath?: string;
  expectedChunkIds?: string[];
  targetType?: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  recallAtK?: number;
  mrr?: number;
  ndcg?: number;
  retrievedChunks: EvaluationRetrievedChunk[];
}
export const getEvaluationSets = (params?: {
  current?: number;
  pageSize?: number;
  name?: string;
  agentDefinitionId?: string;
}) =>
  request<ResponseStructure<EvaluationSet[]>>('/api/knowledge/evaluation/sets', {
    method: 'GET',
    params,
  });
export const getEvaluationSet = (id: string) =>
  request<ResponseStructure<EvaluationSet>>(`/api/knowledge/evaluation/sets/${id}`, {
    method: 'GET',
  });
export const saveEvaluationSet = (data: EvaluationSet) =>
  request<ResponseStructure<string>>('/api/knowledge/evaluation/sets', { method: 'POST', data });
export const updateEvaluationSet = (id: string, data: EvaluationSet) =>
  request<ResponseStructure<void>>(`/api/knowledge/evaluation/sets/${id}`, { method: 'PUT', data });
export const deleteEvaluationSet = (id: string) =>
  request<ResponseStructure<void>>(`/api/knowledge/evaluation/sets/${id}`, { method: 'DELETE' });
export const getEvaluationCases = (id: string) =>
  request<ResponseStructure<EvaluationCase[]>>(`/api/knowledge/evaluation/sets/${id}/cases`, {
    method: 'GET',
  });
export const saveEvaluationCase = (id: string, data: EvaluationCase) =>
  request<ResponseStructure<string>>(`/api/knowledge/evaluation/sets/${id}/cases`, {
    method: 'POST',
    data,
  });
export const updateEvaluationCase = (setId: string, caseId: string, data: EvaluationCase) =>
  request<ResponseStructure<void>>(`/api/knowledge/evaluation/sets/${setId}/cases/${caseId}`, {
    method: 'PUT',
    data,
  });
export const deleteEvaluationCase = (setId: string, caseId: string) =>
  request<ResponseStructure<void>>(`/api/knowledge/evaluation/sets/${setId}/cases/${caseId}`, {
    method: 'DELETE',
  });
export const updateEvaluationCaseStatuses = (setId: string, caseIds: string[], status: number) =>
  request<ResponseStructure<void>>(`/api/knowledge/evaluation/sets/${setId}/cases/batch-status`, {
    method: 'POST',
    data: { caseIds, status },
  });
export const exportEvaluationCases = (setId: string) =>
  request<ResponseStructure<EvaluationCaseTransfer[]>>(
    `/api/knowledge/evaluation/sets/${setId}/cases/export`,
    { method: 'GET' },
  );
export const previewEvaluationCaseImport = (setId: string, data: EvaluationCaseTransfer[]) =>
  request<ResponseStructure<EvaluationImportPreview>>(
    `/api/knowledge/evaluation/sets/${setId}/cases/import/preview`,
    { method: 'POST', data },
  );
export const importEvaluationCases = (setId: string, data: EvaluationCaseTransfer[]) =>
  request<ResponseStructure<number>>(`/api/knowledge/evaluation/sets/${setId}/cases/import`, {
    method: 'POST',
    data,
  });
export const getEvaluationCaseLabels = (setId: string, caseId: string) =>
  request<ResponseStructure<EvaluationLabel[]>>(
    `/api/knowledge/evaluation/sets/${setId}/cases/${caseId}/labels`,
    { method: 'GET' },
  );
export const saveEvaluationCaseLabel = (setId: string, caseId: string, data: EvaluationLabel) =>
  request<ResponseStructure<string>>(
    `/api/knowledge/evaluation/sets/${setId}/cases/${caseId}/labels`,
    { method: 'POST', data },
  );
export const deleteEvaluationCaseLabel = (setId: string, caseId: string, labelId: string) =>
  request<ResponseStructure<void>>(
    `/api/knowledge/evaluation/sets/${setId}/cases/${caseId}/labels/${labelId}`,
    { method: 'DELETE' },
  );
export const getEvaluationSetHealth = (id: string) =>
  request<ResponseStructure<EvaluationHealth>>(`/api/knowledge/evaluation/sets/${id}/health`, {
    method: 'GET',
  });
export const publishEvaluationSetVersion = (id: string) =>
  request<ResponseStructure<string>>(`/api/knowledge/evaluation/sets/${id}/versions`, {
    method: 'POST',
  });
export const getEvaluationSetVersions = (id: string) =>
  request<ResponseStructure<EvaluationSetVersion[]>>(
    `/api/knowledge/evaluation/sets/${id}/versions`,
    { method: 'GET' },
  );
export const createEvaluationRun = (id: string, evaluationSetVersionId?: string) =>
  request<ResponseStructure<string>>(`/api/knowledge/evaluation/sets/${id}/runs`, {
    method: 'POST',
    params: { evaluationSetVersionId },
  });
export const getEvaluationRunProgress = (setId: string, runId: string) =>
  request<ResponseStructure<EvaluationRunProgress>>(
    `/api/knowledge/evaluation/sets/${setId}/runs/${runId}/progress`,
    { method: 'GET' },
  );
export const cancelEvaluationRun = (setId: string, runId: string) =>
  request<ResponseStructure<void>>(`/api/knowledge/evaluation/sets/${setId}/runs/${runId}/cancel`, {
    method: 'POST',
  });
export const retryEvaluationRunFailures = (setId: string, runId: string) =>
  request<ResponseStructure<void>>(
    `/api/knowledge/evaluation/sets/${setId}/runs/${runId}/retry-failed`,
    { method: 'POST' },
  );
export const setEvaluationRunBaseline = (setId: string, runId: string) =>
  request<ResponseStructure<void>>(
    `/api/knowledge/evaluation/sets/${setId}/runs/${runId}/baseline`,
    { method: 'POST' },
  );
export const compareEvaluationRuns = (
  setId: string,
  baselineRunId: string,
  candidateRunId: string,
) =>
  request<ResponseStructure<EvaluationRunComparison>>(
    `/api/knowledge/evaluation/sets/${setId}/runs/compare`,
    { method: 'GET', params: { baselineRunId, candidateRunId } },
  );
export const getEvaluationRuns = (id: string) =>
  request<ResponseStructure<EvaluationRun[]>>(`/api/knowledge/evaluation/sets/${id}/runs`, {
    method: 'GET',
  });
export const getEvaluationTrend = (id: string) =>
  request<ResponseStructure<EvaluationRun[]>>(`/api/knowledge/evaluation/sets/${id}/trend`, {
    method: 'GET',
  });
export const getEvaluationDocuments = (keyword?: string) =>
  request<ResponseStructure<EvaluationDocument[]>>('/api/knowledge/evaluation/documents', {
    method: 'GET',
    params: { keyword },
  });
export const getEvaluationDocumentSections = (id: string) =>
  request<ResponseStructure<string[]>>(`/api/knowledge/evaluation/documents/${id}/sections`, {
    method: 'GET',
  });
export const getEvaluationDocumentChunks = (id: string) =>
  request<ResponseStructure<{ id: string; chunkIndex?: number; sectionPath?: string }[]>>(
    `/api/knowledge/evaluation/documents/${id}/chunks`,
    { method: 'GET' },
  );
export const getEvaluationRunResults = (setId: string, runId: string) =>
  request<ResponseStructure<EvaluationRunResult[]>>(
    `/api/knowledge/evaluation/sets/${setId}/runs/${runId}/results`,
    { method: 'GET' },
  );
