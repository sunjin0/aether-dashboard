import { request } from '@umijs/max';
import { KnowledgeBase, KnowledgeBaseSearchParams } from '@/services/entity/Agent';
import { ResponseStructure } from '@/services/entity/Common';

export const getKnowledgeBaseList = async (
  params: KnowledgeBaseSearchParams,
): Promise<ResponseStructure<KnowledgeBase[]>> =>
  request('/api/knowledge/base/list', { method: 'POST', data: params });

export const getKnowledgeBase = async (id: string): Promise<ResponseStructure<KnowledgeBase>> =>
  request(`/api/knowledge/base/${id}`, { method: 'GET' });

export const addKnowledgeBase = async (
  params: KnowledgeBase,
): Promise<ResponseStructure<string>> => request('/api/knowledge/base', { method: 'POST', data: params });

export const updateKnowledgeBase = async (
  params: KnowledgeBase,
): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/base/${params.id}`, { method: 'PUT', data: params });

export const deleteKnowledgeBase = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/base/${id}`, { method: 'DELETE' });
