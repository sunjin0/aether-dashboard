import React, { useEffect, useRef, useState } from 'react';
import { history, useLocation, useIntl } from '@umijs/max';
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components';
import {
  Alert,
  Collapse,
  Divider,
  Space,
  Spin,
  Tag,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  TimePicker,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { parsePlan } from './plan';
import {
  AgentWorkflow,
  getWorkflow,
  getWorkflowList,
} from '@/services/workflow/workflow/WorkflowController';
import {
  createWorkflowSchedule,
  deleteWorkflowSchedule,
  getWorkflowSchedules,
  setWorkflowScheduleEnabled,
  updateWorkflowSchedule,
  WorkflowSchedule,
} from '@/services/workflow/schedule/WorkflowScheduleController';
import { getServiceAccountList, ServiceAccount } from '@/services/sys/ServiceAccountController';
import {
  AgentProductProfile,
  getAgentProductProfiles,
} from '@/services/agent/AgentProductProfileController';

import WorkflowInputs, {
  WorkflowField,
  parseWorkflowFields,
  inputValue,
  submittedValue,
} from '../WorkflowInputs';

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

const getScheduleVariables = (
  variables?: WorkflowSchedule['variables'],
): Record<string, unknown> => {
  if (!variables) return {};
  if (typeof variables === 'object') return variables;
  try {
    return JSON.parse(String(variables));
  } catch {
    return {};
  }
};

const WorkflowSchedulePage: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const requestedWorkflow = new URLSearchParams(location.search).get('workflowId') || undefined;
  const createRequested = new URLSearchParams(location.search).get('create') === '1';
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsReady, setFieldsReady] = useState(false);
  const [busySchedules, setBusySchedules] = useState<string[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AgentWorkflow>();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const ref = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState<string[]>([]);
  const [editing, setEditing] = useState<WorkflowSchedule>();
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [products, setProducts] = useState<AgentProductProfile[]>([]);
  const [workflowVariables, setWorkflowVariables] = useState<WorkflowField[]>([]);
  const [form] = Form.useForm();
  const workflowId = Form.useWatch('workflowId', form);
  const scheduleTime = Form.useWatch('scheduleTime', form);
  const scheduleWeekday = Form.useWatch('scheduleWeekday', form);
  const scheduleType = Form.useWatch('scheduleType', form) || 'DAILY';

  useEffect(() => {
    getWorkflowList({ current: 1, pageSize: 1000 }).then((result) => {
      if (result.code === 200)
        setWorkflows((result.data || []).filter((workflow) => workflow.status === 1));
    });
    getAgentProductProfiles({ current: 1, pageSize: 100, status: 1 }).then((result) => {
      if (result.code === 200)
        setProducts((result.data || []).filter((product) => product.status === 1));
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    getServiceAccountList().then((result) => {
      if (result.code === 200) setServiceAccounts(result.data || []);
    });
  }, [open]);

  useEffect(() => {
    if (!open || !workflowId) {
      setWorkflowVariables([]);
      setFieldsReady(false);
      setSelectedWorkflow(undefined);
      setLoadingFields(false);
      return;
    }
    let cancelled = false;
    setLoadingFields(true);
    setFieldsReady(false);
    setWorkflowVariables([]);
    getWorkflow(workflowId)
      .then((result) => {
        if (cancelled) return;
        if (result.code === 200 && result.data) {
          setSelectedWorkflow(result.data);
          setFieldsReady(result.data.status === 1);
          const fields = parseWorkflowFields(
            result.data.publishedInputSchema || result.data.inputSchema,
          );
          const savedVariables = getScheduleVariables(
            editing?.workflowId === workflowId ? editing?.variables : undefined,
          );
          setWorkflowVariables(fields);
          form.setFieldValue(
            'variables',
            fields.reduce<Record<string, unknown>>((values, field) => {
              values[field.name] = inputValue(field, savedVariables[field.name] ?? field.default);
              return values;
            }, {}),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setFieldsReady(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingFields(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, form, open, workflowId]);

  const openCreate = () => {
    setEditing(undefined);
    form.resetFields();
    setBusinessOpen([]);
    form.setFieldsValue({
      workflowId: requestedWorkflow,
      scheduleType: 'DAILY',
      scheduleTime: dayjs().hour(9).minute(0).second(0),
      scheduleWeekday: 'MON',
      variables: {},
    });
    setOpen(true);
  };

  useEffect(() => {
    if (createRequested && requestedWorkflow) {
      openCreate();
      history.replace(`/workflow/schedule?workflowId=${encodeURIComponent(requestedWorkflow)}`);
    }
  }, [createRequested, requestedWorkflow]);

  const openEdit = (schedule: WorkflowSchedule) => {
    setEditing(schedule);
    const plan = parsePlan(schedule.cronExpression);
    const scheduleType = plan.type;
    form.setFieldsValue({
      ...schedule,
      scheduleType,
      scheduleTime: dayjs().hour(plan.hour).minute(plan.minute).second(0),
      scheduleWeekday: scheduleType === 'WEEKLY' ? plan.weekday : 'MON',
      variables: {},
    });
    setOpen(true);
  };

  const createSchedule = async () => {
    if (submitLock.current || !fieldsReady || loadingFields) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      if (!availableAccounts.some((account) => account.id === values.serviceAccountId)) {
        form.setFields([
          { name: 'serviceAccountId', errors: [t('pages.workflowUX.selectAccountAgain')] },
        ]);
        return;
      }
      const variables = workflowVariables.reduce<Record<string, unknown>>((result, field) => {
        result[field.name] = submittedValue(field, values.variables?.[field.name]);
        return result;
      }, {});
      const payload: WorkflowSchedule = {
        workflowId: values.workflowId,
        name: values.name,
        serviceAccountId: values.serviceAccountId,
        cronExpression:
          values.scheduleType === 'CUSTOM' && editing
            ? editing.cronExpression
            : buildScheduleCron(values.scheduleType, values.scheduleTime, values.scheduleWeekday),
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
    } catch (error) {
      const invalid = (error as { errorFields?: Array<{ name: string[] }> }).errorFields;
      if (invalid?.length) {
        if (invalid.some((item) => ['businessType', 'businessIdTemplate'].includes(item.name[0])))
          setBusinessOpen(['business']);
        form.scrollToField(invalid[0].name);
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const toggleSchedule = async (schedule: WorkflowSchedule, enabled: boolean) => {
    if (!schedule.id) return;
    if (busySchedules.includes(schedule.id)) return;
    setBusySchedules((current) => [...current, schedule.id!]);
    try {
      const result = await setWorkflowScheduleEnabled(schedule.id, enabled);
      if (result.code === 200) ref.current?.reload();
    } finally {
      setBusySchedules((current) => current.filter((id) => id !== schedule.id));
    }
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
        products.some(
          (product) =>
            product.workflowId === workflowId &&
            product.applicationId === account.applicationId &&
            account.allowedProductIds?.includes(product.id),
        )),
  );

  const describeCron = (cron: string) => {
    const plan = parsePlan(cron);
    if (plan.type === 'CUSTOM') return t('pages.workflowUX.customSchedule');
    if (plan.type.startsWith('EVERY_'))
      return t(`pages.agent.workflow.schedule.frequency.${plan.type}`);
    if (plan.type === 'HOURLY') return t('pages.workflowUX.hourlyAt', { minute: plan.minute });
    return `${t(`pages.agent.workflow.schedule.frequency.${plan.type}`)} · ${plan.type === 'WEEKLY' ? t(`pages.agent.workflow.schedule.weekday.${plan.weekday}`) + ' ' : ''}${String(plan.hour).padStart(2, '0')}:${String(plan.minute).padStart(2, '0')}`;
  };
  return (
    <PageContainer
      header={{ title: t('pages.agent.workflow.schedule.manage'), breadcrumb: undefined }}
    >
      <ProTable<WorkflowSchedule>
        actionRef={ref}
        params={{ workflowId: requestedWorkflow }}
        scroll={{ x: 1000 }}
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
            enabled:
              params.enabled === '' || params.enabled === undefined
                ? undefined
                : String(params.enabled) === 'true',
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
              t('pages.workflowUX.unknown'),
          },
          {
            title: t('pages.workflowUX.executionPlan'),
            dataIndex: 'cronExpression',
            width: 190,
            hideInSearch: true,
            render: (_, record) => describeCron(record.cronExpression),
          },
          {
            title: t('pages.agent.workflow.schedule.nextFireAt'),
            dataIndex: 'nextFireAt',
            width: 180,
            render: (value) => (value ? new Date(Number(value)).toLocaleString() : '-'),
            hideInSearch: true,
          },
          {
            title: t('pages.workflowUX.lastExecution'),
            dataIndex: 'lastTriggeredAt',
            hideInSearch: true,
            width: 190,
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <span>
                  {record.lastTriggeredAt ? new Date(record.lastTriggeredAt).toLocaleString() : '—'}
                </span>
                <Tag color={record.lastErrorMessage ? 'error' : 'default'}>
                  {t(
                    record.lastErrorMessage
                      ? 'pages.workflowUX.triggerFailed'
                      : record.lastTriggeredAt
                        ? 'pages.workflowUX.triggered'
                        : 'pages.workflowUX.notTriggered',
                  )}
                </Tag>
              </Space>
            ),
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
                loading={busySchedules.includes(schedule.id!)}
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
        style={{ top: 24 }}
        styles={{ body: { maxHeight: 'calc(100dvh - 190px)', overflowY: 'auto', paddingRight: 8 } }}
        open={open}
        title={editing ? t('pages.common.edit') : t('pages.agent.workflow.schedule.create')}
        confirmLoading={submitting}
        okButtonProps={{ disabled: !fieldsReady || loadingFields }}
        cancelButtonProps={{ disabled: submitting }}
        closable={!submitting}
        maskClosable={!submitting}
        keyboard={!submitting}
        onCancel={() => {
          form.resetFields();
          setOpen(false);
          setEditing(undefined);
        }}
        afterClose={() => form.resetFields()}
        destroyOnClose
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          name="workflowScheduleForm"
          form={form}
          layout="vertical"
          onFinish={createSchedule}
          onFinishFailed={({ errorFields }) => {
            if (
              errorFields.some((item) =>
                ['businessType', 'businessIdTemplate'].includes(String(item.name[0])),
              )
            )
              setBusinessOpen(['business']);
            if (errorFields.length) form.scrollToField(errorFields[0].name);
          }}
        >
          <Divider orientation="left">{t('pages.workflowUX.scheduleTarget')}</Divider>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: '0 16px',
            }}
          >
            <Form.Item
              name="name"
              label={t('pages.agent.workflow.schedule.name')}
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={128} />
            </Form.Item>
            <Form.Item
              name="workflowId"
              label={t('pages.agent.workflow.schedule.workflow')}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                onChange={() => {
                  form.setFieldValue('serviceAccountId', undefined);
                  form.setFieldValue('variables', {});
                  setFieldsReady(false);
                }}
                options={workflows.map((workflow) => ({
                  value: workflow.id,
                  label: workflow.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="serviceAccountId"
              label={t('pages.agent.workflow.schedule.serviceAccount')}
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                disabled={!workflowId}
                placeholder={t('pages.agent.workflow.schedule.serviceAccountTip')}
                options={availableAccounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                notFoundContent={t('pages.agent.workflow.schedule.noServiceAccounts')}
              />
            </Form.Item>
            {selectedWorkflow && (
              <Tag style={{ alignSelf: 'center' }}>
                {t('pages.workflowUX.runVersionLabel', {
                  version: selectedWorkflow.publishedVersion || '—',
                })}
              </Tag>
            )}
          </div>
          <Divider orientation="left">{t('pages.workflowUX.schedulePlan')}</Divider>
          <Space align="start" wrap>
            <Form.Item
              name="scheduleType"
              label={t('pages.agent.workflow.schedule.frequency')}
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 180 }}
                options={[
                  ...scheduleTypes.map((value) => ({
                    value,
                    label: t(`pages.agent.workflow.schedule.frequency.${value}`),
                  })),
                  ...(editing && parsePlan(editing.cronExpression).type === 'CUSTOM'
                    ? [{ value: 'CUSTOM', label: t('pages.workflowUX.customSchedule') }]
                    : []),
                ]}
              />
            </Form.Item>
            {scheduleType !== 'CUSTOM' && !scheduleType.startsWith('EVERY_') && (
              <Form.Item
                name="scheduleTime"
                label={t('pages.agent.workflow.schedule.time')}
                rules={[{ required: true }]}
              >
                <TimePicker
                  format={scheduleType === 'HOURLY' ? 'mm' : 'HH:mm'}
                  style={{ width: 160 }}
                />
              </Form.Item>
            )}
            {scheduleType === 'WEEKLY' && (
              <Form.Item
                name="scheduleWeekday"
                label={t('pages.agent.workflow.schedule.weekday')}
                rules={[{ required: true }]}
              >
                <Select
                  style={{ width: 140 }}
                  options={weekdays.map((value) => ({
                    value,
                    label: t(`pages.agent.workflow.schedule.weekday.${value}`),
                  }))}
                />
              </Form.Item>
            )}
          </Space>
          <Alert
            type="info"
            showIcon
            message={describeCron(
              scheduleType === 'CUSTOM' && editing
                ? editing.cronExpression
                : buildScheduleCron(scheduleType, scheduleTime, scheduleWeekday),
            )}
            description={t('pages.workflowUX.serverTimezone')}
          />
          <Divider orientation="left">{t('pages.agent.workflow.schedule.variables')}</Divider>
          <Spin spinning={loadingFields}>
            <WorkflowInputs fields={workflowVariables} prefix="variables" />
          </Spin>
          {workflowId && !loadingFields && !fieldsReady && (
            <Alert type="warning" message={t('pages.agent.workflow.run.publishFirst')} />
          )}
          <Collapse
            activeKey={businessOpen}
            onChange={(keys) => setBusinessOpen(typeof keys === 'string' ? [keys] : keys)}
            items={[
              {
                key: 'business',
                forceRender: true,
                label: t('pages.workflowUX.requiredBusiness'),
                children: (
                  <>
                    <Form.Item
                      name="businessType"
                      label={t('pages.agent.workflow.schedule.businessType')}
                      rules={[{ required: true }]}
                    >
                      <Input maxLength={64} />
                    </Form.Item>
                    <Form.Item
                      name="businessIdTemplate"
                      label={t('pages.agent.workflow.schedule.businessId')}
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="daily-${scheduledAt}" />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default WorkflowSchedulePage;
