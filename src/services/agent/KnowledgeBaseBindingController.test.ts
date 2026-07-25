import { request } from '@umijs/max'
import {
  addKnowledgeBaseBinding,
  deleteKnowledgeBaseBinding,
  getKnowledgeBaseBindingList,
  updateKnowledgeBaseBindingStatus,
} from './KnowledgeBaseBindingController'

jest.mock('@umijs/max', () => ({ request: jest.fn() }))

const mockedRequest = request as jest.Mock

describe('KnowledgeBaseBindingController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null })
  })

  it('uses documented agent knowledge-base binding endpoints', async () => {
    await getKnowledgeBaseBindingList({ current: 1, pageSize: 20, agentDefinitionId: 'agent-1' })
    await addKnowledgeBaseBinding({
      agentDefinitionId: 'agent-1',
      knowledgeBaseId: 'knowledge-base-1',
      status: 1,
    })
    await updateKnowledgeBaseBindingStatus('binding-1', { status: 0 })
    await deleteKnowledgeBaseBinding('binding-1')

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/knowledge-base-binding/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, agentDefinitionId: 'agent-1' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/knowledge-base-binding', {
      method: 'POST',
      data: { agentDefinitionId: 'agent-1', knowledgeBaseId: 'knowledge-base-1', status: 1 },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(
      3,
      '/api/agent/knowledge-base-binding/binding-1/status',
      {
        method: 'PUT',
        data: { status: 0 },
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(
      4,
      '/api/agent/knowledge-base-binding/binding-1',
      {
        method: 'DELETE',
      },
    )
  })
})
