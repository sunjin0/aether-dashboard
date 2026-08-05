import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Select, Table, Tag } from 'antd';
import { history, useIntl, useParams } from '@umijs/max';
import {
  EvaluationRunResult,
  getEvaluationRunResults,
} from '@/services/knowledge/EvaluationController';
import '../evaluation.less';

const pct = (value?: number) => (value === undefined ? '-' : `${(value * 100).toFixed(1)}%`);

export default function EvaluationRunDetailPage() {
  const intl = useIntl();
  const { setId, runId } = useParams<{ setId: string; runId: string }>();
  const [results, setResults] = useState<EvaluationRunResult[]>([]);
  const [status, setStatus] = useState<string>();
  const evaluationStatus = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.status.${value || 'UNKNOWN'}` });
  const targetType = (value?: string) =>
    intl.formatMessage({ id: `pages.knowledge.evaluation.targetType.${value || 'DOCUMENT'}` });
  const evaluationError = (code?: string) =>
    code ? intl.formatMessage({ id: `pages.knowledge.evaluation.error.${code}` }) : '-';

  useEffect(() => {
    if (!setId || !runId) return;
    getEvaluationRunResults(setId, runId).then((response) => setResults(response.data || []));
  }, [setId, runId]);

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
        <Select
          allowClear
          value={status}
          onChange={setStatus}
          placeholder={intl.formatMessage({ id: 'pages.knowledge.evaluation.allResults' })}
          style={{ width: 180, marginBottom: 16 }}
          options={['EVALUATED', 'RETRIEVAL_ERROR', 'INVALID_LABEL'].map((value) => ({
            value,
            label: evaluationStatus(value),
          }))}
        />
        <Table<EvaluationRunResult>
          className="evaluation-table"
          rowKey="id"
          scroll={{ x: 1000 }}
          dataSource={status ? results.filter((item) => item.status === status) : results}
          pagination={{ pageSize: 10, showSizeChanger: true }}
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
            { title: 'Recall@K', dataIndex: 'recallAtK', render: pct },
            { title: 'MRR', dataIndex: 'mrr', render: pct },
            { title: 'nDCG', dataIndex: 'ndcg', render: pct },
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
  );
}
