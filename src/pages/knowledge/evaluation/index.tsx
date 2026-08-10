import React, { useEffect, useRef, useState } from 'react';
import {
  ActionType,
  DrawerForm,
  PageContainer,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { ArrowRightOutlined, PlusOutlined } from '@ant-design/icons';
import { Badge, Button, Popconfirm, Space, Tag, Typography } from 'antd';
import { history, useAccess, useIntl } from '@umijs/max';
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController';
import { Option } from '@/services/entity/Common';
import {
  EvaluationSet,
  deleteEvaluationSet,
  getEvaluationSets,
  saveEvaluationSet,
  updateEvaluationSet,
} from '@/services/knowledge/EvaluationController';
import './evaluation.less';

const { Paragraph, Text } = Typography;

type EvaluationSetForm = Pick<EvaluationSet, 'name' | 'agentDefinitionId' | 'description' | 'status'>;

export default function EvaluationSetListPage() {
  const access = useAccess();
  const intl = useIntl();
  const format = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const canWrite = Boolean(access['/knowledge/evaluation']);
  const actionRef = useRef<ActionType>();
  const [agentOptions, setAgentOptions] = useState<Option[]>([]);

  useEffect(() => {
    getAgentDefinitionOptions().then(setAgentOptions);
  }, []);

  const agentName = (agentId?: string) =>
    agentOptions.find((item) => String(item.value) === agentId)?.label || agentId || '-';

  const formFields = () => (
    <>
      <ProFormText
        name="name"
        label={format('pages.common.name')}
        placeholder={format('pages.knowledge.evaluation.setNamePlaceholder')}
        rules={[{ required: true }]}
      />
      <ProFormSelect
        name="agentDefinitionId"
        label={format('pages.knowledge.evaluation.agent')}
        placeholder={format('pages.knowledge.evaluation.selectAgent')}
        rules={[{ required: true }]}
        fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
        request={getAgentDefinitionOptions}
      />
      <ProFormTextArea
        name="description"
        label={format('pages.agent.workflow.description')}
        placeholder={format('pages.knowledge.evaluation.descriptionPlaceholder')}
        fieldProps={{ autoSize: { minRows: 3, maxRows: 6 }, maxLength: 255, showCount: true }}
      />
    </>
  );

  return (
    <PageContainer className="evaluation-page" title={format('menu.knowledge.evaluation')}>
      <section className="evaluation-intro" aria-label={format('pages.knowledge.evaluation.workflowTitle')}>
        <div className="evaluation-intro-copy">
          <Text className="evaluation-eyebrow">{format('pages.knowledge.evaluation.workspace')}</Text>
          <h2>{format('pages.knowledge.evaluation.workflowTitle')}</h2>
          <Paragraph>{format('pages.knowledge.evaluation.workflowDescription')}</Paragraph>
        </div>
        <div className="evaluation-flow" aria-label={format('pages.knowledge.evaluation.workflowTitle')}>
          {[
            ['01', 'pages.knowledge.evaluation.flow.prepare', 'pages.knowledge.evaluation.flow.prepareHint'],
            ['02', 'pages.knowledge.evaluation.flow.release', 'pages.knowledge.evaluation.flow.releaseHint'],
            ['03', 'pages.knowledge.evaluation.flow.measure', 'pages.knowledge.evaluation.flow.measureHint'],
          ].map(([index, title, hint], itemIndex) => (
            <React.Fragment key={index}>
              {itemIndex > 0 && <ArrowRightOutlined className="evaluation-flow-arrow" />}
              <div className="evaluation-flow-step">
                <span>{index}</span>
                <strong>{format(title)}</strong>
                <small>{format(hint)}</small>
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      <ProTable<EvaluationSet>
        className="evaluation-card evaluation-set-table"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        headerTitle={format('pages.knowledge.evaluation.sets')}
        options={{ density: false, fullScreen: true, reload: true, setting: true }}
        request={async (params) => {
          const response = await getEvaluationSets({
            current: params.current,
            pageSize: params.pageSize,
            name: params.name,
            agentDefinitionId: params.agentDefinitionId,
          });
          return { data: response.data || [], total: response.total || 0, success: response.code === 200 };
        }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => format('pages.knowledge.evaluation.setTotal', { total }) }}
        toolBarRender={() => [
          canWrite ? (
            <DrawerForm<EvaluationSetForm>
              key="add"
              title={format('pages.knowledge.evaluation.createSet')}
              width={520}
              drawerProps={{ destroyOnClose: true }}
              onFinish={async (values) => {
                await saveEvaluationSet(values as EvaluationSet);
                actionRef.current?.reload();
                return true;
              }}
              trigger={<Button type="primary" icon={<PlusOutlined />}>{format('pages.knowledge.evaluation.createSet')}</Button>}
            >
              {formFields()}
            </DrawerForm>
          ) : null,
        ]}
        columns={[
          {
            title: format('pages.knowledge.evaluation.setIdentity'),
            dataIndex: 'name',
            width: 320,
            render: (_, record) => (
              <div className="evaluation-set-identity">
                <strong>{record.name}</strong>
                <span>{record.description || format('pages.knowledge.evaluation.noDescription')}</span>
              </div>
            ),
          },
          {
            title: format('pages.knowledge.evaluation.targetAgent'),
            dataIndex: 'agentDefinitionId',
            valueType: 'select',
            fieldProps: { options: agentOptions, showSearch: true, optionFilterProp: 'label' },
            render: (_, record) => <span className="evaluation-agent-name">{agentName(record.agentDefinitionId)}</span>,
          },
          {
            title: format('pages.knowledge.evaluation.readiness'),
            dataIndex: 'status',
            search: false,
            width: 180,
            render: (value) => value === 1 ? (
              <Badge status="success" text={format('pages.knowledge.evaluation.readyToManage')} />
            ) : (
              <Badge status="default" text={format('pages.knowledge.evaluation.paused')} />
            ),
          },
          {
            title: format('pages.knowledge.evaluation.lastUpdated'),
            dataIndex: 'updatedAt',
            valueType: 'dateTime',
            search: false,
            width: 180,
          },
          {
            title: format('pages.common.option'),
            search: false,
            fixed: 'right',
            width: 260,
            render: (_, record) => (
              <Space size={4} wrap>
                <Button type="link" onClick={() => history.push(`/knowledge/evaluation/sets/${record.id}`)}>
                  {format('pages.knowledge.evaluation.openWorkbench')}
                </Button>
                {canWrite && (
                  <DrawerForm<EvaluationSetForm>
                    title={format('pages.knowledge.evaluation.editSet')}
                    initialValues={record}
                    width={520}
                    drawerProps={{ destroyOnClose: true }}
                    onFinish={async (values) => {
                      await updateEvaluationSet(record.id!, values as EvaluationSet);
                      actionRef.current?.reload();
                      return true;
                    }}
                    trigger={<Button type="link">{format('pages.common.edit')}</Button>}
                  >
                    {formFields()}
                    <ProFormSelect
                      name="status"
                      label={format('pages.common.status')}
                      options={[
                        { label: format('pages.knowledge.evaluation.enabled'), value: 1 },
                        { label: format('pages.knowledge.evaluation.disabled'), value: 0 },
                      ]}
                    />
                  </DrawerForm>
                )}
                {canWrite && (
                  <Popconfirm
                    title={format('pages.knowledge.evaluation.deleteSetConfirm')}
                    description={format('pages.knowledge.evaluation.deleteSetHint')}
                    onConfirm={async () => {
                      await deleteEvaluationSet(record.id!);
                      actionRef.current?.reloadAndRest?.();
                    }}
                  >
                    <Button type="link" danger>{format('pages.common.delete')}</Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
