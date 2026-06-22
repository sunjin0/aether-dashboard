import {request} from "@umijs/max";
import {ResponseStructure} from "@/services/entity/Common";
import {Resource, ResourceSearchParams} from "@/services/entity/Sys";



/**
 * @description 资源列表
 * @since 2025-07-17
 */
export const getResourceList = async (params: ResourceSearchParams): Promise<ResponseStructure<Resource[]>> => {
  return request('/api/sys/resource/list', {
    method: 'POST',
    data: params,
  });
};
/**
 * @description 资源详情
 * @since 2025-07-17
 */
export const getResourceInfo = async (params: ResourceSearchParams): Promise<ResponseStructure<Resource>> => {
  return request(`/api/sys/resource/info`, {
    method: 'GET',
    params:{id:params},
  })
}
/**
 * @description 资源添加
 * @since 2025-07-17
 */
export const addResourceInfo = async (params: Resource) => {
  return request(`/api/sys/resource/add`, {
    method: 'POST',
    data: params,
  })
}
/**
 * @description 资源修改
 * @since 2025-07-17
 */
export const updateResourceInfo = async (params: Resource) => {
  return request(`/api/sys/resource/update`, {
    method: 'POST',
    data: params,
  })
}
/**
 * @description 资源删除
 * @since 2025-07-17
 */
export const deleteResourceInfo = async (params: ResourceSearchParams) => {
  return request(`/api/sys/resource/delete`, {
    method: 'GET',
    params:{id: params.id},
  })
}
/**
 * @description 选项
 * @since 2025-07-17
 */
export const getResourceOptions = async (): Promise<Resource[]> => {
  const {data} =await request('/api/sys/resource/select', {});
  return data
}

