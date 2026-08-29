export type HumanOption = { label: string; value: string }

/** 将新旧工作流定义中的选项统一为可展示、可提交的字符串值。 */
export const normalizeHumanOptions = (options: unknown): HumanOption[] | undefined => {
  if (!Array.isArray(options)) return undefined
  const normalized = options.map((option): HumanOption | undefined => {
    if (typeof option === 'string' || typeof option === 'number') {
      return { label: String(option), value: String(option) }
    }
    if (option && typeof option === 'object') {
      const value = (option as Record<string, unknown>).value
      const label = (option as Record<string, unknown>).label
      if (value !== undefined && value !== null) {
        return { label: String(label ?? value), value: String(value) }
      }
    }
    return undefined
  }).filter((option): option is HumanOption => Boolean(option))
  return normalized.length ? normalized : undefined
}
