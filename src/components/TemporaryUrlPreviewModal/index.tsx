import { Button, message, Modal } from 'antd'
import React, { useState } from 'react'

export interface TemporaryUrlResult {
  code?: number;
  message?: string;
  data?: string;
}

interface TemporaryUrlPreviewModalProps {
  /** 每次打开时获取临时 URL，避免前端缓存过期链接。 */
  getUrl: () => Promise<TemporaryUrlResult>;
  title?: string;
  triggerText?: string;
  disabled?: boolean;
  width?: number | string;
  previewHeight?: number | string;
}

const TemporaryUrlPreviewModal: React.FC<TemporaryUrlPreviewModalProps> = ({
  getUrl,
  title = '文件预览',
  triggerText = '预览/下载',
  disabled,
  width = '90vw',
  previewHeight = '75vh',
}) => {
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
      } else {
        message.error(response.message || '获取预览链接失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const close = () => {
    setOpen(false)
    setUrl(undefined)
  }

  return (
    <>
      <Button type="link" loading={loading} disabled={disabled} onClick={showPreview}>
        {triggerText}
      </Button>
      <Modal
        title={title}
        open={open}
        onCancel={close}
        footer={
          url ? (
            <Button type="primary" href={url} target="_blank" rel="noreferrer">
              下载文件
            </Button>
          ) : null
        }
        width={width}
        destroyOnClose
      >
        {url && (
          <iframe
            title={title}
            src={url}
            style={{ display: 'block', width: '100%', height: previewHeight, border: 0 }}
          />
        )}
      </Modal>
    </>
  )
}

export default TemporaryUrlPreviewModal
