import { PageContainer, ProFormTextArea } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max'
import {
  Alert,
  Button,
  Card,
  Col,
  List,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  KnowledgeAiReview,
  KnowledgeAiReviewIssue,
  KnowledgeDocumentVersion,
} from '@/services/entity/Agent'
import {
  getDocument,
  getDocumentVersion,
  getDocumentVersions,
  reviseDocumentVersion,
  updateDocumentDraft,
} from '@/services/knowledge/DocumentController'
import {
  getAiReviewIssues,
  getLatestAiReview,
  handleAiReviewIssue,
  startAiReview,
  submitReview,
} from '@/services/knowledge/ReviewController'
const state: Record<string, [string, string]> = {
  DRAFT: ['草稿', 'default'],
  AI_REVIEWING: ['AI 审查中', 'processing'],
  AI_REVIEWED: ['待处理 AI 建议', 'warning'],
  SUBMITTED: ['人工审批中', 'processing'],
  APPROVED: ['已通过', 'success'],
  REJECTED: ['已拒绝', 'error'],
}
export default () => {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const id = query.get('id') || ''
  const requested = query.get('version')
  const [versions, setVersions] = useState<KnowledgeDocumentVersion[]>([])
  const [version, setVersion] = useState<KnowledgeDocumentVersion>()
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('文档工作台')
  const [review, setReview] = useState<KnowledgeAiReview | null>()
  const [issues, setIssues] = useState<KnowledgeAiReviewIssue[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(
    async (versionId?: string) => {
      setLoading(true)
      try {
        const [d, v] = await Promise.all([getDocument(id), getDocumentVersions(id)])
        setTitle(d.data?.title || '文档工作台')
        setVersions(v.data || [])
        const target = versionId || requested || v.data?.[0]?.id
        if (target) {
          const detail = (await getDocumentVersion(target)).data
          setVersion(detail)
          setContent(detail.content || '')
          const ar = (await getLatestAiReview(target)).data
          setReview(ar)
          setIssues(ar?.id ? (await getAiReviewIssues(ar.id)).data || [] : [])
        }
      } finally {
        setLoading(false)
      }
    },
    [id, requested],
  )
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (!version?.id || !['pending', 'running'].includes(review?.status || '')) return
    const timer = setInterval(async () => {
      if (document.hidden) return
      const r = (await getLatestAiReview(version.id!)).data
      setReview(r)
      if (r?.id && !['pending', 'running'].includes(r.status || '')) {
        setIssues((await getAiReviewIssues(r.id)).data || [])
        load(version.id)
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [version?.id, review?.status, load])
  const editable = version?.reviewStatus === 'DRAFT' || version?.reviewStatus === 'AI_REVIEWED'
  const save = async () => {
    if (!version?.id) return
    const r = await updateDocumentDraft(version.id, content, version.contentChecksum || '')
    if (r.code === 200) {
      setVersion(r.data)
      message.success('草稿已保存')
    } else if (r.code === 409) {
      Modal.warning({
        title: '草稿已被其他操作更新',
        content: '为避免覆盖他人修改，已重新加载最新版本。',
      })
      load(version.id)
    }
  }
  const run = async () => {
    if (!version?.id) return
    await startAiReview(version.id)
    message.success('AI 审查已发起')
    load(version.id)
  }
  const submit = async () => {
    if (!version?.id) return
    const critical = issues.some(
      (x) => x.severity === 'critical' && (!x.status || x.status === 'pending'),
    )
    const go = async () => {
      const r = await submitReview(version.id!)
      if (r.code === 200) {
        message.success('已提交人工审批')
        load(version.id)
      }
    }
    critical
      ? Modal.confirm({
        title: '仍有未处理的严重问题',
        content: '确定忽略风险并提交吗？',
        onOk: go,
      })
      : go()
  }
  const badge = state[version?.reviewStatus || 'DRAFT']
  return (
    <PageContainer
      title={title}
      onBack={() => history.push('/knowledge/document')}
      extra={
        <Space>
          <Tag color={badge?.[1]}>{badge?.[0]}</Tag>
          <Button disabled={!editable} onClick={save}>保存</Button>
          <Button disabled={!editable} onClick={run}>AI 审查</Button>
          <Button
            type="primary"
            disabled={!['DRAFT', 'AI_REVIEWED'].includes(version?.reviewStatus || '')}
            onClick={submit}
          >
              提交审批
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={5}>
            <Card title="版本时间线">
              <Timeline
                items={versions.map((v) => ({
                  children: (
                    <Button type="link" onClick={() => load(v.id)}>
                      v{v.versionNo} · {state[v.reviewStatus || 'DRAFT']?.[0]}
                    </Button>
                  ),
                }))}
              />
              {version && !editable && (
                <Button
                  block
                  onClick={async () => {
                    const r = await reviseDocumentVersion(version.id!)
                    if (r.code === 200) load(r.data)
                  }}
                >
                  基于此版本修订
                </Button>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title={`正文 · v${version?.versionNo || '-'}`}>
              <ProFormTextArea
                value={content}
                readOnly={!editable}
                fieldProps={{
                  rows: 24,
                  onChange: (e) => setContent(e.target.value),
                }}
              />
            </Card>
          </Col>
          <Col span={7}>
            <Card>
              <Tabs
                items={[
                  {
                    key: 'ai',
                    label: 'AI 审查',
                    children: (
                      <>
                        <Alert
                          showIcon
                          type={review?.status === 'failed' ? 'error' : 'info'}
                          message={review?.summary || review?.errorMessage || '暂无审查结果'}
                          description={
                            review?.score !== undefined ? `评分：${review.score}` : undefined
                          }
                        />
                        <List
                          dataSource={issues}
                          renderItem={(x) => (
                            <List.Item
                              actions={
                                !x.status || x.status === 'pending'
                                  ? ['manually_fixed', 'ignored', 'rejected'].map((s) => (
                                    <Button
                                      key={s}
                                      size="small"
                                      onClick={async () => {
                                        await handleAiReviewIssue(x.id!, { status: s as any })
                                        load(version?.id)
                                      }}
                                    >
                                      {s === 'manually_fixed'
                                        ? '已修复'
                                        : s === 'ignored'
                                          ? '忽略'
                                          : '不采纳'}
                                    </Button>
                                  ))
                                  : []
                              }
                            >
                              <List.Item.Meta
                                title={
                                  <>
                                    <Tag color={x.severity === 'critical' ? 'red' : 'orange'}>
                                      {x.severity}
                                    </Tag>
                                    {x.title}
                                  </>
                                }
                                description={
                                  <>
                                    <Typography.Paragraph>{x.description}</Typography.Paragraph>
                                    {x.originalExcerpt && (
                                      <Typography.Text mark>{x.originalExcerpt}</Typography.Text>
                                    )}
                                    {x.suggestedPatch && (
                                      <Typography.Paragraph code>
                                        {x.suggestedPatch}
                                      </Typography.Paragraph>
                                    )}
                                  </>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      </>
                    ),
                  },
                  { key: 'approval', label: '审批记录', children: '提交后可在审批中心查看进度' },
                  { key: 'index', label: '索引分块', children: '审批通过后异步创建索引任务' },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  )
}



