import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import { McpServer, McpServerSearchParams, McpTool } from '@/services/entity/Agent';

export const getMcpServerList = async (
  params: McpServerSearchParams,
): Promise<ResponseStructure<McpServer[]>> =>
  request('/api/agent/mcp-server/list', { method: 'POST', data: params });

export const getMcpServer = async (id: string): Promise<ResponseStructure<McpServer>> =>
  request(`/api/agent/mcp-server/${id}`, { method: 'GET' });

export const addMcpServer = async (params: McpServer): Promise<ResponseStructure<McpServer>> =>
  request('/api/agent/mcp-server', { method: 'POST', data: params });

export const updateMcpServer = async (
  id: string,
  params: McpServer,
): Promise<ResponseStructure<McpServer>> =>
  request(`/api/agent/mcp-server/${id}`, { method: 'PUT', data: params });

export const deleteMcpServer = async (id: string): Promise<ResponseStructure<McpServer>> =>
  request(`/api/agent/mcp-server/${id}`, { method: 'DELETE' });

export const discoverMcpServerTools = async (id: string): Promise<ResponseStructure<McpTool[]>> =>
  request(`/api/agent/mcp-server/${id}/tools`, { method: 'POST' });

export const importMcpServerTools = async (
  id: string,
  toolNames?: string[],
): Promise<ResponseStructure<unknown>> =>
  request(`/api/agent/mcp-server/${id}/import-tools`, {
    method: 'POST',
    data: toolNames?.length ? { toolNames } : {},
  });
