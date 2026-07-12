import React from 'react';
import { Collapse, Tag, Typography } from 'antd';
import { AgentToolCallLog } from '@/services/entity/Agent';
import './index.less';

const { Text } = Typography;

export interface ToolCallCardProps {
  log: AgentToolCallLog;
  compact?: boolean;
}

const toolStatusMap: Record<number, { text: string; color: string }> = {
  0: { text: '成功', color: 'success' },
  1: { text: '失败', color: 'error' },
  2: { text: '超时', color: 'warning' },
  3: { text: '安全拦截', color: 'purple' },
};

const formatJSON = (json: string): string => {
  try {
    const obj = JSON.parse(json);
    return JSON.stringify(obj, null, 2);
  } catch {
    return json;
  }
};

const formatLatency = (ms?: number): string => {
  if (!ms) return '-';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
};

const ToolCallCard: React.FC<ToolCallCardProps> = ({ log, compact }) => {
  const statusInfo = toolStatusMap[log.status || 0] || { text: '未知', color: 'default' };

  const header = (
    <div className="tool-call-card-header">
      <Text type="secondary">工具：</Text>
      <span className="tool-call-card-name">{log.toolName || '未知工具'}</span>
      <Tag color={statusInfo.color} className="tool-call-card-status-tag">
        {statusInfo.text}
      </Tag>
      {log.latencyMs !== undefined && (
        <Text type="secondary" className="tool-call-card-latency">
          {formatLatency(log.latencyMs)}
        </Text>
      )}
    </div>
  );

  const items = [
    {
      key: 'detail',
      label: header,
      children: (
        <div className="tool-call-card-detail">
          {log.arguments && (
            <div className="tool-call-card-section">
              <div className="tool-call-card-label">参数</div>
              <pre className="tool-call-card-json">{formatJSON(log.arguments)}</pre>
            </div>
          )}

          {log.responseBody && (
            <div className="tool-call-card-section">
              <div className="tool-call-card-label">结果</div>
              <pre className="tool-call-card-json">{formatJSON(log.responseBody)}</pre>
            </div>
          )}

          {log.errorMsg && (
            <div className="tool-call-card-section">
              <div className="tool-call-card-label tool-call-card-label-error">错误</div>
              <pre className="tool-call-card-json tool-call-card-json-error">{log.errorMsg}</pre>
            </div>
          )}

          {log.requestUrl && (
            <div className="tool-call-card-meta">
              <Text type="secondary">{log.requestMethod} {log.requestUrl}</Text>
              {log.responseStatus && <Text type="secondary"> · {log.responseStatus}</Text>}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={`tool-call-card ${compact ? 'tool-call-card-compact' : ''}`}>
      <Collapse size="small" ghost items={items} />
    </div>
  );
};

export default ToolCallCard;
