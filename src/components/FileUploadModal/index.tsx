import { InboxOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Form, message, Modal, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import React, { useState } from 'react'

export interface UploadActionResult {
  code?: number;
  message?: string;
}

/** 上传弹窗中自定义表单字段的值，由调用方自行定义并传给接口。 */
export type UploadExtraValues = Record<string, unknown>;

interface FileUploadModalProps {
  accept: string;
  allowedExtensions: string[];
  maxSize?: number;
  triggerText?: string;
  title?: string;
  width?: number | string;
  disabled?: boolean;
  initialValues?: UploadExtraValues;
  /** 调用方可传入任意 Form.Item，用于扩展上传接口参数。 */
  extraFields?: React.ReactNode;
  /** 文件与已校验的自定义字段值同时提交给调用方。 */
  upload: (file: File, values: UploadExtraValues) => Promise<UploadActionResult>;
  onSuccess?: () => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  accept,
  allowedExtensions,
  maxSize = 50 * 1024 * 1024,
  triggerText = '上传文件',
  title = '上传文件',
  width = 760,
  disabled,
  initialValues,
  extraFields,
  upload,
  onSuccess,
}) => {
  const [form] = Form.useForm<UploadExtraValues>()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File>()
  const [uploading, setUploading] = useState(false)

  /** 关闭弹窗时清理文件和扩展字段，避免下次打开沿用旧数据。 */
  const reset = () => {
    form.resetFields()
    setFile(undefined)
    setOpen(false)
  }

  /** 仅选择文件，不使用 Upload 组件的默认上传行为。 */
  const beforeUpload = (selectedFile: File) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!extension || !allowedExtensions.includes(extension)) {
      message.error(`仅支持 ${allowedExtensions.join('、')} 文件`)
      return Upload.LIST_IGNORE
    }
    if (selectedFile.size > maxSize) {
      message.error(`文件大小不能超过 ${Math.floor(maxSize / 1024 / 1024)} MB`)
      return Upload.LIST_IGNORE
    }
    setFile(selectedFile)
    return false
  }

  /** 校验扩展字段后，将文件和字段值统一交给业务接口。 */
  const submit = async () => {
    if (!file) return
    const values = await form.validateFields()
    setUploading(true)
    try {
      const response = await upload(file, values)
      if (response.code === 200) {
        message.success(response.message || '文件上传成功')
        onSuccess?.()
        reset()
      } else {
        message.error(response.message || '文件上传失败')
      }
    } finally {
      setUploading(false)
    }
  }

  const fileList: UploadFile[] = file
    ? [{ uid: file.name, name: file.name, status: 'done', size: file.size }]
    : []

  return (
    <>
      <Button icon={<UploadOutlined />} disabled={disabled} onClick={() => setOpen(true)}>
        {triggerText}
      </Button>
      <Modal
        title={title}
        open={open}
        width={width}
        onCancel={reset}
        onOk={submit}
        okText="确认上传"
        cancelText="取消"
        confirmLoading={uploading}
        okButtonProps={{ disabled: !file }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={initialValues}>
          {extraFields}
        </Form>
        <Upload.Dragger
          accept={accept}
          maxCount={1}
          fileList={fileList}
          beforeUpload={beforeUpload}
          onRemove={() => {
            setFile(undefined)
            return true
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此处</p>
          <p className="ant-upload-hint">
            支持 {allowedExtensions.join('、')}，单个文件不超过 {Math.floor(maxSize / 1024 / 1024)}{' '}
            MB
          </p>
        </Upload.Dragger>
      </Modal>
    </>
  )
}

export default FileUploadModal
