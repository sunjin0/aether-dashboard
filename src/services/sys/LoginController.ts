import {ResponseStructure} from "@/services/entity/Common";
import {request} from "@umijs/max";

/**
 * 校验账号
 * @param params 账号密码
 */
export const verify = async (params: any): Promise<ResponseStructure<any>> => {
  return await request('/api/sys/verify', {
    data: params,
    method: 'POST',
  });
}
/**
 * 登录
 * @param params 短信验证
 */
export const login = async (params: any): Promise<ResponseStructure<any>> => {
  return await request('/api/sys/login', {
    data: params,
    method: 'POST',
  });
}
/**
 * 获取用户信息
 */
export const info = async (): Promise<ResponseStructure<any>> => {
  return await request('/api/sys/info');
}
/**
 * 登出
 */
export const logout = async (): Promise<ResponseStructure<any>> => {
  return await request('/api/sys/logout');
}
/**
 * 获取路由
 */
export const getRoutes = async (): Promise<ResponseStructure<any>> => {
  return await request('/api/sys/getRouters');
}
