// Local UI fixtures only. No proxy or connection to a real backend; all writes stay in memory.
// Run after npm run build: node deploy/dev/workflow-preview.cjs
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
const root = path.resolve(__dirname, '../..');
const nodes = [{ id: 'start', type: 'start', name: '开始', position: { x: 40, y: 120 } }, { id: 'rule', type: 'rule', name: '订单分类', position: { x: 300, y: 120 } }, { id: 'end', type: 'end', name: '结束', position: { x: 560, y: 120 } }];
const edges = [{ id: 'a', source: 'start', target: 'rule' }, { id: 'b', source: 'rule', target: 'end' }];
const schema = JSON.stringify([{ name: 'order', label: '订单号', required: true }, { name: 'amount', label: '金额', type: 'number', default: 10 }, { name: 'urgent', label: '加急', type: 'boolean', default: false }]);
const workflows = [{ id: 'preview', applicationId: 'app', name: '订单处理 · 布局验证', code: 'preview_order', description: '仅用于本地界面验证，不连接实际业务服务', status: 1, publishedVersion: 3, nodes: JSON.stringify(nodes), edges: JSON.stringify(edges), inputSchema: schema, publishedInputSchema: schema, outputSchema: '[]' }];
const instances = [{ id: 'preview-failed', workflowId: 'preview', workflowName: workflows[0].name, status: 'FAILED', startedAt: Date.now() - 60000, completedAt: Date.now(), versionNodes: workflows[0].nodes, versionEdges: workflows[0].edges, nodes: [{ id: 'node1', nodeId: 'rule', status: 'FAILED', nodeType: 'rule', errorMessage: '测试错误：请检查规则参数' }], variables: '{"order":"DEMO-01","amount":10}' }];
const schedules = [];
const menus = [{ name: '工作流管理', path: '/workflow/workflow' }, { name: '运行记录', path: '/workflow/run' }, { name: '定时任务', path: '/workflow/schedule' }];
app.use('/api', (req, res) => {
  const p = req.path;
  const ok = (data = null) => res.json({ code: 200, data, total: Array.isArray(data) ? data.length : 0, success: true });
  if (p === '/sys/info') return ok({ id: 'fixture', username: '本地界面验证', permissionMap: Object.fromEntries(menus.map((menu) => [menu.path, true])) });
  if (p === '/sys/getRouters') return ok(menus);
  if (p === '/agent/application/list') return ok([{ id: 'app', name: '演示应用', status: 1 }]);
  if (p === '/agent/product-profile/list') return ok([{ id: 'product', applicationId: 'app', workflowId: 'preview', status: 1 }]);
  if (p === '/sys/service-account/list') return ok([{ id: 'account', name: '测试服务账号', applicationId: 'app', enabled: true, allowedProductIds: ['product'] }]);
  if (p === '/agent/workflow/list') return ok(workflows.filter((w) => !req.body.name || w.name.includes(req.body.name)));
  if (p === '/agent/workflow/instances/list') return ok(instances);
  if (p === '/agent/workflow/schedules/list') return ok(schedules);
  if (p === '/agent/workflow/schedules' && req.method === 'POST') { schedules.push({ ...req.body, id: `schedule-${schedules.length}`, enabled: true, nextFireAt: Date.now() + 60000 }); return ok(schedules.at(-1)); }
  const w = p.match(/^\/agent\/workflow\/([^/]+)$/);
  if (w) { const workflow = workflows.find((item) => item.id === w[1]); if (req.method === 'PUT') Object.assign(workflow, req.body); return ok(workflow); }
  if (p.endsWith('/draft/validate')) return ok();
  if (p.endsWith('/publish')) return ok(++workflows[0].publishedVersion);
  if (/\/workflow\/[^/]+\/instances$/.test(p)) {
    const instance = { ...instances[0], id: `preview-${instances.length}`, status: 'COMPLETED', variables: JSON.stringify(req.body.variables), nodes: [], startedAt: Date.now(), completedAt: Date.now() };
    instances.unshift(instance); return ok(instance.id);
  }
  const i = p.match(/^\/agent\/workflow\/instances\/([^/]+)$/);
  if (i) return ok(instances.find((item) => item.id === i[1]));
  if (p.endsWith('/terminate')) { const item = instances.find((item) => p.includes(item.id)); if (item) item.status = 'TERMINATED'; return ok(); }
  if (p.endsWith('/retry')) return ok();
  return ok([]);
});
app.use(express.static(path.join(root, 'dist')));
app.get('*', (_, res) => res.sendFile(path.join(root, 'dist/index.html')));
app.listen(18083, '127.0.0.1', () => console.log('Workflow UI fixtures: http://127.0.0.1:18083/workflow/workflow'));
