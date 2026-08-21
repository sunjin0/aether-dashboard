import { request } from '@umijs/max'
import {
  closeAgentConversation,
  correctAgentConversationMemory,
  deleteAgentConversation,
  deleteAgentConversationMemory,
  getAgentContextOperationsMetrics,
  getAgentConversationContext,
  getAgentConversationInfo,
  getAgentConversationList,
  getAgentConversationMemories,
  getAgentConversationMessages,
  submitAgentConversationMemoryFeedback,
} from './ConversationController'

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}))

const mockedRequest = request as jest.Mock

describe('ConversationController', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedRequest.mockResolvedValue({ code: 200, data: null })
  })

  it('uses documented conversation management endpoints', async () => {
    await getAgentConversationList({ current: 1, pageSize: 20, title: 'hello' })
    await getAgentConversationInfo('conversation-1')
    await getAgentConversationMessages('conversation-1', { current: 1, pageSize: 20 })
    await closeAgentConversation('conversation-1')
    await deleteAgentConversation('conversation-1')

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/conversation/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, title: 'hello' },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/conversation/conversation-1', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(
      3,
      '/api/agent/conversation/conversation-1/messages',
      {
        method: 'GET',
        params: { current: 1, pageSize: 20 },
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(
      4,
      '/api/agent/conversation/conversation-1/close',
      {
        method: 'PUT',
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/agent/conversation/conversation-1', {
      method: 'DELETE',
    })
  })

  it('uses documented conversation memory and context endpoints', async () => {
    await getAgentConversationContext('conversation-1')
    await getAgentContextOperationsMetrics(123)
    await getAgentConversationMemories('conversation-1')
    await correctAgentConversationMemory(
      'conversation-1',
      'memory-1',
      { content: '项目需要 Java 8', reason: '用户修正', memoryVersion: 2 },
      'idem-correct',
    )
    await deleteAgentConversationMemory('conversation-1', 'memory-1', 2, 'idem-delete')
    await submitAgentConversationMemoryFeedback(
      'conversation-1',
      { memoryId: 'memory-1', memoryVersion: 2, verdict: 'INACCURATE', reason: '用户确认不准确' },
      'idem-feedback',
    )

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/conversation/conversation-1/context', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/conversation/context/operations/metrics', {
      method: 'GET',
      params: { sinceCreatedAt: 123 },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/agent/conversation/conversation-1/memory', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(
      4,
      '/api/agent/conversation/conversation-1/memory/memory-1',
      {
        method: 'PUT',
        data: { content: '项目需要 Java 8', reason: '用户修正', memoryVersion: 2 },
        headers: { 'If-Match': '2', 'Idempotency-Key': 'idem-correct' },
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(
      5,
      '/api/agent/conversation/conversation-1/memory/memory-1',
      {
        method: 'DELETE',
        headers: { 'If-Match': '2', 'Idempotency-Key': 'idem-delete' },
      },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(
      6,
      '/api/agent/conversation/conversation-1/memory/feedback',
      {
        method: 'POST',
        data: { memoryId: 'memory-1', memoryVersion: 2, verdict: 'INACCURATE', reason: '用户确认不准确' },
        headers: { 'If-Match': '2', 'Idempotency-Key': 'idem-feedback' },
      },
    )
  })
})
