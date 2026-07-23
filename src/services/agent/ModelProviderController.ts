import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import {
  ModelProvider,
  ModelProviderSearchParams,
  ModelProviderStatusParams,
} from '@/services/entity/Agent';

/**
 * @description 获取模型供应商列表
 */
export const getModelProviderList = async (
  params: ModelProviderSearchParams,
): Promise<ResponseStructure<ModelProvider[]>> => {
  return request('/api/agent/model-provider/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取模型供应商详情
 */
export const getModelProviderInfo = async (
  id: string,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}`, {
    method: 'GET',
  });
};

/**
 * @description 新增模型供应商
 */
export const addModelProviderInfo = async (
  params: ModelProvider,
): Promise<ResponseStructure<ModelProvider>> => {
  return request('/api/agent/model-provider', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 修改模型供应商
 */
export const updateModelProviderInfo = async (
  params: ModelProvider,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${params.id}`, {
    method: 'PUT',
    data: params,
  });
};

/**
 * @description 删除模型供应商
 */
export const deleteModelProviderInfo = async (
  id: string,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}`, {
    method: 'DELETE',
  });
};

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
  });
};

/** 获取可用于 Embedding 的已启用模型供应商 */
export const getEmbeddingProviderOptions = async () =>
  request('/api/agent/model-provider/embedding-options', {
    method: 'GET',
  });

/** 获取可用于 AI 文档审查的已启用非 Embedding 模型供应商。 */
export const getReviewModelProviderOptions = async () => {
  const response = await getModelProviderList({ current: 1, pageSize: 1000, status: 1 });
  return (response.data || [])
    .filter((provider) => provider.id && provider.type?.toLowerCase() !== 'embedding')
    .map((provider) => ({ label: provider.name || provider.id!, value: provider.id! }));
};
