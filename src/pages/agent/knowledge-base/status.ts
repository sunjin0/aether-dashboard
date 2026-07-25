export const getSwitchStatus = (status?: number) =>
  status === 1 ? { label: '启用', color: 'success' } : { label: '禁用', color: 'default' }

export const getIndexStatus = (status?: number) => {
  if (status === 2) return { label: '已索引', color: 'success' }
  if (status === 1) return { label: '索引中', color: 'processing' }
  return { label: '未索引', color: 'default' }
}

export const getDocumentStatus = (status?: number) => {
  if (status === 2) return { label: '已完成', color: 'success' }
  if (status === 1) return { label: '处理中', color: 'processing' }
  return { label: '未处理', color: 'default' }
}
