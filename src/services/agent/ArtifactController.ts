import { request } from '@umijs/max'
import type { ResponseStructure } from '@/services/entity/Common'
import type { AgentArtifact, AgentArtifactSearchParams } from '@/services/entity/Agent'

export const getAgentArtifactList = (params: AgentArtifactSearchParams): Promise<ResponseStructure<AgentArtifact[]>> =>
  request('/api/agent/artifact/list', { method: 'POST', data: params })

const getArtifactBlob = async (id: string, action: 'preview' | 'download'): Promise<Blob> =>
  request(`/api/agent/artifact/${id}/${action}`, { method: 'GET', responseType: 'blob', skipErrorHandler: true })

export const createArtifactPreviewUrl = async (id: string): Promise<string> => URL.createObjectURL(await getArtifactBlob(id, 'preview'))

export const downloadAgentArtifact = async (id: string, fileName?: string): Promise<void> => {
  const url = URL.createObjectURL(await getArtifactBlob(id, 'download'))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'file'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const recycleAgentArtifact = (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/agent/artifact/${id}`, { method: 'DELETE' })

export const restoreAgentArtifact = (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/agent/artifact/${id}/restore`, { method: 'POST' })
