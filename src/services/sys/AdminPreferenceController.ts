import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';

export interface AdminPreference {
  id?: string;
  adminId?: string;
  category?: string;
  content?: string;
  sourceConversationId?: string;
  sourceMessageId?: string;
  confidence?: number;
  status?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface AdminPreferenceSearchParams extends AdminPreference {
  current?: number;
  pageSize?: number;
}

export interface AdminPreferenceStatusParams {
  status: number;
}

export const getAdminPreferenceList = async (
  params: AdminPreferenceSearchParams,
): Promise<ResponseStructure<AdminPreference[]>> =>
  request('/api/sys/admin/preference/list', { method: 'POST', data: params });

export const getAdminPreference = async (id: string): Promise<ResponseStructure<AdminPreference>> =>
  request(`/api/sys/admin/preference/${id}`, { method: 'GET' });

export const addAdminPreference = async (
  params: AdminPreference,
): Promise<ResponseStructure<string>> =>
  request('/api/sys/admin/preference', { method: 'POST', data: params });

export const updateAdminPreference = async (
  params: AdminPreference,
): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${params.id}`, { method: 'PUT', data: params });

export const deleteAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}`, { method: 'DELETE' });

export const updateAdminPreferenceStatus = async (
  id: string,
  params: AdminPreferenceStatusParams,
): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}/status`, { method: 'PUT', data: params });
