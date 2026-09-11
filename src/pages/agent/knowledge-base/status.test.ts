import { getDocumentStatus, getIndexStatus, getSwitchStatus } from './status'
import zhCN from '@/locales/zh-CN'

jest.mock('@umijs/max', () => ({
  getIntl: () => ({
    formatMessage: ({ id }: { id: string }) => {
      const messages = require('@/locales/zh-CN').default as Record<string, string>
      return messages[id] || id
    },
  }),
}))

describe('knowledge-base status labels', () => {
  it('maps documented API status values to display labels and colors', () => {
    expect(getSwitchStatus(0)).toEqual({ label: zhCN['pages.common.disabled'], color: 'default' })
    expect(getSwitchStatus(1)).toEqual({ label: zhCN['pages.common.enabled'], color: 'success' })
    expect(getIndexStatus(0)).toEqual({
      label: zhCN['pages.knowledge.status.notIndexed'],
      color: 'default',
    })
    expect(getIndexStatus(1)).toEqual({
      label: zhCN['pages.knowledge.status.indexing'],
      color: 'processing',
    })
    expect(getIndexStatus(2)).toEqual({
      label: zhCN['pages.knowledge.status.indexed'],
      color: 'success',
    })
    expect(getDocumentStatus(0)).toEqual({
      label: zhCN['pages.knowledge.status.unprocessed'],
      color: 'default',
    })
    expect(getDocumentStatus(1)).toEqual({
      label: zhCN['pages.knowledge.status.processing'],
      color: 'processing',
    })
    expect(getDocumentStatus(2)).toEqual({
      label: zhCN['pages.knowledge.status.completed'],
      color: 'success',
    })
  })
})
