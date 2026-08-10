import { useIntl, useModel } from '@umijs/max'
import { message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import type { KnowledgeReviewTaskDetail } from '@/services/entity/Agent'
import {
  approveReviewTask,
  claimReviewTask,
  getReviewTask,
  rejectReviewTask,
} from '@/services/knowledge/ReviewController'
import { getAdminOptions } from '@/services/sys/AdminController'

interface UseReviewTaskOptions {
  taskId?: string
  open?: boolean
  onSuccess?: () => void
}

interface UseReviewTaskReturn {
  data?: KnowledgeReviewTaskDetail
  loading: boolean
  acting: boolean
  comment: string
  setComment: (value: string) => void
  canDecide: boolean
  act: (kind: 'claim' | 'approve' | 'reject') => Promise<void>
  refresh: () => Promise<void>
  getUserName: (id?: string) => string
}

export const useReviewTask = ({ taskId, open, onSuccess }: UseReviewTaskOptions): UseReviewTaskReturn => {
  const intl = useIntl()
  const { initialState } = useModel('@@initialState')
  const [data, setData] = useState<KnowledgeReviewTaskDetail>()
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [comment, setComment] = useState('')
  const [claimedByCurrentUser, setClaimedByCurrentUser] = useState(false)
  const [userMap, setUserMap] = useState<Record<string, string>>({})

  const canDecide =
    data?.status === 'claimed' &&
    (claimedByCurrentUser ||
      String(data.reviewerId || '') === String(initialState?.currentUser?.id || ''))

  const load = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const response = await getReviewTask(taskId)
      setData(response.data)
    } catch {
      // handled globally
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const getUserName = useCallback(
    (id?: string | number) => (id ? userMap[String(id)] || String(id) : '-'),
    [userMap],
  )

  useEffect(() => {
    if (!open || !taskId) return
    setClaimedByCurrentUser(false)
    setComment('')
    getAdminOptions().then((options) => {
      const map: Record<string, string> = {}
      for (const option of options) {
        if (option.value) map[String(option.value)] = option.label || String(option.value)
      }
      setUserMap(map)
    })
    load()
  }, [open, taskId, load])

  const act = useCallback(
    async (kind: 'claim' | 'approve' | 'reject') => {
      if (!taskId) return
      if (kind === 'reject' && !comment.trim()) {
        message.warning(intl.formatMessage({ id: 'pages.knowledge.review.rejectReasonRequired' }))
        return
      }
      setActing(true)
      try {
        const response =
          kind === 'claim'
            ? await claimReviewTask(taskId)
            : kind === 'approve'
              ? await approveReviewTask(taskId, comment)
              : await rejectReviewTask(taskId, comment)
        if (response.code === 200) {
          onSuccess?.()
          if (kind === 'claim') {
            setClaimedByCurrentUser(true)
            setData((current) => (current ? { ...current, status: 'claimed' } : current))
          } else if (kind === 'approve') {
            setData((current) => (current ? { ...current, status: 'approved' } : current))
          } else {
            load()
          }
        }
      } catch {
        // handled globally
      } finally {
        setActing(false)
      }
    },
    [taskId, comment, onSuccess, load, intl],
  )

  return { data, loading, acting, comment, setComment, canDecide, act, refresh: load, getUserName }
}
