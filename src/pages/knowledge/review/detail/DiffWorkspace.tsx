import { PageContainer } from '@ant-design/pro-components'
import { history, useIntl, useLocation } from '@umijs/max'
import { Alert, Button, Col, Empty, message, Result, Row, Spin } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { AiReviewDiffIssue } from '@/services/entity/Agent'
import { startAiReview, submitReview } from '@/services/knowledge/ReviewController'
import ReviewDiffEditor from './components/ReviewDiffEditor'
import ReviewDiffToolbar from './components/ReviewDiffToolbar'
import ReviewIssueList from './components/ReviewIssueList'
import ReplacementEditor from './components/ReplacementEditor'
import { severityOrder } from './constants'
import { useAiReviewDiff } from './hooks/useAiReviewDiff'
import { ReviewIssueFilter } from './types'

interface Props {
  reviewId?: string
  documentVersionId?: string
  versionReviewStatus?: string
  onApplied?: () => void
  onReviewStatusChange?: (status?: string) => void
}

const DiffWorkspace: React.FC<Props> = ({
  reviewId: reviewIdProp,
  documentVersionId,
  versionReviewStatus,
  onApplied,
  onReviewStatusChange,
}) => {
  const intl = useIntl()
  const errorText = (error: unknown) => {
    const value = error as {
        response?: { status?: number; data?: { message?: string; code?: number } }
        status?: number
        message?: string
      }
    const statusCode = value?.response?.status || value?.status
    if (statusCode === 409) return intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.conflict' })
    if (statusCode === 404) return intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.notFound' })
    if (statusCode === 400) return intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.badRequest' })
    return value?.message || intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.error.unknown' })
  }
  const location = useLocation()
  const reviewId = reviewIdProp || new URLSearchParams(location.search).get('id') || ''
  const {
    diff,
    loading,
    conflict,
    refresh,
    accept,
    reject,
    unaccept,
    acceptBatch,
    applyAccepted,
  } = useAiReviewDiff(reviewId)
  const [filter, setFilter] = useState<ReviewIssueFilter>('all')
  const [activeIssue, setActiveIssue] = useState<AiReviewDiffIssue>()
  const [replacementIssue, setReplacementIssue] = useState<AiReviewDiffIssue>()
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState(false)
  const [justApplied, setJustApplied] = useState(false)
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

  useEffect(() => {
    if (conflict) {
      setActiveIssue(undefined)
      setReplacementIssue(undefined)
      setApplied(false)
    }
  }, [conflict])

  useEffect(() => {
    if (onReviewStatusChange) {
      onReviewStatusChange(diff?.reviewStatus || versionReviewStatus)
    }
  }, [diff?.reviewStatus, versionReviewStatus, onReviewStatusChange])

  const runAiReview = async () => {
    const targetVersionId = diff?.documentVersionId || documentVersionId
    if (!targetVersionId) return
    setBusy(true)
    try {
      await startAiReview(targetVersionId)
      setApplied(false)
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
      message.success(intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.acceptSuccess' }))
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
      message.success(intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.ignoreSuccess' }))
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
      message.success(intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.unacceptSuccess' }))
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  const batchAcceptableIssues = useMemo(
    () =>
      (diff?.issues || []).filter(
        (issue) =>
          issue.handleStatus === 'pending' &&
          issue.suggestedPatch &&
          issue.severity !== 'critical',
      ),
    [diff?.issues],
  )

  const batchAccept = async () => {
    if (batchAcceptableIssues.length === 0) return
    setBusy(true)
    try {
      await acceptBatch(batchAcceptableIssues.map((issue) => issue.id))
      message.success(intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.batchAcceptSuccess' }))
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
      message.success(intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.applySuccess' }))
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

  const submit = async () => {
    const targetVersionId = diff?.documentVersionId || documentVersionId
    if (!targetVersionId) return
    setBusy(true)
    try {
      const response = await submitReview(targetVersionId)
      if (response.code === 200) {
        message.success(intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.submitSuccess' }))
        if (response.data) {
          history.push(`/knowledge/review/detail?id=${response.data}`)
        } else {
          history.push('/knowledge/reviews')
        }
      } else {
        message.error(response.message || intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.submitFailed' }))
      }
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }
  console.log('DiffWorkspace', {
    status,
    diff,
    busy,
    reviewId,
    documentVersionId,
    versionReviewStatus,
  })
  const canSubmit =
    (status === 'AI_REVIEWED' || status === 'DRAFT') &&
    !busy &&
    (diff?.documentVersionId || documentVersionId)
  console.log('canSubmit', canSubmit)

  const stale = !diff || diff.stale || !isDiffAvailable
  const stateContent = () => {
    if (status === 'DRAFT')
      return (
        <Result
          status="info"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.draft' })}
          subTitle={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.draftDesc' })}
          extra={
            <Button type="primary" onClick={() => history.push('/knowledge/document')}>
              {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.back' })}
            </Button>
          }
        />
      )
    if (status === 'AI_REVIEWING')
      return (
        <Result
          status="info"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.reviewing' })}
          subTitle={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.reviewingDesc' })}
          extra={
            <Button loading={loading} onClick={refresh}>
              {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.refreshStatus' })}
            </Button>
          }
        />
      )
    if (status === 'SUBMITTED')
      return (
        <Result
          status="info"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.submitted' })}
          subTitle={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.submittedDesc' })}
        />
      )
    if (status === 'APPROVED')
      return (
        <Result
          status="success"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.approved' })}
          subTitle={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.approvedDesc' })}
        />
      )
    if (status === 'REJECTED')
      return (
        <Result
          status="error"
          title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.rejected' })}
          subTitle={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.rejectedDesc' })}
        />
      )
    if (!diff) return <Empty description={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.noResult' })} />
    return (
      <Result
        status="error"
        title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.failed' })}
        subTitle={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.failedDesc' })}
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
      title={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.title' })}
      onBack={() => history.push('/knowledge/document')}
      extra={
        <Button onClick={refresh}>{intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.refresh' })}</Button>
      }
    >
      <Spin spinning={loading && !diff}>
        {conflict && (
          <Alert
            type="warning"
            showIcon
            message={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.alert.changed' })}
            style={{ marginBottom: 12 }}
          />
        )}
        {justApplied && (
          <Alert
            type="success"
            showIcon
            message={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.applySuccess' })}
            style={{ marginBottom: 12 }}
            closable
            onClose={() => setJustApplied(false)}
            action={
              <Button size="small" type="primary" onClick={runAiReview}>
                {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.rerun' })}
              </Button>
            }
          />
        )}
        {applied && (
          <Alert
            type="success"
            showIcon
            message={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.alert.appliedSaved' })}
            style={{ marginBottom: 12 }}
            closable
            onClose={() => setApplied(false)}
            action={
              <Button size="small" type="primary" onClick={runAiReview}>
                {intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.state.rerun' })}
              </Button>
            }
          />
        )}
        {diff?.stale && (
          <Alert
            type="warning"
            showIcon
            message={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.alert.staleTitle' })}
            description={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.alert.staleDesc' })}
            style={{ marginBottom: 12 }}
          />
        )}
        {diff && (
          <ReviewDiffToolbar
            diff={diff}
            busy={busy}
            batchCount={batchAcceptableIssues.length}
            acceptedCount={diff.acceptedCount}
            onRerun={runAiReview}
            onBatchAccept={batchAcceptableIssues.length > 0 ? batchAccept : undefined}
            onApplyAccepted={
              diff.acceptedCount > 0 && !diff.stale && !justApplied ? applyAcceptedChanges : undefined
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
                message={intl.formatMessage({ id: 'pages.knowledge.review.diffWorkspace.alert.noPending' })}
                style={{ marginBottom: 12 }}
              />
            )}
            {diff ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <ReviewDiffEditor diff={diff} activeIssue={activeIssue} />
                </Col>
                <Col xs={24} lg={8}>
                  <ReviewIssueList
                    issues={issues}
                    filter={filter}
                    activeId={activeIssue?.id}
                    disabled={stale || busy || isReadOnly}
                    busyId={busy ? replacementIssue?.id : undefined}
                    onFilter={setFilter}
                    onSelect={setActiveIssue}
                    onAccept={(issue) => {
                      if (issue.suggestedPatch && issue.handleStatus === 'pending') {
                        setReplacementIssue(issue)
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
    </PageContainer>
  )
}
export default DiffWorkspace
