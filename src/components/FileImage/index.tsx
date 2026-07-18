import { Image, Skeleton } from 'antd'
import type { ImageProps } from 'antd'
import React, { useEffect, useState } from 'react'
import { createFilePreviewUrl } from '@/services/file/FileController'

export interface FileImageProps extends Omit<ImageProps, 'src'> {
  value?: string;
  fileName?: string;
}

const isDirectUrl = (value: string) => /^(https?:|data:|blob:)/i.test(value)

const FileImage: React.FC<FileImageProps> = ({ value, fileName, ...imageProps }) => {
  const [src, setSrc] = useState<string>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!value) {
      setSrc(undefined)
      return
    }
    if (isDirectUrl(value)) {
      setSrc(value)
      return
    }

    let disposed = false
    let blobUrl: string | undefined
    setLoading(true)
    createFilePreviewUrl({
      objectKey: value,
      fileName: fileName || value.split('/').pop(),
    })
      .then((url) => {
        blobUrl = url
        if (!disposed) setSrc(url)
      })
      .catch(() => {
        if (!disposed) setSrc(undefined)
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })

    return () => {
      disposed = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [fileName, value])

  if (loading) {
    const size = typeof imageProps.width === 'number' ? imageProps.width : 40
    return <Skeleton.Avatar active shape="circle" size={size} />
  }

  return (
    <Image
      {...imageProps}
      src={src}
      preview={Boolean(src) && imageProps.preview}
      style={{ objectFit: 'cover', borderRadius: '50%', ...imageProps.style }}
    />
  )
}

export default FileImage
