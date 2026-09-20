import React, { useEffect, useState } from 'react'
import { Collapse, Empty, Spin, Timeline, Typography } from 'antd'
import { useIntl } from '@umijs/max'
import { getAgentRunSteps } from '@/services/agent/RunController'
import { AgentRunStep } from '@/services/entity/Agent'
import { AGENT_RUN_EVENT_MESSAGE_IDS } from '../chat/deepProgress'

type StepData = {
  message?: string
  toolName?: string
  skills?: string[]
  tools?: string[]
  sourceCount?: number
  knowledgeBaseCount?: number
  messageCount?: number
  estimatedTokens?: number
  callCount?: number
  successCount?: number
  failureCount?: number
  timeoutCount?: number
  securityBlockCount?: number
  valid?: boolean
  citationCount?: number
  toolResultVerified?: boolean
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

    const { message, toolName, actions, skills, tools, sourceCount, knowledgeBaseCount, messageCount, estimatedTokens,
      callCount, successCount, failureCount, timeoutCount, securityBlockCount, valid, citationCount, toolResultVerified } = parsed as Record<string, unknown>
    const actionToolName = Array.isArray(actions) && actions.length && actions[0] && typeof actions[0] === 'object'
      && typeof (actions[0] as Record<string, unknown>).name === 'string'
      ? (actions[0] as Record<string, string>).name : undefined
    return {
      ...(typeof message === 'string' ? { message } : {}),
      ...(typeof toolName === 'string' ? { toolName } : actionToolName ? { toolName: actionToolName } : {}),
      ...(Array.isArray(skills) ? { skills: skills.filter((item): item is string => typeof item === 'string') } : {}),
      ...(Array.isArray(tools) ? { tools: tools.filter((item): item is string => typeof item === 'string') } : {}),
      ...(typeof sourceCount === 'number' ? { sourceCount } : {}),
      ...(typeof knowledgeBaseCount === 'number' ? { knowledgeBaseCount } : {}),
      ...(typeof messageCount === 'number' ? { messageCount } : {}),
      ...(typeof estimatedTokens === 'number' ? { estimatedTokens } : {}),
      ...(typeof callCount === 'number' ? { callCount } : {}),
      ...(typeof successCount === 'number' ? { successCount } : {}),
      ...(typeof failureCount === 'number' ? { failureCount } : {}),
      ...(typeof timeoutCount === 'number' ? { timeoutCount } : {}),
      ...(typeof securityBlockCount === 'number' ? { securityBlockCount } : {}),
      ...(typeof valid === 'boolean' ? { valid } : {}),
      ...(typeof citationCount === 'number' ? { citationCount } : {}),
      ...(typeof toolResultVerified === 'boolean' ? { toolResultVerified } : {}),
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
              {data.skills && data.skills.length > 0 && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.skills' }, { skills: data.skills.join(', ') })}
                  </Typography.Text>
                </div>
              )}
              {typeof data.sourceCount === 'number' && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.sourceCount' }, { count: data.sourceCount })}
                  </Typography.Text>
                </div>
              )}
              {typeof data.knowledgeBaseCount === 'number' && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.knowledgeBases' }, { count: data.knowledgeBaseCount })}
                  </Typography.Text>
                </div>
              )}
              {typeof data.messageCount === 'number' && typeof data.estimatedTokens === 'number' && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.context' }, { messages: data.messageCount, tokens: data.estimatedTokens })}
                  </Typography.Text>
                </div>
              )}
              {data.tools && data.tools.length > 0 && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.tools' }, { tools: data.tools.join(', ') })}
                  </Typography.Text>
                </div>
              )}
              {typeof data.callCount === 'number' && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.toolCalls' }, { count: data.callCount, success: data.successCount || 0 })}
                  </Typography.Text>
                </div>
              )}
              {typeof data.valid === 'boolean' && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: data.valid
                      ? 'pages.agent.run.steps.detail.toolValidation.valid'
                      : 'pages.agent.run.steps.detail.toolValidation.invalid' })}
                  </Typography.Text>
                </div>
              )}
              {typeof data.failureCount === 'number' && data.failureCount > 0 && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.toolFailures' }, {
                      failures: data.failureCount,
                      timeouts: data.timeoutCount || 0,
                      blocks: data.securityBlockCount || 0,
                    })}
                  </Typography.Text>
                </div>
              )}
              {typeof data.citationCount === 'number' && typeof data.toolResultVerified === 'boolean' && (
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'pages.agent.run.steps.detail.grounding' }, {
                      citations: data.citationCount,
                      toolResult: intl.formatMessage({ id: data.toolResultVerified
                        ? 'pages.agent.run.steps.detail.grounding.toolVerified'
                        : 'pages.agent.run.steps.detail.grounding.noTool' }),
                    })}
                  </Typography.Text>
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
