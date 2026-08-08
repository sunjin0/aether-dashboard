import React, { useEffect, useState } from 'react'
import { Descriptions, Drawer, Empty, Space, Spin, Table, Tag, Typography } from 'antd'
import { useIntl } from '@umijs/max'
import { getSkillDetail } from '@/services/agent/SkillController'
import { AgentSkillDetail } from '@/services/entity/Agent'
import { loadKnowledgeBaseOptions, loadToolOptions } from './options'

interface SkillDetailProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const { Paragraph, Text } = Typography

const SkillDetail: React.FC<SkillDetailProps> = ({ id, open, setOpen }) => {
  const intl = useIntl()
  const format = (key: string, values?: Record<string, string>) =>
    intl.formatMessage({ id: key }, values)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<AgentSkillDetail>({})
  const [toolNames, setToolNames] = useState<Record<string, string>>({})
  const [kbNames, setKbNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open || !id) return
    setLoading(true)
    setDetail({})
    Promise.all([
      getSkillDetail(id),
      loadToolOptions(),
      loadKnowledgeBaseOptions(),
    ])
      .then(([detailRes, tools, bases]) => {
        setDetail(detailRes.data || {})
        setToolNames(
          Object.fromEntries(tools.map((item) => [String(item.value), item.label])),
        )
        setKbNames(
          Object.fromEntries(bases.map((item) => [String(item.value), item.label])),
        )
      })
      .finally(() => setLoading(false))
  }, [id, open])

  const toolColumns = [
    {
      title: format('pages.agent.skill.tool'),
      dataIndex: 'toolId',
      render: (value: string) => toolNames[value] || value || '-',
    },
    {
      title: format('pages.agent.skill.required'),
      dataIndex: 'required',
      width: 100,
      render: (value: boolean) =>
        value ? <Tag color="red">{format('pages.agent.skill.required')}</Tag> : null,
    },
    {
      title: format('pages.agent.tool.priority'),
      dataIndex: 'priority',
      width: 100,
    },
  ]

  const kbColumns = [
    {
      title: format('pages.agent.knowledgeBase.name'),
      dataIndex: 'knowledgeBaseId',
      render: (value: string) => kbNames[value] || value || '-',
    },
  ]

  const resourceColumns = [
    { title: format('pages.agent.skill.resourceName'), dataIndex: 'name' },
    {
      title: format('pages.agent.skill.resourceType'),
      dataIndex: 'type',
      width: 140,
      render: (value: string) => value || '-',
    },
    {
      title: format('pages.agent.skill.resourceSize'),
      dataIndex: 'size',
      width: 120,
      render: (value?: number) => (value == null ? '-' : `${value}`),
    },
    {
      title: format('pages.agent.skill.resourceStatus'),
      dataIndex: 'status',
      width: 120,
      render: (value?: number) =>
        value === 1 ? (
          <Tag color="green">{format('pages.common.enabled')}</Tag>
        ) : (
          <Tag>{format('pages.common.disabled')}</Tag>
        ),
    },
  ]

  return (
    <Drawer
      title={format('pages.agent.skill.detail')}
      open={open}
      onClose={() => setOpen(false)}
      width={760}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {detail.skill ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions
              column={2}
              bordered
              size="small"
              title={format('pages.agent.skill.basicInfo')}
            >
              <Descriptions.Item label={format('pages.agent.skill.name')}>
                {detail.skill.name}
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.code')}>
                {detail.skill.code}
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.category')}>
                {detail.skill.category || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.status')}>
                {detail.skill.status === 1 ? (
                  <Tag color="green">{format('pages.common.enabled')}</Tag>
                ) : (
                  <Tag>{format('pages.common.disabled')}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.tags')} span={2}>
                {detail.skill.tags || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.description')} span={2}>
                {detail.skill.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions column={1} bordered size="small" title={format('pages.agent.skill.draftInfo')}>
              <Descriptions.Item label={format('pages.agent.skill.draftStatus')}>
                {detail.draft ? (
                  <Tag color="orange">{format('pages.agent.skill.draftExists')}</Tag>
                ) : (
                  <Tag>{format('pages.agent.skill.noDraft')}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.instruction')}>
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {(detail.draft || detail.currentVersion)?.instruction || '-'}
                </Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.toolPolicy')}>
                {(detail.draft || detail.currentVersion)?.toolPolicy || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions column={1} bordered size="small" title={format('pages.agent.skill.currentVersionInfo')}>
              <Descriptions.Item label={format('pages.agent.skill.versionNo')}>
                {detail.currentVersion?.versionNo ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label={format('pages.agent.skill.changeNote')}>
                {detail.currentVersion?.changeNote || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Text strong>{format('pages.agent.skill.tools')}</Text>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.tools || []}
              columns={toolColumns}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />

            <Text strong>{format('pages.agent.skill.knowledgeBaseIds')}</Text>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.knowledgeBases || []}
              columns={kbColumns}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />

            <Text strong>{format('pages.agent.skill.resources')}</Text>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.resources || []}
              columns={resourceColumns}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Space>
        ) : (
          !loading && <Empty />
        )}
      </Spin>
    </Drawer>
  )
}

export default SkillDetail
