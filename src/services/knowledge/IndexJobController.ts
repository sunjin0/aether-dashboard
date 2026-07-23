import { request } from '@umijs/max';
import { KnowledgeIndexJob, KnowledgeIndexJobSearchParams } from '@/services/entity/Agent';
import { ResponseStructure } from '@/services/entity/Common';
export const getIndexJobList = async (
  params: KnowledgeIndexJobSearchParams,
): Promise<ResponseStructure<KnowledgeIndexJob[]>> =>
  request('/api/knowledge/index-job/list', { method: 'POST', data: params });
export const getIndexJob = async (id: string): Promise<ResponseStructure<KnowledgeIndexJob>> =>
  request(`/api/knowledge/index-job/${id}`, { method: 'GET' });
export const retryIndexJob = async (id: string): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/index-job/${id}/retry`, { method: 'POST' });
