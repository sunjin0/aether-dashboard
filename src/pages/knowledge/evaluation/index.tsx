import React, { useEffect, useRef, useState } from 'react';
import {
  ActionType,
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space } from 'antd';
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

export default function EvaluationSetListPage() {
  const access = useAccess();
  const intl = useIntl();
  const canWrite = Boolean(access['/knowledge/evaluation']);
  const actionRef = useRef<ActionType>();
  const [agentOptions, setAgentOptions] = useState<Option[]>([]);

  useEffect(() => {
    getAgentDefinitionOptions().then(setAgentOptions);
  }, []);

  return (
    <PageContainer className="evaluation-page">
      <ProTable<EvaluationSet>
        className="evaluation-card evaluation-table"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const response = await getEvaluationSets({
            current: params.current,
            pageSize: params.pageSize,
            name: params.name,
            agentDefinitionId: params.agentDefinitionId,
          });
          return {
            data: response.data || [],
            total: response.total || 0,
            success: response.code === 200,
          };
        }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total}` }}
        toolBarRender={() => [
          canWrite ? (
            <ModalForm
              key="add"
              title={intl.formatMessage({ id: 'pages.knowledge.evaluation.createSet' })}
              modalProps={{ destroyOnClose: true }}
              onFinish={async (values) => {
                await saveEvaluationSet(values as EvaluationSet);
                actionRef.current?.reload();
                return true;
              }}
              trigger={
                <Button type="primary">
                  {intl.formatMessage({ id: 'pages.knowledge.evaluation.createSet' })}
                </Button>
              }
            >
              <ProFormText
                name="name"
                label={intl.formatMessage({ id: 'pages.common.name' })}
                rules={[{ required: true }]}
              />
              <ProFormSelect
                name="agentDefinitionId"
                label={intl.formatMessage({ id: 'pages.knowledge.evaluation.agent' })}
                rules={[{ required: true }]}
                request={getAgentDefinitionOptions}
              />
              <ProFormTextArea
                name="description"
                label={intl.formatMessage({ id: 'pages.agent.workflow.description' })}
              />
            </ModalForm>
          ) : null,
        ]}
        columns={[
          { title: intl.formatMessage({ id: 'pages.common.name' }), dataIndex: 'name' },
          {
            title: intl.formatMessage({ id: 'pages.knowledge.evaluation.agent' }),
            dataIndex: 'agentDefinitionId',
            valueType: 'select',
            fieldProps: { options: agentOptions, showSearch: true, optionFilterProp: 'label' },
            render: (_, record) =>
              agentOptions.find((item) => String(item.value) === record.agentDefinitionId)?.label ||
              '-',
          },
          {
            title: intl.formatMessage({ id: 'pages.agent.workflow.description' }),
            dataIndex: 'description',
            search: false,
            ellipsis: true,
          },
          {
            title: intl.formatMessage({ id: 'pages.common.status' }),
            dataIndex: 'status',
            search: false,
            valueEnum: {
              1: {
                text: intl.formatMessage({ id: 'pages.knowledge.evaluation.enabled' }),
                status: 'Success',
              },
              0: {
                text: intl.formatMessage({ id: 'pages.knowledge.evaluation.disabled' }),
                status: 'Default',
              },
            },
          },
          {
            title: intl.formatMessage({ id: 'pages.common.createTime' }),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            search: false,
            width: 180,
          },
          {
            title: intl.formatMessage({ id: 'pages.common.updateTime' }),
            dataIndex: 'updatedAt',
            valueType: 'dateTime',
            search: false,
            width: 180,
          },
          {
            title: intl.formatMessage({ id: 'pages.common.option' }),
            search: false,
            render: (_, record) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => history.push(`/knowledge/evaluation/sets/${record.id}`)}
                >
                  {intl.formatMessage({ id: 'pages.knowledge.evaluation.manage' })}
                </Button>
                {canWrite && (
                  <ModalForm<EvaluationSet>
                    title={intl.formatMessage({ id: 'pages.common.edit' })}
                    initialValues={record}
                    modalProps={{ destroyOnClose: true }}
                    onFinish={async (values) => {
                      await updateEvaluationSet(record.id!, values);
                      actionRef.current?.reload();
                      return true;
                    }}
                    trigger={
                      <Button type="link">{intl.formatMessage({ id: 'pages.common.edit' })}</Button>
                    }
                  >
                    <ProFormText
                      name="name"
                      label={intl.formatMessage({ id: 'pages.common.name' })}
                      rules={[{ required: true }]}
                    />
                    <ProFormSelect
                      name="agentDefinitionId"
                      label={intl.formatMessage({ id: 'pages.knowledge.evaluation.agent' })}
                      rules={[{ required: true }]}
                      request={getAgentDefinitionOptions}
                    />
                    <ProFormTextArea
                      name="description"
                      label={intl.formatMessage({ id: 'pages.agent.workflow.description' })}
                    />
                    <ProFormSelect
                      name="status"
                      label={intl.formatMessage({ id: 'pages.common.status' })}
                      options={[
                        {
                          label: intl.formatMessage({ id: 'pages.knowledge.evaluation.enabled' }),
                          value: 1,
                        },
                        {
                          label: intl.formatMessage({ id: 'pages.knowledge.evaluation.disabled' }),
                          value: 0,
                        },
                      ]}
                    />
                  </ModalForm>
                )}
                {canWrite && (
                  <Popconfirm
                    title={intl.formatMessage({ id: 'pages.common.delete' })}
                    onConfirm={async () => {
                      await deleteEvaluationSet(record.id!);
                      actionRef.current?.reloadAndRest?.();
                    }}
                  >
                    <Button type="link" danger>
                      {intl.formatMessage({ id: 'pages.common.delete' })}
                    </Button>
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
