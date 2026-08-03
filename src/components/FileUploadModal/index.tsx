import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Form, message, Modal, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import React, { useState } from 'react';
import { useIntl } from '@umijs/max';

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
  upload: (files: File[], values: UploadExtraValues) => Promise<UploadActionResult>;
  onSuccess?: () => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  accept,
  allowedExtensions,
  maxSize = 50 * 1024 * 1024,
  triggerText,
  title,
  width = 760,
  disabled,
  initialValues,
  extraFields,
  upload,
  onSuccess,
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<UploadExtraValues>();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  /** 关闭弹窗时清理文件和扩展字段，避免下次打开沿用旧数据。 */
  const reset = () => {
    form.resetFields();
    setFiles([]);
    setOpen(false);
  };

  /** 仅选择文件，不使用 Upload 组件的默认上传行为。 */
  const beforeUpload = (selectedFile: File) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      message.error(
        intl.formatMessage(
          { id: 'components.fileUploadModal.unsupportedType' },
          { extensions: allowedExtensions.join(', ') },
        ),
      );
      return Upload.LIST_IGNORE;
    }
    if (selectedFile.size > maxSize) {
      message.error(
        intl.formatMessage(
          { id: 'components.fileUploadModal.maxSize' },
          { maxSize: Math.floor(maxSize / 1024 / 1024) },
        ),
      );
      return Upload.LIST_IGNORE;
    }
    setFiles((current) => [...current, selectedFile]);
    return false;
  };

  /** 校验扩展字段后，将文件和字段值统一交给业务接口。 */
  const submit = async () => {
    if (!files.length) return;
    const values = await form.validateFields();
    setUploading(true);
    try {
      const response = await upload(files, values);
      if (response.code === 200) {
        onSuccess?.();
        reset();
      }
    } finally {
      setUploading(false);
    }
  };

  const fileList: UploadFile[] = files.map((file) => ({ uid: `${file.name}-${file.lastModified}`, name: file.name, status: 'done', size: file.size }));

  return (
    <>
      <Button icon={<UploadOutlined />} disabled={disabled} onClick={() => setOpen(true)}>
        {triggerText || intl.formatMessage({ id: 'components.fileUploadModal.uploadFile' })}
      </Button>
      <Modal
        title={title || intl.formatMessage({ id: 'components.fileUploadModal.uploadFile' })}
        open={open}
        width={width}
        onCancel={reset}
        onOk={submit}
        okText={intl.formatMessage({ id: 'components.fileUploadModal.confirmUpload' })}
        cancelText={intl.formatMessage({ id: 'components.fileUploadModal.cancel' })}
        confirmLoading={uploading}
        okButtonProps={{ disabled: !files.length }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={initialValues}>
          {extraFields}
        </Form>
        <Upload.Dragger
          accept={accept}
          multiple
          fileList={fileList}
          beforeUpload={beforeUpload}
          onRemove={(removed) => {
            setFiles((current) => current.filter((file) => `${file.name}-${file.lastModified}` !== removed.uid));
            return true;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {intl.formatMessage({ id: 'components.fileUploadModal.dragHint' })}
          </p>
          <p className="ant-upload-hint">
            {intl.formatMessage(
              { id: 'components.fileUploadModal.uploadHint' },
              {
                extensions: allowedExtensions.join(', '),
                maxSize: Math.floor(maxSize / 1024 / 1024),
              },
            )}
          </p>
        </Upload.Dragger>
      </Modal>
    </>
  );
};

export default FileUploadModal;
