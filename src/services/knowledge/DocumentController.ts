import { request } from '@umijs/max'
import {
  Document,
  DocumentSearchParams,
  KnowledgeDocumentChunk,
  KnowledgeDocumentVersion,
} from '@/services/entity/Agent'
import { ResponseStructure } from '@/services/entity/Common'

/**
 * 获取文档列表
 * @param params 查询参数
 */
export const getDocumentList = async (
  params: DocumentSearchParams,
): Promise<ResponseStructure<Document[]>> =>
  request('/api/knowledge/document/list', { method: 'POST', data: params })
/**
 * 获取文档详情
 * @param id 文档ID
 */
export const getDocument = async (id: string): Promise<ResponseStructure<Document>> =>
  request(`/api/knowledge/document/${id}`, { method: 'GET' })
/**
 * 添加文档
 * @param params 文档信息
 */
export const addDocument = async (params: Document): Promise<ResponseStructure<string>> =>
  request('/api/knowledge/document', { method: 'POST', data: params })
/**
 * 更新文档
 * @param params 文档信息
 */
export const updateDocument = async (params: Document): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/document/${params.id}`, { method: 'PUT', data: params })
/**
 * 删除文档
 * @param id 文档ID
 */
export const deleteDocument = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/document/${id}`, { method: 'DELETE' })
/**
 * 重新索引文档
 * @param id 文档ID
 */
export const reindexDocument = async (id: string): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/${id}/reindex`, { method: 'POST' })
/**
 * 上传文档
 * @param knowledgeBaseId 知识库ID
 * @param file 文件
 * @param title 标题
 */
export const uploadDocument = async (
  knowledgeBaseId: string,
  file: File,
  title?: string,
): Promise<ResponseStructure<string>> => {
  const data = new FormData()
  data.append('knowledgeBaseId', knowledgeBaseId)
  data.append('file', file)
  if (title) data.append('title', title)
  return request('/api/knowledge/document/upload', { method: 'POST', data })
}
/**
 * 获取文档预览地址
 * @param id 文档ID
 */
/**
 * 获取文档版本列表
 * @param id 文档ID
 */
export const getDocumentPreviewUrl = async (id: string): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/${id}/preview-url`, { method: 'GET' });
/**
 * 获取文档版本详情
 * @param id 文档ID
 */
export const getDocumentVersions = async (
  id: string,
): Promise<ResponseStructure<KnowledgeDocumentVersion[]>> =>
  request(`/api/knowledge/document/${id}/versions`, { method: 'GET' })
export const getDocumentVersion = async (
  versionId: string,
): Promise<ResponseStructure<KnowledgeDocumentVersion>> =>
  request(`/api/knowledge/document/version/${versionId}`, { method: 'GET' })
/**
 * 更新文档草稿
 * @param versionId 版本ID
 * @param content 内容
 * @param expectedChecksum 期望的校验和
 */
export const updateDocumentDraft = async (
  versionId: string,
  content: string,
  expectedChecksum: string,
): Promise<ResponseStructure<KnowledgeDocumentVersion>> =>
  request(`/api/knowledge/document/version/${versionId}/draft`, {
    method: 'PUT',
    data: { content, expectedChecksum },
  })
export const reviseDocumentVersion = async (
  versionId: string,
): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/version/${versionId}/revise`, { method: 'POST' })
/**
 * 撤销文档版本
 * @param versionId 版本ID
 */
export const rollbackDocumentVersion = async (
  versionId: string,
): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/version/${versionId}/rollback`, { method: 'POST' })
/**
 * 查询指定文档版本按 chunkNo 升序返回的分块列表。
 * @param versionId 文档版本ID
 */
export const getDocumentVersionChunkList = async (
  versionId: string,
): Promise<ResponseStructure<KnowledgeDocumentChunk[]>> =>
  request(`/api/knowledge/document/version/${versionId}/chunk/list`, { method: 'GET' })
