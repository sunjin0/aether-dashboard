import React, { useEffect, useState } from 'react';
import { history, useIntl, useParams } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Space,
  Steps,
  Tag,
  message,
} from 'antd';
import {
  getWorkflow,
  getWorkflowInstance,
  startWorkflow,
  answerWorkflow,
  retryWorkflow,
  terminateWorkflow,
  AgentWorkflow,
  WorkflowInstance,
} from '@/services/agent/WorkflowController';
import FormattedContent from '@/components/FormattedContent';

const statusColor: Record<string, string> = {
  RUNNING: 'processing',
  WAITING_USER: 'warning',
  FAILED: 'error',
  COMPLETED: 'success',
  TERMINATED: 'default',
  PENDING: 'default',
};
const RunPage: React.FC = () => {
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<AgentWorkflow>();
  const [instance, setInstance] = useState<WorkflowInstance>();
  const [form] = Form.useForm();
  const [answerForm] = Form.useForm();
  const [starting, setStarting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [acting, setActing] = useState(false);
  useEffect(() => {
    if (id) getWorkflow(id).then((r) => r.data && setWorkflow(r.data));
  }, [id]);
  const fields = (() => {
    try {
      return JSON.parse(workflow?.inputSchema || '[]');
    } catch {
      return [];
    }
  })();
  const load = (instanceId: string) =>
    getWorkflowInstance(instanceId).then((r) => {
      if (r.code === 200) setInstance(r.data);
    });
  useEffect(() => {
    if (!instance || ['COMPLETED', 'FAILED', 'TERMINATED'].includes(instance.status)) return;
    const timer = window.setInterval(() => load(instance.id), 2000);
    return () => window.clearInterval(timer);
  }, [instance?.id, instance?.status]);
  const start = async () => {
    if (!id) return;
    setStarting(true);
    try {
      const result = await startWorkflow(id, form.getFieldsValue());
      if (result.code === 200 && result.data) {
        message.success('流程已启动');
        load(result.data);
      } else message.error(result.message || '启动失败');
    } finally {
      setStarting(false);
    }
  };
  const answer = async () => {
    if (!instance) return;
    setAnswering(true);
    try {
      const node = instance.nodes?.find((item) => item.status === 'WAITING_USER');
      const config = node?.interactionConfig ? JSON.parse(node.interactionConfig) : {};
      const result = await answerWorkflow(
        instance.id,
        config.type === 'mcp_tool_approval'
          ? { decision: answerForm.getFieldValue('decision') }
          : answerForm.getFieldsValue(),
      );
      if (result.code === 200) {
        message.success('已提交');
        answerForm.resetFields();
        load(instance.id);
      } else message.error(result.message || '提交失败');
    } finally {
      setAnswering(false);
    }
  };
  const act = async (action: () => Promise<void>) => {
    setActing(true);
    try {
      await action();
    } finally {
      setActing(false);
    }
  };
  const graphNodes = (() => {
    try {
      const nodes = JSON.parse(instance?.versionNodes || workflow?.nodes || '[]');
      const edges = JSON.parse(instance?.versionEdges || workflow?.edges || '[]');
      if (!Array.isArray(nodes) || !Array.isArray(edges)) return Array.isArray(nodes) ? nodes : [];
      const byId = new Map(nodes.map((node: any) => [node.id, node]));
      const next = new Map(edges.map((edge: any) => [edge.source, edge.target]));
      const ordered: any[] = [];
      const visited = new Set<string>();
      let current = nodes.find((node: any) => node.type === 'start')?.id;
      while (current && byId.has(current) && !visited.has(current)) {
        visited.add(current);
        ordered.push(byId.get(current));
        current = next.get(current);
      }
      // 已发布历史数据可能不完整，仍展示未连入主链的节点，但放在主流程之后。
      nodes.forEach((node: any) => {
        if (!visited.has(node.id)) ordered.push(node);
      });
      return ordered;
    } catch {
      return [];
    }
  })();
  return (
    <PageContainer
      header={{ title: t('pages.agent.workflow.run.title'), breadcrumb: undefined }}
      extra={<Button onClick={() => history.push(`/agent/workflow/${id}`)}>返回编排</Button>}
    >
      <Card title={t('pages.agent.workflow.run.startForm')} style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          {fields.map((field: any) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label || field.name}
              rules={field.required ? [{ required: true }] : []}
            >
              <Input placeholder={field.placeholder} />
            </Form.Item>
          ))}
          <Button
            type="primary"
            loading={starting}
            onClick={start}
            disabled={workflow?.status !== 1}
          >
            启动已发布版本
          </Button>
          {workflow?.status !== 1 && (
            <span style={{ marginLeft: 12, color: '#fa8c16' }}>请先发布工作流</span>
          )}
        </Form>
      </Card>
      {instance && (
        <>
          <Card
            title={t('pages.agent.workflow.run.status')}
            extra={
              <Tag color={statusColor[instance.status]}>
                {t(`pages.agent.workflow.run.status.${instance.status}`)}
              </Tag>
            }
          >
            <Descriptions column={2}>
              <Descriptions.Item label="实例 ID">{instance.id}</Descriptions.Item>
              <Descriptions.Item label="当前节点">
                {instance.currentNodeId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="错误">{instance.errorMessage || '-'}</Descriptions.Item>
            </Descriptions>
            <Steps
              direction="vertical"
              size="small"
              current={Math.max(
                0,
                graphNodes.findIndex((node: any) => node.id === instance.currentNodeId),
              )}
              items={graphNodes.map((node: any) => {
                const log = instance.nodes?.find((item) => item.nodeId === node.id);
                const nodeName = node.name || t(`pages.agent.workflow.run.node.${node.type}`);
                const nodeStatus = log?.status || 'PENDING';
                return {
                  title: nodeName,
                  description: (
                    <Space direction="vertical">
                      <Tag color={statusColor[nodeStatus]}>
                        {t(`pages.agent.workflow.run.status.${nodeStatus}`)}
                      </Tag>
                      {log?.outputData && <FormattedContent content={log.outputData} />}
                      {log?.errorMessage && (
                        <span style={{ color: '#ff4d4f' }}>{log.errorMessage}</span>
                      )}
                    </Space>
                  ),
                };
              })}
            />
          </Card>
          {instance.status === 'WAITING_USER' && (
            <Card title="等待人工操作" style={{ marginTop: 16 }}>
              <Form form={answerForm} layout="vertical">
                {(() => {
                  const node = instance.nodes?.find((item) => item.status === 'WAITING_USER');
                  const config = node?.interactionConfig ? JSON.parse(node.interactionConfig) : {};
                  return config.type === 'mcp_tool_approval' ? (
                    <>
                      <p>{config.question || '请确认 MCP 工具调用'}</p>
                      {config.arguments && <FormattedContent content={config.arguments} />}
                      <Form.Item name="decision" rules={[{ required: true }]}>
                        <Input placeholder="once、allow_10m 或 reject" />
                      </Form.Item>
                    </>
                  ) : (
                    <>
                      <p>{config.question || '请补充信息'}</p>
                      <Form.Item name="answer" rules={[{ required: true }]}>
                        <Input.TextArea />
                      </Form.Item>
                    </>
                  );
                })()}
                <Button type="primary" loading={answering} onClick={answer}>
                  提交并继续
                </Button>
              </Form>
            </Card>
          )}
          {instance.status === 'FAILED' && (
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                loading={acting}
                onClick={() =>
                  act(async () => {
                    await retryWorkflow(instance.id);
                    load(instance.id);
                  })
                }
              >
                重试失败节点
              </Button>
              <Button
                danger
                loading={acting}
                onClick={() =>
                  act(async () => {
                    await terminateWorkflow(instance.id);
                    load(instance.id);
                  })
                }
              >
                终止流程
              </Button>
            </Space>
          )}
        </>
      )}
    </PageContainer>
  );
};
export default RunPage;
