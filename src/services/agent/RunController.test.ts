import {request} from '@umijs/max';
import {getAgentRunInfo, getAgentRunList} from './RunController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('RunController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({code: 200, data: null});
  });

  it('uses documented run record endpoints', async () => {
    await getAgentRunList({
      current: 1,
      pageSize: 20,
      agentDefinitionId: 'agent-1',
      status: 1,
    });
    await getAgentRunInfo('run-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/run/list', {
      method: 'POST',
      data: {
        current: 1,
        pageSize: 20,
        agentDefinitionId: 'agent-1',
        status: 1,
      },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/run/run-1', {
      method: 'GET',
    });
  });
});
