import React, { useEffect, useState } from 'react'
import { Collapse, Empty, Spin, Timeline, Typography } from 'antd'
import { useIntl } from '@umijs/max'
import { getAgentRunSteps } from '@/services/agent/RunController'
import { AgentRunStep } from '@/services/entity/Agent'
import { AGENT_RUN_EVENT_MESSAGE_IDS } from '../chat/deepProgress'

type StepData = {
  message?: string
  toolName?: string
  actions?: Array<{ name?: string }>
}

export const parseStepData = (data?: string): StepData => {
  if (!data) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const { message, toolName, actions } = parsed as Record<string, unknown>
    const actionToolName = Array.isArray(actions) && actions.length && actions[0] && typeof actions[0] === 'object'
      && typeof (actions[0] as Record<string, unknown>).name === 'string'
      ? (actions[0] as Record<string, string>).name : undefined
    return {
      ...(typeof message === 'string' ? { message } : {}),
      ...(typeof toolName === 'string' ? { toolName } : actionToolName ? { toolName: actionToolName } : {}),
    }
  } catch {
    return {}
  }
}

const parseRawStepData = (data?: string): object | undefined => {
  if (!data) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(data)
    return parsed && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

interface AgentRunStepsTimelineProps {
  runId: string
}

const AgentRunStepsTimeline: React.FC<AgentRunStepsTimelineProps> = ({ runId }) => {
  const intl = useIntl()
  const [steps, setSteps] = useState<AgentRunStep[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    setLoading(true)
    getAgentRunSteps(runId)
      .then(({ data }) => {
        if (active) {
          setSteps((data || []).sort((a, b) => (a.occurredAt || 0) - (b.occurredAt || 0)))
        }
      })
      .catch(() => {
        if (active) {
          setSteps([])
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [runId])

  if (loading) {
    return <Spin />
  }

  if (!steps.length) {
    return <Empty description={intl.formatMessage({ id: 'pages.agent.run.steps.empty' })} />
  }

  return (
    <Timeline
      items={steps.map((step) => {
        const data = parseStepData(step.data)
        const rawData = parseRawStepData(step.data)
        const eventType = step.eventType || ''
        const eventMessageId = AGENT_RUN_EVENT_MESSAGE_IDS[eventType]
        const label = eventMessageId
          ? intl.formatMessage({ id: eventMessageId }, { toolName: data.toolName || '-' })
          : intl.formatMessage(
            { id: 'pages.agent.run.steps.unknown' },
            { eventType: eventType || 'none' },
          )
        const time = step.occurredAt ? new Date(step.occurredAt).toLocaleString() : ''

        return {
          children: (
            <div>
              <Typography.Text strong>{label}</Typography.Text>
              {data.message && (
                <div>
                  <Typography.Text type="secondary">{data.message}</Typography.Text>
                </div>
              )}
              {data.toolName && (
                <div>
                  <Typography.Text code>{data.toolName}</Typography.Text>
                </div>
              )}
              {rawData && (
                <Collapse
                  ghost
                  size="small"
                  items={[
                    {
                      key: 'raw-payload',
                      label: intl.formatMessage({ id: 'pages.agent.run.steps.rawPayload' }),
                      children: (
                        <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                          {JSON.stringify(rawData, null, 2)}
                        </pre>
                      ),
                    },
                  ]}
                />
              )}
              {time && (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {time}
                  </Typography.Text>
                </div>
              )}
            </div>
          ),
        }
      })}
    />
  )
}

export default AgentRunStepsTimeline
