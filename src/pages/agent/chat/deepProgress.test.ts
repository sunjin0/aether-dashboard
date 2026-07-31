import {
  cancelDeepRun,
  getDeepRunTasks,
  mergeDeepRunSteps,
  getDeepStepDisplayText,
} from './deepProgress'
import { AgentStreamRunStepData } from '@/services/entity/Agent'

describe('deep progress helpers', () => {
  it('deduplicates identified events, retains distinct anonymous events, and sorts by occurrence', () => {
    const steps = mergeDeepRunSteps(
      [
        { eventId: 'event-2', eventType: 'tool.completed', occurredAt: 20 },
        { eventType: 'step.started', occurredAt: 30 },
      ],
      { eventId: 'event-1', eventType: 'run.started', occurredAt: 10 },
    )
    const deduplicated = mergeDeepRunSteps(steps, {
      eventId: 'event-2',
      eventType: 'tool.completed',
      occurredAt: 20,
    })
    const withAnonymousEvent = mergeDeepRunSteps(deduplicated, {
      eventType: 'tool.started',
      occurredAt: 30,
    })

    expect(withAnonymousEvent.map((step) => step.eventId)).toEqual([
      'event-1',
      'event-2',
      undefined,
      undefined,
    ])
  })

  it('uses localized event labels when a formatter is supplied', () => {
    const formatMessage = jest.fn(({ id }) => id)
    expect(
      getDeepStepDisplayText(
        { eventType: 'tool.approval.required', data: { message: 'Waiting', actions: [{ name: 'get_current_time' }] } },
        formatMessage,
      ),
    ).toBe('pages.agent.run.steps.event.toolApprovalRequired')
    expect(formatMessage).toHaveBeenCalledWith(
      { id: 'pages.agent.run.steps.event.toolApprovalRequired' },
      { toolName: 'get_current_time' },
    )
  })

  it('uses only string messages or event types for progress labels without a formatter', () => {
    expect(getDeepStepDisplayText({ data: { message: 'Searching knowledge' } })).toBe(
      'Searching knowledge',
    )
    expect(
      getDeepStepDisplayText({
        data: { message: { unsafe: true } },
        eventType: 'tool.started',
      } as unknown as AgentStreamRunStepData),
    ).toBe('tool.started')
    expect(
      getDeepStepDisplayText({ data: { message: ['unsafe'] } } as unknown as AgentStreamRunStepData),
    ).toBeUndefined()
  })

  it('extracts the latest Deep Agent plan tasks and normalizes their status', () => {
    expect(
      getDeepRunTasks([
        {
          eventType: 'plan.updated',
          data: {
            plan: [
              { id: 'collect', title: '收集资料', status: 'completed' },
              { id: 'report', title: '输出报告', status: 'in_progress' },
            ],
          },
        },
      ]),
    ).toEqual([
      { id: 'collect', title: '收集资料', status: 'completed' },
      { id: 'report', title: '输出报告', status: 'running' },
    ])
  })

  it('requests cancellation for a run ID', async () => {
    const cancel = jest.fn().mockResolvedValue({ code: 200 })

    await expect(cancelDeepRun('run-1', cancel)).resolves.toBeUndefined()

    expect(cancel).toHaveBeenCalledWith('run-1')
  })

  it.each([
    ['a rejected cancellation request', jest.fn().mockRejectedValue(new Error('unavailable'))],
    ['a non-200 cancellation response', jest.fn().mockResolvedValue({ code: 500 })],
  ])('silently swallows %s', async (_description, cancel) => {
    await expect(cancelDeepRun('run-1', cancel)).resolves.toBeUndefined()

    expect(cancel).toHaveBeenCalledWith('run-1')
  })
})
