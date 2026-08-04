import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from '@umijs/max';
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components';
import { Button, Form, Input, Modal, Popconfirm, Select, Switch, TimePicker, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  AgentWorkflow,
  createWorkflowSchedule,
  deleteWorkflowSchedule,
  getWorkflow,
  getWorkflowList,
  getWorkflowSchedules,
  setWorkflowScheduleEnabled,
  updateWorkflowSchedule,
  WorkflowSchedule,
} from '@/services/workflow/WorkflowController';
import { getServiceAccountList, ServiceAccount } from '@/services/sys/ServiceAccountController';

const scheduleTypes = [
  'EVERY_5_MINUTES',
  'EVERY_15_MINUTES',
  'EVERY_30_MINUTES',
  'HOURLY',
  'DAILY',
  'WEEKDAYS',
  'WEEKLY',
] as const;
const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const buildScheduleCron = (type: string, time?: ReturnType<typeof dayjs>, weekday?: string) => {
  const minute = time?.minute() ?? 0;
  const hour = time?.hour() ?? 0;
  if (type === 'EVERY_5_MINUTES') return '0 */5 * * * *';
  if (type === 'EVERY_15_MINUTES') return '0 */15 * * * *';
  if (type === 'EVERY_30_MINUTES') return '0 */30 * * * *';
  if (type === 'HOURLY') return `0 ${minute} * * * *`;
  if (type === 'WEEKDAYS') return `0 ${minute} ${hour} * * MON-FRI`;
  if (type === 'WEEKLY') return `0 ${minute} ${hour} * * ${weekday || 'MON'}`;
  return `0 ${minute} ${hour} * * *`;
};

const parseScheduleVariable = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const getWorkflowVariables = (workflow?: AgentWorkflow) => {
  try {
    const fields = JSON.parse(workflow?.publishedInputSchema || workflow?.inputSchema || '[]');
    if (!Array.isArray(fields)) return [];
    return fields
      .filter((field) => field && typeof field === 'object' && field.name)
      .map((field) => ({
        key: String(field.name),
        value:
          field.default === undefined
            ? ''
            : typeof field.default === 'string'
              ? field.default
              : JSON.stringify(field.default),
      }));
  } catch {
    return [];
  }
};

const WorkflowSchedulePage: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const ref = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowSchedule>();
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [form] = Form.useForm();
  const workflowId = Form.useWatch('workflowId', form);
  const scheduleType = Form.useWatch('scheduleType', form) || 'DAILY';

  useEffect(() => {
    getWorkflowList({ current: 1, pageSize: 1000 }).then((result) => {
      if (result.code === 200)
        setWorkflows((result.data || []).filter((workflow) => workflow.status === 1));
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    getServiceAccountList().then((result) => {
      if (result.code === 200) setServiceAccounts(result.data || []);
    });
  }, [open]);

  useEffect(() => {
    if (!open || editing || !workflowId) return;
    getWorkflow(workflowId).then((result) => {
      if (result.code === 200 && result.data) {
        form.setFieldValue('variables', getWorkflowVariables(result.data));
      }
    });
  }, [editing, form, open, workflowId]);

  const openCreate = () => {
    setEditing(undefined);
    form.setFieldsValue({
      scheduleType: 'DAILY',
      scheduleTime: dayjs().hour(9).minute(0).second(0),
      scheduleWeekday: 'MON',
      variables: [{ key: '', value: '' }],
    });
    setOpen(true);
  };

  const openEdit = (schedule: WorkflowSchedule) => {
    setEditing(schedule);
    const fields = schedule.cronExpression.split(' ');
    const everyMinutes = fields[1]?.match(/^\*\/(5|15|30)$/)?.[1];
    const scheduleType = everyMinutes
      ? `EVERY_${everyMinutes}_MINUTES`
      : fields[5] === 'MON-FRI'
        ? 'WEEKDAYS'
        : fields[5] && weekdays.includes(fields[5])
          ? 'WEEKLY'
          : fields[2] === '*'
            ? 'HOURLY'
            : 'DAILY';
    let variables: Record<string, unknown> = {};
    try {
      variables = schedule.variables ? JSON.parse(String(schedule.variables)) : {};
    } catch {
      variables = {};
    }
    form.setFieldsValue({
      ...schedule,
      scheduleType,
      scheduleTime: dayjs()
        .hour(Number(fields[2]) || 0)
        .minute(Number(fields[1]) || 0)
        .second(0),
      scheduleWeekday: scheduleType === 'WEEKLY' ? fields[5] : 'MON',
      variables: Object.entries(variables).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      })),
    });
    setOpen(true);
  };

  const createSchedule = async () => {
    const values = await form.validateFields();
    const variables: Record<string, unknown> = {};
    for (const row of values.variables || []) {
      const key = String(row?.key || '').trim();
      if (!key) continue;
      if (Object.prototype.hasOwnProperty.call(variables, key)) {
        message.error(t('pages.agent.workflow.schedule.duplicateVariable'));
        return;
      }
      variables[key] = parseScheduleVariable(String(row?.value || ''));
    }
    const payload: WorkflowSchedule = {
      workflowId: values.workflowId,
      name: values.name,
      serviceAccountId: values.serviceAccountId,
      cronExpression: buildScheduleCron(
        values.scheduleType,
        values.scheduleTime,
        values.scheduleWeekday,
      ),
      businessType: values.businessType,
      businessIdTemplate: values.businessIdTemplate,
      variables,
    };
    const result = editing?.id
      ? await updateWorkflowSchedule(editing.id, payload)
      : await createWorkflowSchedule(payload);
    if (result.code !== 200) return;
    setOpen(false);
    setEditing(undefined);
    ref.current?.reload();
  };

  const toggleSchedule = async (schedule: WorkflowSchedule, enabled: boolean) => {
    if (!schedule.id) return;
    const result = await setWorkflowScheduleEnabled(schedule.id, enabled);
    if (result.code === 200) ref.current?.reload();
  };

  const deleteSchedule = async (schedule: WorkflowSchedule) => {
    if (!schedule.id) return;
    const result = await deleteWorkflowSchedule(schedule.id);
    if (result.code === 200) ref.current?.reload();
  };

  const availableAccounts = serviceAccounts.filter(
    (account) =>
      account.enabled &&
      (!workflowId ||
        !account.allowedWorkflowIds?.length ||
        account.allowedWorkflowIds.includes(workflowId)),
  );

  return (
    <PageContainer
      header={{ title: t('pages.agent.workflow.schedule.manage'), breadcrumb: undefined }}
    >
      <ProTable<WorkflowSchedule>
        actionRef={ref}
        rowKey="id"
        cardBordered
        search={{ labelWidth: 'auto', defaultCollapsed: false, span: 8 }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true, showQuickJumper: true }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('pages.agent.workflow.schedule.create')}
          </Button>,
        ]}
        request={async (params) => {
          const result = await getWorkflowSchedules({
            name: params.name,
            workflowId: params.workflowId,
            enabled: params.enabled === '' || params.enabled === undefined ? undefined : String(params.enabled) === 'true',
            current: params.current,
            pageSize: params.pageSize,
          });
          return { data: result.data || [], success: result.code === 200, total: result.total };
        }}
        columns={[
          { title: t('pages.agent.workflow.schedule.name'), dataIndex: 'name', width: 180 },
          {
            title: t('pages.agent.workflow.schedule.workflow'),
            dataIndex: 'workflowId',
            valueType: 'select',
            fieldProps: {
              showSearch: true,
              optionFilterProp: 'label',
              options: workflows.map((workflow) => ({ value: workflow.id, label: workflow.name })),
            },
            render: (_, record) =>
              workflows.find((workflow) => workflow.id === record.workflowId)?.name ||
              record.workflowId,
          },
          {
            title: t('pages.agent.workflow.schedule.cron'),
            dataIndex: 'cronExpression',
            width: 190,
            hideInSearch: true,
          },
          {
            title: t('pages.agent.workflow.schedule.nextFireAt'),
            dataIndex: 'nextFireAt',
            width: 180,
            render: (value) => (value ? new Date(Number(value)).toLocaleString() : '-'),
            hideInSearch: true,
          },
          {
            title: t('pages.agent.workflow.schedule.lastError'),
            dataIndex: 'lastErrorMessage',
            ellipsis: true,
            hideInSearch: true,
          },
          {
            title: t('pages.agent.workflow.schedule.enabled'),
            dataIndex: 'enabled',
            width: 100,
            valueType: 'select',
            valueEnum: { true: t('pages.common.yes'), false: t('pages.common.no') },
            render: (_, schedule) => (
              <Switch
                checked={!!schedule.enabled}
                onChange={(enabled) => toggleSchedule(schedule, enabled)}
              />
            ),
          },
          {
            title: t('pages.agent.workflow.action'),
            width: 160,
            valueType: 'option',
            render: (_, schedule) => (
              <>
                <Button type="link" onClick={() => openEdit(schedule)}>
                  {t('pages.common.edit')}
                </Button>
                <Popconfirm
                  title={t('pages.agent.workflow.schedule.deleteConfirm')}
                  onConfirm={() => deleteSchedule(schedule)}
                >
                  <Button type="link" style={{ color: '#ff4d4f' }}>
                    {t('pages.common.delete')}
                  </Button>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />
      <Modal
        open={open}
        title={editing ? t('pages.common.edit') : t('pages.agent.workflow.schedule.create')}
        onCancel={() => {
          setOpen(false);
          setEditing(undefined);
        }}
        onOk={createSchedule}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '0 16px',
            }}
          >
            <Form.Item
              name="workflowId"
              label={t('pages.agent.workflow.schedule.workflow')}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={workflows.map((workflow) => ({
                  value: workflow.id,
                  label: workflow.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="name"
              label={t('pages.agent.workflow.schedule.name')}
              rules={[{ required: true }]}
            >
              <Input maxLength={128} />
            </Form.Item>
            <Form.Item
              name="serviceAccountId"
              label={t('pages.agent.workflow.schedule.serviceAccount')}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t('pages.agent.workflow.schedule.serviceAccountTip')}
                options={availableAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} (${account.clientId})`,
                }))}
                notFoundContent={t('pages.agent.workflow.schedule.noServiceAccounts')}
              />
            </Form.Item>
            <Form.Item
              name="scheduleType"
              label={t('pages.agent.workflow.schedule.frequency')}
              rules={[{ required: true }]}
            >
              <Select
                options={scheduleTypes.map((value) => ({
                  value,
                  label: t(`pages.agent.workflow.schedule.frequency.${value}`),
                }))}
              />
            </Form.Item>
            <Form.Item
              name="scheduleTime"
              label={t('pages.agent.workflow.schedule.time')}
              rules={[{ required: true }]}
            >
              <TimePicker
                format="HH:mm"
                minuteStep={5}
                style={{ width: '100%' }}
                disabled={scheduleType.startsWith('EVERY_')}
              />
            </Form.Item>
            <Form.Item
              name="businessType"
              label={t('pages.agent.workflow.schedule.businessType')}
              rules={[{ required: true }]}
            >
              <Input maxLength={64} />
            </Form.Item>
          </div>
          {scheduleType === 'WEEKLY' && (
            <Form.Item
              name="scheduleWeekday"
              label={t('pages.agent.workflow.schedule.weekday')}
              rules={[{ required: true }]}
            >
              <Select
                options={weekdays.map((value) => ({
                  value,
                  label: t(`pages.agent.workflow.schedule.weekday.${value}`),
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="businessIdTemplate"
            label={t('pages.agent.workflow.schedule.businessId')}
            rules={[{ required: true }]}
          >
            <Input placeholder="daily-${scheduledAt}" />
          </Form.Item>
          <Form.List name="variables">
            {(fields, { add, remove }) => (
              <Form.Item label={t('pages.agent.workflow.schedule.variables')}>
                {fields.map((field) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Form.Item {...field} name={[field.name, 'key']} noStyle>
                      <Input placeholder={t('pages.agent.workflow.schedule.variableKey')} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'value']} noStyle>
                      <Input placeholder={t('pages.agent.workflow.schedule.variableValue')} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ key: '', value: '' })}
                >
                  {t('pages.agent.workflow.schedule.addVariable')}
                </Button>
              </Form.Item>
            )}
          </Form.List>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default WorkflowSchedulePage;
