import { request } from '@umijs/max'
import {
  addKnowledgeBase,
  deleteKnowledgeBase,
  getKnowledgeBase,
  getKnowledgeBaseList,
  updateKnowledgeBase,
} from './KnowledgeBaseController'

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}))

const mockedRequest = request as jest.Mock

describe('KnowledgeBaseController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null })
  })

  it('uses documented knowledge-base endpoints', async () => {
    await getKnowledgeBaseList({ current: 1, pageSize: 20, scope: 'PLATFORM' })
    await getKnowledgeBase('knowledge-base-1')
    await addKnowledgeBase({ scope: 'PLATFORM', name: 'Product documentation' })
    await updateKnowledgeBase({ id: 'knowledge-base-1', name: 'Updated documentation' })
    await deleteKnowledgeBase('knowledge-base-1')

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/knowledge/base/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, scope: 'PLATFORM' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/knowledge/base/knowledge-base-1', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/knowledge/base', {
      method: 'POST',
      data: { scope: 'PLATFORM', name: 'Product documentation' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/knowledge/base/knowledge-base-1', {
      method: 'PUT',
      data: { id: 'knowledge-base-1', name: 'Updated documentation' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/knowledge/base/knowledge-base-1', {
      method: 'DELETE',
    })
  })
})
