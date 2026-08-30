import type { RequestOptions } from '@@/plugin-request/request'
import type { RequestConfig } from '@umijs/max'
import { Button, message, notification } from 'antd'
import React from 'react'
import { getIntl, getLocale } from '@@/exports'
import { request } from '@umijs/max'
import { ErrorShowType, ResponseStructure } from '@/services/entity/Common'

let refreshPromise: Promise<boolean> | null = null

const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
}

const refreshSession = async (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false

  refreshPromise = request<ResponseStructure<{ token?: string; refreshToken?: string }>>('/api/sys/refresh', {
    data: { refreshToken },
    method: 'POST',
    skipAuthRefresh: true,
    skipErrorHandler: true,
    skipSuccessMessage: true,
  })
    .then((result) => {
      if (result?.code !== 200 || !result.data?.token || !result.data?.refreshToken) return false
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('refreshToken', result.data.refreshToken)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

const isBlobResponse = (data: unknown): data is Blob =>
  typeof Blob !== 'undefined' && data instanceof Blob

const getApiMessage = (data: unknown): string | undefined => {
  if (typeof data === 'string' && data.trim()) return data
  if (!data || typeof data !== 'object') return undefined

  const response = data as Record<string, unknown>
  for (const key of ['message', 'errorMessage']) {
    const value = response[key]
    if (typeof value === 'string' && value.trim()) return value
  }

  return getApiMessage(response.error)
}

const getFallbackMessage = (id: 'app.requestError.noResponse' | 'app.requestError.requestFailed') =>
  getIntl().formatMessage({ id })

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // Initial-state loading depends on API responses; fail instead of leaving the app's bootstrap spinner forever.
  timeout: 15_000,
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      if (!res || typeof res !== 'object' || isBlobResponse(res)) {
        return
      }
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure<any>
      if (!success) {
        const message = getApiMessage(res) || errorMessage || getFallbackMessage('app.requestError.requestFailed')
        const error: any = new Error(message)
        error.name = 'BizError'
        error.info = { errorCode, errorMessage: message, showType, data }
        throw error // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure<any> | undefined = error.info
        if (errorInfo) {
          const { errorCode } = errorInfo
          const errorMessage =
            getApiMessage(errorInfo.data) || errorInfo.errorMessage || getFallbackMessage('app.requestError.requestFailed')
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage)
              break
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage)
              break
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
                type: 'error',
              })
              if (errorCode === 401) {
                clearSession()
                window.location.href = '/login'
              }

              break
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break
            default:
              message.error(errorMessage)
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        notification.open({
          description:
            getApiMessage(error.response.data) ||
            (typeof error.message === 'string' && error.message.trim()) ||
            getFallbackMessage('app.requestError.requestFailed'),
          message: error.response.status,
          type: 'error',
        })
        if (error.response.status === 502 && window.aetherDesktop?.isDesktop) {
          notification.open({
            message: '无法连接 Aether Admin',
            description: '请确认 Admin 服务已启动，或打开连接配置目录修改 adminUrl。',
            btn: React.createElement(Button, {
              type: 'primary',
              size: 'small',
              onClick: () => window.aetherDesktop?.openConfigFolder(),
              children: '打开连接配置',
            }),
            type: 'error',
          })
        }
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error(getFallbackMessage('app.requestError.noResponse'))
      } else {
        // 发送请求时出了点问题
        message.error(getFallbackMessage('app.requestError.requestFailed'))
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，进行个性化处理。
      // const url = config?.url?.concat('?token = 123');
      config.headers = {
        ...config.headers,
        'Accept-Language': getLocale(),
      }
      const item = localStorage.getItem('token')
      if (item && !config.headers.Authorization) {
        config.headers.Authorization = 'Bearer ' + item
      }
      return { ...config }
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    async (response) => {
      // 拦截响应数据，进行个性化处理
      const { data } = response as { data: ResponseStructure<any> }
      if (!data || typeof data !== 'object' || isBlobResponse(data)) {
        return response
      }
      const config = (response as any).config || {}
      const isAuthFailure = data.code === 401
      if (isAuthFailure && !config.skipAuthRefresh && !config.__authRetried) {
        const refreshed = await refreshSession()
        if (refreshed) {
          return request(config.url, {
            ...config,
            __authRetried: true,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }) as any
        }
        clearSession()
      }
      data.success = data.code === 200
      const skipSuccessMessage = (response as { config?: { skipSuccessMessage?: boolean } }).config?.skipSuccessMessage
      if (data.success) {
        if (!skipSuccessMessage) {
          const apiMessage = getApiMessage(data)
          if (apiMessage) message.success(apiMessage)
        }
      } else {
        data.errorMessage = getApiMessage(data) || getFallbackMessage('app.requestError.requestFailed')
        data.errorCode = data.code
        data.showType = ErrorShowType.NOTIFICATION
      }
      return response
    },
  ],
}
