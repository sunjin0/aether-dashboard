import { request } from '@umijs/max'

export const putConnectorCredential = (credentialRef: string, values: Record<string, string>) =>
  request('/api/agent/governance/connector-credentials', { method: 'POST', data: { credentialRef, values } })

export const revokeConnectorCredential = (credentialRef: string) =>
  request(`/api/agent/governance/connector-credentials/${encodeURIComponent(credentialRef)}`, { method: 'DELETE' })
