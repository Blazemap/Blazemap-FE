import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('operations landing links to four isolated operation pages without loading operation data', () => {
  const page = read('src/pages/monitoring/OperationsPage.tsx');
  for (const route of ['teams', 'equipment', 'assignments', 'access-water']) assert.match(page, new RegExp(`href: "/monitoring/operations/${route}"`));
  assert.doesNotMatch(page, /useMonitoring(?:Teams|Equipment|Assignments|AccessWater|Operations)/);
});

test('operation routes are nested, deep-link guarded, and keep the landing as the index', () => {
  const routes = read('src/config/routes.ts');
  assert.match(routes, /path: "operations"[\s\S]*children:/);
  assert.match(routes, /index: true[\s\S]*OperationsPage/);
  for (const [route, component] of [['teams', 'OperationsTeamsPage'], ['equipment', 'OperationsEquipmentPage'], ['assignments', 'OperationsAssignmentsPage'], ['access-water', 'OperationsAccessWaterPage']]) {
    assert.match(routes, new RegExp(`path: "${route}"[^\n]+${component}[^\n]+loader`));
  }
});

test('each operation page loads and renders only its relevant inventory', () => {
  const expectations = [
    ['OperationsTeamsPage.tsx', 'useMonitoringTeams', 'Teams inventory', ['Equipment inventory', 'Assignments inventory', 'Access and water inventory']],
    ['OperationsEquipmentPage.tsx', 'useMonitoringEquipment', 'Equipment inventory', ['Teams inventory', 'Assignments inventory', 'Access and water inventory']],
    ['OperationsAssignmentsPage.tsx', 'useMonitoringAssignments', 'Assignments inventory', ['Teams inventory', 'Equipment inventory', 'Access and water inventory']],
    ['OperationsAccessWaterPage.tsx', 'useMonitoringAccessWater', 'Access and water inventory', ['Teams inventory', 'Equipment inventory', 'Assignments inventory']],
  ];
  for (const [file, hook, own, others] of expectations) {
    const page = read(`src/pages/monitoring/${file}`);
    assert.match(page, new RegExp(`${hook}\\(`));
    assert.match(page, new RegExp(own));
    for (const other of others) assert.doesNotMatch(page, new RegExp(other));
  }
});

test('operation hooks use section-scoped query options', () => {
  const hooks = read('src/hooks/dashboard/useDashboardResource.ts');
  for (const [hook, section] of [['useMonitoringTeams', 'teams'], ['useMonitoringEquipment', 'equipment'], ['useMonitoringAssignments', 'assignments'], ['useMonitoringAccessWater', 'access-water']]) {
    assert.match(hooks, new RegExp(`function ${hook}[\\s\\S]*monitoringOperationsQueryOptions\\(user, "${section}"\\)`));
  }
});

test('government worklist omits the redundant refresh icon but retains failure retry', () => {
  const worklist = read('src/pages/dashboard/components/GovernmentReports.tsx');
  assert.doesNotMatch(worklist, /aria-label="Refresh citizen reports"/);
  assert.match(worklist, /reports\.failed[\s\S]*onClick=\{reports\.retry\}[\s\S]*>Retry</);
  assert.match(read('src/pages/dashboard/components/FeedRow.tsx'), /aria-label=\{`Refresh \$\{title\.toLowerCase\(\)\}`\}/);
});
