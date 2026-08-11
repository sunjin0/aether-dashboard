import { Button, message, Modal } from 'antd'
import React, { ReactNode, useState } from 'react'
import { useIntl } from '@umijs/max'

export interface TemporaryUrlResult {
  code?: number
  message?: string
  data?: string
}

interface TemporaryUrlPreviewModalProps {
  /** 每次打开时获取临时 URL，避免前端缓存过期链接。 */
  getUrl: () => Promise<TemporaryUrlResult>
  title?: string
  triggerText?: ReactNode
  disabled?: boolean
  width?: number | string
  previewHeight?: number | string
}

const TemporaryUrlPreviewModal: React.FC<TemporaryUrlPreviewModalProps> = ({
  getUrl,
  title,
  triggerText,
  disabled,
  width = '90vw',
  previewHeight = '75vh',
}) => {
  const intl = useIntl()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string>()

  /** 临时链接只在点击预览时请求，并在弹窗关闭后立即丢弃。 */
  const showPreview = async () => {
    setLoading(true)
    try {
      const response = await getUrl()
      if (response.code === 200 && response.data) {
        setUrl(response.data)
        setOpen(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const close = () => {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    setOpen(false)
    setUrl(undefined)
  }

  return (
    <>
      <Button type="link" loading={loading} disabled={disabled} onClick={showPreview}>
        {triggerText ||
          intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.previewDownload' })}
      </Button>
      <Modal
        title={
          title || intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.filePreview' })
        }
        open={open}
        onCancel={close}
        footer={
          url ? (
            <Button type="primary" href={url} target="_blank" rel="noreferrer">
              {intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.download' })}
            </Button>
          ) : null
        }
        width={width}
        destroyOnClose
      >
        {url && (
          <iframe
            title={
              title || intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.filePreview' })
            }
            src={url}
            style={{ display: 'block', width: '100%', height: previewHeight, border: 0 }}
          />
        )}
      </Modal>
    </>
  )
}

export default TemporaryUrlPreviewModal
