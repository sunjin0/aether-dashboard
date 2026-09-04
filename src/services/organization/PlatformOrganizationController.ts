import { request } from '@umijs/max';

export const listPlatformOrganizations = () => request('/api/sys/organization/list');
export const listPlatformUserOptions = () => request('/api/sys/admin/options');
export const createPlatformOrganization = (data: { code: string; name: string }) =>
  request('/api/sys/organization/create', { method: 'POST', data });
export const updatePlatformOrganization = (data: { id: string; code: string; name: string }) =>
  request('/api/sys/organization/update', { method: 'POST', data });
export const deletePlatformOrganization = (organizationId: string) =>
  request('/api/sys/organization/delete', { method: 'POST', params: { organizationId } });
export const assignOrganizationMember = (params: { organizationId: string; userId: string }) =>
  request('/api/sys/organization/member/assign', { method: 'POST', params });
export const listPlatformMembers = (organizationId: string) =>
  request('/api/sys/organization/member/list', { params: { organizationId } });
export const listPlatformTeams = (organizationId: string) =>
  request('/api/sys/organization/team/list', { params: { organizationId } });
export const createPlatformTeam = (data: { organizationId: string; code: string; name: string }) =>
  request('/api/sys/organization/team/create', { method: 'POST', data });
export const updatePlatformTeam = (data: {
  id: string;
  organizationId: string;
  code: string;
  name: string;
}) => request('/api/sys/organization/team/update', { method: 'POST', data });
export const deletePlatformTeam = (organizationId: string, teamId: string) =>
  request('/api/sys/organization/team/delete', {
    method: 'POST',
    params: { organizationId, teamId },
  });
export const assignTeamMember = (params: {
  organizationId: string;
  teamId: string;
  userId: string;
  roleCode: string;
}) => request('/api/sys/organization/team/member/assign', { method: 'POST', params });
export const listPlatformTeamMembers = (organizationId: string, teamId: string) =>
  request('/api/sys/organization/team/member/list', { params: { organizationId, teamId } });
export const removeOrganizationMember = (organizationId: string, userId: string) =>
  request('/api/sys/organization/member/remove', {
    method: 'POST',
    params: { organizationId, userId },
  });
export const removeTeamMember = (organizationId: string, teamId: string, userId: string) =>
  request('/api/sys/organization/team/member/remove', {
    method: 'POST',
    params: { organizationId, teamId, userId },
  });
