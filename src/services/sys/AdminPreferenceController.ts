import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export interface AdminPreference {
  id?: string;
  adminId?: string;
  adminName?: string;
  category?: string;
  keyName?: string;
  value?: string;
  description?: string;
  priority?: number;
  scope?: string;
  scopeDetail?: string;
  source?: string;
  confidence?: number;
  usageCount?: number;
  lastUsedAt?: number;
  expiresAt?: number;
  decayRate?: number;
  effectiveScore?: number;
  status?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface AdminPreferenceSearchParams {
  current?: number;
  pageSize?: number;
  category?: string;
  keyName?: string;
  value?: string;
  adminId?: string;
  status?: number;
}

export interface AdminPreferenceStatusParams {
  status: number;
}

export interface AdminPreferenceStatistics {
  total: number;
  enabled: number;
  implicit: number;
  explicit: number;
}

export const getAdminPreferenceStatistics = async (): Promise<
  ResponseStructure<AdminPreferenceStatistics>
> => request('/api/sys/preference/statistics', { method: 'GET' })

export const getAdminPreferenceList = async (
  params: AdminPreferenceSearchParams,
): Promise<ResponseStructure<AdminPreference[]>> =>
  request('/api/sys/preference/list', { method: 'POST', data: params })

export const getAdminPreference = async (id: string): Promise<ResponseStructure<AdminPreference>> =>
  request(`/api/sys/preference/${id}`, { method: 'GET' })

export const addAdminPreference = async (
  params: AdminPreference,
): Promise<ResponseStructure<string>> =>
  request('/api/sys/preference', { method: 'POST', data: params })

export const updateAdminPreference = async (
  params: AdminPreference,
): Promise<ResponseStructure<void>> =>
  request(`/api/sys/preference/${params.id}`, { method: 'PUT', data: params })

export const deleteAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/preference/${id}`, { method: 'DELETE' })

export const updateAdminPreferenceStatus = async (
  id: string,
  params: AdminPreferenceStatusParams,
): Promise<ResponseStructure<void>> =>
  request(`/api/sys/preference/${id}/status`, { method: 'PUT', data: params })

export const confirmAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/preference/${id}/feedback`, { method: 'POST' })

export const rejectAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/preference/${id}/feedback`, { method: 'DELETE' })

export const overrideAdminPreference = async (
  id: string,
  params: { value: string },
): Promise<ResponseStructure<void>> =>
  request(`/api/sys/preference/${id}/override`, { method: 'PUT', data: params })
