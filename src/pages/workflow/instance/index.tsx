import React, { useState } from 'react'
import { history, useIntl, useLocation, useModel } from '@umijs/max'
import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components'
import { Button, Modal, Select, Tag, message } from 'antd'
import { PlayCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { AgentWorkflow, getWorkflowList } from '@/services/workflow/workflow/WorkflowController'
import { getWorkflowInstances, WorkflowInstance } from '@/services/workflow/instance/WorkflowInstanceController'
import { useCreatorSearchColumn } from '@/components/CreatorSearchColumn'

const statusColor: Record<string, string> = {
  RUNNING: 'processing', WAITING_USER: 'warning', WAITING_SUBFLOW: 'warning', WAITING_EVENT: 'warning', WAITING_DELAY: 'warning', FAILED: 'error', COMPLETED: 'success', TERMINATED: 'default', TIMED_OUT: 'error', PENDING: 'default',
}

const WorkflowInstancesPage: React.FC = () => {
  const intl = useIntl()
  const location = useLocation()
  const filterWorkflowId = new URLSearchParams(location.search).get('workflowId') || undefined
  const t = (id: string) => intl.formatMessage({ id })
  const { initialState } = useModel('@@initialState')
  const canStart = Boolean(initialState?.currentUser?.permissionMap?.['/workflow/run'])
  const creatorColumn = useCreatorSearchColumn<WorkflowInstance>()
  const [startOpen, setStartOpen] = useState(false)
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([])
  const [workflowId, setWorkflowId] = useState<string>()
  React.useEffect(() => {
    getWorkflowList({ current: 1, pageSize: 1000 }).then((result) => {
      if (result.code === 200) setWorkflows(result.data || [])
    })
  }, [])
  const openStart = async () => {
    const result = await getWorkflowList({ status: 1, current: 1, pageSize: 100 })
    if (result.code !== 200) return
    setWorkflows(result.data || [])
    setWorkflowId(undefined)
    setStartOpen(true)
  }
  const columns: ProColumns<WorkflowInstance>[] = [
    {
      title: t('pages.agent.workflow.instance.workflow'),
      dataIndex: 'workflowId',
      valueType: 'select',
      fieldProps: { showSearch: true, optionFilterProp: 'label', options: workflows.map((item) => ({ value: item.id, label: item.name })) },
      ellipsis: true,
      render: (_, record) => record.workflowName || workflows.find((item) => item.id === record.workflowId)?.name || t('pages.workflowUX.unknown'),
    },
    {
      title: t('pages.agent.workflow.instance.status'),
      dataIndex: 'status',
      width: 150,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.keys(statusColor).map((key) => [key, t(`pages.agent.workflow.run.status.${key}`)]),
      ),
      render: (_, record) => (
        <Tag color={statusColor[record.status] || 'default'}>
          {t(`pages.agent.workflow.run.status.${record.status}`)}
        </Tag>
      ),
    },
    {
      title: t('pages.agent.workflow.instance.business'),
      dataIndex: 'businessType',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) =>
        [record.businessType, record.businessId].filter(Boolean).join(' / ') || '-',
    },
    {
      title: t('pages.agent.workflow.instance.startedAt'),
      dataIndex: 'startedAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: t('pages.agent.workflow.instance.completedAt'),
      dataIndex: 'completedAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: t('pages.agent.workflow.instance.error'),
      dataIndex: 'errorMessage',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('pages.agent.workflow.action'),
      width: 120,
      valueType: 'option',
      render: (_, record) => (
        <a
          onClick={() =>
            history.push(
              `/workflow/workflow/${record.workflowId}/run?instanceId=${encodeURIComponent(record.id)}`,
            )
          }
        >
          <PlayCircleOutlined /> {t('pages.agent.workflow.instance.open')}
        </a>
      ),
    },
  ];
  return (
    <PageContainer
      header={{
        title: t('pages.agent.workflow.instances'),
        subTitle: t('pages.agent.workflow.instancesDescription'),
        breadcrumb: undefined,
      }}
    >
      <ProTable<WorkflowInstance>
        params={{ workflowId: filterWorkflowId }}
        rowKey="id"
        cardBordered
        search={{ labelWidth: 'auto', defaultCollapsed: false, span: 8 }}
        options={{ reload: true, density: true, setting: true }}
        toolBarRender={() => [
          canStart ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openStart}>
              {t('pages.agent.workflow.instance.start')}
            </Button>
          ) : undefined,
        ]}
        columns={[...(creatorColumn ? [creatorColumn] : []), ...columns]}
        request={(params) =>
          getWorkflowInstances({ ...params, current: params.current, pageSize: params.pageSize })
        }
      />
      <Modal
        open={startOpen}
        title={t('pages.agent.workflow.instance.start')}
        okText={t('pages.agent.workflow.instance.continue')}
        okButtonProps={{ disabled: !workflowId }}
        onCancel={() => setStartOpen(false)}
        onOk={() => {
          if (!workflowId) return
          setStartOpen(false)
          history.push(`/workflow/workflow/${workflowId}/run`)
        }}
      >
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          placeholder={t('pages.agent.workflow.instance.selectWorkflow')}
          value={workflowId}
          onChange={setWorkflowId}
          options={workflows.map((workflow) => ({ value: workflow.id, label: workflow.name }))}
        />
      </Modal>
    </PageContainer>
  );
}

export default WorkflowInstancesPage
