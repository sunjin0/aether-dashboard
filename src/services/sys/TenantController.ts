import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export interface TenantRecord { id?: string; code: string; name: string; status?: number }
export interface WorkspaceRecord { id?: string; tenantId: string; code: string; name: string; status?: number }
export interface ProjectRecord { id?: string; workspaceId: string; applicationId?: string; code: string; name: string; status?: number }
export interface ApplicationRecord { id?: string; code: string; name: string; status?: number; tenantId?: string }

export const getTenantList = (): Promise<ResponseStructure<TenantRecord[]>> => request('/api/system/tenant')
export const saveTenant = (data: TenantRecord) => request('/api/system/tenant', { method: 'POST', data })
export const disableTenant = (id: string) => request(`/api/system/tenant/${id}/disable`, { method: 'POST' })

export const getWorkspaceList = (tenantId: string): Promise<ResponseStructure<WorkspaceRecord[]>> =>
  request('/api/system/workspace', { params: { tenantId } })
export const saveWorkspace = (data: WorkspaceRecord) => request('/api/system/workspace', { method: 'POST', data })
export const disableWorkspace = (id: string) => request(`/api/system/workspace/${id}/disable`, { method: 'POST' })

export const getProjectList = (workspaceId: string): Promise<ResponseStructure<ProjectRecord[]>> =>
  request('/api/system/project', { params: { workspaceId } })
export const saveProject = (data: ProjectRecord) => request('/api/system/project', { method: 'POST', data })
export const disableProject = (id: string) => request(`/api/system/project/${id}/disable`, { method: 'POST' })

export const getApplicationList = (): Promise<ResponseStructure<ApplicationRecord[]>> =>
  request('/api/agent/application/list', { method: 'POST', data: { current: 1, pageSize: 100 } })
