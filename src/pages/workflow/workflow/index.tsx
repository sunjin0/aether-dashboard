import React, { useRef, useState } from 'react';
import { history, useIntl, useModel } from '@umijs/max';
import { downloadBlob } from '@/utils/desktop';
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components';
import {
  Empty,
  Space,
  Typography,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  DownloadOutlined,
  HistoryOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  AgentWorkflow,
  createWorkflow,
  createWorkflowTemplate,
  deleteWorkflow,
  exportWorkflow,
  getWorkflow,
  getWorkflowList,
  getWorkflowTemplates,
  getWorkflowVersionDiff,
  getWorkflowVersions,
  importWorkflow,
  instantiateWorkflowTemplate,
  offlineWorkflow,
  publishWorkflow,
  updateWorkflow,
  WorkflowTemplate,
  WorkflowVersion,
  WorkflowVersionDiff,
} from '@/services/workflow/workflow/WorkflowController';
import TableActionMenu from '@/components/TableActionMenu';
import {
  AgentApplication,
  getAgentApplicationList,
} from '@/services/agent/AgentApplicationController';
import { useCreatorSearchColumn } from '@/components/CreatorSearchColumn';

const WorkflowPage: React.FC = () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const canRun = Boolean(initialState?.currentUser?.permissionMap?.['/workflow/run']);
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const creatorColumn = useCreatorSearchColumn<AgentWorkflow>();
  const ref = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [editing, setEditing] = useState<AgentWorkflow>();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [templateSource, setTemplateSource] = useState<AgentWorkflow>();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionWorkflow, setVersionWorkflow] = useState<AgentWorkflow>();
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [versionDiff, setVersionDiff] = useState<WorkflowVersionDiff>();
  const [compareVersions, setCompareVersions] = useState<number[]>([]);
  const importInput = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const applicationOptions = applications.map((item) => ({ label: item.name, value: item.id }));

  React.useEffect(() => {
    getAgentApplicationList({ current: 1, pageSize: 100 }).then(({ data }) =>
      setApplications((data || []).filter((item) => item.status === 1)),
    );
  }, []);
  const loadTemplates = async () => {
    const result = await getWorkflowTemplates();
    if (result.code === 200) setTemplates(result.data || []);
    else return;
  };
  const showTemplates = async () => {
    await loadTemplates();
    setTemplatesOpen(true);
  };
  const showVersions = async (record: AgentWorkflow) => {
    if (!record.id) return;
    const result = await getWorkflowVersions(record.id);
    if (result.code !== 200) return;
    setVersionWorkflow(record);
    setVersions(result.data || []);
    setCompareVersions([]);
    setVersionDiff(undefined);
    setVersionsOpen(true);
  };
  const compareVersion = async (selectedVersions: number[]) => {
    setCompareVersions(selectedVersions);
    if (selectedVersions.length !== 2 || !versionWorkflow?.id) {
      setVersionDiff(undefined);
      return;
    }
    const [from, to] = [...selectedVersions].sort((a, b) => a - b);
    const result = await getWorkflowVersionDiff(versionWorkflow.id, from, to);
    if (result.code === 200) setVersionDiff(result.data);
    else return;
  };
  const downloadWorkflow = async (record: AgentWorkflow) => {
    if (!record.id) return;
    const result = await exportWorkflow(record.id);
    if (result.code !== 200 || !result.data) return;
    await downloadBlob(
      new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' }),
      `${record.name || 'workflow'}.json`,
    );
  };
  const uploadWorkflow = async (file?: File) => {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as AgentWorkflow;
      const result = await importWorkflow(payload);
      if (result.code === 200 && result.data) {
        history.push(`/workflow/workflow/${result.data}`);
      } else return;
    } catch {
      message.error(t('pages.agent.workflow.importInvalid'));
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  };
  const submit = async (values: AgentWorkflow) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      if (editing?.id) {
        const result = await updateWorkflow(editing.id, { ...editing, ...values });
        if (result.code === 200) {
          setOpen(false);
          setEditing(undefined);
          ref.current?.reload();
        } else return;
        return;
      }
      const result = await createWorkflow(values);
      if (result.code === 200 && result.data) {
        setOpen(false);
        history.push(`/workflow/workflow/${result.data}`);
      } else return;
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };
  const openCreate = () => {
    setEditing(undefined);
    form.resetFields();
    setOpen(true);
  };
  const openEdit = async (record: AgentWorkflow) => {
    if (!record.id) return;
    const result = await getWorkflow(record.id);
    if (result.code !== 200 || !result.data) {
      return;
    }
    setEditing(result.data);
    form.setFieldsValue({
      applicationId: result.data.applicationId,
      code: result.data.code,
      name: result.data.name,
      description: result.data.description,
      maxConcurrentInstances: result.data.maxConcurrentInstances ?? 0,
    });
    setOpen(true);
  };
  const action = async (record: AgentWorkflow, fn: (id: string) => Promise<any>, text: string) => {
    if (!record.id) return;
    const result = await fn(record.id);
    if (result.code === 200) {
      ref.current?.reload();
    } else return;
  };
  const createTemplate = async () => {
    if (!templateSource?.id) return;
    const values = await templateForm.validateFields();
    const result = await createWorkflowTemplate(templateSource.id, values);
    if (result.code === 200) {
      setTemplateSource(undefined);
      templateForm.resetFields();
      await loadTemplates();
    } else return;
  };
  const instantiateTemplate = async (template: WorkflowTemplate) => {
    const result = await instantiateWorkflowTemplate(template.id, {
      name: `${template.name} ${t('pages.agent.workflow.copySuffix')}`,
      description: template.description || '',
    });
    if (result.code === 200 && result.data) {
      setTemplatesOpen(false);
      history.push(`/workflow/workflow/${result.data}`);
    } else return;
  };
  return (
    <PageContainer
      header={{
        title: t('pages.agent.workflow.title'),
        subTitle: t('pages.agent.workflow.pageDescription'),
        breadcrumb: undefined,
      }}
    >
      <ProTable<AgentWorkflow>
        actionRef={ref}
        rowKey="id"
        cardBordered={false}
        search={{ labelWidth: 'auto', defaultCollapsed: true, span: 8 }}
        options={{ reload: true, density: true, setting: true }}
        scroll={{ x: 720 }}
        locale={{
          emptyText: (
            <Empty description={t('pages.workflowUX.emptyWorkflows')}>
              <Space>
                <Button type="primary" onClick={openCreate}>
                  {t('pages.agent.workflow.new')}
                </Button>
                <Button onClick={showTemplates}>{t('pages.agent.workflow.templates')}</Button>
              </Space>
            </Empty>
          ),
        }}
        toolBarRender={() => [
          <input
            key="import-file"
            ref={importInput}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(event) => uploadWorkflow(event.target.files?.[0])}
          />,
          <Button icon={<UploadOutlined />} onClick={() => importInput.current?.click()}>
            {t('pages.agent.workflow.import')}
          </Button>,
          <Button icon={<AppstoreOutlined />} onClick={showTemplates}>
            {t('pages.agent.workflow.templates')}
          </Button>,
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('pages.agent.workflow.new')}
          </Button>,
        ]}
        columns={[
          ...(creatorColumn ? [creatorColumn] : []),
          {
            title: t('pages.agent.product.application'),
            dataIndex: 'applicationId',
            width: 140,
            valueType: 'select',
            fieldProps: { options: applicationOptions },
            render: (_, record) =>
              applications.find((item) => item.id === record.applicationId)?.name ||
              t('pages.workflowUX.unknown'),
          },
          {
            title: t('pages.agent.workflow.name'),
            dataIndex: 'name',
            width: 220,
            render: (_, r) => (
              <Space direction="vertical" size={2}>
                <a onClick={() => history.push(`/workflow/workflow/${r.id}`)}>{r.name}</a>
                <Typography.Text
                  type="secondary"
                  ellipsis={{ tooltip: r.description }}
                  style={{ maxWidth: 200 }}
                >
                  {r.description || '—'}
                </Typography.Text>
              </Space>
            ),
          },
          {
            title: t('pages.agent.workflow.status'),
            dataIndex: 'status',
            width: 100,
            valueType: 'select',
            valueEnum: {
              0: t('pages.agent.workflow.status.draft'),
              1: t('pages.workflowUX.published'),
              2: t('pages.agent.workflow.status.offline'),
            },
            render: (_, r) => (
              <Tag color={r.status === 1 ? 'green' : r.status === 2 ? 'default' : 'orange'}>
                {r.status === 1
                  ? t('pages.workflowUX.published')
                  : r.status === 2
                    ? t('pages.agent.workflow.status.offline')
                    : t('pages.agent.workflow.status.draft')}
              </Tag>
            ),
          },
          {
            title: t('pages.agent.workflow.version'),
            dataIndex: 'publishedVersion',
            hideInSearch: true,
            width: 90,
            render: (_, r) => (r.publishedVersion ? `v${r.publishedVersion}` : '—'),
          },
          {
            title: t('pages.agent.workflow.action'),
            width: 190,
            fixed: 'right',
            valueType: 'option',
            render: (_, r) => (
              <TableActionMenu
                items={[
                  {
                    key: 'edit',
                    label: t('pages.agent.workflow.basicSettings'),
                    onClick: () => openEdit(r),
                  },
                  {
                    key: 'design',
                    label: t('pages.agent.workflow.action.edit'),
                    primary: true,
                    onClick: () => history.push(`/workflow/workflow/${r.id}`),
                  },
                  {
                    key: 'run',
                    label: t('pages.agent.workflow.action.start'),
                    primary: true,
                    visible: r.status === 1 && canRun,
                    onClick: () => history.push(`/workflow/workflow/${r.id}/run`),
                  },
                  {
                    key: 'records',
                    label: t('pages.agent.workflow.instances'),
                    onClick: () =>
                      history.push(`/workflow/run?workflowId=${encodeURIComponent(r.id!)}`),
                  },
                  {
                    key: 'schedule',
                    label: t('pages.agent.workflow.schedule.create'),
                    visible:
                      r.status === 1 &&
                      Boolean(initialState?.currentUser?.permissionMap?.['/workflow/schedule']),
                    onClick: () =>
                      history.push(
                        `/workflow/schedule?workflowId=${encodeURIComponent(r.id!)}&create=1`,
                      ),
                  },
                  {
                    key: 'template',
                    label: t('pages.agent.workflow.saveAsTemplate'),
                    onClick: () => {
                      setTemplateSource(r);
                      templateForm.setFieldsValue({
                        name: `${r.name || ''} ${t('pages.agent.workflow.templateSuffix')}`,
                        description: r.description,
                      });
                    },
                  },
                  {
                    key: 'versions',
                    label: (
                      <>
                        <HistoryOutlined /> {t('pages.agent.workflow.versions')}
                      </>
                    ),
                    onClick: () => showVersions(r),
                  },
                  {
                    key: 'evaluation',
                    label: t('pages.agentEvaluation.entry.evaluate'),
                    onClick: () =>
                      r.id &&
                      history.push(`/evaluation/experiments?targetType=WORKFLOW&targetId=${r.id}`),
                  },
                  {
                    key: 'export',
                    label: (
                      <>
                        <DownloadOutlined /> {t('pages.agent.workflow.export')}
                      </>
                    ),
                    onClick: () => downloadWorkflow(r),
                  },
                  {
                    key: 'publish',
                    label: t('pages.agent.workflow.action.publish'),
                    visible: r.status !== 1,
                    onClick: () =>
                      action(r, publishWorkflow, t('pages.agent.workflow.action.publish')),
                  },
                  {
                    key: 'offline',
                    label: t('pages.agent.workflow.action.offline'),
                    visible: r.status === 1,
                    onClick: () =>
                      action(r, offlineWorkflow, t('pages.agent.workflow.status.offline')),
                  },
                  {
                    key: 'delete',
                    label: t('pages.agent.workflow.action.delete'),
                    danger: true,
                    confirm: { title: t('pages.agent.workflow.deleteConfirm') },
                    onClick: () => action(r, deleteWorkflow, t('pages.agent.workflow.deleted')),
                  },
                ]}
              />
            ),
          },
        ]}
        request={(params) =>
          getWorkflowList({ ...params, current: params.current, pageSize: params.pageSize })
        }
      />
      <Modal
        open={open}
        title={editing ? t('pages.agent.workflow.basicSettings') : t('pages.agent.workflow.new')}
        okText={
          editing
            ? t('pages.agent.workflow.editor.save')
            : t('pages.agent.workflow.createAndDesign')
        }
        confirmLoading={submitting}
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
      >
        <Form form={form} layout="vertical" preserve={false} onFinish={submit}>
          <Form.Item
            name="applicationId"
            label={t('pages.agent.product.application')}
            rules={[{ required: true }]}
          >
            <Select options={applicationOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('pages.agent.workflow.name')}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item
            name="code"
            label={t('pages.agent.workflow.code')}
            rules={[
              { required: true, message: t('pages.agent.workflow.codeRequired') },
              {
                pattern: /^[A-Za-z][A-Za-z0-9_-]{2,63}$/,
                message: t('pages.agent.workflow.codeInvalid'),
              },
            ]}
          >
            <Input maxLength={64} placeholder="order_fulfillment" />
          </Form.Item>
          <Form.Item name="description" label={t('pages.agent.workflow.description')}>
            <Input.TextArea maxLength={512} />
          </Form.Item>
          <Form.Item
            name="maxConcurrentInstances"
            label={t('pages.agent.workflow.maxConcurrentInstances')}
            initialValue={0}
            extra={t('pages.agent.workflow.maxConcurrentInstancesTip')}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={!!templateSource}
        title={t('pages.agent.workflow.saveAsTemplate')}
        onCancel={() => {
          setTemplateSource(undefined);
          templateForm.resetFields();
        }}
        onOk={createTemplate}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('pages.agent.workflow.name')}
            rules={[{ required: true }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label={t('pages.agent.workflow.description')}>
            <Input.TextArea maxLength={512} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={templatesOpen}
        title={t('pages.agent.workflow.templates')}
        footer={null}
        width={760}
        onCancel={() => setTemplatesOpen(false)}
      >
        <Table<WorkflowTemplate>
          rowKey="id"
          pagination={false}
          dataSource={templates}
          columns={[
            { title: t('pages.agent.workflow.name'), dataIndex: 'name' },
            {
              title: t('pages.agent.workflow.description'),
              dataIndex: 'description',
              ellipsis: true,
            },
            {
              title: t('pages.agent.workflow.action'),
              width: 110,
              render: (_, template) => (
                <a onClick={() => instantiateTemplate(template)}>
                  {t('pages.agent.workflow.useTemplate')}
                </a>
              ),
            },
          ]}
        />
      </Modal>
      <Modal
        open={versionsOpen}
        title={t('pages.agent.workflow.versions')}
        footer={<Button onClick={() => setVersionsOpen(false)}>{t('pages.common.close')}</Button>}
        width={820}
        onCancel={() => setVersionsOpen(false)}
      >
        <Select
          mode="multiple"
          maxCount={2}
          value={compareVersions as any}
          style={{ width: '100%', marginBottom: 16 }}
          placeholder={t('pages.agent.workflow.selectVersions')}
          options={versions.map((version) => ({
            value: version.versionNo,
            label: `v${version.versionNo}`,
          }))}
          onChange={(value) => compareVersion(value as number[])}
        />
        <Table<WorkflowVersion>
          rowKey="id"
          pagination={false}
          dataSource={versions}
          columns={[
            {
              title: t('pages.agent.workflow.version'),
              dataIndex: 'versionNo',
              render: (version) => `v${version}`,
            },
            {
              title: t('pages.agent.workflow.publishedAt'),
              dataIndex: 'publishedAt',
              render: (value) => (value ? new Date(Number(value)).toLocaleString() : '-'),
            },
          ]}
        />
        {versionDiff && (
          <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
            <Descriptions.Item label={t('pages.agent.workflow.diff.addedNodes')}>
              {versionDiff.addedNodeIds.join(', ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.removedNodes')}>
              {versionDiff.removedNodeIds.join(', ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.changedNodes')}>
              {versionDiff.changedNodeIds.join(', ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={t('pages.agent.workflow.diff.edges')}
            >{`${t('pages.agent.workflow.diff.added')}: ${versionDiff.addedEdgeIds.length}，${t('pages.agent.workflow.diff.removed')}: ${versionDiff.removedEdgeIds.length}`}</Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.inputSchema')}>
              {versionDiff.inputSchemaChanged ? t('pages.common.yes') : t('pages.common.no')}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agent.workflow.diff.outputSchema')}>
              {versionDiff.outputSchemaChanged ? t('pages.common.yes') : t('pages.common.no')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
};
export default WorkflowPage;
