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
  runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => dependencies[name] ?? require(name) });
  return exports;
}
const skeletons = compile('src/pages/monitoring/MonitoringSkeletons.tsx');
const render = (name, props) => renderToStaticMarkup(createElement(skeletons[name], props));
const pages = read('src/pages/monitoring/MonitoringPages.tsx');
const expected = {
  teams: ['Team', 'Condition', 'Freshness', 'State', 'Action'],
  equipment: ['Equipment', 'Condition', 'Freshness', 'State', 'Action'],
  assignments: ['Case', 'Team', 'Status', 'Freshness', 'Action'],
  reports: ['Report', 'Observations', 'Priority', 'Workflow', 'Location', 'Observed', 'Action'],
  cases: ['Case', 'Verification', 'Handling', 'Priority', 'Context updated', 'Action'],
  users: ['User', 'Role', 'Account', 'Email', 'Created', 'Action'],
};
for (const [section, headers] of Object.entries(expected)) {
  test(`${section}: rendered skeleton matches actual table columns, width and row shape`, () => {
    const operation = ['teams', 'equipment', 'assignments'].includes(section);
    const source = operation ? read(`src/pages/monitoring/Operations${section[0].toUpperCase() + section.slice(1)}Page.tsx`) : pages.slice(pages.indexOf(`export function ${section[0].toUpperCase() + section.slice(1)}Page`));
    const actualTable = source.match(/<table[\s\S]*?<\/table>/)[0];
    assert.deepEqual([...actualTable.matchAll(/<th\s[^>]*>([^<]+)<\/th>/g)].map(match => match[1]), headers);
    const html = render(operation ? 'OperationsSkeleton' : 'InventorySkeleton', { section });
    assert.deepEqual([...html.matchAll(/<th\s[^>]*>([^<]+)<\/th>/g)].map(match => match[1]), headers);
    assert.ok(html.includes(actualTable.match(/min-w-\[\d+px\]/)[0]));
    const rows = [...html.matchAll(/<tbody[^>]*>([\s\S]*?)<\/tbody>/g)][0][1].match(/<tr>/g).length;
    assert.equal(rows, operation ? 6 : 8);
    assert.equal((html.match(/<td\s/g) ?? []).length, rows * headers.length);
    if (operation) {
      assert.equal((html.match(/data-skeleton="collapsed-form"/g) ?? []).length, section === 'assignments' ? 0 : 2);
      if (section === 'assignments') {
        assert.match(html, /sm:grid-cols-2/);
        assert.match(html, /h-11 w-24 rounded-full/);
      } else {
        assert.match(html, /min-w-56/);
        assert.match(html, /h-10 w-full rounded-lg/);
        assert.match(html, /mt-2 h-11 w-full rounded-full/);
      }
    } else {
      assert.match(html, /text-right/);
      assert.match(html, /min-h-11/);
      assert.match(source, new RegExp(`${section}\\.initialLoading && !${section}\\.data \\? <InventorySkeleton section="${section}"`));
      assert.ok(source.indexOf('<InventoryToolbar') < source.indexOf('<InventorySkeleton'));
    }
  });
}
test('access/water uses two responsive lists, not a table or cards', () => {
  const html = render('OperationsSkeleton', { section: 'access-water' });
  assert.equal((html.match(/<ul /g) ?? []).length, 2);
  assert.equal((html.match(/<li /g) ?? []).length, 6);
  assert.equal((html.match(/data-skeleton="collapsed-form"/g) ?? []).length, 1);
  assert.match(html, /xl:grid-cols-2/);
  assert.match(html, /sm:grid-cols-\[1fr_auto\]/);
  assert.match(html, /xl:border-r/);
  assert.doesNotMatch(html, /<table/);
});
test('overview reserves stats, donut, 4/6/5 bars, queue and source rows at actual breakpoints', () => {
  const stats = render('StatSkeletons');
  assert.equal((stats.match(/<article /g) ?? []).length, 4);
  assert.match(stats, /sm:grid-cols-2 2xl:grid-cols-4/);
  const charts = render('DistributionSkeleton');
  assert.equal((charts.match(/<section /g) ?? []).length, 4);
  assert.match(charts, /size-36 rounded-full/);
  assert.equal((charts.match(/h-2\.5 w-full/g) ?? []).length, 15);
  assert.match(charts, /xl:grid-cols-2 2xl:grid-cols-4/);
  assert.equal((render('QueueSkeleton').match(/<li /g) ?? []).length, 5);
  assert.equal((render('HealthSkeleton').match(/<li /g) ?? []).length, 4);
  assert.match(pages, /summary\.initialLoading && !summary\.data \? <DistributionSkeleton/);
});
test('detail placeholders match distinct metadata, form and responsive layouts', () => {
  const report = render('MonitoringDetailSkeleton', { section: 'report' });
  const caseHtml = render('MonitoringDetailSkeleton', { section: 'case' });
  const user = render('MonitoringDetailSkeleton', { section: 'user' });
  assert.match(report, /h-28 w-full/);
  assert.doesNotMatch(caseHtml, /h-28|h-24 w-full/);
  assert.match(caseHtml, /mt-7 border-t/);
  assert.match(user, /xl:grid-cols-\[1\.1fr_0\.9fr\]/);
  assert.match(user, /h-24 w-full/);
  assert.match(user, /size-4/);
  const source = read('src/pages/monitoring/MonitoringDetails.tsx');
  for (const section of ['report', 'case', 'user']) assert.match(source, new RegExp(`resource.initialLoading && !resource.data && <MonitoringDetailSkeleton section="${section}"`));
});
test('every placeholder has one accessible status, hidden geometry, reduced-motion safe animation and no fake controls', () => {
  const variants = [['InventorySkeleton', { section: 'reports' }], ...['teams', 'equipment', 'assignments', 'access-water'].map(section => ['OperationsSkeleton', { section }]), ...['report', 'case', 'user'].map(section => ['MonitoringDetailSkeleton', { section }]), ...['StatSkeletons', 'DistributionSkeleton', 'QueueSkeleton', 'HealthSkeleton'].map(name => [name, {}])];
  for (const [name, props] of variants) {
    const html = render(name, props);
    assert.equal((html.match(/role="status"/g) ?? []).length, 1);
    assert.match(html, /class="sr-only">Loading/);
    assert.match(html, /aria-hidden="true" class="motion-safe:animate-pulse"/);
    assert.doesNotMatch(html, /<input|<button|<select|animate-spin/);
  }
});
test('background fetch retains resource data and never becomes an initial load', () => {
  let state;
  const { useDashboardResource } = compile('src/hooks/dashboard/useDashboardResource.ts', {
    '@tanstack/react-query': { useQuery: () => state }, '@/api/dashboard': { DashboardError: class extends Error {} }, '@/constants': {}, '@/lib': { AuthError: class extends Error {} }, './session': {},
  });
  const data = { teams: [{ id: 'existing' }] };
  for (const isFetching of [true, false]) {
    state = { data, isFetching, isPending: false };
    const result = useDashboardResource({}, [], () => {});
    assert.equal(result.data, data);
    assert.equal(result.initialLoading, false);
    assert.equal(result.refreshing, isFetching);
  }
  state = { isFetching: true, isPending: true };
  assert.equal(useDashboardResource({}, [], () => {}).initialLoading, true);
  const operations = read('src/pages/monitoring/OperationsShared.tsx');
  assert.match(operations, /resource.initialLoading && !resource.data \?[^\n]*OperationsSkeleton section=\{section\}/);
  assert.doesNotMatch(read('src/pages/monitoring/OperationsPage.tsx'), /Skeleton|useMonitoring(?:Teams|Operations)/);
});
