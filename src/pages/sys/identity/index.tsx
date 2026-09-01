import { PageContainer, ProDescriptions } from '@ant-design/pro-components'
import { Card, Col, Row, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { getOidcIdentityStatus, getSamlIdentityStatus, getScimIdentityStatus, IdentityStatus } from '@/services/sys/IdentityController'

const IdentityCard: React.FC<{ title: string; status?: IdentityStatus }> = ({ title, status }) => (
  <Card title={title} loading={!status}>
    {status && <ProDescriptions column={1} dataSource={status} columns={[
      { title: '状态', dataIndex: 'enabled', render: (_, item) => <Tag color={item.enabled ? 'green' : 'default'}>{item.enabled ? '已启用' : '未启用'}</Tag> },
      { title: '协议', dataIndex: 'protocol' },
      { title: 'Issuer', dataIndex: 'issuerUri' },
      { title: 'Metadata', dataIndex: 'metadataUri' },
      { title: 'SCIM Base Path', dataIndex: 'basePath' },
      { title: 'PKCE', dataIndex: 'pkce' },
    ]} />}
  </Card>
)

const IdentityPage: React.FC = () => {
  const [oidc, setOidc] = useState<IdentityStatus>()
  const [saml, setSaml] = useState<IdentityStatus>()
  const [scim, setScim] = useState<IdentityStatus>()
  useEffect(() => { Promise.all([getOidcIdentityStatus(), getSamlIdentityStatus(), getScimIdentityStatus()]).then(([a, b, c]) => { setOidc(a.data); setSaml(b.data); setScim(c.data) }).catch(() => message.error('身份配置加载失败')) }, [])
  return <PageContainer><Row gutter={[16, 16]}><Col xs={24} lg={8}><IdentityCard title="OIDC" status={oidc} /></Col><Col xs={24} lg={8}><IdentityCard title="SAML" status={saml} /></Col><Col xs={24} lg={8}><IdentityCard title="SCIM" status={scim} /></Col></Row></PageContainer>
}
export default IdentityPage
