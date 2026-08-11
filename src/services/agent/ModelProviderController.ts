import { request } from '@umijs/max'
import { Option, ResponseStructure } from '@/services/entity/Common'
import {
  ModelProvider,
  ModelProviderSearchParams,
  ModelProviderStatusParams,
  ModelCatalog,
} from '@/services/entity/Agent'

/**
 * @description 获取模型供应商列表
 */
export const getModelProviderList = async (
  params: ModelProviderSearchParams,
): Promise<ResponseStructure<ModelProvider[]>> => {
  return request('/api/agent/model-provider/list', {
    method: 'POST',
    data: params,
  })
}
export const getModelProviderOptions = async (type?: string, excludeEmbedding = false): Promise<Option[]> => {
  const { data } = await request<ResponseStructure<Option[]>>('/api/agent/model-provider/options', { method: 'GET', params: { type, excludeEmbedding } })
  return data || []
}
export const getModelCatalogOptions = async (capability: string): Promise<Option[]> => {
  const { data } = await request<ResponseStructure<Option[]>>('/api/agent/model-provider/models/options', {
    method: 'GET', params: { capability },
  })
  return data || []
}
export const getModelCatalog = async (providerId?: string) =>
  request<ResponseStructure<ModelCatalog[]>>('/api/agent/model-provider/models', { method: 'GET', params: { providerId } })
export const discoverProviderModels = async (providerId: string): Promise<Option[]> => {
  const { data } = await request<ResponseStructure<Option[]>>(`/api/agent/model-provider/${providerId}/models/discover`, { method: 'GET' })
  return data || []
}
export const saveModelCatalog = async (data: ModelCatalog) =>
  request<ResponseStructure<string>>('/api/agent/model-provider/models', { method: 'POST', data })
export const saveModelCatalogBatch = async (data: ModelCatalog[]) =>
  request<ResponseStructure<number>>('/api/agent/model-provider/models/batch', { method: 'POST', data })
export const updateModelCatalog = async (id: string, data: ModelCatalog) =>
  request<ResponseStructure<void>>(`/api/agent/model-provider/models/${id}`, { method: 'PUT', data })
export const deleteModelCatalog = async (id: string) =>
  request<ResponseStructure<void>>(`/api/agent/model-provider/models/${id}`, { method: 'DELETE' })
export const updateModelCatalogStatus = async (id: string, status: number) =>
  request<ResponseStructure<void>>(`/api/agent/model-provider/models/${id}/status`, { method: 'PUT', data: { status } })

/**
 * @description 获取模型供应商详情
 */
export const getModelProviderInfo = async (
  id: string,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}`, {
    method: 'GET',
  })
}

/**
 * @description 新增模型供应商
 */
export const addModelProviderInfo = async (
  params: ModelProvider,
): Promise<ResponseStructure<string>> => {
  return request('/api/agent/model-provider', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 修改模型供应商
 */
export const updateModelProviderInfo = async (
  params: ModelProvider,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${params.id}`, {
    method: 'PUT',
    data: params,
  })
}

/**
 * @description 删除模型供应商
 */
export const deleteModelProviderInfo = async (
  id: string,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}`, {
    method: 'DELETE',
  })
}

/**
 * @description 启用/禁用模型供应商
 */
export const updateModelProviderStatus = async (
  id: string,
  params: ModelProviderStatusParams,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}/status`, {
    method: 'PUT',
    data: params,
  })
}

/** 获取可用于 Embedding 的已启用模型供应商 */
export const getEmbeddingProviderOptions = async () =>
  request('/api/agent/model-provider/embedding-options', {
    method: 'GET',
  })

/** 获取可用于 AI 文档审查的已启用非 Embedding 模型供应商。 */
export const getReviewModelProviderOptions = async () => {
  const options = await getModelProviderOptions(undefined, true)
  return options
}

export interface ModelProviderConnectionTestResult { success: boolean; elapsedMs: number; error?: string }
export const testModelProviderConnection = async (id: string): Promise<ResponseStructure<ModelProviderConnectionTestResult>> =>
  request(`/api/agent/model-provider/${id}/test`, { method: 'POST' })
