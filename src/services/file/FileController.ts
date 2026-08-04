import { request } from '@umijs/max'
import type { ResponseStructure } from '@/services/entity/Common'

export interface FileUploadResult {
  objectKey: string;
  fileName: string;
  contentType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
}

export interface FileReference {
  objectKey: string;
  fileName?: string;
  contentType?: string;
}

export const uploadFile = async (file: File): Promise<ResponseStructure<FileUploadResult>> => {
  const data = new FormData()
  data.append('file', file)
  return request('/api/file/upload', { method: 'POST', data })
}

const getFileBlob = async (
  path:
    | '/api/file/preview'
    | '/api/file/download'
    | '/api/file/chat/preview'
    | '/api/file/chat/download',
  file: FileReference,
): Promise<Blob> => {
  try {
    return await request<Blob>(path, {
      method: 'GET',
      params: {
        objectKey: file.objectKey,
        fileName: file.fileName,
        contentType: file.contentType,
      },
      responseType: 'blob',
      skipErrorHandler: true,
    })
  } catch (error: unknown) {
    const body = (error as { response?: { data?: unknown } }).response?.data
    if (body instanceof Blob && body.type.includes('application/json')) {
      const result = JSON.parse(await body.text()) as { message?: string }
      throw new Error(result.message || '文件请求失败')
    }
    throw error
  }
}

export const createFilePreviewUrl = async (file: FileReference): Promise<string> =>
  URL.createObjectURL(await getFileBlob('/api/file/preview', file))

export const createChatAttachmentPreviewUrl = async (file: FileReference): Promise<string> =>
  URL.createObjectURL(await getFileBlob('/api/file/chat/preview', file))

export const downloadFile = async (file: FileReference): Promise<void> => {
  const url = URL.createObjectURL(await getFileBlob('/api/file/download', file))
  const link = document.createElement('a')
  link.href = url
  link.download = file.fileName || 'file'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
