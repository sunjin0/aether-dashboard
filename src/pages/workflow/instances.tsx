import React, { useState } from 'react'
import { history, useIntl, useModel } from '@umijs/max'
import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components'
import { Button, Modal, Select, Tag, message } from 'antd'
import { PlayCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { AgentWorkflow, getWorkflowInstances, getWorkflowList, WorkflowInstance } from '@/services/workflow/WorkflowController'

const statusColor: Record<string, string> = {
  RUNNING: 'processing', WAITING_USER: 'warning', FAILED: 'error', COMPLETED: 'success', TERMINATED: 'default', TIMED_OUT: 'error', PENDING: 'default',
}

const WorkflowInstancesPage: React.FC = () => {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id })
  const { initialState } = useModel('@@initialState')
  const canStart = Boolean(initialState?.currentUser?.permissionMap?.['/workflow/run'])
  const [startOpen, setStartOpen] = useState(false)
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([])
  const [workflowId, setWorkflowId] = useState<string>()
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
      dataIndex: 'workflowName',
      ellipsis: true,
      render: (_, record) => record.workflowName || record.workflowId,
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
        columns={columns}
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
        onOk={() => workflowId && history.push(`/workflow/workflow/${workflowId}/run`)}
      >
        <Select
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
