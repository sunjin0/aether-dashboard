import {request} from "@umijs/max";
import {ResponseStructure} from "@/services/entity/Common";
/**
 * 查询参数
 * @since 2025-07-23 10:46:11
 */
export interface MemberSearchParams extends Member {
    current: number;
    pageSize: number;
}
/**
 * 实体
 * @since 2025-07-23 10:46:11
 */
export interface Member {
    id: number;
            username : string;
            password : string;
            nickname : string;
            email : string;
            phone : string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
    state: number;
    sortNum: number;
}
/**
 * 分页查询
 * @param params 查询参数
 * @since 2025-07-23 10:46:11
 * @returns 查询结果
 */
export const getMemberList = async (params: MemberSearchParams): Promise<ResponseStructure<Member[]>> => {
    return await request('/api/user/member/list', {
        method: 'POST',
        data: params,
    })
}
/**
 * 查询信息
 * @param params 查询参数
 * @since 2025-07-23 10:46:11
 * @returns 查询结果
 */
export const getMemberInfo = async (params: MemberSearchParams): Promise<ResponseStructure<Member>> => {
    let {data} = await request('/api/user/member/info', {
        method: 'get',
        params: {id:params},

    });
    return data
}
/**
 * 新增信息
 * @param params 新增参数
 * @since 2025-07-23 10:46:11
 * @returns 新增结果
 */
export const addMemberInfo = async (params: Member) => {
    return request('/api/user/member/add', {
        method: 'post',
        data: params,
    });
}
/**
 * 修改信息
 * @param params 修改参数
 * @since 2025-07-23 10:46:11
 * @returns 修改结果
 */
export const updateMemberInfo = async (params: Member) => {
    return request('/api/user/member/update', {
        method: 'post',
        data: params,
    })
}
/**
 * 删除信息
 * @param params 删除参数
 * @since 2025-07-23 10:46:11
 * @returns 删除结果
 */
export const deleteMemberInfo = async (params: MemberSearchParams) => {
    return request('/api/user/member/delete', {
        method: 'get',
        params: {id:params.id},
    })
}
