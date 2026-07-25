import { request } from '@umijs/max'
import { KnowledgeBaseBinding, KnowledgeBaseBindingSearchParams } from '@/services/entity/Agent'
import { ResponseStructure } from '@/services/entity/Common'

export const getKnowledgeBaseBindingList = async (
  params: KnowledgeBaseBindingSearchParams,
): Promise<ResponseStructure<KnowledgeBaseBinding[]>> =>
  request('/api/agent/knowledge-base-binding/list', { method: 'POST', data: params })

export const addKnowledgeBaseBinding = async (
  params: KnowledgeBaseBinding,
): Promise<ResponseStructure<string>> =>
  request('/api/agent/knowledge-base-binding', { method: 'POST', data: params })

export const updateKnowledgeBaseBinding = async (
  id: string,
  params: Partial<KnowledgeBaseBinding>,
): Promise<ResponseStructure<void>> =>
  request(`/api/agent/knowledge-base-binding/${id}/status`, { method: 'PUT', data: params })

/** @deprecated Use updateKnowledgeBaseBinding. Kept for existing callers. */
export const updateKnowledgeBaseBindingStatus = updateKnowledgeBaseBinding

export const deleteKnowledgeBaseBinding = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/agent/knowledge-base-binding/${id}`, { method: 'DELETE' })
