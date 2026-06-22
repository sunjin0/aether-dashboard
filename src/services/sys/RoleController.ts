import {request} from "@umijs/max";
import {Resource, Role, RoleSearchParams} from "@/services/entity/Sys";
import {ResponseStructure} from "@/services/entity/Common";


/**
 * @description 角色列表
 * @since 2025-07-17
 */
export const getRoleList = async (params: RoleSearchParams): Promise<ResponseStructure<Role[]>> => {
  return request('/api/sys/role/list', {
    method: 'POST',
    data: params,
  });
};
/**
 * @description 角色详情
 * @since 2025-07-17
 */
export const getRoleInfo = async (params: RoleSearchParams): Promise<ResponseStructure<Role>> => {
  return request(`/api/sys/role/info`, {
    method: 'GET',
    params:{id:params},
  })
}
/**
 * @description 角色添加
 * @since 2025-07-17
 */
export const addRoleInfo = async (params: Role) => {
  return request(`/api/sys/role/add`, {
    method: 'POST',
    data: params,
  })
}
/**
 * @description 角色修改
 * @since 2025-07-17
 */
export const updateRoleInfo = async (params: Role) => {
  return request(`/api/sys/role/update`, {
    method: 'POST',
    data: params,
  })
}
/**
 * @description 角色删除
 * @since 2025-07-17
 */
export const deleteRoleInfo = async (params: RoleSearchParams) => {
  return request(`/api/sys/role/delete`, {
    method: 'GET',
    params:{id: params.id},
  })
}
/**
 * @description 获取资源列表
 * @since 2025-07-17
 */
export const getResourceList = async () => {
  return request(`/api/sys/role/resource`, {
    method: 'GET',
  })
}
/**
 * @description 角色权限
 * @since 2025-07-17
 */
export const getRoleAuthorization = async (params: RoleSearchParams) => {
  return request(`/api/sys/role-resource/permission`, {
    method: 'GET',
    params:{
      roleId: params.id
    },
  })
}
/**
 * @description 角色权限保存
 * @since 2025-07-17
 */
export const saveRoleAuthorization = async (params: RoleSearchParams) => {
  return request(`/api/sys/role-resource/save`, {
    method: 'POST',
    data: {
      roleId: params.id,
      resourceIds: params.resourceIds
    },
  })
}
