import { request } from '@umijs/max';
import {
  addAgentToolInfo,
  deleteAgentToolInfo,
  getAgentToolInfo,
  getAgentToolList,
  testAgentTool,
  updateAgentToolInfo,
} from './ToolController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('ToolController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses documented MCP tool endpoints', async () => {
    await getAgentToolList({ current: 1, pageSize: 20, name: 'search' });
    await getAgentToolInfo('tool-1');
    await addAgentToolInfo({ name: 'Weather', code: 'weather', mcpServerId: 'server-1' });
    await updateAgentToolInfo({ id: 'tool-1', name: 'Weather', code: 'weather' });
    await deleteAgentToolInfo('tool-1');
    await testAgentTool('tool-1', { keyword: 'test' });

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/tool/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, name: 'search' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/tool/tool-1', {
      method: 'GET',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/agent/tool', {
      method: 'POST',
      data: { name: 'Weather', code: 'weather', mcpServerId: 'server-1' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/agent/tool/tool-1', {
      method: 'PUT',
      data: { id: 'tool-1', name: 'Weather', code: 'weather' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/agent/tool/tool-1', {
      method: 'DELETE',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(6, '/api/agent/tool/tool-1/test', {
      method: 'POST',
      data: { keyword: 'test' },
    });
  });
});
