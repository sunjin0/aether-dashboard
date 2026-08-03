import { PageContainer } from '@ant-design/pro-components'
import { history, useIntl, useLocation } from '@umijs/max'
import { Alert, Button, Checkbox, Col, Empty, message, Modal, Result, Row, Space, Spin, Tag } from 'antd'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AiReviewDiffIssue } from '@/services/entity/Agent'
import { startAiReview, submitReview } from '@/services/knowledge/ReviewController'
import ReviewDiffEditor from './components/ReviewDiffEditor'
import ReviewDiffToolbar from './components/ReviewDiffToolbar'
import ReviewIssueList from './components/ReviewIssueList'
import ReplacementEditor from './components/ReplacementEditor'
import {
  issueTypeColor,
  issueTypeLabelKey,
  patchOperationLabelKey,
  severityColor,
  severityLabelKey,
  severityOrder,
} from './constants'
import { useAiReviewDiff } from './hooks/useAiReviewDiff'
import { useReviewShortcuts } from './hooks/useReviewShortcuts'
import { countUnappliedAcceptedIssues } from './reviewState'
import type { ReviewIssueFilter } from './types'
import './DiffWorkspace.less'

interface Props {
  reviewId?: string;
  documentVersionId?: string;
  versionReviewStatus?: string;
  pageTitle?: React.ReactNode;
  pageSubTitle?: React.ReactNode;
  backPath?: string;
  embedded?: boolean;
  onApplied?: () => void;
  onReviewStatusChange?: (status?: string) => void;
}

const DiffWorkspace: React.FC<Props> = ({
  reviewId: reviewIdProp,
  documentVersionId,
  versionReviewStatus,
  pageTitle,
  pageSubTitle,
  backPath = '/knowledge/document',
  embedded = false,
  onApplied,
  onReviewStatusChange,
}) => {
  const intl = useIntl()
  const errorText = (error: unknown) => {
    const value = error as {
      response?: { status?: number; data?: { message?: string; code?: number } };
      status?: number;
      message?: string;
    }
    const statusCode = value?.response?.status || value?.status
    if (statusCode === 409)
      return intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.conflict' })
    if (statusCode === 404)
      return intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.notFound' })
    if (statusCode === 400)
      return intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.badRequest' })
    return (
      value?.message ||
      intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.unknown' })
    )
  }
  const localizedSeverity = (severity: string) =>
    intl.formatMessage({ id: severityLabelKey[severity] || severity })
  const localizedIssueType = (type?: string) =>
    type ? intl.formatMessage({ id: issueTypeLabelKey[type] || type }) : ''
  const localizedOperation = (patch: unknown) => {
    if (!patch) return ''
    if (typeof patch === 'string') {
      try {
        const parsed = JSON.parse(patch)
        return intl.formatMessage({ id: patchOperationLabelKey[parsed.operation] || parsed.operation })
      } catch {
        return ''
      }
    }
    const obj = patch as { operation?: string }
    return obj.operation
      ? intl.formatMessage({ id: patchOperationLabelKey[obj.operation] || obj.operation })
      : ''
  }

  const location = useLocation()
  const reviewId = reviewIdProp || new URLSearchParams(location.search).get('id') || ''
  const { diff, loading, conflict, refresh, accept, reject, unaccept, acceptBatch, applyAccepted } =
    useAiReviewDiff(reviewId, documentVersionId)
  const [filter, setFilter] = useState<ReviewIssueFilter>('all')
  const [activeIssue, setActiveIssue] = useState<AiReviewDiffIssue>()
  const [replacementIssue, setReplacementIssue] = useState<AiReviewDiffIssue>()
  const [busy, setBusy] = useState(false)
  const [justApplied, setJustApplied] = useState(false)
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchSelection, setBatchSelection] = useState<string[]>([])
  const shortcutHintRef = useRef<HTMLDivElement>(null)

  const status = (diff?.reviewStatus || versionReviewStatus || '').toUpperCase()
  const isDiffAvailable = status === 'AI_REVIEWED'
  const isReadOnly = ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)

  const issues = useMemo(
    () =>
      (diff?.issues || [])
        .filter(
          (issue) =>
            filter === 'all' ||
            (filter === 'risk'
              ? ['critical', 'high'].includes(issue.severity)
              : issue.handleStatus === filter),
        )
        .sort(
          (a, b) =>
            (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) ||
            (a.baseStartLine || 0) - (b.baseStartLine || 0),
        ),
    [diff?.issues, filter],
  )

  const batchAcceptableIssues = useMemo(
    () =>
      (diff?.issues || []).filter(
        (issue) =>
          issue.handleStatus === 'pending' && issue.suggestedPatch && issue.severity !== 'critical',
      ),
    [diff?.issues],
  )

  useEffect(() => {
    if (conflict) {
      setActiveIssue(undefined)
      setReplacementIssue(undefined)
    }
  }, [conflict])

  useEffect(() => {
    if (onReviewStatusChange) {
      onReviewStatusChange(diff?.reviewStatus || versionReviewStatus)
    }
  }, [diff?.reviewStatus, versionReviewStatus, onReviewStatusChange])

  useEffect(() => {
    const current = issues.find((issue) => issue.id === activeIssue?.id)
    if (current) {
      if (current !== activeIssue) setActiveIssue(current)
      return
    }
    setActiveIssue(issues.find((issue) => issue.handleStatus === 'pending') || issues[0])
  }, [issues, activeIssue])

  useEffect(() => {
    if (status !== 'AI_REVIEWING') return
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [status, refresh])

  const selectNextPendingIssue = useCallback(
    (currentId: string) => {
      const currentIndex = issues.findIndex((issue) => issue.id === currentId)
      const followingIssues = [...issues.slice(currentIndex + 1), ...issues.slice(0, currentIndex)]
      setActiveIssue(
        followingIssues.find((issue) => issue.handleStatus === 'pending') || followingIssues[0],
      )
    },
    [issues],
  )

  const selectPrevIssue = useCallback(() => {
    if (!activeIssue) return
    const currentIndex = issues.findIndex((issue) => issue.id === activeIssue.id)
    const prevIndex = currentIndex <= 0 ? issues.length - 1 : currentIndex - 1
    setActiveIssue(issues[prevIndex])
  }, [issues, activeIssue])

  const handleAcceptCurrent = useCallback(() => {
    if (!activeIssue) return
    if (activeIssue.suggestedPatch && activeIssue.handleStatus === 'pending') {
      setReplacementIssue(activeIssue)
    } else if (activeIssue.handleStatus === 'pending') {
      acceptOne(activeIssue)
    }
  }, [activeIssue])

  const handleRejectCurrent = useCallback(() => {
    if (activeIssue && activeIssue.handleStatus === 'pending') {
      ignoreOne(activeIssue)
    }
  }, [activeIssue])

  useReviewShortcuts(isDiffAvailable && !isReadOnly, {
    onAccept: handleAcceptCurrent,
    onReject: handleRejectCurrent,
    onNext: () => activeIssue && selectNextPendingIssue(activeIssue.id),
    onPrev: selectPrevIssue,
    onBatchAccept: () => {
      if (batchAcceptableIssues.length > 0) {
        setBatchSelection(batchAcceptableIssues.map((i) => i.id))
        setBatchModalOpen(true)
      }
    },
  })

  const runAiReview = async () => {
    const targetVersionId = diff?.documentVersionId || documentVersionId
    if (!targetVersionId) return
    setBusy(true)
    try {
      await startAiReview(targetVersionId)
      setJustApplied(false)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const acceptOne = async (issue: AiReviewDiffIssue, replacement?: string) => {
    setBusy(true)
    try {
      await accept(issue, replacement)
      setJustApplied(false)
      message.success(
        intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.acceptSuccess' }),
      )
      selectNextPendingIssue(issue.id)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBusy(false)
      setReplacementIssue(undefined)
    }
  }

  const ignoreOne = async (issue: AiReviewDiffIssue) => {
    setBusy(true)
    try {
      await reject(issue)
      message.success(
        intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.ignoreSuccess' }),
      )
      selectNextPendingIssue(issue.id)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  const unacceptOne = async (issue: AiReviewDiffIssue) => {
    setBusy(true)
    try {
      await unaccept(issue)
      setJustApplied(false)
      message.success(
        intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.unacceptSuccess' }),
      )
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  const handleBatchAccept = async () => {
    if (batchSelection.length === 0) return
    setBusy(true)
    try {
      await acceptBatch(batchSelection)
      setJustApplied(false)
      setBatchModalOpen(false)
      message.success(
        intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.batchAcceptSuccess' }),
      )
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  const applyAcceptedChanges = async () => {
    if ((diff?.acceptedCount || 0) === 0) return
    setBusy(true)
    try {
      const result = await applyAccepted()
      setJustApplied(true)
      message.success(
        intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.applySuccess' }),
      )
      if (result?.reviewStatus) {
        onReviewStatusChange?.(result.reviewStatus)
      }
      onApplied?.()
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  const [submitResult, setSubmitResult] = useState<{ taskId: string; returnTo: string } | null>(null)

  const submit = async () => {
    if ((diff?.criticalPendingCount || 0) > 0) {
      Modal.confirm({
        title: intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.submitCriticalWarning' }),
        content: intl.formatMessage(
          { id: 'pages.knowledge.review.diffWorkspace.submitCriticalDesc' },
          { count: diff?.criticalPendingCount },
        ),
        onOk: doSubmit,
      })
      return
    }
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.submitConfirmTitle' }),
      content: intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.submitConfirmDesc' }),
      onOk: doSubmit,
    })
  }

  const doSubmit = async () => {
    const targetVersionId = diff?.documentVersionId || documentVersionId
    if (!targetVersionId) return
    setBusy(true)
    try {
      const response = await submitReview(targetVersionId)
      if (response.code === 200) {
        const taskId = response.data
        const returnTo = backPath
        setSubmitResult(taskId ? { taskId, returnTo } : { taskId: '', returnTo })
        setTimeout(() => {
          if (taskId) {
            history.push(`/knowledge/reviews/${taskId}?returnTo=${encodeURIComponent(returnTo)}`)
          } else {
            history.push('/knowledge/reviews')
          }
        }, 1500)
      }
    } catch (error) {
      // API failures are displayed by the global request handler.
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    (status === 'AI_REVIEWED' || status === 'DRAFT') &&
    !busy &&
    (diff?.documentVersionId || documentVersionId)
  const unappliedAcceptedCount = countUnappliedAcceptedIssues(diff?.issues)
  const stale = !diff || diff.stale || !isDiffAvailable
  const workspaceAlert = conflict
    ? {
      type: 'warning' as const,
      message: intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.alert.changed' }),
    }
    : diff?.stale
      ? {
        type: 'warning' as const,
        message: intl.formatMessage({
          id: 'pages.knowledge.review.diffWorkspace.alert.staleTitle',
        }),
        description: intl.formatMessage({
          id: 'pages.knowledge.review.diffWorkspace.alert.staleDesc',
        }),
      }
      : justApplied
        ? {
          type: 'success' as const,
          message: intl.formatMessage({
            id: 'pages.knowledge.review.diffWorkspace.applySuccess',
          }),
          action: (
            <Button size="small" type="primary" onClick={runAiReview}>
              {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.rerun' })}
            </Button>
          ),
        }
        : undefined

  const stateContent = () => {
    if (status === 'DRAFT')
      return (
        <Result
          status="info"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.draft' })}
          subTitle={intl.formatMessage({
            id: 'pages.knowledge.review.diffWorkspace.state.draftDesc',
          })}
          extra={
            <Space>
              <Button type="primary" loading={busy} onClick={runAiReview}>
                {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.startAiReview' })}
              </Button>
              <Button onClick={() => history.push('/knowledge/document')}>
                {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.back' })}
              </Button>
            </Space>
          }
        />
      )
    if (status === 'AI_REVIEWING')
      return (
        <Result
          status="info"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.reviewing' })}
          subTitle={intl.formatMessage({
            id: 'pages.knowledge.review.diffWorkspace.state.reviewingDesc',
          })}
          extra={
            <Button loading={loading} onClick={refresh}>
              {intl.formatMessage({
                id: 'pages.knowledge.review.diffWorkspace.state.refreshStatus',
              })}
            </Button>
          }
        />
      )
    if (status === 'SUBMITTED')
      return (
        <Result
          status="info"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.submitted' })}
          subTitle={intl.formatMessage({
            id: 'pages.knowledge.review.diffWorkspace.state.submittedDesc',
          })}
        />
      )
    if (status === 'APPROVED')
      return (
        <Result
          status="success"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.approved' })}
          subTitle={intl.formatMessage({
            id: 'pages.knowledge.review.diffWorkspace.state.approvedDesc',
          })}
        />
      )
    if (status === 'REJECTED')
      return (
        <Result
          status="error"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.rejected' })}
          subTitle={intl.formatMessage({
            id: 'pages.knowledge.review.diffWorkspace.state.rejectedDesc',
          })}
        />
      )
    if (!diff)
      return (
        <Empty
          description={intl.formatMessage({
            id: 'pages.knowledge.review.diffWorkspace.state.noResult',
          })}
        />
      )
    return (
      <Result
        status="error"
        title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.failed' })}
        subTitle={intl.formatMessage({
          id: 'pages.knowledge.review.diffWorkspace.state.failedDesc',
        })}
        extra={
          <Button type="primary" loading={busy} onClick={runAiReview}>
            {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.rerun' })}
          </Button>
        }
      />
    )
  }

  return (
    <PageContainer
      title={
        embedded
          ? undefined
          : pageTitle || intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.title' })
      }
      subTitle={embedded ? undefined : pageSubTitle}
      onBack={embedded ? undefined : () => history.push(backPath)}
      extra={
        embedded ? undefined : (
          <Button onClick={refresh}>
            {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.refresh' })}
          </Button>
        )
      }
    >
      <Spin spinning={loading && !diff}>
        {workspaceAlert && (
          <Alert
            {...workspaceAlert}
            showIcon
            style={{ marginBottom: 12 }}
            closable={Boolean(justApplied && !conflict && !diff?.stale)}
            onClose={() => setJustApplied(false)}
          />
        )}
        {diff && (
          <ReviewDiffToolbar
            diff={diff}
            busy={busy}
            batchCount={batchAcceptableIssues.length}
            acceptedCount={unappliedAcceptedCount}
            onRerun={status === 'DRAFT' ? runAiReview : undefined}
            onBatchAccept={batchAcceptableIssues.length > 0 ? () => {
              setBatchSelection(batchAcceptableIssues.map((i) => i.id))
              setBatchModalOpen(true)
            } : undefined}
            onApplyAccepted={
              unappliedAcceptedCount > 0 && !diff.stale ? applyAcceptedChanges : undefined
            }
            onSubmit={canSubmit ? submit : undefined}
          />
        )}
        {!isDiffAvailable ? (
          stateContent()
        ) : (
          <>
            {diff && diff.pendingCount === 0 && diff.acceptedCount === 0 && (
              <Alert
                type="success"
                showIcon
                message={intl.formatMessage({
                  id: 'pages.knowledge.review.diffWorkspace.alert.noPending',
                })}
                style={{ marginBottom: 12 }}
              />
            )}
            {isDiffAvailable && !isReadOnly && (
              <div
                ref={shortcutHintRef}
                style={{
                  marginBottom: 12,
                  padding: '6px 12px',
                  background: '#f6f8fa',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'rgba(0,0,0,0.45)',
                }}
              >
                <Tag>A</Tag> {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.shortcut.accept' })} <Tag>R</Tag> {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.shortcut.ignore' })} <Tag>N</Tag> {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.shortcut.next' })} <Tag>P</Tag> {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.shortcut.previous' })} <Tag>B</Tag> {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.shortcut.batchAccept' })}
              </div>
            )}
            {diff ? (
              <Row className="ai-review-workspace" gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <ReviewDiffEditor diff={diff} activeIssue={activeIssue} />
                </Col>
                <Col xs={24} lg={8}>
                  <ReviewIssueList
                    issues={issues}
                    filter={filter}
                    activeId={activeIssue?.id}
                    disabled={isReadOnly}
                    busyId={busy ? replacementIssue?.id : undefined}
                    onFilter={setFilter}
                    onSelect={setActiveIssue}
                    onAccept={(issue) => {
                      if (issue.suggestedPatch && issue.handleStatus === 'pending') {
                        setReplacementIssue(issue)
                      } else if (issue.handleStatus === 'pending') {
                        acceptOne(issue)
                      }
                    }}
                    onReject={ignoreOne}
                    onUnaccept={unacceptOne}
                  />
                </Col>
              </Row>
            ) : (
              stateContent()
            )}
          </>
        )}
      </Spin>
      <ReplacementEditor
        issue={replacementIssue}
        open={Boolean(replacementIssue)}
        loading={busy}
        onCancel={() => setReplacementIssue(undefined)}
        onConfirm={(replacement) => replacementIssue && acceptOne(replacementIssue, replacement)}
      />
      <Modal
        title={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.batchAcceptTitle' })}
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        onOk={handleBatchAccept}
        confirmLoading={busy}
        okText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.batchAcceptOkText' })}
        cancelText={intl.formatMessage({ id: 'pages.knowledge.review.diffToolbar.cancelText' })}
      >
        <p style={{ marginBottom: 12, color: 'rgba(0,0,0,0.45)' }}>
          {intl.formatMessage(
            { id: 'pages.knowledge.review.diffToolbar.batchAcceptDesc' },
            { count: batchSelection.length },
          )}
        </p>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {(batchAcceptableIssues || []).map((issue) => (
            <div
              key={issue.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <Checkbox
                checked={batchSelection.includes(issue.id)}
                onChange={(e) => {
                  setBatchSelection((prev) =>
                    e.target.checked
                      ? [...prev, issue.id]
                      : prev.filter((id) => id !== issue.id),
                  )
                }}
              />
              <div style={{ flex: 1 }}>
                <Space size="small" wrap>
                  <Tag color={severityColor[issue.severity] || 'default'}>
                    {localizedSeverity(issue.severity)}
                  </Tag>
                  {issue.issueType && (
                    <Tag color={issueTypeColor[issue.issueType] || 'default'}>
                      {localizedIssueType(issue.issueType)}
                    </Tag>
                  )}
                  {issue.suggestedPatch && (
                    <Tag color="processing">{localizedOperation(issue.suggestedPatch)}</Tag>
                  )}
                </Space>
                <div style={{ marginTop: 4 }}>{issue.message}</div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </PageContainer>
  )
}
export default DiffWorkspace
