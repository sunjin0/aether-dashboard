import React, {useRef, useState} from 'react';
import {PlusOutlined} from '@ant-design/icons';
import {ActionType, PageContainer, ProTable} from '@ant-design/pro-components';
import {Button, message, Popconfirm} from 'antd';
import {FormattedMessage, history, useAccess} from '@@/exports';
import ModelProviderForm from '@/pages/agent/model-provider/ModelProviderForm';
import {
  deleteModelProviderInfo,
  getModelProviderList,
  updateModelProviderStatus,
} from '@/services/agent/ModelProviderController';
import {getOptionList} from '@/services/sys/DictController';
import {ModelProvider, ModelProviderSearchParams} from '@/services/entity/Agent';

const ModelProviderPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const path = history.location.pathname;
  const write = permissionMap[path];

  const handleDelete = async (record: ModelProvider) => {
    if (!record.id) {
      message.error('缺少模型供应商 ID');
      return;
    }

    const {code, message: msg} = await deleteModelProviderInfo(record.id);
    if (code === 200) {
      message.success(msg || '删除成功');
      ref.current?.reload();
    } else {
      message.error(msg || '删除失败');
    }
  };

  const handleStatusChange = async (record: ModelProvider) => {
    if (!record.id) {
      message.error('缺少模型供应商 ID');
      return;
    }

    const nextStatus = record.status === 1 ? 0 : 1;
    const {code, message: msg} = await updateModelProviderStatus(record.id, {
      status: nextStatus,
    });
    if (code === 200) {
      message.success(msg || '操作成功');
      ref.current?.reload();
    } else {
      message.error(msg || '操作失败');
    }
  };

  const columns: any[] = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      valueType: 'select',
      request: async () => getOptionList('Model_Provider_Name'),
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      request: async () => getOptionList('Model_Provider_Type'),
    },
    {
      title: 'API 基础地址',
      dataIndex: 'apiBaseUrl',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '默认模型',
      dataIndex: 'defaultModel',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      request: async () => getOptionList('Agent_Status'),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      valueType: 'digit',
      hideInSearch: true,
    },
    // {
    //   title: '备注',
    //   dataIndex: 'remark',
    //   valueType: 'text',
    //   ellipsis: true,
    //   hideInSearch: true,
    // },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      render: (_: any, record: ModelProvider) =>
        write && [
          <Button
            type="link"
            key="edit"
            onClick={() => {
              setId(record.id);
              setOpen(true);
            }}
          >
            编辑
          </Button>,
          <Popconfirm
            key="status"
            title={`确认${record.status === 1 ? '禁用' : '启用'}该模型供应商？`}
            onConfirm={() => handleStatusChange(record)}
          >
            <Button type="link" key="status-button">
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="delete"
            title="确认删除该模型供应商？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" key="delete-button">
              删除
            </Button>
          </Popconfirm>,
        ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: ModelProviderSearchParams) =>
          getModelProviderList(params as ModelProviderSearchParams)
        }
        toolBarRender={() =>
          write && [
            <Button
              key="button"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined);
                setOpen(true);
              }}
            >
              <FormattedMessage id="pages.common.new" />
            </Button>,
          ]
        }
        columns={columns}
      />
      <ModelProviderForm
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

export default ModelProviderPage;
