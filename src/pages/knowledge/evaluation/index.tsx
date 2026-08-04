import React, { useEffect, useState } from 'react'
import {
  PageContainer,
  ProTable,
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormDependency,
} from '@ant-design/pro-components'
import { Button, Card, Descriptions, Drawer, message, Modal, Space, Table, Tag } from 'antd'
import { useAccess, useIntl } from '@umijs/max'
import { getAgentDefinitionOptions } from '@/services/agent/AgentDefinitionController'
import {
  EvaluationCase,
  EvaluationRunResult,
  EvaluationRun,
  EvaluationSet,
  getEvaluationCases,
  getEvaluationRuns,
  getEvaluationDocuments,
  getEvaluationDocumentSections,
  getEvaluationRunResults,
  getEvaluationSets,
  runEvaluation,
  saveEvaluationCase,
  saveEvaluationSet,
} from '@/services/knowledge/EvaluationController'
const pct = (v?: number) => (v === undefined ? '-' : `${(v * 100).toFixed(1)}%`)
export default function EvaluationPage() {
  const access = useAccess()
  const intl = useIntl()
  const canWrite = Boolean(access['/knowledge/evaluation'])
  const [sets, setSets] = useState<EvaluationSet[]>([]),
    [selected, setSelected] = useState<EvaluationSet>(),
    [runs, setRuns] = useState<EvaluationRun[]>([]),
    [cases, setCases] = useState<EvaluationCase[]>([]),
    [compareRunIds, setCompareRunIds] = useState<React.Key[]>([]),
    [resultRun, setResultRun] = useState<EvaluationRun>(),
    [results, setResults] = useState<EvaluationRunResult[]>([])
  const load = async () => setSets((await getEvaluationSets()).data || [])
  useEffect(() => {
    load()
  }, [])
  const open = async (s: EvaluationSet) => {
    setSelected(s)
    setCases((await getEvaluationCases(s.id!)).data || [])
    setRuns((await getEvaluationRuns(s.id!)).data || [])
    setCompareRunIds([])
  }
  return (
    <PageContainer
      extra={canWrite ? [
        <ModalForm
          key="add"
          title={intl.formatMessage({ id: 'pages.knowledge.evaluation.createSet' })}
          modalProps={{ destroyOnClose: true }}
          onFinish={async (v) => {
            await saveEvaluationSet(v as EvaluationSet)
            await load()
            return true
          }}
          trigger={<Button type="primary">{intl.formatMessage({ id: 'pages.knowledge.evaluation.createSet' })}</Button>}
        >
          <ProFormText name="name" label={intl.formatMessage({ id: 'pages.common.name' })} rules={[{ required: true }]} />
          <ProFormSelect
            name="agentDefinitionId"
            label={intl.formatMessage({ id: 'pages.knowledge.evaluation.agent' })}
            rules={[{ required: true }]}
            request={async () => getAgentDefinitionOptions()}
          />
          <ProFormTextArea name="description" label={intl.formatMessage({ id: 'pages.agent.workflow.description' })} />
        </ModalForm>,
      ] : []}
    >
      <ProTable<EvaluationSet>
        rowKey="id"
        search={false}
        dataSource={sets}
        pagination={false}
        columns={[
          { title: intl.formatMessage({ id: 'pages.common.name' }), dataIndex: 'name' },
          { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.agent' }), dataIndex: 'agentDefinitionId' },
          { title: intl.formatMessage({ id: 'pages.common.option' }), render: (_, s) => <Button onClick={() => open(s)}>{intl.formatMessage({ id: 'pages.knowledge.evaluation.manage' })}</Button> },
        ]}
      />
      <Drawer
        width={900}
        open={!!selected}
        onClose={() => setSelected(undefined)}
        title={selected?.name}
      >
        <Space>
          {canWrite && <>
            <Button
              type="primary"
              onClick={async () => {
                await runEvaluation(selected!.id!)
                await open(selected!)
                message.success(intl.formatMessage({ id: 'pages.knowledge.evaluation.completed' }))
              }}
            >
            {intl.formatMessage({ id: 'pages.knowledge.evaluation.run' })}
            </Button>
            <ModalForm
              title={intl.formatMessage({ id: 'pages.knowledge.evaluation.addQuestion' })}
              modalProps={{ destroyOnClose: true }}
              onFinish={async (v) => {
                await saveEvaluationCase(selected!.id!, v as EvaluationCase)
                await open(selected!)
                return true
              }}
              trigger={<Button>{intl.formatMessage({ id: 'pages.knowledge.evaluation.addQuestion' })}</Button>}
            >
              <ProFormTextArea name="question" label={intl.formatMessage({ id: 'pages.knowledge.evaluation.question' })} rules={[{ required: true }]} />
              <ProFormSelect
                name="documentId"
                label={intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedDocument' })}
                rules={[{ required: true, message: intl.formatMessage({ id: 'pages.knowledge.evaluation.selectExpectedDocument' }) }]}
                showSearch
                request={async () =>
                  ((await getEvaluationDocuments()).data || []).map((x) => ({ label: x.title, value: x.id }))
                }
              />
              <ProFormDependency name={['documentId']}>
                {({ documentId }) => (
                  <ProFormSelect
                    name="sectionPath"
                    label={intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedSection' })}
                    placeholder={intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedSectionPlaceholder' })}
                    disabled={!documentId}
                    request={async () =>
                      documentId
                        ? ((await getEvaluationDocumentSections(documentId)).data || []).map((x) => ({ label: x, value: x }))
                        : []
                    }
                  />
                )}
              </ProFormDependency>
            </ModalForm>
          </>}
        </Space>
        <Card title={intl.formatMessage({ id: 'pages.knowledge.evaluation.latestMetrics' })} style={{ marginTop: 16 }}>
          <Descriptions
            items={
              runs[0]
                ? [
                  { key: 'r', label: 'Recall@K', children: pct(runs[0].recallAtK) },
                  { key: 'm', label: 'MRR', children: pct(runs[0].mrr) },
                  { key: 'n', label: 'nDCG', children: pct(runs[0].ndcg) },
                  { key: 'i', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.invalidAnnotations' }), children: runs[0].invalidCount },
                ]
                : []
            }
          />
        </Card>
        <Table
          rowKey="id"
          style={{ marginTop: 16 }}
          dataSource={cases}
          pagination={false}
          columns={[
             { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.question' }), dataIndex: 'question' },
             { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.document' }), dataIndex: 'documentId' },
             { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.section' }), dataIndex: 'sectionPath' },
          ]}
        />
        {compareRunIds.length === 2 && (
          <Card title={intl.formatMessage({ id: 'pages.knowledge.evaluation.runComparison' })} size="small" style={{ marginTop: 16 }}>
            {(() => {
              const [before, after] = compareRunIds.map((id) => runs.find((run) => run.id === id)!)
              const delta = (key: 'recallAtK' | 'mrr' | 'ndcg') => pct((after[key] || 0) - (before[key] || 0))
              return <Descriptions items={[
                { key: 'before', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.baselineRun' }), children: new Date(before.startedAt || 0).toLocaleString(intl.locale) },
                { key: 'after', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.comparisonRun' }), children: new Date(after.startedAt || 0).toLocaleString(intl.locale) },
                { key: 'recall', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.recallChange' }), children: delta('recallAtK') },
                { key: 'mrr', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.mrrChange' }), children: delta('mrr') },
                { key: 'ndcg', label: intl.formatMessage({ id: 'pages.knowledge.evaluation.ndcgChange' }), children: delta('ndcg') },
              ]} />
            })()}
          </Card>
        )}
        <Table
          rowKey="id"
          style={{ marginTop: 16 }}
          dataSource={runs}
          pagination={false}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: compareRunIds,
            onChange: (keys) => {
              if (keys.length > 2) { message.warning(intl.formatMessage({ id: 'pages.knowledge.evaluation.maxTwoRuns' })); return }
              setCompareRunIds(keys)
            },
          }}
          columns={[
            {
              title: intl.formatMessage({ id: 'pages.knowledge.evaluation.runTime' }),
              dataIndex: 'startedAt',
              render: (v) => (v ? new Date(v).toLocaleString(intl.locale) : '-'),
            },
            { title: 'Recall@K', dataIndex: 'recallAtK', render: pct },
            { title: 'MRR', dataIndex: 'mrr', render: pct },
            { title: 'nDCG', dataIndex: 'ndcg', render: pct },
            {
              title: intl.formatMessage({ id: 'pages.knowledge.evaluation.details' }),
              render: (_, run) => <Button type="link" onClick={async () => {
                setResults((await getEvaluationRunResults(selected!.id!, run.id)).data || [])
                setResultRun(run)
              }}>{intl.formatMessage({ id: 'pages.knowledge.evaluation.viewQuestionResults' })}</Button>,
            },
          ]}
        />
      </Drawer>
      <Modal width={1100} footer={null} open={!!resultRun} onCancel={() => setResultRun(undefined)} title={intl.formatMessage({ id: 'pages.knowledge.evaluation.questionResultsTitle' }, { time: resultRun?.startedAt ? new Date(resultRun.startedAt).toLocaleString(intl.locale) : '' })}>
        <Table<EvaluationRunResult>
          rowKey="id"
          dataSource={results}
          pagination={false}
          expandable={{
            expandedRowRender: (item) => <Table
              size="small" rowKey="id" pagination={false} dataSource={item.retrievedChunks || []}
              columns={[
                { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.rank' }), dataIndex: 'rank' },
                { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.retrievedDocument' }), dataIndex: 'documentTitle' },
                { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.section' }), dataIndex: 'sectionPath', render: (v) => v || '—' },
                { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.chunk' }), dataIndex: 'chunkIndex' },
              ]}
            />,
          }}
          columns={[
            { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.question' }), dataIndex: 'question' },
            { title: intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedSource' }), render: (_, item) => <>{item.expectedDocumentTitle || item.expectedDocumentId}<br />{item.expectedSectionPath || intl.formatMessage({ id: 'pages.knowledge.evaluation.entireDocument' })}</> },
            { title: 'Recall@K', dataIndex: 'recallAtK', render: pct },
            { title: 'MRR', dataIndex: 'mrr', render: pct },
            { title: 'nDCG', dataIndex: 'ndcg', render: pct },
            { title: intl.formatMessage({ id: 'pages.common.status' }), dataIndex: 'status', render: (v) => <Tag color={v === 'EVALUATED' ? 'green' : 'default'}>{v}</Tag> },
          ]}
        />
      </Modal>
    </PageContainer>
  )
}
