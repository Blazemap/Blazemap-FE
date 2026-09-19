import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
function compile(path, dependencies = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, crypto: { randomUUID: () => 'request-key' }, require: name => dependencies[name] ?? require(name) });
  return exports;
}
test('case panels expose shared assignment controls without monitoring context', () => {
  assert.match(read('src/pages/dashboard/components/GovernmentWorklist.tsx'), /<CaseAssignments/);
  assert.match(read('src/pages/monitoring/MonitoringDetails.tsx'), /<CaseAssignments|<AssignmentForm user=\{user\} detail=\{detail\}/);
  assert.match(read('src/pages/dashboard/DashboardPage.tsx'), /caseId \? <CasePanel/);
});
test('eligible teams require current actual availability and no reservation', () => {
  const { eligibleTeams, assignmentTransitions } = compile('src/lib/assignments.ts');
  const team = { id: 'real', active: true, sample: false, activeAssignmentCount: 0, latestCondition: 'AVAILABLE', latestObservedAt: new Date().toISOString() };
  for (const patch of [{ sample: true }, { active: false }, { activeAssignmentCount: 1 }, { latestCondition: 'UNKNOWN' }, { latestObservedAt: null }, { latestObservedAt: new Date(Date.now() - 86400001).toISOString() }, { latestObservedAt: new Date(Date.now() + 10000).toISOString() }]) assert.equal(eligibleTeams([{ ...team, ...patch }]).length, 0);
  assert.equal(eligibleTeams([team]).length, 1);
  assert.deepEqual(Array.from(assignmentTransitions.ASSIGNED), ['ACCEPTED', 'CANCELLED']);
  assert.deepEqual(Array.from(assignmentTransitions.ACCEPTED), ['IN_PROGRESS', 'CANCELLED']);
  assert.deepEqual(Array.from(assignmentTransitions.IN_PROGRESS), ['COMPLETED', 'CANCELLED']);
  assert.equal(assignmentTransitions.COMPLETED.length, 0);
});
test('assignment form has required task, exact case query, freshness, teams link and stable request key', () => {
  const source = read('src/pages/monitoring/OperationsShared.tsx');
  assert.match(source, /version: detail.version/);
  assert.match(source, /Task description/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /eligibleTeams/);
  assert.match(source, /assignmentTransitions\[item.status\]/);
  assert.match(source, /query: search/);
  assert.match(source, /all: true/);
  assert.match(source, /\/monitoring\/operations\/teams/);
  assert.match(source, /idempotencyKey/);
});
test('rendered assignment form excludes synthetic teams and action selects only permitted stages', () => {
  const ui = { Button: ({ children, ...props }) => createElement('button', props, children), FieldSelect: ({ id, options, value, required }) => createElement('select', { id, value, required, onChange() {} }, options.map(option => createElement('option', { key: option.value, value: option.value }, option.label))) };
  const mutation = { isPending: false, isSuccess: false, error: null };
  const module = compile('src/pages/monitoring/OperationsShared.tsx', {
    '@/components/common': { DraftGuard: () => null },
    '@/api/dashboard': {}, '@/components/ui': ui, '@/hooks/dashboard': {},
    '@/hooks/dashboard/useGovernment': { useGovernmentMutation: () => mutation },
    '@/lib/assignments': compile('src/lib/assignments.ts'),
    '@/pages/dashboard/utils': { formatTime: value => value },
    './MonitoringComponents': {}, './MonitoringPage': {}, './MonitoringSkeletons': {},
    'react-router-dom': { Link: ({ to, children, ...props }) => createElement('a', { href: to, ...props }, children) },
  });
  const props = { user: { id: 'admin', role: 'ADMIN' }, detail: { id: 'case', version: 3, handling: 'OPEN', verification: 'UNVERIFIED' }, operations: { teams: [{ id: 'sample', name: 'Synthetic', active: true, sample: true, activeAssignmentCount: 0, latestCondition: 'AVAILABLE', latestObservedAt: new Date().toISOString() }] }, refresh: async () => {} };
  const html = renderToStaticMarkup(createElement(module.AssignmentForm, props));
  assert.match(html, /No eligible teams/); assert.match(html, /does not confirm a fire/); assert.match(html, /Task description/); assert.doesNotMatch(html, /<option[^>]*>Synthetic/); assert.match(html, /href="\/monitoring\/operations\/teams"/); assert.match(html, /aria-required="true"/);
  const action = renderToStaticMarkup(createElement(module.AssignmentAction, { user: props.user, item: { id: 'assignment', status: 'ASSIGNED', version: 1 }, refresh: props.refresh }));
  assert.match(action, /value="ACCEPTED"/); assert.match(action, /value="CANCELLED"/); assert.doesNotMatch(action, /value="IN_PROGRESS"|value="COMPLETED"/);
});
test('assignment loading skeleton reserves form geometry and announces loading once', () => {
  const { AssignmentFormSkeleton } = compile('src/pages/monitoring/MonitoringSkeletons.tsx');
  const html = renderToStaticMarkup(createElement(AssignmentFormSkeleton));
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /motion-safe:animate-pulse/);
  assert.doesNotMatch(html, /<input|<select|<button/);
});
