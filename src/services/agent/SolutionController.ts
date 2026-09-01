import { request } from '@umijs/max'

export interface SolutionRecord {
  id: string
  name: string
  code: string
  version: string
  status?: number
  manifestJson?: string
  tenantId?: string
}

export interface SolutionInstallation {
  id: string
  solutionId: string
  applicationId: string
  solutionVersion: string
  status?: number
}

export const getSolutionList = (params: { current?: number; pageSize?: number; name?: string }) =>
  request<{ data: SolutionRecord[]; total?: number }>('/api/agent/solution', { method: 'GET', params })

export const saveSolution = (data: Partial<SolutionRecord>) =>
  request('/api/agent/solution', { method: 'POST', data })

export const deleteSolution = (id: string) =>
  request(`/api/agent/solution/${id}`, { method: 'DELETE' })

export const getSolutionInstallations = (applicationId: string, history = false) =>
  request<{ data: SolutionInstallation[] }>('/api/agent/solution/installations', {
    method: 'GET', params: { applicationId, history },
  })

export const installSolution = (solutionId: string, applicationId: string) =>
  request(`/api/agent/solution/${solutionId}/install`, { method: 'POST', params: { applicationId } })

export const uninstallSolution = (solutionId: string, applicationId: string) =>
  request(`/api/agent/solution/${solutionId}/uninstall`, { method: 'POST', params: { applicationId } })

export const rollbackSolution = (installationId: string) =>
  request(`/api/agent/solution/installations/${installationId}/rollback`, { method: 'POST' })
