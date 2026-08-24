import type { AgentDefinition } from '@/services/entity/Agent'

/** 只有 Deep Agent 运行可以使用 Deep run 控制接口。 */
export const isDeepAgent = (agents: AgentDefinition[], agentId?: string): boolean =>
  agents.find((item) => item.id === agentId)?.executionMode === 'DEEP'
