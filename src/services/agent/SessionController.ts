import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import { AgentSessionMemory, AgentSessionMetrics, AgentSessionSnapshot, AgentSessionTimeline, AgentTaskSnapshot } from '@/services/entity/Agent'

/** 获取聊天会话对应的持续 Deep Agent Session 与任务列表。 */
export const getAgentSessionByConversation = async (
  conversationId: string,
): Promise<ResponseStructure<AgentSessionSnapshot>> =>
  request(`/api/agent/session/conversation/${conversationId}`, { method: 'GET' })

/** 获取 Session 的任务、事件时间线，用于刷新后恢复当前任务与历史计划。 */
export const getAgentSessionTimeline = async (
  conversationId: string,
): Promise<ResponseStructure<AgentSessionTimeline>> =>
  request(`/api/agent/session/conversation/${conversationId}/timeline`, { method: 'GET' })

/** 获取一个 Task 的当前计划及状态。 */
export const getAgentTaskSnapshot = async (
  taskId: string,
): Promise<ResponseStructure<AgentTaskSnapshot>> =>
  request(`/api/agent/session/task/${taskId}`, { method: 'GET' })

/** 暂停当前任务并保存检查点。 */
export const pauseAgentSessionTask = async (
  taskId: string,
): Promise<ResponseStructure<void>> =>
  request(`/api/agent/session/task/${taskId}/pause`, { method: 'POST' })

/** 从当前任务的最新安全检查点继续执行。 */
export const resumeAgentSessionTask = async (
  taskId: string,
): Promise<ResponseStructure<void>> =>
  request(`/api/agent/session/task/${taskId}/resume`, { method: 'POST' })

/** 回答当前任务的 ask_user 提问或审批工具调用。 */
export const submitAgentSessionTaskInput = async (
  taskId: string,
  payload: { messageId: string; answers?: Record<string, unknown> },
): Promise<ResponseStructure<{ runId?: string }>> =>
  request(`/api/agent/session/task/${taskId}/input`, { method: 'POST', data: payload })

/** 查询当前会话可注入的长期任务记忆。 */
export const getAgentSessionMemories = async (
  sessionId: string,
): Promise<ResponseStructure<AgentSessionMemory[]>> =>
  request(`/api/agent/session/${sessionId}/memory`, { method: 'GET' })

/** 查询 Session 的任务、状态与记忆统计。 */
export const getAgentSessionMetrics = async (
  sessionId: string,
): Promise<ResponseStructure<AgentSessionMetrics>> =>
  request(`/api/agent/session/${sessionId}/metrics`, { method: 'GET' })

/** 删除一条长期任务记忆，后续 Deep 请求不再注入。 */
export const deleteAgentSessionMemory = async (
  sessionId: string,
  memoryId: string,
): Promise<ResponseStructure<void>> =>
  request(`/api/agent/session/${sessionId}/memory/${memoryId}`, { method: 'DELETE' })

/** 记录用户对已完成任务的质量评分。 */
export const submitAgentTaskFeedback = async (
  taskId: string,
  payload: { rating: number; note?: string },
): Promise<ResponseStructure<void>> =>
  request(`/api/agent/session/task/${taskId}/feedback`, { method: 'POST', data: payload })
