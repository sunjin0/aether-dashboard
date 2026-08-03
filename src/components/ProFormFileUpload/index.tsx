import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { ProFormUploadButton } from '@ant-design/pro-components';
import { Form, message } from 'antd';
import type { ButtonProps, FormItemProps, UploadFile, UploadProps } from 'antd';
import React, { useEffect, useState } from 'react';
import { useIntl } from '@umijs/max';
import { createFilePreviewUrl, downloadFile, uploadFile } from '@/services/file/FileController';
import type { FileUploadResult } from '@/services/file/FileController';

export interface ProFormFileUploadProps extends Pick<
  FormItemProps,
  'name' | 'label' | 'rules' | 'required' | 'tooltip' | 'extra'
> {
  mode?: 'card' | 'title';
  accept?: string;
  allowedExtensions?: string[];
  maxSize?: number;
  max?: number;
  disabled?: boolean;
  title?: React.ReactNode;
  buttonProps?: ButtonProps;
  fieldProps?: Omit<UploadProps, 'fileList' | 'beforeUpload' | 'customRequest'>;
  formItemProps?: Omit<FormItemProps, 'children' | 'name' | 'label' | 'rules'>;
  value?: string;
  onChange?: (objectKey?: string) => void;
  onSuccess?: (file: FileUploadResult) => void;
  onError?: (error: unknown) => void;
}

type FileUploadControlProps = Omit<
  ProFormFileUploadProps,
  'name' | 'label' | 'rules' | 'required' | 'tooltip' | 'extra' | 'formItemProps'
>;

const isDirectUrl = (value: string) => /^(https?:|data:|blob:)/i.test(value);

const FileUploadControl: React.FC<FileUploadControlProps> = ({
  mode = 'title',
  accept,
  allowedExtensions = [],
  maxSize = 50 * 1024 * 1024,
  max = 1,
  disabled,
  title,
  buttonProps,
  fieldProps,
  value,
  onChange,
  onSuccess,
  onError,
}) => {
  const intl = useIntl();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (!value) {
      setFileList([]);
      return;
    }

    const fileName = value.split('/').pop() || 'file';
    let disposed = false;
    let blobUrl: string | undefined;
    const preview = isDirectUrl(value)
      ? Promise.resolve(value)
      : createFilePreviewUrl({ objectKey: value, fileName });

    preview
      .then((url) => {
        if (!isDirectUrl(value)) blobUrl = url;
        if (!disposed) {
          setFileList([{ uid: value, name: fileName, status: 'done', url }]);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) setFileList([{ uid: value, name: fileName, status: 'done' }]);
        onError?.(error);
      });

    return () => {
      disposed = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [onError, value]);

  const validateFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (allowedExtensions.length > 0 && (!extension || !allowedExtensions.includes(extension))) {
      message.error(
        intl.formatMessage(
          { id: 'components.proFormFileUpload.unsupportedType' },
          { extensions: allowedExtensions.join(', ') },
        ),
      );
      return false;
    }
    if (file.size > maxSize) {
      message.error(
        intl.formatMessage(
          { id: 'components.proFormFileUpload.maxSize' },
          { maxSize: Math.floor(maxSize / 1024 / 1024) },
        ),
      );
      return false;
    }
    return true;
  };

  const customRequest: NonNullable<UploadProps['customRequest']> = async (options) => {
    const selectedFile = options.file as File;
    if (!validateFile(selectedFile)) {
      options.onError?.(
        new Error(intl.formatMessage({ id: 'components.proFormFileUpload.validationFailed' })),
      );
      return;
    }

    try {
      const response = await uploadFile(selectedFile);
      if (response.code !== 200 || !response.data?.objectKey) {
        throw new Error(intl.formatMessage({ id: 'components.proFormFileUpload.uploadFailed' }));
      }

      const result = response.data;
      onChange?.(result.objectKey);
      onSuccess?.(result);
      options.onSuccess?.(response);
    } catch (error) {
      onError?.(error);
      options.onError?.(
        error instanceof Error
          ? error
          : new Error(intl.formatMessage({ id: 'components.proFormFileUpload.uploadFailed' })),
      );
    }
  };

  const handleDownload = async (file: UploadFile) => {
    if (!value) return;
    if (isDirectUrl(value)) {
      const link = document.createElement('a');
      link.href = value;
      link.download = file.name || 'file';
      link.click();
      return;
    }
    await downloadFile({ objectKey: value, fileName: file.name });
  };

  return (
    <ProFormUploadButton
      fileList={fileList}
      max={max}
      listType={mode === 'card' ? 'picture-card' : 'text'}
      icon={mode === 'card' ? <PlusOutlined /> : <UploadOutlined />}
      title={
        title ??
        intl.formatMessage({
          id:
            mode === 'card'
              ? 'components.proFormFileUpload.uploadFile'
              : 'components.proFormFileUpload.selectFile',
        })
      }
      disabled={disabled}
      buttonProps={buttonProps}
      fieldProps={{
        ...fieldProps,
        name: fieldProps?.name ?? 'file',
        accept: fieldProps?.accept ?? accept,
        customRequest,
        showUploadList: {
          showPreviewIcon: true,
          showDownloadIcon: true,
          showRemoveIcon: !disabled,
          ...(typeof fieldProps?.showUploadList === 'object' ? fieldProps.showUploadList : {}),
        },
        onDownload: async (file) => {
          fieldProps?.onDownload?.(file);
          await handleDownload(file);
        },
        onRemove: async (file) => {
          const canRemove = await fieldProps?.onRemove?.(file);
          if (canRemove === false) return false;
          setFileList([]);
          onChange?.(undefined);
          return true;
        },
      }}
    />
  );
};

const ProFormFileUpload: React.FC<ProFormFileUploadProps> = ({
  name,
  label,
  rules,
  required,
  tooltip,
  extra,
  formItemProps,
  ...controlProps
}) => (
  <Form.Item
    {...formItemProps}
    name={name}
    label={label}
    rules={rules}
    required={required}
    tooltip={tooltip}
    extra={extra}
  >
    <FileUploadControl {...controlProps} />
  </Form.Item>
);

export default ProFormFileUpload;
