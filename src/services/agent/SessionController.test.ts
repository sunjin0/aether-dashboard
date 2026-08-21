import { request } from '@umijs/max'
import {
  deleteAgentSessionMemory,
  getAgentSessionByConversation,
  getAgentSessionMemories,
  getAgentSessionMetrics,
  getAgentSessionTimeline,
  getAgentTaskSnapshot,
  pauseAgentSessionTask,
  resumeAgentSessionTask,
  submitAgentSessionTaskInput,
  submitAgentTaskFeedback,
} from './SessionController'

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}))

const mockedRequest = request as jest.Mock

describe('SessionController', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedRequest.mockResolvedValue({ code: 200, data: null })
  })

  it('uses documented session snapshot and timeline endpoints', async () => {
    await getAgentSessionByConversation('conversation-1')
    await getAgentSessionTimeline('conversation-1')
    await getAgentTaskSnapshot('task-1')

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/session/conversation/conversation-1', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(
      2,
      '/api/agent/session/conversation/conversation-1/timeline',
      { method: 'GET' },
    )
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/agent/session/task/task-1', {
      method: 'GET',
    })
  })

  it('uses documented memory, metrics and feedback endpoints', async () => {
    await getAgentSessionMemories('session-1')
    await getAgentSessionMetrics('session-1')
    await deleteAgentSessionMemory('session-1', 'memory-1', 3, 'idem-delete')
    await submitAgentTaskFeedback('task-1', { rating: 5, note: '很准确' })

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/session/session-1/memory', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/session/session-1/metrics', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/agent/session/session-1/memory/memory-1', {
      method: 'DELETE',
      headers: {
        'Idempotency-Key': 'idem-delete',
        'If-Match': '3',
      },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/agent/session/task/task-1/feedback', {
      method: 'POST',
      data: { rating: 5, note: '很准确' },
    })
  })

  it('uses documented task pause, resume and input endpoints', async () => {
    await pauseAgentSessionTask('task-1')
    await resumeAgentSessionTask('task-1')
    await submitAgentSessionTaskInput('task-1', { messageId: 'msg-1', answers: { target: '用户 123' } })

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/session/task/task-1/pause', {
      method: 'POST',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/session/task/task-1/resume', {
      method: 'POST',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/agent/session/task/task-1/input', {
      method: 'POST',
      data: { messageId: 'msg-1', answers: { target: '用户 123' } },
    })
  })
})
