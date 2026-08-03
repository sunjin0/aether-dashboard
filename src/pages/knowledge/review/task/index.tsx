import { history, useIntl, useLocation, useParams } from '@umijs/max'
import { Button, Result } from 'antd'
import React from 'react'
import ReviewTaskPageComponent from '../ReviewTaskPage'

const getSafeReturnTo = (search: string, fallback: string) => {
  const value = new URLSearchParams(search).get('returnTo')
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}

const ReviewTaskPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>()
  const intl = useIntl()
  const location = useLocation()
  const returnTo = getSafeReturnTo(location.search, '/knowledge/reviews')
  const goBack = () => history.push(returnTo)

  if (!taskId) {
    return (
      <Result
        status="404"
        title={intl.formatMessage({ id: 'pages.knowledge.review.task.missingTaskId' })}
        extra={<Button onClick={goBack}>{intl.formatMessage({ id: 'pages.knowledge.review.task.backToReviewCenter' })}</Button>}
      />
    )
  }

  return (
    <ReviewTaskPageComponent
      taskId={taskId}
      onClose={goBack}
      onSuccess={() => undefined}
    />
  )
}

export default ReviewTaskPage
