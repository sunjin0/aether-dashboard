import DrawerForm from '@/components/DrawerForm'
import { Alert, Button, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { KnowledgeDocumentVersion, ReviewStatus } from '@/services/entity/Agent'
import { getDocumentVersions } from '@/services/knowledge/DocumentController'
import { getLatestAiReview } from '@/services/knowledge/ReviewController'
import { useIntl } from '@umijs/max'
import DiffWorkspace from '../review/detail/DiffWorkspace'

interface Props {
  documentId?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentReviewDrawer: React.FC<Props> = ({ documentId, open, onClose, onSuccess }) => {
  const intl = useIntl()
  const [version, setVersion] = useState<KnowledgeDocumentVersion>()
  const [reviewId, setReviewId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!documentId || !open) return
      setLoading(true)
      setError('')
      try {
        const versions = (await getDocumentVersions(documentId)).data || []
        const currentVersion = versions[0]
        if (!currentVersion?.id) {
          if (!cancelled) setError(intl.formatMessage({ id: 'pages.knowledge.review.noDocumentVersion' }))
          return
        }
        const latestReview = (await getLatestAiReview(currentVersion.id)).data
        if (!cancelled) {
          setVersion(currentVersion)
          setReviewId(latestReview?.id || '')
        }
      } catch {
        if (!cancelled) setError(intl.formatMessage({ id: 'pages.knowledge.review.loadStatusFailed' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [documentId, intl, open, reloadKey])

  return (
    <DrawerForm
      title={intl.formatMessage({ id: 'pages.knowledge.review.documentAiReview' })}
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      drawerProps={{ destroyOnClose: true, width: '100vw', styles: { body: { padding: 0 } } }}
      submitter={false}
    >
      {loading && (
        <Spin spinning tip={intl.formatMessage({ id: 'pages.knowledge.review.loading' })}>
          <div style={{ minHeight: 400 }} />
        </Spin>
      )}
      {!loading && error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => setReloadKey((key) => key + 1)}>
              {intl.formatMessage({ id: 'pages.common.retry' })}
            </Button>
          }
          style={{ margin: 24 }}
        />
      )}
      {!loading && !error && version && (
        <DiffWorkspace
          embedded
          reviewId={reviewId}
          documentVersionId={version.id}
          versionReviewStatus={version.reviewStatus as ReviewStatus}
          onApplied={onSuccess}
        />
      )}
    </DrawerForm>
  )
}

export default DocumentReviewDrawer
