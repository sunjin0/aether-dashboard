import { history, useIntl, useLocation, useParams } from '@umijs/max'
import { Alert, Button, Result, Spin } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { Document, KnowledgeDocumentVersion } from '@/services/entity/Agent'
import { getDocument, getDocumentVersions } from '@/services/knowledge/DocumentController'
import { getLatestAiReview } from '@/services/knowledge/ReviewController'
import DiffWorkspace from './DiffWorkspace'

const getSafeReturnTo = (search: string, fallback: string) => {
  const value = new URLSearchParams(search).get('returnTo')
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}

const DocumentReviewPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>()
  const intl = useIntl()
  const location = useLocation()
  const returnTo = getSafeReturnTo(location.search, '/knowledge/document')
  const [document, setDocument] = useState<Document>()
  const [version, setVersion] = useState<KnowledgeDocumentVersion>()
  const [reviewId, setReviewId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    setError('')
    try {
      const [documentResponse, versionResponse] = await Promise.all([
        getDocument(documentId),
        getDocumentVersions(documentId),
      ])
      const currentVersion = versionResponse.data?.[0]
      setDocument(documentResponse.data)
      setVersion(currentVersion)
      if (currentVersion?.id) {
        const reviewResponse = await getLatestAiReview(currentVersion.id)
        setReviewId(reviewResponse.data?.id || '')
      } else {
        setReviewId('')
      }
    } catch {
      setError(intl.formatMessage({ id: 'pages.knowledge.review.loadFailed' }))
    } finally {
      setLoading(false)
    }
  }, [documentId, intl])

  useEffect(() => {
    load()
  }, [load])

  if (!documentId) {
    return (
      <Result
        status="404"
        title={intl.formatMessage({ id: 'pages.knowledge.review.missingDocumentId' })}
        extra={<Button onClick={() => history.push(returnTo)}>{intl.formatMessage({ id: 'pages.knowledge.review.backToDocuments' })}</Button>}
      />
    )
  }

  if (loading) {
    return (
      <Spin spinning tip={intl.formatMessage({ id: 'pages.knowledge.review.loading' })}>
        <div style={{ minHeight: 480 }} />
      </Spin>
    )
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={error}
        action={
          <Button size="small" onClick={load}>
            {intl.formatMessage({ id: 'pages.common.retry' })}
          </Button>
        }
        style={{ margin: 24 }}
      />
    )
  }

  if (!version?.id) {
    return (
      <Result
        status="info"
        title={intl.formatMessage({ id: 'pages.knowledge.review.noReviewableVersion' })}
        extra={<Button onClick={() => history.push(returnTo)}>{intl.formatMessage({ id: 'pages.knowledge.review.backToDocuments' })}</Button>}
      />
    )
  }

  return (
    <DiffWorkspace
      reviewId={reviewId}
      documentVersionId={version.id}
      versionReviewStatus={version.reviewStatus}
      pageTitle={document?.title || intl.formatMessage({ id: 'pages.knowledge.review.workspaceTitle' })}
      pageSubTitle={version.versionNo ? `v${version.versionNo}` : undefined}
      backPath={returnTo}
      onApplied={load}
    />
  )
}

export default DocumentReviewPage
