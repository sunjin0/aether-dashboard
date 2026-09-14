import type { useIntl } from '@umijs/max';
import type { WorkflowNode } from '@/services/workflow/workflow/WorkflowController';

export const validateBeforePublish = (
  intl: ReturnType<typeof useIntl>,
  workflowNodes: WorkflowNode[],
  workflowEdges: Array<{ source: string; target: string }>,
) => {
  const issues: Array<{ message: string; nodeId?: string }> = [];
  const ids = new Set(workflowNodes.map((node) => node.id));
  const starts = workflowNodes.filter((node) => node.type === 'start');
  const ends = workflowNodes.filter((node) => node.type === 'end');
  if (starts.length !== 1 || ends.length !== 1)
    return [
      { message: intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.startEnd' }) },
    ];
  if (workflowEdges.some((edge) => !ids.has(edge.source) || !ids.has(edge.target)))
    issues.push({
      message: intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.deletedEdge' }),
    });
  if (workflowEdges.some((edge) => edge.source === ends[0].id))
    issues.push({
      nodeId: ends[0].id,
      message: intl.formatMessage({ id: 'pages.agent.workflow.editor.validation.endOutput' }),
    });
  const next = new Map<string, string[]>();
  const previous = new Map<string, string[]>();
  workflowEdges.forEach((edge) => {
    next.set(edge.source, [...(next.get(edge.source) || []), edge.target]);
    previous.set(edge.target, [...(previous.get(edge.target) || []), edge.source]);
  });
  const traverse = (from: string, graph: Map<string, string[]>) => {
    const visited = new Set<string>([from]);
    const queue = [from];
    while (queue.length) {
      const current = queue.shift()!;
      (graph.get(current) || []).forEach((target) => {
        if (!visited.has(target)) {
          visited.add(target);
          queue.push(target);
        }
      });
    }
    return visited;
  };
  const reachable = traverse(starts[0].id, next);
  const canReachEnd = traverse(ends[0].id, previous);
  workflowNodes
    .filter((node) => !reachable.has(node.id))
    .forEach((node) =>
      issues.push({
        nodeId: node.id,
        message: intl.formatMessage(
          { id: 'pages.agent.workflow.editor.validation.unreachable' },
          { name: node.name || node.id },
        ),
      }),
    );
  workflowNodes
    .filter((node) => !canReachEnd.has(node.id))
    .forEach((node) =>
      issues.push({
        nodeId: node.id,
        message: intl.formatMessage(
          { id: 'pages.agent.workflow.editor.validation.deadEnd' },
          { name: node.name || node.id },
        ),
      }),
    );
  // 并行分叉为编排式：至少引出 2 条分支连线，且所有分支必须能汇聚到同一个 join 节点。
  const joinIds = new Set(
    workflowNodes.filter((node) => node.type === 'join').map((node) => node.id),
  );
  const reachableJoinIds = (from: string) => {
    const found = new Set<string>();
    const visited = new Set<string>([from]);
    const queue = [from];
    while (queue.length) {
      const current = queue.shift()!;
      (next.get(current) || []).forEach((target) => {
        if (joinIds.has(target)) {
          found.add(target);
          return;
        }
        if (!visited.has(target)) {
          visited.add(target);
          queue.push(target);
        }
      });
    }
    return found;
  };
  for (const node of workflowNodes) {
    if (node.type !== 'parallel') continue;
    const branches = next.get(node.id) || [];
    if (branches.length < 2)
      issues.push({
        nodeId: node.id,
        message: intl.formatMessage(
          { id: 'pages.agent.workflow.editor.validation.parallelBranchCount' },
          { name: node.name || node.id },
        ),
      });
    const commonJoins = new Set<string>();
    branches.forEach((branch, index) => {
      const reachable = reachableJoinIds(branch);
      if (index === 0) reachable.forEach((joinId) => commonJoins.add(joinId));
      else
        Array.from(commonJoins).forEach((joinId) => {
          if (!reachable.has(joinId)) commonJoins.delete(joinId);
        });
    });
    if (commonJoins.size === 0)
      issues.push({
        nodeId: node.id,
        message: intl.formatMessage(
          { id: 'pages.agent.workflow.editor.validation.parallelJoinMissing' },
          { name: node.name || node.id },
        ),
      });
  }
  return issues;
};
