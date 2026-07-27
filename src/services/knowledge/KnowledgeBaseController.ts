import { request } from '@umijs/max'
import { KnowledgeBase, KnowledgeBaseSearchParams, RetrievalConfig, ReviewConfig } from '@/services/entity/Agent'
import { Option, ResponseStructure } from '@/services/entity/Common'

type KnowledgeBaseMutation = Omit<KnowledgeBase, 'reviewConfig' | 'retrievalConfig'> & {
  reviewConfig?: string;
  retrievalConfig?: string;
};

const parseReviewConfig = (value: ReviewConfig | string | undefined): ReviewConfig | undefined => {
  if (!value || typeof value !== 'string') return value as ReviewConfig | undefined
  try {
    return JSON.parse(value) as ReviewConfig
  } catch {
    return undefined
  }
}

const parseRetrievalConfig = (value: RetrievalConfig | string | undefined): RetrievalConfig | undefined => {
  if (!value || typeof value !== 'string') return value as RetrievalConfig | undefined
  try {
    return JSON.parse(value) as RetrievalConfig
  } catch {
    return undefined
  }
}

const normalizeKnowledgeBase = (item: KnowledgeBase): KnowledgeBase => ({
  ...item,
  reviewConfig: parseReviewConfig(item.reviewConfig),
  retrievalConfig: parseRetrievalConfig(item.retrievalConfig),
})

export const getKnowledgeBaseList = async (
  params: KnowledgeBaseSearchParams,
): Promise<ResponseStructure<KnowledgeBase[]>> => {
  const response = await request<ResponseStructure<KnowledgeBase[]>>('/api/knowledge/base/list', {
    method: 'POST',
    data: params,
  })
  return { ...response, data: (response.data || []).map(normalizeKnowledgeBase) }
}
export const getKnowledgeBaseOptions = async (status = 1, indexStatus?: number): Promise<Option[]> => {
  const { data } = await request<ResponseStructure<Option[]>>('/api/knowledge/base/options', { method: 'GET', params: { status, indexStatus } })
  return data || []
}

export const getKnowledgeBase = async (id: string): Promise<ResponseStructure<KnowledgeBase>> => {
  const response = await request<ResponseStructure<KnowledgeBase>>(`/api/knowledge/base/${id}`, {
    method: 'GET',
  })
  return { ...response, data: normalizeKnowledgeBase(response.data) }
}

export const addKnowledgeBase = async (
  params: KnowledgeBaseMutation,
): Promise<ResponseStructure<string>> =>
  request('/api/knowledge/base', { method: 'POST', data: params })

export const updateKnowledgeBase = async (
  params: KnowledgeBaseMutation,
): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/base/${params.id}`, { method: 'PUT', data: params })

export const deleteKnowledgeBase = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/base/${id}`, { method: 'DELETE' })
