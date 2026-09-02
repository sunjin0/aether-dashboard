import React, { useEffect, useState } from 'react'
import { useIntl } from '@umijs/max'
import { PageContainer } from '@ant-design/pro-components'
import { Button, Card, Descriptions, Table, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import {
  getWorkflowDeadLetters,
  getWorkflowOperationsMetrics,
  WorkflowDeadLetter,
  WorkflowOperationsMetrics,
} from '@/services/workflow/operations/WorkflowOperationsController'

const WorkflowOperationsPage: React.FC = () => {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id })
  const [metrics, setMetrics] = useState<WorkflowOperationsMetrics>()
  const [deadLetters, setDeadLetters] = useState<WorkflowDeadLetter[]>([])
  const [loading, setLoading] = useState(false)
  const load = async () => {
    setLoading(true)
    try {
      const [metricResult, letterResult] = await Promise.all([getWorkflowOperationsMetrics(), getWorkflowDeadLetters()])
      if (metricResult.code === 200) setMetrics(metricResult.data)
      else return
      if (letterResult.code === 200) setDeadLetters(letterResult.data || [])
      else return
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  return (
    <PageContainer
      header={{ title: t('pages.agent.workflow.operations'), breadcrumb: undefined }}
      extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={load}>{t('pages.agent.workflow.run.refresh')}</Button>}
    >
      <Card title={t('pages.agent.workflow.operations')}>
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label={t('pages.agent.workflow.metric.total')}>{metrics?.totalInstances ?? 0}</Descriptions.Item>
          <Descriptions.Item label={t('pages.agent.workflow.metric.completed')}>{metrics?.completedInstances ?? 0}</Descriptions.Item>
          <Descriptions.Item label={t('pages.agent.workflow.metric.failed')}>{metrics?.failedInstances ?? 0}</Descriptions.Item>
          <Descriptions.Item label={t('pages.agent.workflow.metric.waiting')}>{metrics?.waitingUserInstances ?? 0}</Descriptions.Item>
          <Descriptions.Item label={t('pages.agent.workflow.metric.completionRate')}>{metrics?.completionRate == null ? '-' : `${(metrics.completionRate ).toFixed(1)}%`}</Descriptions.Item>
          <Descriptions.Item label={t('pages.agent.workflow.metric.executionDeadLetter')}>{metrics?.executionDeadLetterCount ?? 0}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title={t('pages.agent.workflow.deadLetters')} style={{ marginTop: 16 }}>
        <Table<WorkflowDeadLetter>
          rowKey="id" loading={loading} pagination={false} dataSource={deadLetters}
          locale={{ emptyText: t('pages.agent.workflow.noDeadLetters') }}
          columns={[
            { title: t('pages.agent.workflow.deadLetter.type'), dataIndex: 'type', width: 150,
              render: (value: string) => t(`pages.workbench.deadLetter.type.${value}`) },
            { title: t('pages.agent.workflow.deadLetter.instance'), dataIndex: 'instanceId', ellipsis: true },
            { title: t('pages.agent.workflow.deadLetter.attempts'), dataIndex: 'attemptCount', width: 100 },
            { title: t('pages.agent.workflow.deadLetter.error'), dataIndex: 'errorMessage', ellipsis: true },
          ]}
        />
      </Card>
    </PageContainer>
  )
}

export default WorkflowOperationsPage
