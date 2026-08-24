import { isDeepAgent } from './executionMode'

describe('isDeepAgent', () => {
  const agents = [
    { id: 'standard', name: '标准 Agent', executionMode: 'STANDARD' as const },
    { id: 'deep', name: 'Deep Agent', executionMode: 'DEEP' as const },
  ]

  it('only identifies the Deep Agent as cancellable through the Deep run endpoint', () => {
    expect(isDeepAgent(agents, 'standard')).toBe(false)
    expect(isDeepAgent(agents, 'deep')).toBe(true)
    expect(isDeepAgent(agents, 'missing')).toBe(false)
  })
})
