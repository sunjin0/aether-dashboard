import { request } from '@umijs/max'
import { Option, ResponseStructure } from '@/services/entity/Common'
import {
  AgentDefinitionSkillBinding,
  AgentSkill,
  AgentSkillBindingUpdateDto,
  AgentSkillDetail,
  AgentSkillDraftDto,
  AgentSkillInstallDto,
  AgentSkillPreviewDto,
  AgentSkillPreviewVo,
  AgentSkillPublishCheck,
  AgentSkillStatistics,
  AgentSkillResource,
  AgentSkillExecutionConfig,
  AgentSkillSearchParams,
  AgentSkillVersion,
} from '@/services/entity/Agent'

/**
 * @description 分页查询智能体技能列表
 */
export const getSkillList = async (
  params: AgentSkillSearchParams,
): Promise<ResponseStructure<AgentSkill[]>> => {
  return request('/api/agent/skill/list', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 获取智能体技能选项（id/name/code/status，用于匹配展示）
 */
export const getSkillOptions = async (): Promise<Option[]> => {
  const { data } = await request<ResponseStructure<Option[]>>('/api/agent/skill/options', {
    method: 'GET',
  })
  return data || []
}

export const getSkillStatistics = async (): Promise<ResponseStructure<AgentSkillStatistics>> => {
  return request('/api/agent/skill/statistics', { method: 'GET' })
}

export const getSkillRoutingConfig = async (): Promise<ResponseStructure<{ embeddingModelId?: string }>> =>
  request('/api/agent/skill/routing-config', { method: 'GET' })

export const updateSkillRoutingConfig = async (params: { embeddingModelId?: string }): Promise<ResponseStructure<void>> =>
  request('/api/agent/skill/routing-config', { method: 'PUT', data: params })

/**
 * @description 获取智能体技能详情
 */
export const getSkillDetail = async (
  id: string,
): Promise<ResponseStructure<AgentSkillDetail>> => {
  return request(`/api/agent/skill/${id}`, {
    method: 'GET',
  })
}

/**
 * @description 创建技能草稿
 */
export const createSkillDraft = async (
  params: AgentSkillDraftDto,
): Promise<ResponseStructure<string>> => {
  return request('/api/agent/skill', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 更新技能草稿
 */
export const updateSkillDraft = async (
  id: string,
  params: AgentSkillDraftDto,
): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/skill/${id}`, {
    method: 'PUT',
    data: params,
  })
}

/**
 * @description 基于最新发布版本创建下一个草稿
 */
export const createNextSkillDraft = async (
  id: string,
  options?: { skipErrorHandler?: boolean },
): Promise<ResponseStructure<string>> => {
  return request(`/api/agent/skill/${id}/draft`, {
    method: 'POST',
    ...options,
  })
}

/**
 * @description 发布当前草稿
 */
export const publishSkill = async (
  id: string,
  versionId: string,
): Promise<ResponseStructure<AgentSkillVersion>> => {
  return request(`/api/agent/skill/${id}/versions/${versionId}/publish`, {
    method: 'POST',
  })
}

/** 获取发布前检查项；发布接口仍会在服务端二次校验。 */
export const getSkillPublishCheck = async (
  id: string,
): Promise<ResponseStructure<AgentSkillPublishCheck>> => {
  return request(`/api/agent/skill/${id}/publish-check`, { method: 'GET' })
}

/**
 * @description 获取技能版本列表
 */
export const getSkillVersions = async (
  id: string,
): Promise<ResponseStructure<AgentSkillVersion[]>> => {
  return request(`/api/agent/skill/${id}/versions`, {
    method: 'GET',
  })
}

/**
 * @description 启用/停用技能
 */
export const updateSkillStatus = async (
  id: string,
  params: { status: number },
): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/skill/${id}/status`, {
    method: 'PUT',
    data: params,
  })
}

/**
 * @description 获取 Agent 已安装的技能列表
 */
export const getAgentSkillBindings = async (
  agentId: string,
): Promise<ResponseStructure<AgentDefinitionSkillBinding[]>> => {
  return request(`/api/agent/definition/${agentId}/skills`, {
    method: 'GET',
  })
}

/**
 * @description 安装技能到 Agent
 */
export const installSkillToAgent = async (
  agentId: string,
  params: AgentSkillInstallDto,
): Promise<ResponseStructure<string>> => {
  return request(`/api/agent/definition/${agentId}/skills`, {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 更新 Agent 已安装技能
 */
export const updateSkillBinding = async (
  agentId: string,
  bindingId: string,
  params: AgentSkillBindingUpdateDto,
): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/definition/${agentId}/skills/${bindingId}`, {
    method: 'PUT',
    data: params,
  })
}

/**
 * @description 卸载 Agent 已安装技能
 */
export const uninstallSkillFromAgent = async (
  agentId: string,
  bindingId: string,
): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/definition/${agentId}/skills/${bindingId}`, {
    method: 'DELETE',
  })
}

/**
 * @description 上传技能资源文件（上传到当前草稿）
 */
export const uploadSkillResource = async (
  id: string,
  file: File,
  purpose?: string,
  type?: string,
): Promise<ResponseStructure<AgentSkillResource>> => {
  const formData = new FormData()
  formData.append('file', file)
  if (purpose) formData.append('purpose', purpose)
  if (type) formData.append('type', type)
  return request(`/api/agent/skill/${id}/resources`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
  })
}

/**
 * @description 获取技能资源列表（草稿优先，否则当前发布版本）
 */
export const getSkillResources = async (
  id: string,
): Promise<ResponseStructure<AgentSkillResource[]>> => {
  return request(`/api/agent/skill/${id}/resources`, {
    method: 'GET',
  })
}

export interface AgentSkillResourceGenerateParams {
  modelId: string
  type: 'MARKDOWN' | 'TEMPLATE' | 'SCRIPT'
  name?: string
  purpose?: string
  prompt: string
}

export interface AgentSkillResourceGenerateResult {
  name: string
  type: 'MARKDOWN' | 'TEMPLATE' | 'SCRIPT'
  purpose?: string
  content: string
  model?: string
}

export const getSkillResourceContent = async (id: string, resourceId: string): Promise<ResponseStructure<string>> =>
  request(`/api/agent/skill/${id}/resources/${resourceId}/content`, { method: 'GET' })

export const generateSkillResource = async (
  id: string,
  params: AgentSkillResourceGenerateParams,
): Promise<ResponseStructure<AgentSkillResourceGenerateResult>> =>
  request(`/api/agent/skill/${id}/resources/generate`, { method: 'POST', data: params })

export const updateSkillResource = async (
  id: string, resourceId: string, file: File, purpose?: string, type?: string,
): Promise<ResponseStructure<AgentSkillResource>> => {
  const formData = new FormData()
  formData.append('file', file)
  if (purpose) formData.append('purpose', purpose)
  if (type) formData.append('type', type)
  return request(`/api/agent/skill/${id}/resources/${resourceId}`, { method: 'PUT', data: formData })
}

/**
 * @description 删除草稿技能资源
 */
export const removeSkillResource = async (
  id: string,
  resourceId: string,
): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/skill/${id}/resources/${resourceId}`, {
    method: 'DELETE',
  })
}

/**
 * @description 合成技能提示词预览（不调用模型）
 */
export const previewSkill = async (
  id: string,
  params: AgentSkillPreviewDto,
): Promise<ResponseStructure<AgentSkillPreviewVo>> => {
  return request(`/api/agent/skill/${id}/preview`, {
    method: 'POST',
    data: params,
  })
}

export const getSkillExecutionConfig = async (id: string): Promise<ResponseStructure<AgentSkillExecutionConfig>> =>
  request(`/api/agent/skill/${id}/execution-config`, { method: 'GET' })

export const updateSkillExecutionConfig = async (id: string, params: AgentSkillExecutionConfig): Promise<ResponseStructure<void>> =>
  request(`/api/agent/skill/${id}/execution-config`, { method: 'PUT', data: params })
