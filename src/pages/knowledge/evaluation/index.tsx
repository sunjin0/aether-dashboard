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
import { useAccess } from '@umijs/max'
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
          title="新建评测集"
          onFinish={async (v) => {
            await saveEvaluationSet(v as EvaluationSet)
            await load()
            return true
          }}
          trigger={<Button type="primary">新建评测集</Button>}
        >
          <ProFormText name="name" label="名称" rules={[{ required: true }]} />
          <ProFormSelect
            name="agentDefinitionId"
            label="Agent"
            rules={[{ required: true }]}
            request={async () => getAgentDefinitionOptions()}
          />
          <ProFormTextArea name="description" label="说明" />
        </ModalForm>,
      ] : []}
    >
      <ProTable<EvaluationSet>
        rowKey="id"
        search={false}
        dataSource={sets}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: 'Agent', dataIndex: 'agentDefinitionId' },
          { title: '操作', render: (_, s) => <Button onClick={() => open(s)}>管理</Button> },
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
                message.success('评测完成')
              }}
            >
            运行评测
            </Button>
            <ModalForm
              title="新增问题"
              onFinish={async (v) => {
                await saveEvaluationCase(selected!.id!, v as EvaluationCase)
                await open(selected!)
                return true
              }}
              trigger={<Button>新增问题</Button>}
            >
              <ProFormTextArea name="question" label="问题" rules={[{ required: true }]} />
              <ProFormSelect
                name="documentId"
                label="正确文档"
                rules={[{ required: true, message: '请选择正确文档' }]}
                showSearch
                request={async () =>
                  ((await getEvaluationDocuments()).data || []).map((x) => ({ label: x.title, value: x.id }))
                }
              />
              <ProFormDependency name={['documentId']}>
                {({ documentId }) => (
                  <ProFormSelect
                    name="sectionPath"
                    label="正确章节"
                    placeholder="不选则以整篇文档为目标"
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
        <Card title="最新指标" style={{ marginTop: 16 }}>
          <Descriptions
            items={
              runs[0]
                ? [
                  { key: 'r', label: 'Recall@K', children: pct(runs[0].recallAtK) },
                  { key: 'm', label: 'MRR', children: pct(runs[0].mrr) },
                  { key: 'n', label: 'nDCG', children: pct(runs[0].ndcg) },
                  { key: 'i', label: '失效标注', children: runs[0].invalidCount },
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
            { title: '问题', dataIndex: 'question' },
            { title: '文档', dataIndex: 'documentId' },
            { title: '章节', dataIndex: 'sectionPath' },
          ]}
        />
        {compareRunIds.length === 2 && (
          <Card title="运行对比" size="small" style={{ marginTop: 16 }}>
            {(() => {
              const [before, after] = compareRunIds.map((id) => runs.find((run) => run.id === id)!)
              const delta = (key: 'recallAtK' | 'mrr' | 'ndcg') => pct((after[key] || 0) - (before[key] || 0))
              return <Descriptions items={[
                { key: 'before', label: '基线运行', children: new Date(before.startedAt || 0).toLocaleString() },
                { key: 'after', label: '对比运行', children: new Date(after.startedAt || 0).toLocaleString() },
                { key: 'recall', label: 'Recall@K 变化', children: delta('recallAtK') },
                { key: 'mrr', label: 'MRR 变化', children: delta('mrr') },
                { key: 'ndcg', label: 'nDCG 变化', children: delta('ndcg') },
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
              if (keys.length > 2) { message.warning('最多选择两次运行进行对比'); return }
              setCompareRunIds(keys)
            },
          }}
          columns={[
            {
              title: '运行时间',
              dataIndex: 'startedAt',
              render: (v) => (v ? new Date(v).toLocaleString() : '-'),
            },
            { title: 'Recall@K', dataIndex: 'recallAtK', render: pct },
            { title: 'MRR', dataIndex: 'mrr', render: pct },
            { title: 'nDCG', dataIndex: 'ndcg', render: pct },
            {
              title: '明细',
              render: (_, run) => <Button type="link" onClick={async () => {
                setResults((await getEvaluationRunResults(selected!.id!, run.id)).data || [])
                setResultRun(run)
              }}>查看逐题结果</Button>,
            },
          ]}
        />
      </Drawer>
      <Modal width={1100} footer={null} open={!!resultRun} onCancel={() => setResultRun(undefined)} title={`逐题结果：${resultRun?.startedAt ? new Date(resultRun.startedAt).toLocaleString() : ''}`}>
        <Table<EvaluationRunResult>
          rowKey="id"
          dataSource={results}
          pagination={false}
          expandable={{
            expandedRowRender: (item) => <Table
              size="small" rowKey="id" pagination={false} dataSource={item.retrievedChunks || []}
              columns={[
                { title: '名次', dataIndex: 'rank' },
                { title: '实际召回文档', dataIndex: 'documentTitle' },
                { title: '章节', dataIndex: 'sectionPath', render: (v) => v || '—' },
                { title: '分块', dataIndex: 'chunkIndex' },
              ]}
            />,
          }}
          columns={[
            { title: '问题', dataIndex: 'question' },
            { title: '期望来源', render: (_, item) => <>{item.expectedDocumentTitle || item.expectedDocumentId}<br />{item.expectedSectionPath || '整篇文档'}</> },
            { title: 'Recall@K', dataIndex: 'recallAtK', render: pct },
            { title: 'MRR', dataIndex: 'mrr', render: pct },
            { title: 'nDCG', dataIndex: 'ndcg', render: pct },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag color={v === 'EVALUATED' ? 'green' : 'default'}>{v}</Tag> },
          ]}
        />
      </Modal>
    </PageContainer>
  )
}
