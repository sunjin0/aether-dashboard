import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Modal, Popconfirm, Space } from 'antd';
import type { MenuProps } from 'antd';
import React from 'react';
import { useIntl } from '@umijs/max';

export interface TableActionItem {
  key: string;
  label: React.ReactNode;
  onClick: () => void | Promise<void>;
  visible?: boolean;
  primary?: boolean;
  danger?: boolean;
  loading?: boolean;
  confirm?: { title: React.ReactNode; description?: React.ReactNode };
}

interface TableActionMenuProps {
  items: TableActionItem[];
  maxPrimary?: number;
}

const TableActionMenu: React.FC<TableActionMenuProps> = ({ items, maxPrimary = 3 }) => {
  const intl = useIntl();
  const visibleItems = items.filter((item) => item.visible !== false);
  const primaryItems = visibleItems.filter((item) => item.primary).slice(0, maxPrimary);
  const primaryKeys = new Set(primaryItems.map((item) => item.key));
  const moreItems = visibleItems.filter((item) => !primaryKeys.has(item.key));
  const menuItems: MenuProps['items'] = moreItems.map((item) => ({
    key: item.key,
    danger: item.danger,
    label: item.label,
    onClick: item.confirm
      ? () =>
          Modal.confirm({
            title: item.confirm!.title,
            content: item.confirm!.description,
            onOk: item.onClick,
          })
      : item.onClick,
  }));

  return (
    <Space size={0} wrap>
      {primaryItems.map((item) =>
        item.confirm ? (
          <Popconfirm
            key={item.key}
            title={item.confirm.title}
            description={item.confirm.description}
            onConfirm={item.onClick}
          >
            <Button type="link" danger={item.danger} loading={item.loading}>
              {item.label}
            </Button>
          </Popconfirm>
        ) : (
          <Button
            key={item.key}
            type="link"
            danger={item.danger}
            loading={item.loading}
            onClick={item.onClick}
          >
            {item.label}
          </Button>
        ),
      )}
      {moreItems.length > 0 && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button type="link">
            {intl.formatMessage({ id: 'components.tableActionMenu.more' })} <DownOutlined />
          </Button>
        </Dropdown>
      )}
    </Space>
  );
};

export default TableActionMenu;
