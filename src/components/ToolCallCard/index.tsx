import React from 'react'
import { Collapse, Tag, Typography } from 'antd'
import { AgentToolCallLog } from '@/services/entity/Agent'
import { useIntl } from '@umijs/max'
import './index.less'

const { Text } = Typography

export interface ToolCallCardProps {
  log: AgentToolCallLog;
  compact?: boolean;
}

const formatJSON = (json: string): string => {
  try {
    const obj = JSON.parse(json)
    return JSON.stringify(obj, null, 2)
  } catch {
    return json
  }
}

const formatLatency = (ms?: number): string => {
  if (!ms) return '-'
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  return `${ms}ms`
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({ log, compact }) => {
  const intl = useIntl()
  const toolStatusMap: Record<number, { text: string; color: string }> = {
    0: { text: intl.formatMessage({ id: 'components.toolCallCard.status.success' }), color: 'success' },
    1: { text: intl.formatMessage({ id: 'components.toolCallCard.status.failed' }), color: 'error' },
    2: { text: intl.formatMessage({ id: 'components.toolCallCard.status.timeout' }), color: 'warning' },
    3: { text: intl.formatMessage({ id: 'components.toolCallCard.status.blocked' }), color: 'purple' },
  }
  const statusInfo = toolStatusMap[log.status || 0] || { text: intl.formatMessage({ id: 'components.toolCallCard.status.unknown' }), color: 'default' }

  const header = (
    <div className="tool-call-card-header">
      <Text type="secondary">{intl.formatMessage({ id: 'components.toolCallCard.tool' })}</Text>
      <span className="tool-call-card-name">{log.toolName || intl.formatMessage({ id: 'components.toolCallCard.unknownTool' })}</span>
      <Tag color={statusInfo.color} className="tool-call-card-status-tag">
        {statusInfo.text}
      </Tag>
      {log.latencyMs !== undefined && (
        <Text type="secondary" className="tool-call-card-latency">
          {formatLatency(log.latencyMs)}
        </Text>
      )}
    </div>
  )

  const items = [
    {
      key: 'detail',
      label: header,
      children: (
        <div className="tool-call-card-detail">
          {log.arguments && (
            <div className="tool-call-card-section">
              <div className="tool-call-card-label">{intl.formatMessage({ id: 'components.toolCallCard.arguments' })}</div>
              <pre className="tool-call-card-json">{formatJSON(log.arguments)}</pre>
            </div>
          )}

          {log.responseBody && (
            <div className="tool-call-card-section">
              <div className="tool-call-card-label">{intl.formatMessage({ id: 'components.toolCallCard.result' })}</div>
              <pre className="tool-call-card-json">{formatJSON(log.responseBody)}</pre>
            </div>
          )}

          {log.errorMsg && (
            <div className="tool-call-card-section">
              <div className="tool-call-card-label tool-call-card-label-error">{intl.formatMessage({ id: 'components.toolCallCard.error' })}</div>
              <pre className="tool-call-card-json tool-call-card-json-error">{log.errorMsg}</pre>
            </div>
          )}

          {log.requestUrl && (
            <div className="tool-call-card-meta">
              <Text type="secondary">
                {log.requestMethod} {log.requestUrl}
              </Text>
              {log.responseStatus && <Text type="secondary"> · {log.responseStatus}</Text>}
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className={`tool-call-card ${compact ? 'tool-call-card-compact' : ''}`}>
      <Collapse size="small" ghost items={items} />
    </div>
  )
}

export default ToolCallCard
