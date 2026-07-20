import { PageContainer } from '@ant-design/pro-components'
import { useLocation } from '@umijs/max'
import { Alert, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { ReviewStatus } from '@/services/entity/Agent'
import { getDocumentVersions } from '@/services/knowledge/DocumentController'
import { getLatestAiReview } from '@/services/knowledge/ReviewController'
import DiffWorkspace from '../review/detail/DiffWorkspace'

export default () => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const documentId = params.get('id') || ''
  const requestedVersionId = params.get('version')
  const [reviewId, setReviewId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | string>('DRAFT')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!documentId) {
        setError('Missing document id')
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const versions = (await getDocumentVersions(documentId)).data || []
        const version =
          versions.find((item) => item.id === requestedVersionId) || versions[0]
        if (!version?.id) {
          setError('No document version is available')
          return
        }
        setVersionId(version.id)
        setReviewStatus(version.reviewStatus || 'DRAFT')
        const latestReview = (await getLatestAiReview(version.id)).data
        setReviewId(latestReview?.id || '')
      } catch {
        setError('Failed to load document review status')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [documentId, requestedVersionId])

  if (loading) {
    return (
      <PageContainer>
        <Spin spinning tip="Loading document...">
          <div style={{ minHeight: 400 }} />
        </Spin>
      </PageContainer>
    )
  }
  if (error) {
    return (
      <PageContainer>
        <Alert type="error" showIcon message={error} style={{ marginTop: 24 }} />
      </PageContainer>
    )
  }
  return (
    <DiffWorkspace
      reviewId={reviewId}
      documentVersionId={versionId}
      versionReviewStatus={reviewStatus}
    />
  )
}
