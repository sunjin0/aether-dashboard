import { history, useLocation, useParams } from '@umijs/max'
import { Button, Result } from 'antd'
import React from 'react'
import ReviewTaskDrawer from '../ReviewTaskDrawer'

const getSafeReturnTo = (search: string, fallback: string) => {
  const value = new URLSearchParams(search).get('returnTo')
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}

const ReviewTaskPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>()
  const location = useLocation()
  const returnTo = getSafeReturnTo(location.search, '/knowledge/reviews')
  const goBack = () => history.push(returnTo)

  if (!taskId) {
    return (
      <Result
        status="404"
        title="缺少审批任务标识"
        extra={<Button onClick={goBack}>返回审批中心</Button>}
      />
    )
  }

  return (
    <ReviewTaskDrawer
      taskId={taskId}
      open
      presentation="page"
      onClose={goBack}
      onSuccess={() => undefined}
    />
  )
}

export default ReviewTaskPage
