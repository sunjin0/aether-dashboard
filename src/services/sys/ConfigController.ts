import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import { Config } from '@/services/entity/Sys'

export const getConfigTree = async (params?: Partial<Config>): Promise<ResponseStructure<Config[]>> =>
  request('/api/sys/config/tree', { method: 'GET', params })

export const getConfigInfo = async (id: string): Promise<ResponseStructure<Config>> =>
  request('/api/sys/config/info', { method: 'GET', params: { id } })

export const addConfig = async (config: Config): Promise<ResponseStructure<boolean>> =>
  request('/api/sys/config/add', { method: 'POST', data: config })

export const updateConfig = async (config: Config): Promise<ResponseStructure<boolean>> =>
  request('/api/sys/config/update', { method: 'POST', data: config })

export const deleteConfig = async (id: string): Promise<ResponseStructure<boolean>> =>
  request('/api/sys/config/delete', { method: 'GET', params: { id } })
