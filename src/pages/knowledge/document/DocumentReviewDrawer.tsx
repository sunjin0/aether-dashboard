import { DrawerForm } from '@ant-design/pro-components'
import { Alert, Button, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { KnowledgeDocumentVersion, ReviewStatus } from '@/services/entity/Agent'
import { getDocumentVersions } from '@/services/knowledge/DocumentController'
import { getLatestAiReview } from '@/services/knowledge/ReviewController'
import DiffWorkspace from '../review/detail/DiffWorkspace'

interface Props {
  documentId?: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const DocumentReviewDrawer: React.FC<Props> = ({ documentId, open, onClose, onSuccess }) => {
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
          if (!cancelled) setError('No document version is available')
          return
        }
        const latestReview = (await getLatestAiReview(currentVersion.id)).data
        if (!cancelled) {
          setVersion(currentVersion)
          setReviewId(latestReview?.id || '')
        }
      } catch {
        if (!cancelled) setError('Failed to load document review status')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [documentId, open, reloadKey])

  return (
    <DrawerForm
      title="文档 AI 审阅"
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      drawerProps={{ destroyOnClose: true, width: '100vw', styles: { body: { padding: 0 } } }}
      submitter={false}
    >
      {loading && <Spin spinning tip="正在加载文档审阅..."><div style={{ minHeight: 400 }} /></Spin>}
      {!loading && error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => setReloadKey((key) => key + 1)}>重试</Button>} style={{ margin: 24 }} />}
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
