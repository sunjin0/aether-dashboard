// 这套 jest 配置不给 .tsx 做 TS 转换，类型位置上一旦出现导入绑定就直接语法报错；
// 这里沿用同一条约束：只写值，不写类型注解。
jest.mock('@/services/workflow/invocation/WorkflowInvocationController', () => ({
  getConversationWorkflowTasks: jest.fn(),
}))

import { act, renderHook, waitFor } from '@testing-library/react'
import { getConversationWorkflowTasks } from '@/services/workflow/invocation/WorkflowInvocationController'
import useWorkflowTasks from './useWorkflowTasks'

const getTasks = getConversationWorkflowTasks as jest.Mock

beforeEach(() => {
  getTasks.mockReset()
  getTasks.mockResolvedValue({ data: [], total: 0 })
})

describe('useWorkflowTasks', () => {
  it('opens on the unfiltered first page', async () => {
    renderHook(() => useWorkflowTasks('conv-1', false))

    // 不带筛选参数时后端走的是旧语义（只看未结束）；「全部」要靠显式传 all 才对。
    await waitFor(() => expect(getTasks).toHaveBeenCalledTimes(1))
    expect(getTasks).toHaveBeenCalledWith('conv-1', { current: 1, pageSize: 10, state: 'all' })
  })

  it('resets to the first page when the filter changes', async () => {
    const { result } = renderHook(() => useWorkflowTasks('conv-1', false))
    await waitFor(() => expect(getTasks).toHaveBeenCalledTimes(1))

    act(() => result.current.setCurrent(3))
    await waitFor(() =>
      expect(getTasks).toHaveBeenLastCalledWith('conv-1', expect.objectContaining({ current: 3 })),
    )

    act(() => result.current.setState('finished'))

    // 换了筛选还停在第 3 页，用户会看到「筛选后是空的」这种假象。
    await waitFor(() =>
      expect(getTasks).toHaveBeenLastCalledWith('conv-1', {
        current: 1,
        pageSize: 10,
        state: 'finished',
      }),
    )
  })

  it('reuses the current filter when refreshed by hand', async () => {
    const { result } = renderHook(() => useWorkflowTasks('conv-1', false))
    await waitFor(() => expect(getTasks).toHaveBeenCalledTimes(1))

    act(() => result.current.setState('running'))
    await waitFor(() =>
      expect(getTasks).toHaveBeenLastCalledWith(
        'conv-1',
        expect.objectContaining({ state: 'running' }),
      ),
    )
    const before = getTasks.mock.calls.length

    await act(async () => {
      await result.current.refresh()
    })

    expect(getTasks.mock.calls.length).toBe(before + 1)
    expect(getTasks).toHaveBeenLastCalledWith('conv-1', { current: 1, pageSize: 10, state: 'running' })
  })

  it('goes back to the first page when the conversation changes', async () => {
    const { result, rerender } = renderHook(({ id }) => useWorkflowTasks(id, false), {
      initialProps: { id: 'conv-1' },
    })
    await waitFor(() => expect(getTasks).toHaveBeenCalledTimes(1))
    act(() => result.current.setCurrent(3))
    await waitFor(() =>
      expect(getTasks).toHaveBeenLastCalledWith('conv-1', expect.objectContaining({ current: 3 })),
    )

    rerender({ id: 'conv-2' })

    await waitFor(() =>
      expect(getTasks).toHaveBeenLastCalledWith('conv-2', {
        current: 1,
        pageSize: 10,
        state: 'all',
      }),
    )
    // 复位必须发生在发请求之前：否则新会话会先用旧页码发一次，闪一帧上一个会话的数据。
    expect(getTasks.mock.calls.filter(([id]) => id === 'conv-2')).toHaveLength(1)
  })

  it('does not poll while the turn is idle', async () => {
    renderHook(() => useWorkflowTasks('conv-1', false))
    await waitFor(() => expect(getTasks).toHaveBeenCalledTimes(1))

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 50))
    })

    // 空闲页面每 3 秒打一次接口是纯浪费；轮询只在流式过程中跑。
    expect(getTasks).toHaveBeenCalledTimes(1)
  })
})
