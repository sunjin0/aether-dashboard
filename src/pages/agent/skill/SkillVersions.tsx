import React, { useEffect, useState } from 'react'
import { Drawer, Table, Tag } from 'antd'
import { useIntl } from '@umijs/max'
import { getSkillVersions } from '@/services/agent/SkillController'
import { AgentSkillVersion } from '@/services/entity/Agent'

interface SkillVersionsProps {
  id?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SkillVersions: React.FC<SkillVersionsProps> = ({ id, open, setOpen }) => {
  const intl = useIntl()
  const format = (key: string, values?: Record<string, number | string>) =>
    intl.formatMessage({ id: key }, values)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<AgentSkillVersion[]>([])

  useEffect(() => {
    if (!open || !id) return
    setLoading(true)
    getSkillVersions(id)
      .then(({ data }) => setVersions(data || []))
      .finally(() => setLoading(false))
  }, [id, open])

  const columns = [
    {
      title: format('pages.agent.skill.versionNo'),
      dataIndex: 'versionNo',
      width: 100,
      render: (value?: number) => (value == null ? '-' : `v${value}`),
    },
    {
      title: format('pages.agent.skill.versionStatus'),
      dataIndex: 'status',
      width: 120,
      render: (value?: number) =>
        value === 1 ? (
          <Tag color="green">{format('pages.agent.skill.published')}</Tag>
        ) : (
          <Tag color="orange">{format('pages.agent.skill.draft')}</Tag>
        ),
    },
    {
      title: format('pages.agent.skill.changeNote'),
      dataIndex: 'changeNote',
      render: (value?: string) => value || '-',
    },
    {
      title: format('pages.agent.skill.publishedAt'),
      dataIndex: 'publishedAt',
      width: 180,
      render: (value?: number) =>
        value == null
          ? '-'
          : format('pages.agent.skill.publishedAtValue', {
            time: new Date(value).toLocaleString(intl.locale),
          }),
    },
  ]

  return (
    <Drawer
      title={format('pages.agent.skill.versions')}
      open={open}
      onClose={() => setOpen(false)}
      width={640}
      destroyOnClose
    >
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        dataSource={versions}
        columns={columns}
      />
    </Drawer>
  )
}

export default SkillVersions
