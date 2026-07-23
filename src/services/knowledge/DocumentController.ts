import { request } from '@umijs/max';
import {
  Document,
  DocumentSearchParams,
  KnowledgeDocumentChunk,
  KnowledgeDocumentVersion,
} from '@/services/entity/Agent';
import { ResponseStructure } from '@/services/entity/Common';

export const getDocumentList = async (
  params: DocumentSearchParams,
): Promise<ResponseStructure<Document[]>> =>
  request('/api/knowledge/document/list', { method: 'POST', data: params });
export const getDocument = async (id: string): Promise<ResponseStructure<Document>> =>
  request(`/api/knowledge/document/${id}`, { method: 'GET' });
export const addDocument = async (params: Document): Promise<ResponseStructure<string>> =>
  request('/api/knowledge/document', { method: 'POST', data: params });
export const updateDocument = async (params: Document): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/document/${params.id}`, { method: 'PUT', data: params });
export const deleteDocument = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/document/${id}`, { method: 'DELETE' });
export const reindexDocument = async (id: string): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/${id}/reindex`, { method: 'POST' });
export const uploadDocument = async (
  knowledgeBaseId: string,
  file: File,
  title?: string,
): Promise<ResponseStructure<string>> => {
  const data = new FormData();
  data.append('knowledgeBaseId', knowledgeBaseId);
  data.append('file', file);
  if (title) data.append('title', title);
  return request('/api/knowledge/document/upload', { method: 'POST', data });
};
export const getDocumentPreviewUrl = async (id: string): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/${id}/preview-url`, { method: 'GET' });
export const getDocumentVersions = async (
  id: string,
): Promise<ResponseStructure<KnowledgeDocumentVersion[]>> =>
  request(`/api/knowledge/document/${id}/versions`, { method: 'GET' });
export const getDocumentVersion = async (
  versionId: string,
): Promise<ResponseStructure<KnowledgeDocumentVersion>> =>
  request(`/api/knowledge/document/version/${versionId}`, { method: 'GET' });
export const updateDocumentDraft = async (
  versionId: string,
  content: string,
  expectedChecksum: string,
): Promise<ResponseStructure<KnowledgeDocumentVersion>> =>
  request(`/api/knowledge/document/version/${versionId}/draft`, {
    method: 'PUT',
    data: { content, expectedChecksum },
  });
export const reviseDocumentVersion = async (
  versionId: string,
): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/version/${versionId}/revise`, { method: 'POST' });
export const rollbackDocumentVersion = async (
  versionId: string,
): Promise<ResponseStructure<string>> =>
  request(`/api/knowledge/document/version/${versionId}/rollback`, { method: 'POST' });
/** 查询指定文档版本按 chunkNo 升序返回的分块列表。 */
export const getDocumentVersionChunkList = async (
  versionId: string,
): Promise<ResponseStructure<KnowledgeDocumentChunk[]>> =>
  request(`/api/knowledge/document/version/${versionId}/chunk/list`, { method: 'GET' });
