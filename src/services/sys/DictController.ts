import {request} from "@umijs/max";
import {Option, ResponseStructure} from "@/services/entity/Common";
import {Dict, DictSearchParams} from "@/services/entity/Sys";

/**
 * @description 获取字典列表
 * @since 2025-07-17
 */
export const getDictList = async (params: DictSearchParams): Promise<ResponseStructure<Dict[]>> => {
  return request('/api/sys/dict/list', {
    method: 'POST',
    data: params,
  });
}
/**
 * @description 获取字典信息
 * @since 2025-07-17
 */
export const getDictInfo = async (params: DictSearchParams): Promise<ResponseStructure<Dict>> => {
  return request('/api/sys/dict/info', {
    method: 'GET',
    params:{id:params},
  });
}
/**
 * @description 添加字典
 * @since 2025-07-17
 */
export const addDictInfo = async (params: Dict): Promise<ResponseStructure<Dict>> => {
  return request('/api/sys/dict/add', {
    method: 'POST',
    data: params,
  });
}
/**
 * @description 修改字典
 * @since 2025-07-17
 */
export const updateDictInfo = async (params: Dict): Promise<ResponseStructure<Dict>> => {
  return request('/api/sys/dict/update', {
    method: 'POST',
    data: params,
  });
}
/**
 * @description 删除字典
 * @since 2025-07-17
 */
export const deleteDictInfo = async (params: DictSearchParams): Promise<ResponseStructure<Dict>> => {
  return request('/api/sys/dict/delete', {
    method: 'GET',
    params:{id: params.id},
  });
}
/**
 * @description 获取字典下拉列表
 * @since 2025-07-21
 */
export const getSelectList = async (): Promise<Option[]> => {
  const {data} = await request('/api/sys/dict/select', {
    method: 'GET',
  });
  return data;
}
/**
 * @description 字典
 * @since 2025-07-17
 */
export const getOptionList = async (parentCode: string): Promise<Option[]> => {
  let {data} = await request(`/api/sys/dict/options`, {
    method: 'GET',
    params: {
      parentCode
    }
  });
  return data
}
