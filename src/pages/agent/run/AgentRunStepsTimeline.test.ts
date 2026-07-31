import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import AgentRunStepsTimeline, { parseStepData } from './AgentRunStepsTimeline'
import enUS from '@/locales/en-US'
import { getAgentRunSteps } from '@/services/agent/RunController'

jest.mock('@/services/agent/RunController', () => ({
  getAgentRunSteps: jest.fn(),
}))

const mockedGetAgentRunSteps = getAgentRunSteps as jest.Mock

const renderWithEnglishLocale = (ui: any) =>
  render(
    React.createElement(IntlProvider, { locale: 'en-US', messages: enUS }, ui),
  )

describe('parseStepData', () => {
  it('returns an empty object for invalid JSON', () => {
    expect(parseStepData('{invalid json')).toEqual({})
  })

  it('returns step data from a JSON object', () => {
    expect(parseStepData('{"message":"Calling search","toolName":"knowledge_search"}')).toEqual({
      message: 'Calling search',
      toolName: 'knowledge_search',
    })
  })

  it('omits non-string display fields', () => {
    expect(
      parseStepData(
        '{"message":{"content":"Calling search"},"toolName":["knowledge_search"]}',
      ),
    ).toEqual({})
  })
})

describe('AgentRunStepsTimeline', () => {
  it('renders localized empty and unknown-event labels', async () => {
    mockedGetAgentRunSteps.mockResolvedValueOnce({ data: [] } as any)
    const { unmount } = renderWithEnglishLocale(
      React.createElement(AgentRunStepsTimeline, { runId: 'run-empty' }),
    )

    await waitFor(() => expect(screen.getByText('No execution steps')).toBeTruthy())
    unmount()

    mockedGetAgentRunSteps.mockResolvedValueOnce({
      data: [{ eventType: 'custom.event' }],
    } as any)
    renderWithEnglishLocale(React.createElement(AgentRunStepsTimeline, { runId: 'run-unknown' }))

    await waitFor(() => expect(screen.getByText('Unknown event: custom.event')).toBeTruthy())
  })

  it('renders valid object and array payloads as escaped text in expandable views', async () => {
    const maliciousPayload = '<img src=x onerror=alert(1)>'
    mockedGetAgentRunSteps.mockResolvedValueOnce({
      data: [
        {
          eventType: 'step.started',
          data: JSON.stringify({ message: maliciousPayload, details: { count: 1 } }),
        },
        { eventType: 'tool.completed', data: '[{"result":"ok"}]' },
      ],
    } as any)

    renderWithEnglishLocale(React.createElement(AgentRunStepsTimeline, { runId: 'run-payloads' }))

    await waitFor(() => expect(screen.getAllByText('Raw payload')).toHaveLength(2))

    screen.getAllByText('Raw payload')[0].click()
    const rawPayload = await screen.findByText((content, element) =>
      element?.tagName === 'PRE' && content.includes(maliciousPayload),
    )
    expect(rawPayload.textContent).toContain(maliciousPayload)
    expect(rawPayload.querySelector('img')).toBeNull()
  })

  it('omits the raw JSON view for malformed payload data', async () => {
    mockedGetAgentRunSteps.mockResolvedValueOnce({
      data: [{ eventType: 'step.started', data: '{malformed json' }],
    } as any)

    renderWithEnglishLocale(React.createElement(AgentRunStepsTimeline, { runId: 'run-malformed' }))

    await waitFor(() => expect(screen.getByText('Step started')).toBeTruthy())
    expect(screen.queryByText('Raw payload')).toBeNull()
  })
})
