import {request} from "@umijs/max";
import {SmsSearchParams,Sms} from "@/services/entity/Msg";
import {ResponseStructure} from "@/services/entity/Common";

/**
 * @description 获取短信列表
 * @since 2025-07-17
 */
export const getSmsList = async (params: SmsSearchParams): Promise<ResponseStructure<Sms[]>> => {
  return request('/api/msg/sms/list', {
    method: 'POST',
    data: params,
  });
}
/**
 * @description 删除短信信息
 * @since 2025-07-17
 */
export const deleteSmsInfo = async (params: SmsSearchParams): Promise<ResponseStructure<Sms>> => {
  return request('/api/msg/sms/delete', {
    method: 'GET',
    params: {
      id: params.id
    },
  })
}
