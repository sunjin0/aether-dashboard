import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getConversationWorkflowTasks,
  type WorkflowTask,
  type WorkflowTaskState,
} from '@/services/workflow/invocation/WorkflowInvocationController'
import { allWorkflowTasksTerminal } from './workflowTask'

/** 一屏内看得完的条数；后端硬上限 50，这里是展示上的收敛。 */
const PAGE_SIZE = 10
const POLL_INTERVAL_MS = 3000

/**
 * 本会话的工作流任务。
 *
 * <p>没有服务端缓存，也不该有：展示状态派生自工作流实例状态，而实例状态会在不触碰调用行的情况下变化，
 * 不存在可靠的失效键。因此靠轮询 —— 但只在流式过程中，且未筛选时全部进入终态后停，避免空闲页面刷请求。
 */
export default function useWorkflowTasks(conversationId: string | undefined, active: boolean) {
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<WorkflowTaskState>('all')
  const [current, setCurrent] = useState(1)
  /** 手动刷新要把「已经停下来的轮询」重新武装起来，见下面那个 effect 的依赖。 */
  const [reloadTick, setReloadTick] = useState(0)
  /** 只用来识别「换会话了」，好把页码复位。 */
  const [conversation, setConversation] = useState(conversationId)
  const tasksRef = useRef<WorkflowTask[]>([])
  tasksRef.current = tasks

  const load = useCallback(async () => {
    if (!conversationId) return
    try {
      setLoading(true)
      const response = await getConversationWorkflowTasks(conversationId, {
        current,
        pageSize: PAGE_SIZE,
        state,
      })
      setTasks(response?.data || [])
      setTotal(response?.total || 0)
    } catch {
      // 列表是旁路展示，取不到时保持上一次结果，不打断对话。
    } finally {
      setLoading(false)
    }
  }, [conversationId, state, current])

  // 换会话时在渲染期就复位，而不是放进 effect：放进 effect 的话这一帧会先用上一个会话的页码
  // 发一次请求，等复位生效再发第二次，用户会看到一帧别人的数据。
  if (conversation !== conversationId) {
    setConversation(conversationId)
    setTasks([])
    setTotal(0)
    setCurrent(1)
  }

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!conversationId || !active) return
    // 「这一页全终态」只在未筛选时勉强算「暂时没什么可看」。选「已结束」时它恒真，
    // 轮询会立刻停死，流式过程中新完成的任务就再也刷不出来。
    const idle = () => state === 'all' && allWorkflowTasksTerminal(tasksRef.current)
    if (idle()) return
    const timer = window.setInterval(() => {
      if (idle()) {
        window.clearInterval(timer)
        return
      }
      void load()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
    // reloadTick 只是为了让手动刷新能重新起一个定时器，不参与取值。
  }, [conversationId, active, state, load, tasks.length, reloadTick])

  const changeState = useCallback((next: WorkflowTaskState) => {
    setState(next)
    // 换了筛选还停在第 3 页是明确的 bug。
    setCurrent(1)
  }, [])

  const refresh = useCallback(() => {
    setReloadTick((tick) => tick + 1)
    return load()
  }, [load])

  return { tasks, total, loading, refresh, state, setState: changeState, current, setCurrent }
}
