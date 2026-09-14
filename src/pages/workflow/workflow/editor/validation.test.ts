import { validateBeforePublish } from './validation';
import type { WorkflowNode } from '@/services/workflow/workflow/WorkflowController';

const intl = { formatMessage: ({ id }: { id: string }) => id } as Parameters<
  typeof validateBeforePublish
>[0];
const nodes: WorkflowNode[] = [
  { id: 'start', type: 'start' },
  { id: 'end', type: 'end' },
];
describe('workflow issue list', () => {
  it('reports every disconnected node with a navigable target', () => {
    const issues = validateBeforePublish(
      intl,
      [...nodes, { id: 'a', type: 'http' }, { id: 'b', type: 'rule' }],
      [{ source: 'start', target: 'end' }],
    );
    expect(new Set(issues.map((issue) => issue.nodeId))).toEqual(new Set(['a', 'b']));
    expect(issues).toHaveLength(4);
  });
  it('accepts a connected workflow and handles missing boundaries without crashing', () => {
    expect(validateBeforePublish(intl, nodes, [{ source: 'start', target: 'end' }])).toEqual([]);
    expect(validateBeforePublish(intl, [], [])).toHaveLength(1);
  });
  it('reports a parallel branch that cannot converge', () => {
    const graph: WorkflowNode[] = [
      ...nodes,
      { id: 'p', type: 'parallel' },
      { id: 'a', type: 'http' },
      { id: 'b', type: 'http' },
    ];
    const issues = validateBeforePublish(intl, graph, [
      { source: 'start', target: 'p' },
      { source: 'p', target: 'a' },
      { source: 'p', target: 'b' },
      { source: 'a', target: 'end' },
      { source: 'b', target: 'end' },
    ]);
    expect(issues).toEqual([
      { nodeId: 'p', message: 'pages.agent.workflow.editor.validation.parallelJoinMissing' },
    ]);
  });
});
