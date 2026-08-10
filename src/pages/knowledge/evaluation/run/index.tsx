import React, { useEffect, useState } from 'react'
import { PageContainer } from '@ant-design/pro-components'
import { Card, Input, Select, Table, Tag, Tooltip } from 'antd'
import { history, useIntl, useParams } from '@umijs/max'
import {
  EvaluationRunResult,
  getEvaluationRunResults,
} from '@/services/knowledge/EvaluationController'
import '../evaluation.less'

const pct = (value?: number) => (value === undefined ? '-' : `${(value * 100).toFixed(1)}%`)

export default function EvaluationRunDetailPage() {
  const intl = useIntl()
  const { setId, runId } = useParams<{ setId: string; runId: string }>()
  const [results, setResults] = useState<EvaluationRunResult[]>([])
  const [status, setStatus] = useState<string>()
  const [question, setQuestion] = useState<string>()
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const evaluationStatus = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.status.${value || 'UNKNOWN'}` })
  const targetType = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.targetType.${value || 'DOCUMENT'}` })
  const evaluationError = (code?: string) =>
    code ? intl.formatMessage({ id: `pages.knowledge.evaluation.error.${code}` }) : '-'
  const metricTitle = (metric: 'recallAtK' | 'mrr' | 'ndcg') => (
    <Tooltip title={intl.formatMessage({ id: `pages.knowledge.evaluation.metric.${metric}.tip` })}>
      <span>{intl.formatMessage({ id: `pages.knowledge.evaluation.metric.${metric}` })}</span>
    </Tooltip>
  )

  useEffect(() => {
    if (!setId || !runId) return
    getEvaluationRunResults(setId, runId, { current, pageSize, status, question }).then((response) => {
      setResults(response.data || [])
      setTotal(Number(response.total || 0))
    })
  }, [setId, runId, current, pageSize, status, question])

  return (
    <PageContainer
      className="evaluation-page"
      title={intl.formatMessage(
        { id: 'pages.knowledge.evaluation.questionResultsTitle' },
        { time: '' },
      )}
      onBack={() => history.push(`/knowledge/evaluation/sets/${setId}`)}
    >
      <Card className="evaluation-card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Select
            allowClear
            value={status}
            onChange={(value) => {
              setStatus(value)
              setCurrent(1)
            }}
            placeholder={intl.formatMessage({ id: 'pages.knowledge.evaluation.allResults' })}
            style={{ width: 180 }}
            options={['EVALUATED', 'RETRIEVAL_ERROR', 'INVALID_LABEL'].map((value) => ({
              value,
              label: evaluationStatus(value),
            }))}
          />
          <Input.Search
            allowClear
            style={{ width: 280 }}
            placeholder={intl.formatMessage({ id: 'pages.knowledge.evaluation.searchQuestion' })}
            onSearch={(value) => {
              setQuestion(value || undefined)
              setCurrent(1)
            }}
          />
        </div>
        <Table<EvaluationRunResult>
          className="evaluation-table"
          rowKey="id"
          scroll={{ x: 1000 }}
          dataSource={results}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextCurrent, nextPageSize) => {
              setCurrent(nextPageSize !== pageSize ? 1 : nextCurrent)
              setPageSize(nextPageSize)
            },
          }}
          expandable={{
            expandedRowRender: (item) => (
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={item.retrievedChunks || []}
                columns={[
                  {
                    title: intl.formatMessage({ id: 'pages.knowledge.evaluation.rank' }),
                    dataIndex: 'rank',
                  },
                  {
                    title: intl.formatMessage({
                      id: 'pages.knowledge.evaluation.retrievedDocument',
                    }),
                    dataIndex: 'documentTitle',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.knowledge.evaluation.section' }),
                    dataIndex: 'sectionPath',
                    render: (value) => value || '-',
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.knowledge.evaluation.chunk' }),
                    dataIndex: 'chunkIndex',
                  },
                ]}
              />
            ),
          }}
          columns={[
            {
              title: intl.formatMessage({ id: 'pages.knowledge.evaluation.question' }),
              dataIndex: 'question',
              width: 260,
            },
            {
              title: intl.formatMessage({ id: 'pages.knowledge.evaluation.expectedSource' }),
              render: (_, item) => (
                <>
                  {item.expectedDocumentTitle || item.expectedDocumentId}
                  <br />
                  {item.expectedSectionPath ||
                    intl.formatMessage({ id: 'pages.knowledge.evaluation.entireDocument' })}
                </>
              ),
            },
            { title: metricTitle('recallAtK'), dataIndex: 'recallAtK', render: pct },
            { title: metricTitle('mrr'), dataIndex: 'mrr', render: pct },
            { title: metricTitle('ndcg'), dataIndex: 'ndcg', render: pct },
            {
              title: intl.formatMessage({ id: 'pages.knowledge.evaluation.target' }),
              render: (_, item) => (
                <>
                  {targetType(item.targetType)}
                  <br />
                  {intl.formatMessage({ id: 'pages.knowledge.evaluation.targetChunks' })}:{' '}
                  {item.expectedChunkIds?.length || 0}
                </>
              ),
            },
            {
              title: intl.formatMessage({ id: 'pages.knowledge.evaluation.error' }),
              render: (_, item) =>
                item.errorCode ? (
                  <span title={item.errorMessage}>{evaluationError(item.errorCode)}</span>
                ) : (
                  '-'
                ),
            },
            {
              title: intl.formatMessage({ id: 'pages.common.status' }),
              dataIndex: 'status',
              render: (value) => (
                <Tag color={value === 'EVALUATED' ? 'green' : 'default'}>
                  {evaluationStatus(value)}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  )
}
