import {request} from '@umijs/max';
import {getAgentToolCallLogInfo, getAgentToolCallLogList} from './ToolCallLogController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('ToolCallLogController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({code: 200, data: null});
  });

  it('uses documented tool call log endpoints', async () => {
    await getAgentToolCallLogList({
      current: 1,
      pageSize: 20,
      runId: 'run-1',
      toolId: 'tool-1',
      status: 3,
    });
    await getAgentToolCallLogInfo('log-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/tool-call-log/list', {
      method: 'POST',
      data: {
        current: 1,
        pageSize: 20,
        runId: 'run-1',
        toolId: 'tool-1',
        status: 3,
      },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/tool-call-log/log-1', {
      method: 'GET',
    });
  });
});
