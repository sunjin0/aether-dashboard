/**
 *@description 字典查询参数
 * @since 2025-07-17
 */
export interface DictSearchParams extends Dict {
  current?: number;
  pageSize?: number;
}

/**
 * @description 字典
 * @since 2025-07-17
 */
export interface Dict {
  id?: number;
  code?: string;
  parent?:string;
  name?: string;
  nameCn?: string;
  val?: string;
  remark?: string;
  status?: number;
  deleted?: number;
  createdAt?: string;
  updatedAt?: string;
  sortNum?: number;
}
/**
 *@description 角色查询参数
 * @since 2025-07-17
 */
export interface RoleSearchParams extends Role {
  current?: number;
  pageSize?: number;
  resourceIds?: any[];
}

/**
 * @description 角色
 * @since 2025-07-17
 */
export interface Role {
  id?: number;
  name?: string;
  description?: string;
  status?: number;
  deleted?: number;
  createdAt?: string;
  updatedAt?: string;
  sortNum?: number;
}
/**
 * @description 资源查询参数
 * @since 2025-07-17
 */
export interface ResourceSearchParams extends Resource {
  current?: number;
  pageSize?: number;
  resourceIds?: any[];
}

/**
 * @description 资源
 * @since 2025-07-17
 */
export interface Resource {
  id?: number;
  name?: string;
  nameCn?: string;
  path?: string;
  type?: string;
  icon?: string;
  parentId?: number;
  description?: string;
  status?: number;
  deleted?: number;
  createdAt?: string;
  updatedAt?: string;
  sortNum?: number;
}
export interface Admin {
  id?: number;
  username?: string;
  password?: string;
  sex?: string;
  type?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  status?: number;
  deleted?: number;
  createdAt?: string;
  updatedAt?: string;
  sortNum?: number;
}
export interface AdminSearchParams extends Admin {
  current?: number;
  pageSize?: number;
}
