import { request } from '@umijs/max'

export interface IdentityStatus {
  enabled?: boolean
  protocol?: string
  clientId?: string
  issuerUri?: string
  metadataUri?: string
  basePath?: string
  pkce?: string
}

export const getOidcIdentityStatus = () => request<{ data: IdentityStatus }>('/api/sys/identity/oidc')
export const getSamlIdentityStatus = () => request<{ data: IdentityStatus }>('/api/sys/identity/saml')
export const getScimIdentityStatus = () => request<{ data: IdentityStatus }>('/api/sys/identity/scim')
