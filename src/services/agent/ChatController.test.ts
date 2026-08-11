import { readFileSync } from 'fs'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { streamAgentChat, streamReplyAgentChat } from './ChatController'

jest.mock('@@/exports', () => ({
  getLocale: jest.fn(() => 'en-US'),
}))

jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: jest.fn(),
}))

const mockedFetchEventSource = fetchEventSource as jest.Mock

describe('ChatController', () => {
  const runStep = {
    runId: 'run-1',
    eventId: 'event-1',
    eventType: 'tool.completed',
    occurredAt: 1760000000000,
    data: { toolName: 'search_knowledge', message: 'Completed search_knowledge' },
  }

  beforeEach(() => {
    mockedFetchEventSource.mockReset()
    localStorage.clear()
    mockedFetchEventSource.mockResolvedValue(undefined)
  })

  it('requires an agent ID in the reply chat request contract', () => {
    const agentTypes = readFileSync(require.resolve('@/services/entity/Agent'), 'utf8')

    expect(agentTypes).toMatch(
      /export interface AgentChatReplyRequest \{\s+agentId: string;\s+conversationId: string;/,
    )
  })

  it('sends normal chat params unchanged', async () => {
    const params = { agentId: 'agent-1', message: 'hello' }

    await streamAgentChat(params)

    expect(mockedFetchEventSource).toHaveBeenCalledWith(
      '/api/agent/chat/stream',
      expect.objectContaining({ body: JSON.stringify(params) }),
    )
  })

  it('marks reply chat params as interactive', async () => {
    const params = { agentId: 'agent-1', conversationId: 'conversation-1' }

    await streamReplyAgentChat(params)

    expect(mockedFetchEventSource).toHaveBeenCalledWith(
      '/api/agent/chat/stream',
      expect.objectContaining({ body: JSON.stringify({ ...params, interactive: true }) }),
    )
  })

  it.each([
    [
      'streamAgentChat',
      (onRunStep: jest.Mock) => streamAgentChat({ agentId: 'agent-1', message: 'hello' }, { onRunStep }),
    ],
    [
      'streamReplyAgentChat',
      (onRunStep: jest.Mock) =>
        streamReplyAgentChat({ agentId: 'agent-1', conversationId: 'conversation-1' }, { onRunStep }),
    ],
  ])('routes run_step events through onRunStep for %s', async (_name, stream: (onRunStep: jest.Mock) => Promise<void>) => {
    const onRunStep = jest.fn()

    const streamPromise = stream(onRunStep)
    const options = mockedFetchEventSource.mock.calls[0][1]
    options.onmessage({ event: 'run_step', data: JSON.stringify(runStep) })
    await streamPromise

    expect(onRunStep).toHaveBeenCalledWith(runStep)
  })

  it.each([
    [
      'streamAgentChat',
      (onAccepted: jest.Mock) => streamAgentChat({ agentId: 'agent-1', message: 'hello' }, { onAccepted }),
    ],
    [
      'streamReplyAgentChat',
      (onAccepted: jest.Mock) =>
        streamReplyAgentChat({ agentId: 'agent-1', conversationId: 'conversation-1' }, { onAccepted }),
    ],
  ])('routes accepted events through onAccepted for %s', async (_name, stream: (onAccepted: jest.Mock) => Promise<void>) => {
    const onAccepted = jest.fn()
    const accepted = { runId: 'run-1', conversationId: 'conversation-1' }

    const streamPromise = stream(onAccepted)
    const options = mockedFetchEventSource.mock.calls[0][1]
    options.onmessage({ event: 'accepted', data: JSON.stringify(accepted) })
    await streamPromise

    expect(onAccepted).toHaveBeenCalledWith(accepted)
  })

  it.each([
    [
      'streamAgentChat',
      (onAccepted: jest.Mock) => streamAgentChat({ agentId: 'agent-1', message: 'hello' }, { onAccepted }),
    ],
    [
      'streamReplyAgentChat',
      (onAccepted: jest.Mock) =>
        streamReplyAgentChat({ agentId: 'agent-1', conversationId: 'conversation-1' }, { onAccepted }),
    ],
  ])('ignores malformed accepted events for %s', async (_name, stream: (onAccepted: jest.Mock) => Promise<void>) => {
    const onAccepted = jest.fn()

    const streamPromise = stream(onAccepted)
    const options = mockedFetchEventSource.mock.calls[0][1]
    options.onmessage({ event: 'accepted', data: JSON.stringify({ runId: 'run-1' }) })
    await streamPromise

    expect(onAccepted).not.toHaveBeenCalled()
  })

  it('routes progress events through onProgress for streamReplyAgentChat', async () => {
    const onProgress = jest.fn()
    const progress = { stage: 'tool', message: 'Calling search' }

    const streamPromise = streamReplyAgentChat(
      { agentId: 'agent-1', conversationId: 'conversation-1' },
      { onProgress },
    )
    const options = mockedFetchEventSource.mock.calls[0][1]
    options.onmessage({ event: 'progress', data: JSON.stringify(progress) })
    await streamPromise

    expect(onProgress).toHaveBeenCalledWith(progress)
  })

  it('routes reasoning and tool-call events without dropping the tool payload', async () => {
    const onReasoning = jest.fn()
    const onToolCall = jest.fn()
    const reasoning = { conversationId: 'conversation-1', chunk: 'Analyse the request.' }
    const toolCall = {
      conversationId: 'conversation-1',
      toolCalls: [{ id: 'call-1', function: { name: 'search_knowledge', arguments: '{"q":"SSE"}' } }],
    }

    const streamPromise = streamAgentChat(
      { agentId: 'agent-1', message: 'hello' },
      { onReasoning, onToolCall },
    )
    const options = mockedFetchEventSource.mock.calls[0][1]
    options.onmessage({ event: 'reasoning', data: JSON.stringify(reasoning) })
    options.onmessage({ event: 'tool_call', data: JSON.stringify(toolCall) })
    await streamPromise

    expect(onReasoning).toHaveBeenCalledWith(reasoning.chunk, reasoning)
    expect(onToolCall).toHaveBeenCalledWith(toolCall)
  })

  it('reports a non-200 status exactly once', async () => {
    const onError = jest.fn()
    const statusText = 'Service Unavailable'
    mockedFetchEventSource.mockImplementation(async (_url, options) => {
      try {
        await options.onopen({ status: 503, statusText })
      } catch (error) {
        return options.onerror(error)
      }
    })

    await expect(streamAgentChat({ agentId: 'agent-1', message: 'hello' }, { onError })).rejects.toThrow(statusText)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith({ message: statusText })
  })

  it.each([
    ['streamAgentChat', () => streamAgentChat({ agentId: 'agent-1', message: 'hello' })],
    ['streamReplyAgentChat', () => streamReplyAgentChat({ agentId: 'agent-1', conversationId: 'conversation-1' })],
  ])('ignores malformed JSON without callbacks for %s', async (_name, stream: () => Promise<void>) => {
    const onMessage = jest.fn()
    const onError = jest.fn()
    const streamPromise = _name === 'streamAgentChat'
      ? streamAgentChat({ agentId: 'agent-1', message: 'hello' }, { onMessage, onError })
      : streamReplyAgentChat({ agentId: 'agent-1', conversationId: 'conversation-1' }, { onMessage, onError })
    const options = mockedFetchEventSource.mock.calls[0][1]
    options.onmessage({ event: 'message', data: '{invalid json' })
    await streamPromise

    expect(onMessage).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
