import KnowledgeBaseForm from '@/pages/knowledge/base/KnowledgeBaseForm';
import {
  deleteKnowledgeBase,
  getKnowledgeBaseList,
} from '@/services/knowledge/KnowledgeBaseController';
import { KnowledgeBase, KnowledgeBaseSearchParams } from '@/services/entity/Agent';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess, useIntl } from '@@/exports';
import { Alert, Button, message, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getIndexStatus, getSwitchStatus } from '@/pages/agent/knowledge-base/status';
import TableActionMenu from '@/components/TableActionMenu';

const KnowledgeBasePage: React.FC = () => {
  const ref = useRef<ActionType>();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string>();
  const permissions = useAccess();
  const write = permissions[history.location.pathname];
  const intl = useIntl();

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      valueType: 'string',
      width: 200,
      copyable: true,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.base.scope' }),
      dataIndex: 'scope',
      valueType: 'select',
      valueEnum: {
        PLATFORM: { text: intl.formatMessage({ id: 'pages.knowledge.base.scope.platform' }) },
        AGENT: { text: intl.formatMessage({ id: 'pages.knowledge.base.scope.agentOnly' }) },
      },
    },
    { title: intl.formatMessage({ id: 'pages.common.name' }), dataIndex: 'name', ellipsis: true },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.base.visibility' }),
      dataIndex: 'visibility',
      valueType: 'select',
      valueEnum: {
        platform: { text: intl.formatMessage({ id: 'pages.knowledge.base.visibility.platform' }) },
        private: { text: intl.formatMessage({ id: 'pages.knowledge.base.visibility.private' }) },
        shared: { text: intl.formatMessage({ id: 'pages.knowledge.base.visibility.shared' }) },
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.common.description' }),
      dataIndex: 'description',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.status' }),
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: intl.formatMessage({ id: 'pages.knowledge.base.status.disabled' }) },
        1: { text: intl.formatMessage({ id: 'pages.knowledge.base.status.enabled' }) },
      },
      render: (_: unknown, record: KnowledgeBase) => {
        const item = getSwitchStatus(record.status);
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.knowledge.document.indexStatus' }),
      dataIndex: 'indexStatus',
      valueType: 'select',
      valueEnum: {
        0: { text: intl.formatMessage({ id: 'pages.knowledge.base.indexStatus.notIndexed' }) },
        1: { text: intl.formatMessage({ id: 'pages.knowledge.base.indexStatus.indexing' }) },
        2: { text: intl.formatMessage({ id: 'pages.knowledge.base.indexStatus.indexed' }) },
      },
      render: (_: unknown, record: KnowledgeBase) => {
        const item = getIndexStatus(record.indexStatus);
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.common.createTime' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.updateTime' }),
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.common.option' }),
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 250,
      render: (_: unknown, record: KnowledgeBase) =>
        write && (
          <TableActionMenu
            key="actions"
            items={[
              {
                key: 'documents',
                label: intl.formatMessage({ id: 'pages.knowledge.base.documents' }),
                primary: true,
                onClick: () =>
                  history.push(
                    `/knowledge/document?knowledgeBaseId=${record.id}&knowledgeBaseName=${encodeURIComponent(record.name || '')}`,
                  ),
              },
              {
                key: 'edit',
                label: intl.formatMessage({ id: 'pages.knowledge.base.edit' }),
                primary: true,
                onClick: () => {
                  setId(record.id);
                  setOpen(true);
                },
              },
              {
                key: 'delete',
                label: intl.formatMessage({ id: 'pages.knowledge.base.delete' }),
                primary: true,
                danger: true,
                confirm: {
                  title: intl.formatMessage({ id: 'pages.knowledge.base.deleteConfirm' }),
                },
                onClick: () => {
                  if (record.id != null) {
                    deleteKnowledgeBase(record.id).then(() => {
                      message.success(
                        intl.formatMessage({ id: 'pages.knowledge.base.deleteSuccess' }),
                      );
                      ref.current?.reload();
                    });
                  }
                },
              },
            ]}
          />
        ),
    },
  ];

  return (
    <PageContainer>
      <Alert
        showIcon
        type="info"
        message={intl.formatMessage({ id: 'pages.knowledge.base.indexingInfo' })}
        style={{ marginBottom: 16 }}
      />
      <ProTable<KnowledgeBase>
        actionRef={ref}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1300 }}
        request={(params: KnowledgeBaseSearchParams) => getKnowledgeBaseList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="new"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined);
                setOpen(true);
              }}
            >
              {intl.formatMessage({ id: 'pages.knowledge.base.create' })}
            </Button>,
          ]
        }
      />{' '}
      <KnowledgeBaseForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined);
          ref.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default KnowledgeBasePage;
