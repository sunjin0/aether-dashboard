import { request } from '@umijs/max'
import type { ResponseStructure } from '@/services/entity/Common'
import type { SandboxTask } from '@/services/entity/Agent'

export const getSandboxTaskByRun = (runId: string): Promise<ResponseStructure<SandboxTask | null>> =>
  request(`/api/agent/sandbox/tasks/run/${runId}`, { method: 'GET' })

export const cancelSandboxTask = (id: string, reason?: string): Promise<ResponseStructure<void>> =>
  request(`/api/agent/sandbox/tasks/${id}/cancel`, { method: 'POST', data: { reason } })

export const retrySandboxTask = (id: string): Promise<ResponseStructure<SandboxTask>> =>
  request(`/api/agent/sandbox/tasks/${id}/retry`, { method: 'POST' })

export const getSandboxTemplates = (): Promise<ResponseStructure<Array<{ id?: string; code?: string; name?: string; description?: string; enabled?: boolean; riskLevel?: string; currentVersionId?: string }>>> =>
  request('/api/agent/sandbox/templates', { method: 'GET' })

export const getSandboxTemplateVersions = (id: string): Promise<ResponseStructure<Array<{ id?: string; version?: number; published?: boolean; policyVersion?: string; publishedAt?: number; configSnapshot?: string }>>> =>
  request(`/api/agent/sandbox/templates/${id}/versions`, { method: 'GET' })

export const setSandboxTemplateEnabled = (id: string, enabled: boolean): Promise<ResponseStructure<void>> =>
  request(`/api/agent/sandbox/admin/templates/${id}/enabled?enabled=${enabled}`, { method: 'POST' })

export const publishSandboxTemplateVersion = (id: string, data: { configSnapshot: string; policyVersion: string; riskLevel?: string }): Promise<ResponseStructure<{ id?: string; version?: number }>> =>
  request(`/api/agent/sandbox/admin/templates/${id}/versions`, { method: 'POST', data })

export const getSandboxAudit = (params: Record<string, unknown>): Promise<ResponseStructure<SandboxTask[]>> =>
  request('/api/agent/sandbox/admin/audit', { method: 'POST', data: params })

export const getSandboxAdminTask = (id: string): Promise<ResponseStructure<SandboxTask>> =>
  request(`/api/agent/sandbox/admin/tasks/${id}`, { method: 'GET' })

export const getSandboxMetrics = (): Promise<ResponseStructure<{ windowStartAt?: number; pendingApproval?: number; queued?: number; running?: number; succeeded?: number; failed?: number; timedOut?: number; cancelled?: number; expired?: number; sensitiveHits?: number; terminalTasks?: number; averageQueueWaitMillis?: number; averageExecutionMillis?: number; totalWallMillis?: number; totalOutputBytes?: number; registeredRunners?: number; activeRunners?: number; staleRunners?: number; successRatePercent?: number; failureTypes?: Record<string, number>; unpinnedImageTaskCount?: number }>> =>
  request('/api/agent/sandbox/admin/metrics', { method: 'GET' })
