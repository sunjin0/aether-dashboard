// 错误处理方案： 错误类型
export enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
export interface Response{
  code: number;
  message: string;
  data: any;
  total?: number;
}

// 与后端约定的响应数据格式
export interface ResponseStructure<T> {
  success: boolean;
  code?: number;
  message?: string;
  data: T;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}
export interface Option{
  id?: number;
  label: string;
  value: string;
  children?: Option[];
  disabled?: boolean;
  isLeaf?: boolean;
  loading?: boolean;
  parent?: Option;
}
