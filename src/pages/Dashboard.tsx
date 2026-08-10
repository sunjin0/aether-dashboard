import React, { useEffect, useState } from 'react'
import { history, useIntl, useModel } from '@umijs/max'
import { PageContainer } from '@ant-design/pro-components'
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Alert, Badge, Button, Card, Col, Empty, List, Progress, Row, Skeleton, Space, Statistic, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { getWorkbenchOverview, WorkbenchItem, WorkbenchOverview } from '@/services/workbench/WorkbenchController'
import './Dashboard.less'

const { Text, Title } = Typography

const statusColor: Record<string, string> = {
  RUNNING: 'processing',
  WAITING_USER: 'warning',
  PENDING: 'default',
  CLAIMED: 'processing',
  FAILED: 'error',
  TIMED_OUT: 'error',
}

const Dashboard: React.FC = () => {
  const intl = useIntl()
  const { initialState } = useModel('@@initialState')
  const [overview, setOverview] = useState<WorkbenchOverview>()
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values)
  const permissionMap = initialState?.currentUser?.permissionMap || {}
  const canViewWorkflow = Boolean(permissionMap['/workflow/run'])
  const canViewOperations = Boolean(permissionMap['/workflow/operations'])
  const canViewReviews = Boolean(permissionMap['/knowledge/reviews'])

  const load = async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const result = await getWorkbenchOverview()
      if (result.code === 200) {
        setOverview(result.data)
      } else {
        setLoadFailed(true)
      }
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const itemPath = (item: WorkbenchItem) => {
    if (item.type === 'knowledge-review') return `/knowledge/reviews/${item.id}`
    if (item.type === 'workflow-dead-letter') return '/workflow/operations'
    return `/workflow/workflow/${item.workflowId}/run?instanceId=${encodeURIComponent(item.id)}`
  }

  const statusText = (status?: string) => {
    const id = `pages.workbench.status.${status}`
    const translated = t(id)
    return translated === id ? status || t('pages.workbench.status.UNKNOWN') : translated
  }

  const taskTime = (item: WorkbenchItem) => {
    if (item.overdue) return <Text type="danger" className="workbench-item-time">{t('pages.workbench.overdue')}</Text>
    if (item.deadlineAt) return <Text type="warning" className="workbench-item-time">{t('pages.workbench.dueAt', { time: dayjs(item.deadlineAt).format('MM-DD HH:mm') })}</Text>
    return item.createdAt && <Text type="secondary" className="workbench-item-time">{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
  }

  const renderTaskList = (items: WorkbenchItem[] | undefined, emptyText: string) => (
    <List<WorkbenchItem>
      dataSource={items || []}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /> }}
      renderItem={(item) => (
        <List.Item
          className="workbench-list-item"
          actions={[<Button key="open" type="link" size="small" onClick={() => history.push(itemPath(item))}>{t('pages.workbench.open')} <ArrowRightOutlined /></Button>]}
        >
          <List.Item.Meta
            title={<Space size={8}><Text strong ellipsis className="workbench-item-title">{item.title || '-'}</Text><Tag color={statusColor[item.status || '']}>{statusText(item.status)}</Tag></Space>}
            description={<Space direction="vertical" size={4} className="workbench-item-detail"><Text type="secondary" ellipsis className="workbench-item-description">{item.description || t('pages.workbench.noDescription')}</Text>{item.type === 'workflow-instance' && item.totalNodeCount ? <Space size={8}><Progress percent={Math.round(((item.completedNodeCount || 0) / item.totalNodeCount) * 100)} size="small" showInfo={false} className="workbench-progress" /><Text type="secondary" className="workbench-progress-text">{t('pages.workbench.progress', { completed: item.completedNodeCount || 0, total: item.totalNodeCount })}</Text></Space> : null}</Space>}
          />
          {taskTime(item)}
        </List.Item>
      )}
    />
  )

  const quickActions = [
    canViewWorkflow && { icon: <PlayCircleOutlined />, title: t('pages.workbench.startWorkflow'), description: t('pages.workbench.startWorkflowDescription'), path: '/workflow/run' },
    Boolean(permissionMap['/agent/chat']) && { icon: <RobotOutlined />, title: t('pages.workbench.openChat'), description: t('pages.workbench.openChatDescription'), path: '/agent/chat' },
    Boolean(permissionMap['/knowledge/document']) && { icon: <DatabaseOutlined />, title: t('pages.workbench.manageKnowledge'), description: t('pages.workbench.manageKnowledgeDescription'), path: '/knowledge/document' },
  ].filter(Boolean) as { icon: React.ReactNode; title: string; description: string; path: string }[]
  const pendingCount = (overview?.waitingWorkflowInstances || 0) + (overview?.reviewTasks || 0)
  const attentionCount = (overview?.failedCallbacks || 0) + (overview?.executionDeadLetters || 0)
  const metricCards = [
    { title: t('pages.workbench.waiting'), value: overview?.waitingWorkflowInstances || 0, icon: <ThunderboltOutlined />, color: '#d46b08', path: canViewWorkflow ? '/workflow/run' : undefined },
    { title: t('pages.workbench.reviews'), value: overview?.reviewTasks || 0, icon: <FileSearchOutlined />, color: '#531dab', path: canViewReviews ? '/knowledge/reviews' : undefined },
    { title: t('pages.workbench.running'), value: overview?.runningWorkflowInstances || 0, icon: <ApartmentOutlined />, color: '#0958d9', path: canViewWorkflow ? '/workflow/run' : undefined },
    { title: t('pages.workbench.attention'), value: attentionCount, icon: <ExclamationCircleOutlined />, color: '#cf1322', path: canViewOperations ? '/workflow/operations' : undefined },
  ]

  return (
    <PageContainer header={{ title: false, breadcrumb: undefined }}>
      <div className="workbench">
        <Card bordered={false} className="workbench-hero" styles={{ body: { padding: '28px 32px' } }}>
          <Row gutter={[24, 20]} align="middle">
            <Col flex="auto">
              <Text className="workbench-eyebrow">{t('pages.workbench.eyebrow')}</Text>
              <Title level={2} className="workbench-greeting">{t('pages.workbench.greeting', { name: initialState?.currentUser?.nickname || initialState?.currentUser?.username || '' })}</Title>
              <Text className="workbench-subtitle">{t('pages.workbench.subtitle', { pending: pendingCount, running: overview?.runningWorkflowInstances || 0 })}</Text>
            </Col>
            <Col><Button className="workbench-refresh" icon={<ReloadOutlined />} loading={loading} onClick={load}>{t('pages.workbench.refresh')}</Button></Col>
          </Row>
        </Card>

        {loadFailed && <Alert className="workbench-load-error" type="warning" showIcon message={t('pages.workbench.loadFailed')} action={<Button size="small" onClick={load}>{t('pages.workbench.retry')}</Button>} />}

        <Row gutter={[16, 16]} className="workbench-metrics">
          {metricCards.map((metric) => <Col key={metric.title} xs={24} sm={12} lg={6}><Card bordered={false} className={`workbench-metric ${metric.path ? 'workbench-metric-actionable' : ''}`} onClick={() => metric.path && history.push(metric.path)}><Statistic title={metric.title} value={metric.value} prefix={<span className="workbench-metric-icon" style={{ color: metric.color }}>{metric.icon}</span>} /><Text type="secondary" className="workbench-metric-footer">{metric.value ? t('pages.workbench.viewDetails') : t('pages.workbench.allClear')}</Text></Card></Col>)}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}><Card title={<Space><span>{t('pages.workbench.pending')}</span>{pendingCount > 0 && <Badge count={pendingCount} overflowCount={99} />}</Space>} extra={(canViewWorkflow || canViewReviews) && <Button type="link" onClick={() => history.push(canViewWorkflow ? '/workflow/run' : '/knowledge/reviews')}>{t('pages.workbench.viewAll')}</Button>}>{loading ? <Skeleton active paragraph={{ rows: 4 }} /> : renderTaskList(overview?.pending, t('pages.workbench.noPending'))}</Card></Col>
          <Col xs={24} xl={10}>
            <Card title={t('pages.workbench.quickActions')}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {quickActions.map((action) => <Button className="workbench-quick-action" key={action.path} block size="large" icon={action.icon} onClick={() => history.push(action.path)}><span>{action.title}</span><Text type="secondary">{action.description}</Text><ArrowRightOutlined /></Button>)}
              </Space>
              {canViewWorkflow && overview?.quickStartWorkflows?.length ? <><Text type="secondary" className="workbench-recent-label">{t('pages.workbench.recentWorkflows')}</Text><div className="workbench-workflows">{overview.quickStartWorkflows.map((workflow) => <Button key={workflow.id} type="dashed" onClick={() => history.push(`/workflow/workflow/${workflow.id}/run`)}><PlayCircleOutlined />{workflow.name}</Button>)}</div></> : null}
            </Card>
          </Col>
          <Col xs={24} xl={canViewOperations ? 14 : 24}><Card title={t('pages.workbench.inProgress')} extra={canViewWorkflow && <Button type="link" onClick={() => history.push('/workflow/run')}>{t('pages.workbench.viewAll')}</Button>}>{loading ? <Skeleton active paragraph={{ rows: 3 }} /> : renderTaskList(overview?.running, t('pages.workbench.noRunning'))}</Card></Col>
          {canViewOperations && <Col xs={24} xl={10}><Card title={t('pages.workbench.risks')} extra={<Button type="link" onClick={() => history.push('/workflow/operations')}>{t('pages.workbench.viewAll')}</Button>}>{loading ? <Skeleton active paragraph={{ rows: 3 }} /> : renderTaskList(overview?.attention, t('pages.workbench.noRisks'))}</Card></Col>}
        </Row>
      </div>
    </PageContainer>
  )
}

export default Dashboard
