import { Option } from '@/services/entity/Common'
import { getAgentToolOptions } from '@/services/agent/ToolController'
import { getKnowledgeBaseOptions } from '@/services/knowledge/KnowledgeBaseController'

/** 会话级选项缓存：技能表单与详情共享，仅首次打开时拉取一次。 */
let toolOptionsCache: Option[] | null = null
let knowledgeBaseOptionsCache: Option[] | null = null

const normalize = (items: Option[]): Option[] =>
  items.map((item) => ({ label: item.label, value: String(item.value) }))

export const loadToolOptions = async (): Promise<Option[]> => {
  if (toolOptionsCache) return toolOptionsCache
  const tools = await getAgentToolOptions().catch(() => [])
  toolOptionsCache = normalize(tools)
  return toolOptionsCache
}

export const loadKnowledgeBaseOptions = async (): Promise<Option[]> => {
  if (knowledgeBaseOptionsCache) return knowledgeBaseOptionsCache
  const bases = await getKnowledgeBaseOptions(1, 2).catch(() => [])
  knowledgeBaseOptionsCache = normalize(bases)
  return knowledgeBaseOptionsCache
}
