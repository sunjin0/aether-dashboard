import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export type WorkflowSchedule = {
  id?: string
  workflowId: string
  serviceAccountId: string
  name: string
  cronExpression: string
  businessType: string
  businessIdTemplate: string
  variables?: Record<string, unknown>
  enabled?: boolean
  nextFireAt?: number
  lastTriggeredAt?: number
  lastErrorMessage?: string
  current?: number
  pageSize?: number
}
export const createWorkflowSchedule = (data: WorkflowSchedule) => request<ResponseStructure<WorkflowSchedule>>('/api/agent/workflow/schedules', { method: 'POST', data })
export const getWorkflowSchedules = (data: Partial<WorkflowSchedule> = {}) => request<ResponseStructure<WorkflowSchedule[]>>('/api/agent/workflow/schedules/list', { method: 'POST', data })
export const updateWorkflowSchedule = (id: string, data: WorkflowSchedule) => request<ResponseStructure<void>>(`/api/agent/workflow/schedules/${id}`, { method: 'PUT', data })
export const setWorkflowScheduleEnabled = (id: string, enabled: boolean) => request<ResponseStructure<void>>(`/api/agent/workflow/schedules/${id}/enabled`, { method: 'POST', params: { enabled } })
export const deleteWorkflowSchedule = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/schedules/${id}`, { method: 'DELETE' })
