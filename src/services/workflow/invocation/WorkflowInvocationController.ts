import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

// 展示状态是后端从工作流实例状态 + 能力动作派生出来的，不是 agent_workflow_invocation.status 原样。
export type WorkflowTaskStatus =
  | 'RUNNING'
  | 'WAITING_MCP_APPROVAL'
  | 'WAITING_USER_INPUT'
  | 'COMPLETED'
  | 'FAILED'
  | 'TERMINATED'
  | 'TIMED_OUT'

export type WorkflowTask = {
  invocationId: string
  instanceId?: string
  workflowId?: string
  workflowName?: string
  capabilityId?: string
  capabilityCode?: string
  capabilityName?: string
  status: WorkflowTaskStatus
  /** 实例原始状态，用于在展示状态被归并（如 WAITING_EVENT → RUNNING）时保留细节。 */
  rawStatus?: string
  stateVersion?: number
  currentNodeId?: string
  currentNodeType?: string
  currentNodeName?: string
  /** 与 workflow_observe 返回的 nextAction 同形状。 */
  nextAction?: Record<string, unknown>
  startedAt?: number
  completedAt?: number
}

/** 列表头部的三档筛选。服务端只认这三个值，传别的会被 422 挡回来。 */
export type WorkflowTaskState = 'all' | 'running' | 'finished'

export type WorkflowTaskQuery = {
  current?: number
  pageSize?: number
  runId?: string
  includeTerminal?: boolean
  /**
   * 粗粒度状态筛选，按工作流实例的真实状态判定而不是调用行的状态。
   *
   * 传了它就完全接管 `includeTerminal` —— `all` 表示两种终态都不过滤。之所以不让两个开关并存：
   * 接口不传 `includeTerminal` 时的旧默认是「只看未结束」，若 `all` 退化成「没传」，
   * 界面上选「全部」反而只看得到未结束的行。
   */
  state?: WorkflowTaskState
}

export const getConversationWorkflowTasks = (conversationId: string, data?: WorkflowTaskQuery) =>
  request<ResponseStructure<WorkflowTask[]>>(
    `/api/agent/chat/conversation/${encodeURIComponent(conversationId)}/workflow-tasks`,
    { method: 'POST', data: data || {} },
  )
