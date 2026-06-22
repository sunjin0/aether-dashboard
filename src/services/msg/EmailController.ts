import {request}from "@umijs/max";
import {Email, EmailSearchParams} from "@/services/entity/Msg";
import { ResponseStructure} from "@/services/entity/Common";

/**
 * @description 获取邮件列表
 * @since 2025-07-17
 */
export const getEmailList = async (params: EmailSearchParams): Promise<ResponseStructure<Email[]>> =>{
  return request('/api/msg/email/list', {
    method: 'POST',
    data: params,
  });
}
/**
 * @description 删除邮件信息
 * @since 2025-07-17
 */
export const deleteEmailInfo = async (params: EmailSearchParams): Promise<ResponseStructure<Email>> =>{
  return request('/api/msg/email/delete', {
    method: 'GET',
    params:{
      id: params.id
    },
  })
}
