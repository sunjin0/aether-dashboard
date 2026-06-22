/**
 * @description: 短信搜索参数
 * @since 2025/7/22
 */
export interface SmsSearchParams extends Sms {
  current?: number;
  pageSize?: number;
}

/**
 * @description: 短信
 * @since 2025/7/22
 */
export interface Sms {
  id?: number;
  userId?: number;
  code?: string;
  type?: string;
  body?: string;
  subject?: string;
  status?: number;
  deleted?: number;
  createdAt?: string;
  updatedAt?: string;
  sortNum?: number;
}

/**
 * @description: 邮件查询参数
 * @since 2025/7/22
 */
export interface EmailSearchParams extends Email {
  current?: number;
  pageSize?: number;
}
/**
 * @description: 邮件
 * @since 2025/7/22
 */
export interface Email {
  id?: number;
  userId?: number;
  code?: string;
  type?: string;
  body?: string;
  subject?: string;
  status?: number;
  deleted?: number;
  createdAt?: string;
  updatedAt?: string;
  sortNum?: number;
}
