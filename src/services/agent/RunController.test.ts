import { request } from '@umijs/max'
import {
  cancelAgentRun,
  getAgentRunInfo,
  getAgentRunList,
  getAgentRunStatistics,
  getAgentRunSteps,
} from './RunController'

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}))

const mockedRequest = request as jest.Mock

describe('RunController', () => {
  beforeEach(() => {
    mockedRequest.mockReset()
    mockedRequest.mockResolvedValue({ code: 200, data: null })
  })

  it('uses documented run record endpoints', async () => {
    await getAgentRunList({
      current: 1,
      pageSize: 20,
      agentDefinitionId: 'agent-1',
      status: 1,
    })
    await getAgentRunInfo('run-1')
    await getAgentRunSteps('run-1')
    await cancelAgentRun('run-1')
    await getAgentRunStatistics({ agentDefinitionId: 'agent-1', startTime: 100, endTime: 200 })

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/run/list', {
      method: 'POST',
      data: {
        current: 1,
        pageSize: 20,
        agentDefinitionId: 'agent-1',
        status: 1,
      },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/run/run-1', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/agent/run/run-1/steps', {
      method: 'GET',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/agent/run/run-1/cancel', {
      method: 'POST',
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/agent/run/statistics', {
      method: 'GET',
      params: {
        agentDefinitionId: 'agent-1',
        startTime: 100,
        endTime: 200,
      },
    })
  })
})
