import { Button, Modal } from 'antd'
import React, { ReactNode, useState } from 'react'
import { useIntl } from '@umijs/max'
import { convertToHtml } from 'mammoth'
import './index.less'

export interface TemporaryUrlResult { code?: number; message?: string; data?: string }

interface TemporaryUrlPreviewModalProps {
  getUrl: () => Promise<TemporaryUrlResult>
  title?: string
  triggerText?: ReactNode
  disabled?: boolean
  width?: number | string
  previewHeight?: number | string
  /** DOCX files are rendered locally because browsers cannot display them in an iframe. */
  fileName?: string
}

const TemporaryUrlPreviewModal: React.FC<TemporaryUrlPreviewModalProps> = ({ getUrl, title, triggerText, disabled, width = '90vw', previewHeight = '75vh', fileName }) => {
  const intl = useIntl()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string>()
  const [docxHtml, setDocxHtml] = useState<string>()
  const isDocx = /\.docx$/i.test(fileName || title || '')

  const showPreview = async () => {
    setLoading(true)
    try {
      const response = await getUrl()
      if (response.code === 200 && response.data) {
        setUrl(response.data)
        if (isDocx) {
          const blob = await fetch(response.data).then(result => result.blob())
          const result = await convertToHtml({ arrayBuffer: await blob.arrayBuffer() })
          setDocxHtml(sanitizeDocxHtml(result.value))
        }
        setOpen(true)
      }
    } finally { setLoading(false) }
  }

  const close = () => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    setOpen(false); setUrl(undefined); setDocxHtml(undefined)
  }

  return <><Button type="link" loading={loading} disabled={disabled} onClick={showPreview}>{triggerText || intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.previewDownload' })}</Button>
    <Modal title={title || intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.filePreview' })} open={open} onCancel={close} footer={url ? <Button type="primary" href={url} target="_blank" rel="noreferrer">{intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.download' })}</Button> : null} width={width} destroyOnClose>
      {docxHtml ? <div className="temporary-url-preview-modal-docx" style={{ height: previewHeight }} dangerouslySetInnerHTML={{ __html: docxHtml }} /> : url && <iframe title={title || intl.formatMessage({ id: 'components.temporaryUrlPreviewModal.filePreview' })} src={url} style={{ display: 'block', width: '100%', height: previewHeight, border: 0 }} />}
    </Modal></>
}

const sanitizeDocxHtml = (html: string): string => {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  body.querySelectorAll('script, style, iframe, object, embed, form, input, button').forEach(node => node.remove())
  body.querySelectorAll('*').forEach(node => Array.from(node.attributes).forEach(attribute => {
    if (attribute.name.toLowerCase().startsWith('on') || attribute.name.toLowerCase() === 'srcdoc') node.removeAttribute(attribute.name)
  }))
  return body.innerHTML
}

export default TemporaryUrlPreviewModal
