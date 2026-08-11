import React, { useEffect, useMemo, useState } from 'react'
import { useIntl } from '@umijs/max'
import { Badge, Button, Card, Col, DatePicker, Empty, Input, Modal, Pagination, Row, Segmented, Select, Skeleton, Tooltip, Typography } from 'antd'
import { DeleteOutlined, DownloadOutlined, EyeOutlined, FileExcelOutlined, FileOutlined, FilePdfOutlined, FileTextOutlined, InboxOutlined, RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import TemporaryUrlPreviewModal from '@/components/TemporaryUrlPreviewModal'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import { createArtifactPreviewUrl, downloadAgentArtifact, getAgentArtifactList, recycleAgentArtifact, restoreAgentArtifact } from '@/services/agent/ArtifactController'
import type { AgentArtifact, AgentArtifactSearchParams } from '@/services/entity/Agent'
import './index.less'

const { RangePicker } = DatePicker
const { Text } = Typography
const DEFAULT_PAGE_SIZE = 12

const extensionOf = (fileName?: string) => fileName?.split('.').pop()?.toUpperCase() || 'FILE'
const formatBytes = (size?: number) => {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  return `${(size / (1024 ** index)).toFixed(index ? 2 : 0)} ${units[index]}`
}
const fileIcon = (fileName?: string) => {
  const extension = extensionOf(fileName)
  if (extension === 'PDF') return <FilePdfOutlined />
  if (extension === 'XLSX' || extension === 'XLS') return <FileExcelOutlined />
  if (['DOCX', 'DOC', 'MD', 'TXT'].includes(extension)) return <FileTextOutlined />
  return <FileOutlined />
}

const AgentArtifactPage: React.FC = () => {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values)
  const [recycled, setRecycled] = useState(false)
  const [keyword, setKeyword] = useState<string>()
  const [extension, setExtension] = useState<string>()
  const [agentDefinitionId, setAgentDefinitionId] = useState<string>()
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>()
  const [agentOptions, setAgentOptions] = useState<{ label: string; value: string }[]>([])
  const [records, setRecords] = useState<AgentArtifact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const query = useMemo<AgentArtifactSearchParams>(() => ({
    fileName: keyword?.trim() || undefined,
    extension,
    agentDefinitionId,
    startTime: range?.[0]?.startOf('day').valueOf(),
    endTime: range?.[1]?.endOf('day').valueOf(),
    recycled,
  }), [agentDefinitionId, extension, keyword, range, recycled])

  const load = async () => {
    setLoading(true)
    try {
      const response = await getAgentArtifactList({ ...query, current, pageSize })
      if (response.code === 200) {
        setRecords(response.data || [])
        setTotal(response.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getAgentDefinitionOptions().then(options => setAgentOptions(options.map(item => ({ label: item.label, value: String(item.value) })))).catch(() => setAgentOptions([]))
  }, [])
  useEffect(() => { load() }, [current, pageSize, query])

  const updateFilters = (callback: () => void) => { setCurrent(1); callback() }
  const reset = () => updateFilters(() => { setKeyword(undefined); setExtension(undefined); setAgentDefinitionId(undefined); setRange(null) })
  const switchView = (value: string | number) => updateFilters(() => setRecycled(value === 'recycled'))
  const recycle = (record: AgentArtifact) => {
    if (!record.id) return
    Modal.confirm({ title: t('pages.agent.artifact.deleteTitle'), content: t('pages.agent.artifact.deleteContent', { days: 30 }), okText: t('pages.agent.artifact.moveToRecycleBin'), okButtonProps: { danger: true }, onOk: async () => { const result = await recycleAgentArtifact(record.id || ''); if (result.code === 200) load() } })
  }
  const restore = async (record: AgentArtifact) => { if (record.id) { const result = await restoreAgentArtifact(record.id); if (result.code === 200) load() } }

  return <div className="agent-artifact-page">
    <Card className="agent-artifact-workspace" bordered={false}>
      <div className="agent-artifact-heading">
        <div className="agent-artifact-heading-copy">
          <span className="agent-artifact-heading-icon"><FileOutlined /><i className="agent-artifact-spark agent-artifact-spark-one" /><i className="agent-artifact-spark agent-artifact-spark-two" /></span>
          <div><h2>{t('pages.agent.artifact.title')}</h2><Text>{t('pages.agent.artifact.subtitle')}</Text></div>
        </div>
        <Segmented className="agent-artifact-segmented" value={recycled ? 'recycled' : 'active'} onChange={switchView} options={[{ label: t('pages.agent.artifact.myFiles'), value: 'active' }, { label: t('pages.agent.artifact.recycleBin'), value: 'recycled' }]} />
      </div>
      <div className="agent-artifact-filterbar">
        <Input.Search className="agent-artifact-search" allowClear prefix={<SearchOutlined />} placeholder={t('pages.agent.artifact.searchPlaceholder')} onSearch={value => updateFilters(() => setKeyword(value))} onChange={event => !event.target.value && updateFilters(() => setKeyword(undefined))} />
        <div className="agent-artifact-filter-fields">
          <Select allowClear placeholder={t('pages.agent.artifact.format')} value={extension} onChange={value => updateFilters(() => setExtension(value))} options={['PDF', 'DOCX', 'XLSX', 'TXT'].map(value => ({ label: value, value }))} />
          <Select allowClear showSearch optionFilterProp="label" placeholder={t('pages.agent.artifact.sourceAgent')} value={agentDefinitionId} onChange={value => updateFilters(() => setAgentDefinitionId(value))} options={agentOptions} />
          <RangePicker value={range} onChange={value => updateFilters(() => setRange(value as [dayjs.Dayjs, dayjs.Dayjs] | null))} />
          <Button type="link" onClick={reset}>{t('pages.agent.artifact.reset')}</Button>
        </div>
      </div>
    </Card>
    {recycled && <div className="agent-artifact-recycle-hint"><Badge status="warning" /><span>{t('pages.agent.artifact.recycleHint', { days: 30 })}</span></div>}
    {loading ? <Row gutter={[18, 18]}>{Array.from({ length: 8 }).map((_, index) => <Col key={index} xs={24} sm={12} xl={6}><Card className="agent-artifact-card"><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>)}</Row> : records.length ? <Row gutter={[18, 18]}>{records.map(record => <Col key={record.id} xs={24} sm={12} xl={6}><Card className="agent-artifact-card" bordered={false}>
      <div className="agent-artifact-card-main" style={{ display: 'grid', gridTemplateColumns: '54px minmax(0, 1fr)', columnGap: 13, alignItems: 'start' }}><span className={`agent-artifact-file-icon agent-artifact-file-icon-${extensionOf(record.fileName).toLowerCase()}`} style={{ gridColumn: 1 }}>{fileIcon(record.fileName)}</span><div className="agent-artifact-file-title" style={{ gridColumn: 2, minWidth: 0 }}><Tooltip title={record.fileName}><Text ellipsis>{record.fileName}</Text></Tooltip><span className="agent-artifact-file-type">{extensionOf(record.fileName)}</span><span className="agent-artifact-file-size">{formatBytes(record.size)}</span></div></div>
      <div className="agent-artifact-card-meta"><span>{t('pages.agent.artifact.generatedBy', { agent: record.agentDefinitionName || '-' })}</span><span>{t('pages.agent.artifact.generatedAt', { time: record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm') : '-' })}</span></div>
      {recycled && <div className="agent-artifact-card-state"><Badge status="warning" text={t('pages.agent.artifact.recycleExpiresAt', { time: record.recycleExpiresAt ? dayjs(record.recycleExpiresAt).format('YYYY-MM-DD HH:mm') : '-' })} /></div>}
      <div className="agent-artifact-card-actions">{recycled ? <Button type="link" icon={<RedoOutlined />} onClick={() => restore(record)}>{t('pages.agent.artifact.restore')}</Button> : <><TemporaryUrlPreviewModal title={record.fileName} triggerText={<><EyeOutlined /> {t('pages.common.preview')}</>} getUrl={async () => ({ code: 200, data: record.id ? await createArtifactPreviewUrl(record.id) : undefined })} /><Button type="link" icon={<DownloadOutlined />} onClick={() => record.id && downloadAgentArtifact(record.id, record.fileName)}>{t('pages.agent.artifact.download')}</Button><Button danger type="link" icon={<DeleteOutlined />} onClick={() => recycle(record)}>{t('pages.common.delete')}</Button></>}</div>
    </Card></Col>)}</Row> : <div className="agent-artifact-empty"><Empty description={t(recycled ? 'pages.agent.artifact.recycleEmpty' : 'pages.agent.artifact.empty')} /></div>}
    {!!total && <div className="agent-artifact-pagination"><Text type="secondary">{t('pages.agent.artifact.total', { total })}</Text><Pagination current={current} pageSize={pageSize} total={total} showSizeChanger showQuickJumper onChange={(nextCurrent, nextPageSize) => { setCurrent(nextCurrent); setPageSize(nextPageSize) }} /></div>}
  </div>
}

export default AgentArtifactPage
