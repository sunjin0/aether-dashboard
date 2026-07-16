import { request } from '@umijs/max';
import { Document, DocumentSearchParams } from '@/services/entity/Agent';
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

export const reindexDocument = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/knowledge/document/${id}/reindex`, { method: 'POST' });
