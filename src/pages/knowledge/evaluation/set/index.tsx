import React, { useEffect, useRef, useState } from 'react'
import {
  PageContainer,
  ProFormInstance,
  ProFormSelect,
  ProFormTextArea,
  ProFormDependency,
} from '@ant-design/pro-components'
import DrawerForm from '@/components/DrawerForm'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Tooltip,
} from 'antd'
import { history, useAccess, useIntl, useParams } from '@umijs/max'
import {
  EvaluationCase,
  EvaluationHealth,
  EvaluationCaseTransfer,
  EvaluationImportPreview,
  EvaluationLabel,
  EvaluationRunComparison,
  EvaluationRunProgress,
  EvaluationRun,
  EvaluationSet,
  EvaluationSetVersion,
  batchDeleteEvaluationCaseLabels,
  batchDeleteEvaluationCases,
  deleteEvaluationCaseLabel,
  deleteEvaluationCase,
  exportEvaluationCases,
  getEvaluationCases,
  getEvaluationDocuments,
  getEvaluationDocumentSections,
  getEvaluationDocumentChunks,
  getEvaluationCaseLabels,
  importEvaluationCases,
  getEvaluationWorkbench,
  cancelEvaluationRun,
  compareEvaluationRuns,
  createEvaluationRun,
  getEvaluationRunProgress,
  retryEvaluationRunFailures,
  publishEvaluationSetVersion,
  previewEvaluationCaseImport,
  saveEvaluationCase,
  saveEvaluationCaseLabel,
  updateEvaluationCase,
  updateEvaluationCaseStatuses,
  setEvaluationRunBaseline,
} from '@/services/knowledge/EvaluationController'
import { getModelCatalogOptions } from '@/services/agent/ModelProviderController'
import '../evaluation.less'
const pct = (v?: number) => (v === undefined ? '-' : `${(v * 100).toFixed(1)}%`)
type RetrievalConfigSnapshot = {
  knowledgeBases?: Array<{
    name?: string
    scope?: string
    embeddingModelId?: string
    retrievalConfig?: Record<string, unknown> | string
  }>
  models?: Array<{ id?: string; name?: string; providerId?: string; capabilities?: string }>
}
export default function EvaluationPage() {
  const access = useAccess()
  const intl = useIntl()
  const { setId } = useParams<{ setId: string }>()
  const evaluationStatus = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.status.${value || 'UNKNOWN'}` })
  const targetType = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.targetType.${value || 'DOCUMENT'}` })
  const metricTitle = (metric: 'recallAtK' | 'mrr' | 'ndcg') => (
    <Tooltip title={intl.formatMessage({ id: `pages.knowledge.evaluation.metric.${metric}.tip` })}>
      <span>{intl.formatMessage({ id: `pages.knowledge.evaluation.metric.${metric}` })}</span>
    </Tooltip>
  )
  const canWrite = Boolean(access['/knowledge/evaluation'])
  const [selected, setSelected] = useState<EvaluationSet>(),
    [runs, setRuns] = useState<EvaluationRun[]>([]),
    [cases, setCases] = useState<EvaluationCase[]>([]),
    [compareRunIds, setCompareRunIds] = useState<React.Key[]>([]),
    [progress, setProgress] = useState<EvaluationRunProgress>(),
    [comparison, setComparison] = useState<EvaluationRunComparison>(),
    [health, setHealth] = useState<EvaluationHealth>(),
    [versions, setVersions] = useState<EvaluationSetVersion[]>([]),
    [trend, setTrend] = useState<EvaluationRun[]>([]),
    [runVersionId, setRunVersionId] = useState<string>(),
    [configRun, setConfigRun] = useState<EvaluationRun>(),
    [modelOptionNames, setModelOptionNames] = useState<Record<string, string>>({}),
    [documentNames, setDocumentNames] = useState<Record<string, string>>({}),
    [chunkNames, setChunkNames] = useState<Record<string, string>>({}),
    [workspaceTab, setWorkspaceTab] = useState<'dataset' | 'runs'>('dataset'),
    [startingRun, setStartingRun] = useState(false),
    [labelCase, setLabelCase] = useState<EvaluationCase>(),
    [labels, setLabels] = useState<EvaluationLabel[]>([]),
    [labelIds, setLabelIds] = useState<React.Key[]>([]),
    [editingCase, setEditingCase] = useState<EvaluationCase>(),
    [caseIds, setCaseIds] = useState<React.Key[]>([]),
    [importItems, setImportItems] = useState<EvaluationCaseTransfer[]>([]),
    [importPreview, setImportPreview] = useState<EvaluationImportPreview>()
  const selectedRef = useRef<EvaluationSet>()
  const importInputRef = useRef<HTMLInputElement>(null)
  const labelFormRef = useRef<ProFormInstance>()
  const healthIssue = (code: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.health.${code}` })
  const documentName = (id?: string) =>
    id ? (documentNames[id] ? `${documentNames[id]}（${id}）` : id) : '-'
  const chunkName = (id?: string) =>
    id ? (chunkNames[id] ? `${chunkNames[id]}（${id}）` : id) : '-'
  const parseRetrievalConfig = (snapshot?: string): RetrievalConfigSnapshot | undefined => {
    if (!snapshot) return undefined
    try {
      return JSON.parse(snapshot)
    } catch {
      return undefined
    }
  }
  const renderRetrievalConfig = (run?: EvaluationRun) => {
    const snapshot = parseRetrievalConfig(run?.retrievalConfigSnapshot)
    if (!snapshot?.knowledgeBases?.length) {
      return <Alert type="info" showIcon message={intl.formatMessage({ id: 'pages.knowledge.evaluation.configSnapshotUnavailable' })} />
    }
    const modelNames = new Map(snapshot.models?.map((model) => [model.id, model.name]))
    Object.entries(modelOptionNames).forEach(([id, name]) => modelNames.set(id, name))
    const modelName = (id?: string) =>
      id ? modelNames.get(id) || intl.formatMessage({ id: 'pages.knowledge.evaluation.providerUnavailable' }) : '-'
    const value = (input: unknown) => {
      if (typeof input === 'boolean') return intl.formatMessage({ id: input ? 'pages.common.yes' : 'pages.common.no' })
      return input === undefined || input === null || input === '' ? '-' : String(input)
    }
    const field = (key: string, input: unknown) => ({
      key,
      label: intl.formatMessage({ id: `pages.knowledge.base.form.retrieval.${key}` }),
      children: value(input),
    })
    return (
      <Space direction="vertical" size={12} style={{ display: 'flex' }}>
        {snapshot.knowledgeBases.map((base, index) => {
          let config: Record<string, unknown> = {}
          if (typeof base.retrievalConfig === 'string') {
            try {
              config = JSON.parse(base.retrievalConfig)
            } catch {
              config = {}
            }
          } else config = base.retrievalConfig || {}
          const retrievalFields = [
            field('embeddingProvider', modelName(base.embeddingModelId)),
            field('topK', config.topK),
            field('minSimilarity', config.minSimilarity),
            field('maxChunksPerDocument', config.maxChunksPerDocument),
            field('strictGrounding', config.strictGrounding),
          ].filter((item) => item.children !== '-')
          const enhancementFields = [
            field('hybridEnabled', config.hybridEnabled),
            field('queryRewriteEnabled', config.queryRewriteEnabled ?? false),
            field('queryRewriteProvider', modelName(config.queryRewriteModelId as string | undefined)),
            field('vectorWeight', config.vectorWeight),
            field('minLexicalScore', config.minLexicalScore),
          ].filter((item) => item.children !== '-')
          const rankingFields = [
            field('authorityScore', config.authorityScore),
            field('authorityWeight', config.authorityWeight),
            field('freshnessWeight', config.freshnessWeight),
            field('rerankEnabled', config.rerankEnabled),
            field('rerankProvider', modelName(config.rerankModelId as string | undefined)),
            field('rerankTopN', config.rerankTopN),
          ].filter((item) => item.children !== '-')
          return (
            <Card
              key={`${base.name || 'knowledge-base'}-${index}`}
              size="small"
              title={base.name || intl.formatMessage({ id: 'pages.knowledge.evaluation.knowledgeBase' })}
            >
              <div className="evaluation-config-snapshot-grid">
                <section>
                  <h4>{intl.formatMessage({ id: 'pages.knowledge.base.form.retrieval.retrievalSettings' })}</h4>
                  <Descriptions column={2} size="small" items={retrievalFields} />
                </section>
                <section>
                  <h4>{intl.formatMessage({ id: 'pages.knowledge.base.form.retrieval.queryEnhancement' })}</h4>
                  <Descriptions column={2} size="small" items={enhancementFields} />
                </section>
                <section>
                  <h4>{intl.formatMessage({ id: 'pages.knowledge.base.form.retrieval.rankingSettings' })}</h4>
                  <Descriptions column={2} size="small" items={rankingFields} />
                </section>
              </div>
            </Card>
          )
        })}
      </Space>
    )
  }
  useEffect(() => {
    if (!setId) return
    setSelected(undefined)
    setCases([])
    setRuns([])
    setHealth(undefined)
    setVersions([])
    setTrend([])
    setProgress(undefined)
    setCompareRunIds([])
    setComparison(undefined)
    selectedRef.current = undefined
    open(setId)
      .catch(() => history.replace('/knowledge/evaluation'))
  }, [setId])
  const open = async (source: string | EvaluationSet) => {
    const id = typeof source === 'string' ? source : source.id!
    const [nextCases, nextWorkbench, nextDocuments] = await Promise.all([
      getEvaluationCases(id),
      getEvaluationWorkbench(id),
      getEvaluationDocuments(),
    ])
    const workbench = nextWorkbench.data
    if (!workbench) return
    if (selectedRef.current && selectedRef.current.id !== id) return
    selectedRef.current = workbench.evaluationSet
    setSelected(workbench.evaluationSet)
    setCases(nextCases.data || [])
    setDocumentNames(
      Object.fromEntries(((nextDocuments.data || []).map((item) => [item.id, item.title]))),
    )
    setRuns(workbench.runs || [])
    setHealth(workbench.health)
    setVersions(workbench.versions || [])
    setTrend(workbench.trend || [])
    setCompareRunIds([])
    setComparison(undefined)
    setCaseIds([])
  }
  const openLabels = async (item: EvaluationCase) => {
    setLabelCase(item)
    setLabelIds([])
    const nextLabels = (await getEvaluationCaseLabels(selected!.id!, item.id!)).data || []
    const documentIds = [...new Set(nextLabels.map((label) => label.documentId).filter(Boolean))]
    const chunkLists = await Promise.all(documentIds.map((documentId) => getEvaluationDocumentChunks(documentId)))
    setChunkNames(
      Object.fromEntries(
        chunkLists.flatMap((response) =>
          (response.data || []).map((chunk) => [
            chunk.id,
            `#${chunk.chunkIndex ?? '-'}${chunk.sectionPath ? ` · ${chunk.sectionPath}` : ''}`,
          ]),
        ),
      ),
    )
    setLabels(nextLabels)
  }
  useEffect(() => {
    if (!selected || !progress || progress.finished) return undefined
    let cancelled = false
    let timer: number | undefined
    const poll = async () => {
      const current = selectedRef.current
      if (!current) return
      const next = (await getEvaluationRunProgress(current.id!, progress.runId)).data
      if (cancelled || selectedRef.current?.id !== current.id) return
      setProgress(next)
      if (next?.finished) {
        await open(current)
        return
      }
      timer = window.setTimeout(poll, 3000)
    }
    timer = window.setTimeout(poll, 3000)
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [selected, progress?.runId, progress?.finished])
  return (
    <PageContainer
      className="evaluation-page"
      title={selected?.name}
      onBack={() => history.push('/knowledge/evaluation')}
    >
      {selected && (
        <>
          <section className="evaluation-workbench-hero">
            <div className="evaluation-workbench-identity">
              <span className="evaluation-workbench-kicker">{intl.formatMessage({ id: 'pages.knowledge.evaluation.workspace' })}</span>
              <h2>{selected.name}</h2>
              <Tag
                style={{
                  width: 200,
                }}
                color={health?.healthy ? 'processing' : 'warning'}>
                {health?.healthy
                  ? intl.formatMessage(
                    { id: 'pages.knowledge.evaluation.datasetHealthy' },
                    { count: health.enabledCaseCount },
                  )
                  : intl.formatMessage({ id: 'pages.knowledge.evaluation.datasetBlockingIssues' })}
              </Tag>
              <span>{selected.description || selected.agentDefinitionId}</span>
            </div>
            <div className="evaluation-workbench-actions">
              {canWrite && workspaceTab === 'runs' && (
                <>
                  <div className="evaluation-run-actions">
                    <Select
                      allowClear
                      value={runVersionId}
                      onChange={setRunVersionId}
                      placeholder={intl.formatMessage({
                        id: 'pages.knowledge.evaluation.currentDraft',
                      })}
                      style={{ width: 160 }}
                      options={versions.map((version) => ({
                        value: version.id,
                        label: intl.formatMessage(
                          { id: 'pages.knowledge.evaluation.version' },
                          { version: version.versionNo },
                        ),
                      }))}
                    />
                    <Button
                      type="primary"
                      loading={startingRun}
                      disabled={Boolean(progress && !progress.finished)}
                      onClick={async () => {
                        if (startingRun) return
                        setStartingRun(true)
                        try {
                          const response = await createEvaluationRun(selected!.id!, runVersionId)
                          const runId = response.data
                          if (!runId) return
                          setProgress((await getEvaluationRunProgress(selected!.id!, runId)).data)
                          await open(selected!)
                        } finally {
                          setStartingRun(false)
                        }
                      }}
                    >
                      {intl.formatMessage({ id: 'pages.knowledge.evaluation.run' })}
                    </Button>
                  </div>
                </>
              )}
              {canWrite && workspaceTab === 'dataset' && (
                <>
                  <div className="evaluation-dataset-actions">
                    <Popconfirm
                      title={intl.formatMessage({
                        id: 'pages.knowledge.evaluation.publishVersionConfirm',
                      })}
                      onConfirm={async () => {
                        await publishEvaluationSetVersion(selected!.id!)
                        await open(selected!)
                      }}
                    >
                      <Button>
                        {intl.formatMessage({ id: 'pages.knowledge.evaluation.publishVersion' })}
                      </Button>
                    </Popconfirm>
                    <Button
                      onClick={async () => {
                        const items = (await exportEvaluationCases(selected!.id!)).data || []
                        const link = document.createElement('a')
                        link.href = URL.createObjectURL(
                          new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }),
                        )
                        link.download = `${selected!.name || 'evaluation-cases'}.json`
                        link.click()
                        URL.revokeObjectURL(link.href)
                      }}
                    >
                      {intl.formatMessage({ id: 'pages.knowledge.evaluation.exportCases' })}
                    </Button>
                    <Button onClick={() => importInputRef.current?.click()}>
                      {intl.formatMessage({ id: 'pages.knowledge.evaluation.importCases' })}
                    </Button>
                  </div>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (!file) return
                      try {
                        const items = JSON.parse(await file.text()) as EvaluationCaseTransfer[]
                        if (!Array.isArray(items)) throw new Error('Invalid import')
                        const preview = (await previewEvaluationCaseImport(selected!.id!, items))
                          .data
                        setImportItems(items)
                        setImportPreview(preview)
                      } catch {
                        message.error(
                          intl.formatMessage({
                            id: 'pages.knowledge.evaluation.invalidImportFile',
                          }),
                        )
                      }
                    }}
                  />
                  <DrawerForm
                    title={intl.formatMessage({ id: 'pages.knowledge.evaluation.addQuestion' })}
                    drawerProps={{ destroyOnClose: true }}
                    onFinish={async (v) => {
                      await saveEvaluationCase(selected!.id!, v as EvaluationCase)
                      await open(selected!)
                      return true
                    }}
                    trigger={
                      <Button>
                        {intl.formatMessage({ id: 'pages.knowledge.evaluation.addQuestion' })}
                      </Button>
                    }
                  >
                    <ProFormTextArea
                      name="question"
                      label={intl.formatMessage({ id: 'pages.knowledge.evaluation.question' })}
                      rules={[{ required: true }]}
                    />
                    <ProFormSelect
                      name="documentId"
                      label={intl.formatMessage({
                        id: 'pages.knowledge.evaluation.expectedDocument',
                      })}
                      rules={[
                        {
                          required: true,
                          message: intl.formatMessage({
                            id: 'pages.knowledge.evaluation.selectExpectedDocument',
                          }),
                        },
                      ]}
                      showSearch
                      request={async () =>
                        ((await getEvaluationDocuments()).data || []).map((x) => ({
                          label: x.title,
                          value: x.id,
                        }))
                      }
                    />
                    <ProFormDependency name={['documentId']}>
                      {({ documentId }) => (
                        <ProFormSelect
                          name="sectionPath"
                          label={intl.formatMessage({
                            id: 'pages.knowledge.evaluation.expectedSection',
                          })}
                          placeholder={intl.formatMessage({
                            id: 'pages.knowledge.evaluation.expectedSectionPlaceholder',
                          })}
                          disabled={!documentId}
                          request={async () =>
                            documentId
                              ? ((await getEvaluationDocumentSections(documentId)).data || []).map(
                                (x) => ({ label: x, value: x }),
                              )
                              : []
                          }
                        />
                      )}
                    </ProFormDependency>
                  </DrawerForm>
                </>
              )}
            </div>
          </section>
          <section className="evaluation-workbench-stages" aria-label={intl.formatMessage({ id: 'pages.knowledge.evaluation.workbenchStages' })}>
            <div className={`evaluation-stage ${health?.healthy ? 'is-ready' : 'is-blocked'}`}>
              <span className="evaluation-stage-number">01</span>
              <div>
                <small>{intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.dataset' })}</small>
                <strong>
                  {health?.healthy
                    ? intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.datasetReady' })
                    : intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.datasetBlocked' })}
                </strong>
                <span>
                  {intl.formatMessage(
                    { id: 'pages.knowledge.evaluation.stage.datasetSummary' },
                    { count: health?.enabledCaseCount || 0 },
                  )}
                </span>
              </div>
            </div>
            <div className="evaluation-stage">
              <span className="evaluation-stage-number">02</span>
              <div>
                <small>{intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.version' })}</small>
                <strong>
                  {versions[0]
                    ? intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.versionPublished' }, { version: versions[0].versionNo })
                    : intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.versionMissing' })}
                </strong>
                <span>{intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.versionSummary' }, { count: versions.length })}</span>
              </div>
            </div>
            <div className="evaluation-stage">
              <span className="evaluation-stage-number">03</span>
              <div>
                <small>{intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.run' })}</small>
                <strong>
                  {runs[0]
                    ? evaluationStatus(runs[0].status)
                    : intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.runMissing' })}
                </strong>
                <span>{intl.formatMessage({ id: 'pages.knowledge.evaluation.stage.runSummary' }, { count: runs.length })}</span>
              </div>
            </div>
          </section>
          <Tabs
            className="evaluation-workbench-tabs"
            activeKey={workspaceTab}
            onChange={(key) => setWorkspaceTab(key as 'dataset' | 'runs')}
            items={[
              { key: 'dataset', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.workspaceTab.dataset' }) },
              { key: 'runs', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.workspaceTab.runs' }) },
            ]}
          />
          {workspaceTab === 'dataset' && (
            <>
              {health && (
                <Alert
                  style={{ marginTop: 16, marginBottom: 16 }}
                  type={health.healthy ? 'success' : 'error'}
                  showIcon
                  message={
                    health.healthy
                      ? intl.formatMessage(
                        { id: 'pages.knowledge.evaluation.datasetHealthy' },
                        { count: health.enabledCaseCount },
                      )
                      : intl.formatMessage({ id: 'pages.knowledge.evaluation.datasetBlockingIssues' })
                  }
                  description={
                    health.issues
                      .map((issue) =>
                        [healthIssue(issue.code), issue.message, issue.evaluationCaseId]
                          .filter(Boolean)
                          .join(': '),
                      )
                      .join(' ') || undefined
                  }
                />
              )}
            </>
          )}
          {workspaceTab === 'runs' && (
            <>
              {progress && !progress.finished && (
                <Card
                  className="evaluation-progress-card"
                  size="small"
                  style={{ marginTop: 16, marginBottom: 16 }}
                  title={intl.formatMessage({ id: 'pages.knowledge.evaluation.progress' })}
                  extra={
                    <Space>
                      <Tag color="processing">{evaluationStatus(progress.status)}</Tag>
                      <Button
                        size="small"
                        onClick={async () => {
                          await cancelEvaluationRun(selected!.id!, progress.runId)
                          setProgress(
                            (await getEvaluationRunProgress(selected!.id!, progress.runId)).data,
                          )
                        }}
                      >
                        {intl.formatMessage({ id: 'pages.knowledge.evaluation.cancel' })}
                      </Button>
                    </Space>
                  }
                >
                  <Progress
                    percent={
                      progress.total
                        ? Math.round(
                          ((progress.succeeded +
                          progress.failed +
                          progress.invalid +
                          progress.cancelled) /
                          progress.total) *
                          100,
                        )
                        : 100
                    }
                  />
                  <Descriptions
                    size="small"
                    column={4}
                    items={[
                      {
                        key: 'q',
                        label: intl.formatMessage({ id: 'pages.knowledge.evaluation.queued' }),
                        children: progress.queued,
                      },
                      {
                        key: 'r',
                        label: intl.formatMessage({ id: 'pages.knowledge.evaluation.running' }),
                        children: progress.running,
                      },
                      {
                        key: 's',
                        label: intl.formatMessage({ id: 'pages.knowledge.evaluation.succeeded' }),
                        children: progress.succeeded,
                      },
                      {
                        key: 'f',
                        label: intl.formatMessage({ id: 'pages.knowledge.evaluation.failed' }),
                        children: progress.failed,
                      },
                    ]}
                  />
                </Card>
              )}
              <div className="evaluation-overview-grid">
                <Card
                  className="evaluation-card evaluation-metric-card"
                  title={intl.formatMessage({ id: 'pages.knowledge.evaluation.latestMetrics' })}
                >
                  <Descriptions
                    layout="vertical"
                    column={2}
                    items={
                      runs[0]
                        ? [
                          { key: 'r', label: metricTitle('recallAtK'), children: pct(runs[0].recallAtK) },
                          { key: 'm', label: metricTitle('mrr'), children: pct(runs[0].mrr) },
                          { key: 'n', label: metricTitle('ndcg'), children: pct(runs[0].ndcg) },
                          {
                            key: 'i',
                            label: intl.formatMessage({
                              id: 'pages.knowledge.evaluation.invalidAnnotations',
                            }),
                            children: runs[0].invalidCount,
                          },
                        ]
                        : []
                    }
                  />
                </Card>
                <Card
                  className="evaluation-card evaluation-trend-card"
                  title={intl.formatMessage({ id: 'pages.knowledge.evaluation.trend' })}
                  size="small"
                >
                  <Table<EvaluationRun>
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ y: 184 }}
                    dataSource={[...trend].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))}
                    columns={[
                      {
                        title: intl.formatMessage({ id: 'pages.knowledge.evaluation.runTime' }),
                        dataIndex: 'startedAt',
                        render: (value) =>
                          value ? new Date(value).toLocaleString(intl.locale) : '-',
                      },
                      { title: metricTitle('recallAtK'), dataIndex: 'recallAtK', render: pct },
                      { title: metricTitle('mrr'), dataIndex: 'mrr', render: pct },
                      { title: metricTitle('ndcg'), dataIndex: 'ndcg', render: pct },
                    ]}
                  />
                </Card>
              </div>
            </>
          )}
          {workspaceTab === 'dataset' && (
            <>
              <Card
                className="evaluation-card"
                title={intl.formatMessage({ id: 'pages.knowledge.evaluation.datasetCases' })}
                size="small"
                extra={
                  canWrite && (
                    <Space wrap>
                      <Button
                        onClick={async () => {
                          if (!caseIds.length)
                            return message.warning(
                              intl.formatMessage({ id: 'pages.knowledge.evaluation.noCasesSelected' }),
                            )
                          await updateEvaluationCaseStatuses(selected!.id!, caseIds.map(String), 1)
                          await open(selected!)
                        }}
                      >
                        {intl.formatMessage({ id: 'pages.knowledge.evaluation.enableSelected' })}
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!caseIds.length)
                            return message.warning(
                              intl.formatMessage({ id: 'pages.knowledge.evaluation.noCasesSelected' }),
                            )
                          await updateEvaluationCaseStatuses(selected!.id!, caseIds.map(String), 0)
                          await open(selected!)
                        }}
                      >
                        {intl.formatMessage({ id: 'pages.knowledge.evaluation.disableSelected' })}
                      </Button>
                      <Popconfirm
                        title={intl.formatMessage({ id: 'pages.knowledge.evaluation.batchDeleteCasesConfirm' })}
                        disabled={!caseIds.length}
                        onConfirm={async () => {
                          await batchDeleteEvaluationCases(selected!.id!, caseIds.map(String))
                          await open(selected!)
                        }}
                      >
                        <Button danger disabled={!caseIds.length}>
                          {intl.formatMessage({ id: 'pages.knowledge.evaluation.batchDelete' })}
                        </Button>
                      </Popconfirm>
                    </Space>
                  )
                }
              >
                <Table
                  rowKey="id"
                  className="evaluation-table"
                  dataSource={cases}
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total}` }}
                  rowSelection={
                    canWrite ? { selectedRowKeys: caseIds, onChange: setCaseIds } : undefined
                  }
                  columns={[
                    {
                      title: intl.formatMessage({ id: 'pages.knowledge.evaluation.question' }),
                      dataIndex: 'question',
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.knowledge.evaluation.document' }),
                      dataIndex: 'documentId',
                      render: documentName,
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.knowledge.evaluation.section' }),
                      dataIndex: 'sectionPath',
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.knowledge.evaluation.labels' }),
                      render: (_, item) => (
                        <Button
                          type="link"
                          onClick={() => openLabels(item)}
                        >
                          {intl.formatMessage({ id: 'pages.knowledge.evaluation.manageLabels' })}
                        </Button>
                      ),
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.common.status' }),
                      dataIndex: 'status',
                      render: (value) => (
                        <Tag color={value === 1 ? 'green' : 'default'}>
                          {intl.formatMessage({
                            id:
                          value === 1
                            ? 'pages.knowledge.evaluation.enabled'
                            : 'pages.knowledge.evaluation.disabled',
                          })}
                        </Tag>
                      ),
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.common.option' }),
                      render: (_, item) =>
                        canWrite && (
                          <Space>
                            <Button type="link" onClick={() => setEditingCase(item)}>
                              {intl.formatMessage({ id: 'pages.common.edit' })}
                            </Button>
                            <Popconfirm
                              title={intl.formatMessage({
                                id: 'pages.knowledge.evaluation.deleteQuestionConfirm',
                              })}
                          onConfirm={async () => {
                            await deleteEvaluationCase(selected!.id!, item.id!)
                            setCaseIds((current) => current.filter((id) => id !== item.id))
                            await open(selected!)
                          }}
                            >
                              <Button type="link" danger>
                                {intl.formatMessage({ id: 'pages.common.delete' })}
                              </Button>
                            </Popconfirm>
                          </Space>
                        ),
                    },
                  ]}
                />
              </Card>
            </>
          )}
          {workspaceTab === 'runs' && (
            <>
              {compareRunIds.length === 2 && comparison && (
                <Card
                  className="evaluation-card"
                  title={intl.formatMessage({ id: 'pages.knowledge.evaluation.runComparison' })}
                  size="small"
                >
                  {!comparison.comparable && (
                    <Alert
                      type="warning"
                      showIcon
                      message={
                        comparison.nonComparableReason ||
                    intl.formatMessage({ id: 'pages.knowledge.evaluation.nonComparable' })
                      }
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  <Descriptions
                    items={[
                      {
                        key: 'recall',
                        label: intl.formatMessage({ id: 'pages.knowledge.evaluation.recallChange' }),
                        children: pct(comparison.metrics.recallAtKDelta),
                      },
                      {
                        key: 'mrr',
                        label: intl.formatMessage({ id: 'pages.knowledge.evaluation.mrrChange' }),
                        children: pct(comparison.metrics.mrrDelta),
                      },
                      {
                        key: 'ndcg',
                        label: intl.formatMessage({ id: 'pages.knowledge.evaluation.ndcgChange' }),
                        children: pct(comparison.metrics.ndcgDelta),
                      },
                    ]}
                  />
                </Card>
              )}
              <Card
                className="evaluation-card evaluation-run-history-card"
                title={intl.formatMessage({ id: 'pages.knowledge.evaluation.runHistory' })}
                extra={intl.formatMessage({ id: 'pages.knowledge.evaluation.runHistoryHint' })}
              >
                <Table
                  rowKey="id"
                  className="evaluation-table"
                  dataSource={runs}
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total}` }}
                  rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys: compareRunIds,
                    onChange: async (keys) => {
                      if (keys.length > 2) {
                        message.warning(
                          intl.formatMessage({ id: 'pages.knowledge.evaluation.maxTwoRuns' }),
                        )
                        return
                      }
                      setCompareRunIds(keys)
                      if (keys.length === 2) {
                        const selectedRuns = runs.filter((run) => keys.includes(run.id!))
                        const baseline = selectedRuns.find((run) => run.isBaseline)
                        const candidate = selectedRuns.find((run) => run.id !== baseline?.id)
                        if (!baseline || !candidate) {
                          setComparison(undefined)
                          message.warning(
                            intl.formatMessage({ id: 'pages.knowledge.evaluation.compareRequiresBaseline' }),
                          )
                          return
                        }
                        const response = await compareEvaluationRuns(
                    selected!.id!,
                    baseline.id!,
                    candidate.id!,
                        )
                        setComparison(response.data)
                      } else setComparison(undefined)
                    },
                  }}
                  columns={[
                    {
                      title: intl.formatMessage({ id: 'pages.knowledge.evaluation.runTime' }),
                      dataIndex: 'startedAt',
                      render: (v) => (v ? new Date(v).toLocaleString(intl.locale) : '-'),
                    },
                    { title: metricTitle('recallAtK'), dataIndex: 'recallAtK', render: pct },
                    { title: metricTitle('mrr'), dataIndex: 'mrr', render: pct },
                    { title: metricTitle('ndcg'), dataIndex: 'ndcg', render: pct },
                    {
                      title: intl.formatMessage({ id: 'pages.common.status' }),
                      dataIndex: 'status',
                      render: (value) => (
                        <Tag
                          color={
                            value === 'SUCCEEDED'
                              ? 'green'
                              : value === 'RUNNING'
                                ? 'processing'
                                : 'default'
                          }
                        >
                          {evaluationStatus(value)}
                        </Tag>
                      ),
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.knowledge.evaluation.baseline' }),
                      dataIndex: 'isBaseline',
                      render: (value) =>
                        value ? (
                          <Tag color="gold">
                            {intl.formatMessage({ id: 'pages.knowledge.evaluation.baseline' })}
                          </Tag>
                        ) : (
                          '-'
                        ),
                    },
                    {
                      title: intl.formatMessage({ id: 'pages.knowledge.evaluation.details' }),
                      render: (_, run) => (
                        <Space>
                          <Button
                            type="link"
                            onClick={() =>
                              history.push(`/knowledge/evaluation/sets/${selected!.id}/runs/${run.id}`)
                            }
                          >
                            {intl.formatMessage({ id: 'pages.knowledge.evaluation.viewQuestionResults' })}
                          </Button>
                          <Button
                            type="link"
                            onClick={async () => {
                              setConfigRun(run)
                              const models = await getModelCatalogOptions('CHAT,MULTIMODAL,EMBEDDING,RERANK')
                              setModelOptionNames(
                                models.reduce<Record<string, string>>((names, model) => {
                                  names[String(model.value)] = model.label
                                  return names
                                }, {}),
                              )
                            }}
                          >
                            {intl.formatMessage({ id: 'pages.knowledge.evaluation.viewRetrievalConfig' })}
                          </Button>
                          {canWrite && (
                            <Popconfirm
                              title={intl.formatMessage({
                                id: 'pages.knowledge.evaluation.setBaselineConfirm',
                              })}
                              onConfirm={async () => {
                                await setEvaluationRunBaseline(selected!.id!, run.id)
                                await open(selected!)
                              }}
                            >
                              <Button
                                type="link"
                                disabled={run.status !== 'SUCCEEDED' && run.status !== 'PARTIAL_FAILED'}
                              >
                                {intl.formatMessage({ id: 'pages.knowledge.evaluation.setBaseline' })}
                              </Button>
                            </Popconfirm>
                          )}
                          {canWrite && run.status === 'FAILED' && (
                            <Button
                              type="link"
                              onClick={async () => {
                                await retryEvaluationRunFailures(selected!.id!, run.id)
                                setProgress((await getEvaluationRunProgress(selected!.id!, run.id)).data)
                              }}
                            >
                              {intl.formatMessage({ id: 'pages.knowledge.evaluation.retryFailures' })}
                            </Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            </>
          )}
        </>
      )}
      <DrawerForm<EvaluationCase>
        open={!!editingCase}
        onOpenChange={(open) => !open && setEditingCase(undefined)}
        initialValues={editingCase}
        title={intl.formatMessage({ id: 'pages.knowledge.evaluation.editQuestion' })}
        drawerProps={{ destroyOnClose: true }}
        onFinish={async (value) => {
          await updateEvaluationCase(selected!.id!, editingCase!.id!, value)
          await open(selected!)
          setEditingCase(undefined)
          return true
        }}
      >
        <ProFormTextArea
          name="question"
          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.question' })}
          rules={[{ required: true }]}
        />
        <ProFormSelect
          name="documentId"
          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedDocument' })}
          showSearch
          request={async () =>
            ((await getEvaluationDocuments()).data || []).map((item) => ({
              label: item.title,
              value: item.id,
            }))
          }
          rules={[{ required: true }]}
        />
        <ProFormDependency name={['documentId']}>
          {({ documentId }) => (
            <ProFormSelect
              name="sectionPath"
              label={intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedSection' })}
              disabled={!documentId}
              request={async () =>
                documentId
                  ? ((await getEvaluationDocumentSections(documentId)).data || []).map((value) => ({
                    label: value,
                    value,
                  }))
                  : []
              }
            />
          )}
        </ProFormDependency>
      </DrawerForm>
      <Modal
        open={!!importPreview}
        title={intl.formatMessage({ id: 'pages.knowledge.evaluation.importPreview' })}
        onCancel={() => setImportPreview(undefined)}
        footer={
          importPreview?.valid ? (
            <Button
              type="primary"
              onClick={async () => {
                await importEvaluationCases(selected!.id!, importItems)
                await open(selected!)
                setImportPreview(undefined)
              }}
            >
              {intl.formatMessage({ id: 'pages.knowledge.evaluation.confirmImport' })}
            </Button>
          ) : null
        }
      >
        {importPreview && (
          <>
            <Alert
              type={importPreview.valid ? 'success' : 'error'}
              showIcon
              message={
                importPreview.valid
                  ? intl.formatMessage(
                    { id: 'pages.knowledge.evaluation.importValid' },
                    { count: importPreview.acceptedCount },
                  )
                  : intl.formatMessage({ id: 'pages.knowledge.evaluation.importInvalid' })
              }
            />
            {!importPreview.valid && (
              <Table
                size="small"
                style={{ marginTop: 16 }}
                rowKey={(item) => `${item.row}-${item.code}`}
                pagination={false}
                dataSource={importPreview.issues}
                columns={[
                  {
                    title: intl.formatMessage(
                      { id: 'pages.knowledge.evaluation.importRow' },
                      { row: '' },
                    ),
                    dataIndex: 'row',
                  },
                  { title: 'Code', dataIndex: 'code' },
                  {
                    title: intl.formatMessage({ id: 'pages.knowledge.evaluation.error' }),
                    dataIndex: 'message',
                  },
                ]}
              />
            )}
          </>
        )}
      </Modal>
      <Modal
        width={860}
        open={!!configRun}
        footer={null}
        onCancel={() => setConfigRun(undefined)}
        title={intl.formatMessage({ id: 'pages.knowledge.evaluation.retrievalConfigSnapshot' })}
      >
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>{renderRetrievalConfig(configRun)}</div>
      </Modal>
      <Modal
        width={760}
        footer={null}
        open={!!labelCase}
        onCancel={() => setLabelCase(undefined)}
        title={intl.formatMessage(
          { id: 'pages.knowledge.evaluation.labelsTitle' },
          { question: labelCase?.question || '' },
        )}
      >
        {labelCase && (
          <>
            <Table<EvaluationLabel>
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={labels}
              rowSelection={
                canWrite ? { selectedRowKeys: labelIds, onChange: setLabelIds } : undefined
              }
              columns={[
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.type' }),
                  dataIndex: 'targetType',
                  render: targetType,
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.document' }),
                  dataIndex: 'documentId',
                  render: documentName,
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.section' }),
                  dataIndex: 'sectionPath',
                  render: (value) => value || '-',
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.chunk' }),
                  dataIndex: 'chunkId',
                  render: chunkName,
                },
                {
                  title: intl.formatMessage({ id: 'pages.knowledge.evaluation.action' }),
                  render: (_, label) =>
                    canWrite ? (
                      <Popconfirm
                        title={intl.formatMessage({
                          id: 'pages.knowledge.evaluation.deleteLabelConfirm',
                        })}
                        onConfirm={async () => {
                          await deleteEvaluationCaseLabel(selected!.id!, labelCase.id!, label.id!)
                          setLabelIds((ids) => ids.filter((id) => id !== label.id))
                          setLabels(
                            (await getEvaluationCaseLabels(selected!.id!, labelCase.id!)).data ||
                              [],
                          )
                          await open(selected!)
                        }}
                      >
                        <Button type="link" danger>
                          {intl.formatMessage({ id: 'pages.knowledge.evaluation.delete' })}
                        </Button>
                      </Popconfirm>
                    ) : (
                      '-'
                    ),
                },
              ]}
            />
            {canWrite && (
              <Space style={{ marginTop: 16 }} wrap>
                <Popconfirm
                  title={intl.formatMessage({ id: 'pages.knowledge.evaluation.batchDeleteLabelsConfirm' })}
                  disabled={!labelIds.length}
                  onConfirm={async () => {
                    await batchDeleteEvaluationCaseLabels(
                      selected!.id!,
                      labelCase.id!,
                      labelIds.map(String),
                    )
                    setLabelIds([])
                    setLabels(
                      (await getEvaluationCaseLabels(selected!.id!, labelCase.id!)).data || [],
                    )
                    await open(selected!)
                  }}
                >
                  <Button danger disabled={!labelIds.length}>
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.batchDelete' })}
                  </Button>
                </Popconfirm>
              <DrawerForm<EvaluationLabel>
                title={intl.formatMessage({ id: 'pages.knowledge.evaluation.addPositiveLabel' })}
                formRef={labelFormRef}
                drawerProps={{ destroyOnClose: true }}
                onFinish={async (value) => {
                  await saveEvaluationCaseLabel(selected!.id!, labelCase.id!, value)
                  await openLabels(labelCase)
                  await open(selected!)
                  return true
                }}
                trigger={
                  <Button>
                    {intl.formatMessage({ id: 'pages.knowledge.evaluation.addLabel' })}
                  </Button>
                }
              >
                <ProFormSelect
                  name="targetType"
                  label={intl.formatMessage({ id: 'pages.knowledge.evaluation.targetType' })}
                  initialValue={labels[0]?.targetType || 'DOCUMENT'}
                  options={['DOCUMENT', 'SECTION', 'CHUNK'].map((value) => ({
                    label: targetType(value),
                    value,
                  }))}
                  rules={[{ required: true }]}
                  fieldProps={{
                    onChange: () => labelFormRef.current?.setFieldsValue({ sectionPath: undefined, chunkId: undefined }),
                  }}
                />
                <ProFormSelect
                  name="documentId"
                  label={intl.formatMessage({ id: 'pages.knowledge.evaluation.document' })}
                  showSearch
                  request={async () =>
                    ((await getEvaluationDocuments()).data || []).map((item) => ({
                      label: item.title,
                      value: item.id,
                    }))
                  }
                  rules={[{ required: true }]}
                  fieldProps={{
                    onChange: () => labelFormRef.current?.setFieldsValue({ sectionPath: undefined, chunkId: undefined }),
                  }}
                />
                <ProFormDependency name={['targetType', 'documentId']}>
                  {({ targetType, documentId }) => (
                    <>
                      {targetType === 'SECTION' && (
                        <ProFormSelect
                          name="sectionPath"
                          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.section' })}
                          disabled={!documentId}
                          params={{ documentId }}
                          key={`section-${documentId || 'empty'}`}
                          request={async () =>
                            documentId
                              ? ((await getEvaluationDocumentSections(documentId)).data || []).map(
                                (value) => ({ label: value, value }),
                              )
                              : []
                          }
                          rules={[{ required: true }]}
                        />
                      )}
                      {targetType === 'CHUNK' && (
                        <ProFormSelect
                          name="chunkId"
                          label={intl.formatMessage({ id: 'pages.knowledge.evaluation.chunk' })}
                          disabled={!documentId}
                          params={{ documentId }}
                          key={`chunk-${documentId || 'empty'}`}
                          request={async () =>
                            documentId
                              ? ((await getEvaluationDocumentChunks(documentId)).data || []).map(
                                (item) => ({
                                  label: `#${item.chunkIndex ?? '-'} ${item.sectionPath || ''}`,
                                  value: item.id,
                                }),
                              )
                              : []
                          }
                          rules={[{ required: true }]}
                        />
                      )}
                    </>
                  )}
                </ProFormDependency>
              </DrawerForm>
              </Space>
            )}
          </>
        )}
      </Modal>
    </PageContainer>
  )
}
