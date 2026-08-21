import React, { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '@ant-design/pro-components'
import { history, useIntl } from '@umijs/max'
import { Card, Col, Empty, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  BarChartOutlined,
  KeyOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  ServiceAccountUsage,
  ServiceAccountUsageItem,
  getServiceAccountUsage,
} from '@/services/sys/ServiceAccountController'

const { Text } = Typography

const ServiceAccountMonitorPage: React.FC = () => {
  const intl = useIntl()
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<ServiceAccountUsage>()
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getServiceAccountUsage()
      if (result.code === 200) {
        setUsage(result.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const maxCalls = useMemo(
    () =>
      Math.max(
        1,
        ...(usage?.accounts || []).map((item) => item.calls || 0),
        ...(usage?.agents || []).map((item) => item.calls || 0),
        ...(usage?.workflows || []).map((item) => item.calls || 0),
      ),
    [usage],
  )

  const columns = [
    {
      title: t('pages.serviceAccount.monitor.name'),
      dataIndex: 'name',
      render: (value: string, record: ServiceAccountUsageItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value || record.id}</Text>
          <Text type="secondary" copyable>
            {record.id}
          </Text>
        </Space>
      ),
    },
    {
      title: t('pages.serviceAccount.monitor.calls'),
      dataIndex: 'calls',
      width: 240,
      render: (value: number) => (
        <Space style={{ width: '100%' }}>
          <Tag color="blue">{value || 0}</Tag>
          <Progress percent={Math.round(((value || 0) / maxCalls) * 100)} showInfo={false} />
        </Space>
      ),
    },
    {
      title: t('pages.serviceAccount.monitor.tokens'),
      dataIndex: 'tokens',
      width: 160,
      render: (value: number) => value || 0,
    },
  ]

  const renderTable = (title: string, icon: React.ReactNode, data?: ServiceAccountUsageItem[]) => (
    <Card
      title={
        <Space>
          {icon}
          {title}
        </Space>
      }
      loading={loading}
    >
      {data?.length ? (
        <Table<ServiceAccountUsageItem>
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={data}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  )

  return (
    <PageContainer onBack={() => history.back()}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={t('pages.serviceAccount.monitor.totalCalls')}
              value={usage?.totalCalls || 0}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={t('pages.serviceAccount.monitor.agentCalls')}
              value={usage?.agentCalls || 0}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={t('pages.serviceAccount.monitor.workflowStarts')}
              value={usage?.workflowStarts || 0}
              prefix={<ApartmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title={t('pages.serviceAccount.monitor.totalTokens')}
              value={usage?.totalTokens || 0}
              prefix={<KeyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24}>
          {renderTable(
            t('pages.serviceAccount.monitor.topAccounts'),
            <BarChartOutlined />,
            usage?.accounts,
          )}
        </Col>
        <Col xs={24} lg={12}>
          {renderTable(t('pages.serviceAccount.monitor.topAgents'), <RobotOutlined />, usage?.agents)}
        </Col>
        <Col xs={24} lg={12}>
          {renderTable(
            t('pages.serviceAccount.monitor.topWorkflows'),
            <ApartmentOutlined />,
            usage?.workflows,
          )}
        </Col>
      </Row>
    </PageContainer>
  )
}

export default ServiceAccountMonitorPage
