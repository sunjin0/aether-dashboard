import { request } from '@umijs/max';
import {
  addMcpServer,
  deleteMcpServer,
  discoverMcpServerTools,
  getMcpServer,
  getMcpServerList,
  importMcpServerTools,
  updateMcpServer,
} from './McpServerController';

jest.mock('@umijs/max', () => ({ request: jest.fn() }));

const mockedRequest = request as jest.Mock;

describe('McpServerController', () => {
  it('uses the documented MCP server endpoints', async () => {
    const server = { name: 'Search', code: 'search_mcp', transport: 'http' as const };
    await getMcpServerList({ current: 1, pageSize: 10 });
    await getMcpServer('server-1');
    await addMcpServer(server);
    await updateMcpServer('server-1', server);
    await deleteMcpServer('server-1');
    await discoverMcpServerTools('server-1');
    await importMcpServerTools('server-1', ['search', 'fetch']);

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/mcp-server/list', {
      method: 'POST',
      data: { current: 1, pageSize: 10 },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/mcp-server/server-1', {
      method: 'GET',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/agent/mcp-server', {
      method: 'POST',
      data: server,
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/agent/mcp-server/server-1', {
      method: 'PUT',
      data: server,
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/agent/mcp-server/server-1', {
      method: 'DELETE',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(6, '/api/agent/mcp-server/server-1/tools', {
      method: 'POST',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(
      7,
      '/api/agent/mcp-server/server-1/import-tools',
      {
        method: 'POST',
        data: { toolNames: ['search', 'fetch'] },
      },
    );
  });
});
