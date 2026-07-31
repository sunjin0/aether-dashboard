import React, { useRef, useState } from 'react';
import { history, useIntl } from '@umijs/max';
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components';
import { Button, Form, Input, Modal, Popconfirm, Space, Tag, message } from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import {
  AgentWorkflow,
  createWorkflow,
  deleteWorkflow,
  getWorkflowList,
  offlineWorkflow,
  publishWorkflow,
} from '@/services/agent/WorkflowController';

const WorkflowPage: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const ref = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const create = async () => {
    const result = await createWorkflow(form.getFieldsValue());
    if (result.code === 200 && result.data) {
      message.success('草稿已创建');
      setOpen(false);
      history.push(`/agent/workflow/${result.data}`);
    } else message.error(result.message || '创建失败');
  };
  const action = async (record: AgentWorkflow, fn: (id: string) => Promise<any>, text: string) => {
    if (!record.id) return;
    const result = await fn(record.id);
    if (result.code === 200) {
      message.success(text);
      ref.current?.reload();
    } else message.error(result.message || '操作失败');
  };
  return (
    <PageContainer
      header={{ title: t('pages.agent.workflow.title'), breadcrumb: undefined }}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t('pages.agent.workflow.new')}
        </Button>
      }
    >
      <ProTable<AgentWorkflow>
        actionRef={ref}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        options={{ reload: true }}
        columns={[
          {
            title: t('pages.agent.workflow.name'),
            dataIndex: 'name',
            render: (_, r) => (
              <a onClick={() => history.push(`/agent/workflow/${r.id}`)}>{r.name}</a>
            ),
          },
          {
            title: t('pages.agent.workflow.description'),
            dataIndex: 'description',
            ellipsis: true,
            hideInSearch: true,
          },
          {
            title: t('pages.agent.workflow.status'),
            dataIndex: 'status',
            valueType: 'select',
            valueEnum: {
              0: t('pages.agent.workflow.status.draft'),
              1: t('pages.agent.workflow.status.published', { version: 1 }),
              2: t('pages.agent.workflow.status.offline'),
            },
            render: (_, r) => (
              <Tag color={r.status === 1 ? 'green' : r.status === 2 ? 'default' : 'orange'}>
                {r.status === 1
                  ? t('pages.agent.workflow.status.published', {
                      version: r.publishedVersion ?? '-',
                    })
                  : r.status === 2
                    ? t('pages.agent.workflow.status.offline')
                    : t('pages.agent.workflow.status.draft')}
              </Tag>
            ),
          },
          {
            title: t('pages.agent.workflow.action'),
            valueType: 'option',
            render: (_, r) => (
              <Space>
                <a onClick={() => history.push(`/agent/workflow/${r.id}`)}>
                  {t('pages.agent.workflow.action.edit')}
                </a>
                <a onClick={() => history.push(`/agent/workflow/${r.id}/run`)}>
                  <PlayCircleOutlined /> {t('pages.agent.workflow.action.start')}
                </a>
                {r.status !== 1 && (
                  <a
                    onClick={() =>
                      action(r, publishWorkflow, t('pages.agent.workflow.action.publish'))
                    }
                  >
                    {t('pages.agent.workflow.action.publish')}
                  </a>
                )}
                {r.status === 1 && (
                  <a
                    onClick={() =>
                      action(r, offlineWorkflow, t('pages.agent.workflow.status.offline'))
                    }
                  >
                    {t('pages.agent.workflow.action.offline')}
                  </a>
                )}
                <Popconfirm
                  title="确认删除该工作流？"
                  onConfirm={() => action(r, deleteWorkflow, '已删除')}
                >
                  <a>{t('pages.agent.workflow.action.delete')}</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        request={(params) =>
          getWorkflowList({ ...params, current: params.current, pageSize: params.pageSize })
        }
      />
      <Modal
        open={open}
        title={t('pages.agent.workflow.new')}
        onCancel={() => setOpen(false)}
        onOk={create}
      >
        <Form form={form} layout="vertical">
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
    </PageContainer>
  );
};
export default WorkflowPage;
