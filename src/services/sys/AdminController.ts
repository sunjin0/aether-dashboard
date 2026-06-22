import {request}from "@umijs/max";
import {Admin, AdminSearchParams} from "@/services/entity/Sys";
import {Option, ResponseStructure} from "@/services/entity/Common";

/**
 * @description 获取管理员列表
 * @since 2025-07-17
 */
export const getAdminList = async (params: AdminSearchParams): Promise<ResponseStructure<Admin[]>> =>{
  return request('/api/sys/admin/list', {
    method: 'POST',
    data: params,
  });
}
/**
 * @description 获取管理员信息
 * @since 2025-07-17
 */
export const getAdminInfo = async (params: AdminSearchParams): Promise<ResponseStructure<Admin>> =>{
  return request('/api/sys/admin/info', {
    method: 'GET',
    params:{id:params},
  });
}
/**
 * @description 添加管理员
 * @since 2025-07-17
 */
export const addAdminInfo = async (params: Admin): Promise<ResponseStructure<Admin>> =>{
  return request('/api/sys/admin/add', {
    method: 'POST',
    data: params,
  });
}
/**
 * @description 修改管理员
 * @since 2025-07-17
 */
export const updateAdminInfo = async (params: Admin): Promise<ResponseStructure<Admin>> =>{
  return request('/api/sys/admin/update', {
    method: 'POST',
    data: params,
  })
}
/**
 * @description 删除管理员
 * @since 2025-07-17
 */
export const deleteAdminInfo = async (params: AdminSearchParams): Promise<ResponseStructure<Admin>> =>{
  return request('/api/sys/admin/delete', {
    method: 'GET',
    params:{
      id: params.id
    },
  });
}
/**
 * @deprecated 获取角色选项
 * @since 2025-07-17
 */
export const getRoleOptions = async (): Promise<Option[]> =>{
  const {data} = await request('/api/sys/role/options', {
    method: 'GET',
  });
  return data;
}
