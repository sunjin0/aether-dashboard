import { useCallback, useEffect, useState } from 'react'
import { ResponseStructure } from '@/services/entity/Common'
import { AiReviewDiff, AiReviewDiffIssue } from '@/services/entity/Agent'
import {
  acceptAiReviewIssue,
  acceptAiReviewIssues,
  applyAcceptedAiReviewIssues,
  getAiReviewDiff,
  rejectAiReviewIssue,
  unacceptAiReviewIssue,
} from '@/services/knowledge/ReviewController'

const isConflict = (error: unknown) => {
  const value = error as { response?: { status?: number }; status?: number }
  return value?.response?.status === 409 || value?.status === 409
}
export const useAiReviewDiff = (reviewId: string) => {
  const [diff, setDiff] = useState<AiReviewDiff>()
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState(false)
  const refresh = useCallback(async () => {
    if (!reviewId) return
    setLoading(true)
    try {
      const response = await getAiReviewDiff(reviewId)
      setDiff(response.data)
      setConflict(false)
    } finally { setLoading(false) }
  }, [reviewId])
  useEffect(() => { refresh() }, [refresh])
  const mutate = async <T,>(action: () => Promise<ResponseStructure<T>>): Promise<T> => {
    try {
      const result = await action()
      await refresh()
      return result.data
    } catch (error) {
      if (isConflict(error)) { setConflict(true) }
      await refresh()
      throw error
    }
  }
  const accept = (issue: AiReviewDiffIssue, replacement?: string) => {
    if (!diff) return Promise.reject(new Error('Diff is not loaded'))
    return mutate(() =>
      acceptAiReviewIssue(reviewId, issue.id, {
        expectedChecksum: diff.contentChecksum,
        replacement,
      }),
    )
  }
  const reject = (issue: AiReviewDiffIssue, comment?: string) =>
    mutate(() => rejectAiReviewIssue(reviewId, issue.id, { comment }))
  const unaccept = (issue: AiReviewDiffIssue, comment?: string) =>
    mutate(() => unacceptAiReviewIssue(reviewId, issue.id, { comment }))
  const acceptBatch = (issueIds: string[], comment?: string) => {
    if (!diff) return Promise.reject(new Error('Diff is not loaded'))
    return mutate(() =>
      acceptAiReviewIssues(reviewId, { issueIds, expectedChecksum: diff.contentChecksum, comment }),
    )
  }
  const applyAccepted = (comment?: string) => {
    if (!diff) return Promise.reject(new Error('Diff is not loaded'))
    return mutate(() => applyAcceptedAiReviewIssues(reviewId, { expectedChecksum: diff.contentChecksum }))
  }
  return { diff, loading, conflict, refresh, accept, reject, unaccept, acceptBatch, applyAccepted }
}
