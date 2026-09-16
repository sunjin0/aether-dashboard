import React from 'react'
import { getLocale, useIntl } from '@umijs/max'
import { Button, Pagination, Segmented, Tag, Tooltip } from 'antd'
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import type {
  WorkflowTask,
  WorkflowTaskState,
} from '@/services/workflow/invocation/WorkflowInvocationController'
import {
  formatWorkflowTaskTime,
  isWorkflowTaskTerminal,
  workflowTaskStatusColor,
  workflowTaskStatusMessageId,
} from './workflowTask'
import styles from './WorkflowTaskList.less'

type Props = {
  tasks: WorkflowTask[]
  total?: number
  loading?: boolean
  onRefresh?: () => void
  state?: WorkflowTaskState
  onStateChange?: (state: WorkflowTaskState) => void
  current?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

/** 与 useWorkflowTasks 的 PAGE_SIZE 同值；组件只负责画，不重新取数。 */
const DEFAULT_PAGE_SIZE = 10

/**
 * 消息流内嵌的工作任务列表。
 *
 * 只做展示、筛选与翻页：这些任务的推进由 agent 通过工作流工具完成，聊天页不提供操作入口，
 * 否则同一份状态会出现两套互相覆盖的写路径。
 */
const WorkflowTaskList: React.FC<Props> = ({
  tasks,
  total,
  loading,
  onRefresh,
  state = 'all',
  onStateChange,
  current = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
}) => {
  const intl = useIntl()
  // 筛选控件就在这个块里，所以只有「默认档且确实没有任务」时才整块隐藏。
  // 若照旧在空列表时直接 return null，用户切到「已结束」一旦为空就再也切不回来。
  if (!tasks.length && state === 'all') return null
  const locale = getLocale()
  const running = tasks.some((task) => !isWorkflowTaskTerminal(task.status))
  const count = total && total > tasks.length ? total : tasks.length

  return (
    <div className={styles.taskList} aria-live="polite">
      <div className={styles.header}>
        {running && <LoadingOutlined spin />}
        <span>{intl.formatMessage({ id: 'pages.agent.chat.workflowTasks.title' })}</span>
        <span className={styles.count}>
          {intl.formatMessage({ id: 'pages.agent.chat.workflowTasks.total' }, { count })}
        </span>
        <span className={styles.headerRight}>
          {onStateChange && (
            <Segmented
              size="small"
              value={state}
              options={[
                {
                  label: intl.formatMessage({ id: 'pages.agent.chat.workflowTasks.filter.all' }),
                  value: 'all',
                },
                {
                  label: intl.formatMessage({ id: 'pages.agent.chat.workflowTasks.filter.running' }),
                  value: 'running',
                },
                {
                  label: intl.formatMessage({ id: 'pages.agent.chat.workflowTasks.filter.finished' }),
                  value: 'finished',
                },
              ]}
              onChange={(value) => onStateChange(value as WorkflowTaskState)}
            />
          )}
          {onRefresh && (
            <Tooltip title={intl.formatMessage({ id: 'pages.agent.chat.workflowTasks.refresh' })}>
              <Button
                type="text"
                size="small"
                className={styles.refresh}
                icon={<ReloadOutlined spin={Boolean(loading)} />}
                onClick={onRefresh}
              />
            </Tooltip>
          )}
        </span>
      </div>
      {tasks.map((task) => {
        const label = task.workflowName || task.capabilityName || task.capabilityCode
        return (
          <div className={styles.row} key={task.invocationId}>
            <Tooltip title={task.capabilityCode || undefined}>
              <span className={styles.name}>{label || '—'}</span>
            </Tooltip>
            <Tag color={workflowTaskStatusColor(task.status)} className={styles.status}>
              {intl.formatMessage({ id: workflowTaskStatusMessageId(task.status) })}
            </Tag>
            <span className={styles.detail}>
              {task.currentNodeName ? (
                <span className={styles.node}>
                  {intl.formatMessage(
                    { id: 'pages.agent.chat.workflowTasks.currentNode' },
                    { node: task.currentNodeName },
                  )}
                </span>
              ) : null}
              <span className={styles.time}>
                {formatWorkflowTaskTime(task.startedAt, locale, intl.formatMessage)}
              </span>
            </span>
          </div>
        )
      })}
      {!tasks.length && (
        <div className={styles.empty}>
          {intl.formatMessage({ id: 'pages.agent.chat.workflowTasks.filter.empty' })}
        </div>
      )}
      {onPageChange && total != null && total > pageSize && (
        <div className={styles.footer}>
          <Pagination
            size="small"
            current={current}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}

export default WorkflowTaskList
