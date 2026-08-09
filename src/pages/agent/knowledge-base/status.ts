import { getIntl } from '@umijs/max'

const format = (id: string) => getIntl().formatMessage({ id })

export const getSwitchStatus = (status?: number) =>
  status === 1
    ? { label: format('pages.common.enabled'), color: 'success' }
    : { label: format('pages.common.disabled'), color: 'default' }

export const getIndexStatus = (status?: number) => {
  if (status === 2) return { label: format('pages.knowledge.status.indexed'), color: 'success' }
  if (status === 1) return { label: format('pages.knowledge.status.indexing'), color: 'processing' }
  return { label: format('pages.knowledge.status.notIndexed'), color: 'default' }
}

export const getDocumentStatus = (status?: number) => {
  if (status === 2) return { label: format('pages.knowledge.status.completed'), color: 'success' }
  if (status === 1) return { label: format('pages.knowledge.status.processing'), color: 'processing' }
  return { label: format('pages.knowledge.status.unprocessed'), color: 'default' }
}
