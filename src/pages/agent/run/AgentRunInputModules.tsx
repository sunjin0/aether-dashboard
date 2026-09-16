import React, { useMemo } from 'react'
import { Collapse, Empty, Tag, Tooltip, Typography } from 'antd'
import { useIntl } from '@umijs/max'
import JsonDisplay from '@/components/JsonDisplay'
import { InputModule, ModelInputView, parseModelInput } from './inputModules'
import './AgentRunInputModules.less'

interface AgentRunInputModulesProps {
  content?: string
  model?: string
}

const CAPABILITY_KIND_COLORS: Record<string, string> = {
  tool: 'blue',
  skill: 'purple',
  workflow: 'gold',
  // 工作流生命周期工具（workflow_start 等）也是「工具」，但属于固定协议，
  // 单独配色以便和真正的 MCP 工具区分开。
  workflowProtocol: 'geekblue',
}

// 组合条与模块行共用同一组配色，让「谁占了大头」一眼对得上。
const MODULE_COLORS = [
  '#2f6bff',
  '#7c4dff',
  '#00b8a9',
  '#f5a524',
  '#ef5b5b',
  '#16a34a',
  '#e8791b',
  '#9b59b6',
  '#0ea5e9',
  '#64748b',
]

/** 能力分组的固定展示顺序；目录里出现的其它 kind 追加在后面。 */
const CAPABILITY_KIND_ORDER = ['tool', 'skill', 'workflow', 'workflowProtocol']

const ROLE_KEYS = ['user', 'assistant', 'system', 'tool']

const AgentRunInputModules: React.FC<AgentRunInputModulesProps> = ({ content, model }) => {
  const intl = useIntl()
  const view: ModelInputView = useMemo(() => parseModelInput(content, model), [content, model])

  const text = (id: string, values?: Record<string, string | number>, defaultMessage?: string) =>
    intl.formatMessage({ id, defaultMessage: defaultMessage || id }, values)

  const roleLabel = (role: string) =>
    ROLE_KEYS.includes(role)
      ? text(`components.agentMessageBubble.role.${role}`)
      : role

  const moduleTitle = (key: string) => text(`pages.agent.run.inputModule.name.${key}`, undefined, key)

  const moduleColor = (index: number) => MODULE_COLORS[index % MODULE_COLORS.length]

  const shareOf = (estimatedTokens: number) =>
    view.totalEstimatedTokens > 0
      ? Math.max(1, Math.round((estimatedTokens * 100) / view.totalEstimatedTokens))
      : 0

  const renderModuleLabel = (module: InputModule, index: number) => (
    <span className="agent-run-input-module-label">
      <span className="agent-run-input-dot" style={{ background: moduleColor(index) }} />
      <Typography.Text strong>{moduleTitle(module.key)}</Typography.Text>
      <Tag>{roleLabel(module.role)}</Tag>
      <Typography.Text type="secondary" className="agent-run-input-meta">
        {text('pages.agent.run.inputModule.messageCount', { count: module.count }, '{count} 条')}
      </Typography.Text>
      <Typography.Text type="secondary" className="agent-run-input-meta">
        {text('pages.agent.run.inputModule.tokens', { tokens: module.estimatedTokens }, '约 {tokens} tokens')}
      </Typography.Text>
      <Typography.Text type="secondary" className="agent-run-input-meta">
        {`${shareOf(module.estimatedTokens)}%`}
      </Typography.Text>
    </span>
  )

  if (!content) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={intl.formatMessage({ id: 'components.jsonDisplay.empty' })}
      />
    )
  }

  if (!view.parsed) {
    return (
      <div className="agent-run-input-modules">
        <Typography.Text type="secondary">
          {text('pages.agent.run.inputModule.unparsed')}
        </Typography.Text>
        <JsonDisplay content={content} />
      </div>
    )
  }

  const capabilityGroups = view.capabilities.reduce<Record<string, typeof view.capabilities>>(
    (groups, capability) => {
      groups[capability.kind] = (groups[capability.kind] || []).concat(capability)
      return groups
    },
    {},
  )
  const capabilityKinds = [
    ...CAPABILITY_KIND_ORDER.filter((kind) => capabilityGroups[kind]),
    ...Object.keys(capabilityGroups).filter((kind) => !CAPABILITY_KIND_ORDER.includes(kind)),
  ]

  return (
    <div className="agent-run-input-modules">
      <div className="agent-run-input-summary">
        {/* 估算口径的说明挂在摘要行上：组合条每段已有自己的 tooltip，嵌套 Tooltip 会同时弹出两个。 */}
        <Tooltip title={text('pages.agent.run.inputModule.estimateHint')}>
          <Typography.Text type="secondary">
            {text(
              'pages.agent.run.inputModule.summary',
              {
                modules: view.modules.length,
                messages: view.messageCount,
                tokens: view.totalEstimatedTokens,
              },
              '{modules} 个模块 · {messages} 条消息 · 约 {tokens} tokens',
            )}
          </Typography.Text>
        </Tooltip>
        {view.model && <Tag color="geekblue">{view.model}</Tag>}
        {view.requestId && (
          <Typography.Text type="secondary" className="agent-run-input-request-id">
            {view.requestId}
          </Typography.Text>
        )}
      </div>

      {/* 一行组合条取代原先每模块一根进度条：高度从 N 行降到 1 行，占比仍可读。 */}
      <div className="agent-run-input-bars">
        {view.modules.map((module, index) => (
          <Tooltip
            key={module.key}
            title={`${moduleTitle(module.key)} · ${text(
              'pages.agent.run.inputModule.tokens',
              { tokens: module.estimatedTokens },
              '约 {tokens} tokens',
            )} · ${shareOf(module.estimatedTokens)}%`}
          >
            <span
              className="agent-run-input-bar"
              style={{ flexGrow: Math.max(module.estimatedTokens, 1), background: moduleColor(index) }}
            />
          </Tooltip>
        ))}
      </div>

      {view.capabilities.length > 0 && (
        <div className="agent-run-input-section">
          <Typography.Text strong>{text('pages.agent.run.inputModule.capabilities')}</Typography.Text>
          <div className="agent-run-input-cards">
            {capabilityKinds.map((kind) => (
              <div className="agent-run-input-tool" key={kind}>
                <div className="agent-run-input-module-head">
                  <Tag color={CAPABILITY_KIND_COLORS[kind] || 'default'}>
                    {text(`pages.agent.run.inputModule.capabilityKind.${kind}`, undefined, kind)}
                  </Tag>
                  <Typography.Text type="secondary" className="agent-run-input-meta">
                    {text(
                      'pages.agent.run.inputModule.messageCount',
                      { count: capabilityGroups[kind].length },
                      '{count} 条',
                    )}
                  </Typography.Text>
                </div>
                {capabilityGroups[kind].map((capability) => (
                  <div className="agent-run-input-capability" key={`${kind}-${capability.name}`}>
                    <Typography.Text>{capability.name}</Typography.Text>
                    {capability.riskLevel && <Tag>{capability.riskLevel}</Tag>}
                    {capability.description && (
                      <Typography.Text type="secondary" ellipsis className="agent-run-input-capability-desc">
                        {capability.description}
                      </Typography.Text>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {view.tools.length > 0 && (
        <div className="agent-run-input-section">
          <Collapse
            ghost
            size="small"
            className="agent-run-input-fold"
            items={[
              {
                key: 'tools',
                label: (
                  <span className="agent-run-input-section-label">
                    <Typography.Text strong>{text('pages.agent.run.inputModule.tools')}</Typography.Text>
                    <Typography.Text type="secondary" className="agent-run-input-meta">
                      {text('pages.agent.run.inputModule.messageCount', { count: view.tools.length }, '{count} 条')}
                    </Typography.Text>
                  </span>
                ),
                children: (
                  <div className="agent-run-input-cards">
                    {view.tools.map((tool) => (
                      <div className="agent-run-input-tool" key={tool.code}>
                        <div className="agent-run-input-module-head">
                          <Typography.Text strong>{tool.name}</Typography.Text>
                          <Typography.Text code>{tool.code}</Typography.Text>
                          <Tag color={tool.source === 'mcp' ? 'cyan' : 'default'}>
                            {text(`pages.agent.run.inputModule.toolSource.${tool.source}`)}
                          </Tag>
                        </div>
                        {tool.description && (
                          <Typography.Paragraph
                            type="secondary"
                            ellipsis={{ rows: 2 }}
                            className="agent-run-input-preview"
                          >
                            {tool.description}
                          </Typography.Paragraph>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      <div className="agent-run-input-section">
        <Collapse
          ghost
          size="small"
          className="agent-run-input-fold"
          items={[
            {
              key: 'modules',
              label: (
                <span className="agent-run-input-section-label">
                  <Typography.Text strong>
                    {text('pages.agent.run.inputModule.modules')}
                  </Typography.Text>
                  <Typography.Text type="secondary" className="agent-run-input-meta">
                    {text(
                      'pages.agent.run.inputModule.messageCount',
                      { count: view.modules.length },
                      '{count} 条',
                    )}
                  </Typography.Text>
                </span>
              ),
              children: (
                <Collapse
                  ghost
                  size="small"
                  className="agent-run-input-module-list"
                  items={view.modules.map((module, index) => ({
                    key: module.key,
                    label: renderModuleLabel(module, index),
                    children: (
                      <div className="agent-run-input-messages">
                        {module.messages.map((message, messageIndex) => (
                          <div
                            className="agent-run-input-message"
                            key={`${module.key}-${messageIndex}`}
                          >
                            <Typography.Text type="secondary" className="agent-run-input-message-role">
                              {`${messageIndex + 1} · ${roleLabel(message.role)}`}
                            </Typography.Text>
                            <pre className="agent-run-input-message-body">{message.content}</pre>
                          </div>
                        ))}
                      </div>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
      </div>

      {view.parameters.length > 0 && (
        <div className="agent-run-input-section">
          <Typography.Text strong>{text('pages.agent.run.inputModule.name.parameters', undefined, 'parameters')}</Typography.Text>
          <div className="agent-run-input-tags">
            {view.parameters.map((parameter) => (
              <Tag key={parameter.key}>{`${parameter.key}=${parameter.value}`}</Tag>
            ))}
          </div>
        </div>
      )}

      {view.fields.length > 0 && (
        <div className="agent-run-input-section">
          <Typography.Text strong>{text('pages.agent.run.inputModule.otherFields')}</Typography.Text>
          <Collapse
            ghost
            size="small"
            className="agent-run-input-fold"
            items={view.fields.map((field) => ({
              key: field.name,
              label: (
                <span className="agent-run-input-section-label">
                  <Typography.Text code>{field.name}</Typography.Text>
                  <Typography.Text type="secondary" className="agent-run-input-meta">
                    {text('pages.agent.run.inputModule.tokens', { tokens: field.estimatedTokens }, '约 {tokens} tokens')}
                  </Typography.Text>
                </span>
              ),
              children: <pre className="agent-run-input-message-body">{field.text}</pre>,
            }))}
          />
        </div>
      )}

      <Collapse
        ghost
        size="small"
        className="agent-run-input-fold"
        items={[
          {
            key: 'raw',
            label: text('pages.agent.run.inputModule.rawJson'),
            children: <JsonDisplay content={content} />,
          },
        ]}
      />
    </div>
  )
}

export default AgentRunInputModules
