import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
export interface EvaluationSet { id?: string; agentDefinitionId: string; name: string; description?: string; status?: number }
export interface EvaluationCase { id?: string; question: string; documentId?: string; sectionPath?: string; remark?: string; status?: number }
export interface EvaluationRun { id: string; recallAtK?: number; mrr?: number; ndcg?: number; totalCount?: number; invalidCount?: number; startedAt?: number }
export interface EvaluationDocument { id: string; title: string; knowledgeBaseId?: string }
export interface EvaluationRetrievedChunk { id: string; documentId: string; documentTitle?: string; sectionPath?: string; chunkIndex?: number; rank: number }
export interface EvaluationRunResult { id: string; evaluationCaseId: string; question: string; expectedDocumentId?: string; expectedDocumentTitle?: string; expectedSectionPath?: string; status: string; recallAtK?: number; mrr?: number; ndcg?: number; retrievedChunks: EvaluationRetrievedChunk[] }
export const getEvaluationSets=()=>request<ResponseStructure<EvaluationSet[]>>('/api/knowledge/evaluation/sets',{method:'GET'})
export const saveEvaluationSet=(data:EvaluationSet)=>request<ResponseStructure<string>>('/api/knowledge/evaluation/sets',{method:'POST',data})
export const getEvaluationCases=(id:string)=>request<ResponseStructure<EvaluationCase[]>>(`/api/knowledge/evaluation/sets/${id}/cases`,{method:'GET'})
export const saveEvaluationCase=(id:string,data:EvaluationCase)=>request<ResponseStructure<string>>(`/api/knowledge/evaluation/sets/${id}/cases`,{method:'POST',data})
export const runEvaluation=(id:string)=>request(`/api/knowledge/evaluation/sets/${id}/run`,{method:'POST'})
export const getEvaluationRuns=(id:string)=>request<ResponseStructure<EvaluationRun[]>>(`/api/knowledge/evaluation/sets/${id}/runs`,{method:'GET'})
export const getEvaluationDocuments=(keyword?:string)=>request<ResponseStructure<EvaluationDocument[]>>('/api/knowledge/evaluation/documents',{method:'GET',params:{keyword}})
export const getEvaluationDocumentSections=(id:string)=>request<ResponseStructure<string[]>>(`/api/knowledge/evaluation/documents/${id}/sections`,{method:'GET'})
export const getEvaluationRunResults=(setId:string,runId:string)=>request<ResponseStructure<EvaluationRunResult[]>>(`/api/knowledge/evaluation/sets/${setId}/runs/${runId}/results`,{method:'GET'})
