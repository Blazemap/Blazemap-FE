import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./monitoring.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source.replace(/^import .*$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const stripped = output.replace(/export\s+/g, '');
const parseMonitoringOperations = new Function(`${stripped}; return parseMonitoringOperations;`)();
const response = { data: {
  asOf: '2026-09-19T00:00:00.000Z',
  teams: [{ id: 'team-1', name: 'Tim Reaksi Cepat Palangka Raya', organization: null, activeAssignmentCount: 0, active: true, createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-19T00:00:00.000Z', version: 1, sample: true, latestCondition: 'UNKNOWN', latestObservedAt: '2026-09-19T00:00:00.000Z' }],
  equipment: [{ id: 'equipment-1', name: 'Pompa Portabel', kind: 'Pompa', teamId: 'team-1', active: true, createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-19T00:00:00.000Z', version: 1, sample: true, latestCondition: 'UNKNOWN', latestObservedAt: '2026-09-19T00:00:00.000Z' }],
  features: [{ id: 'road-1', name: 'Akses Latihan Utara', kind: 'ROAD', sample: true, authoritative: false, provider: 'SAMPLE', verifiedAt: null, latestCondition: 'UNKNOWN', latestObservedAt: '2026-09-19T00:00:00.000Z' }],
  updates: [{ id: 'update-1', subjectType: 'TEAM', subjectId: 'team-1', condition: 'UNKNOWN', source: 'Sample operational data', observedAt: '2026-09-19T00:00:00.000Z', notes: null, createdAt: '2026-09-19T00:00:00.000Z', sample: true }],
  assignments: [{ id: 'assignment-1', caseId: 'case-1', caseNumber: 'C-1', caseTitle: 'Reported smoke', caseVerification: 'UNVERIFIED', caseHandling: 'OPEN', teamId: 'team-1', teamName: 'Tim Reaksi Cepat Palangka Raya', status: 'ASSIGNED', notes: null, createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-19T00:00:00.000Z', version: 1, sample: false }],
  counts: { teams: 1, availableTeams: 0, equipment: 1, availableEquipment: 0, activeAssignments: 1, access: 1, passableAccess: 0, water: 0, availableWater: 0 },
} };
const parsed = parseMonitoringOperations(response);
assert.equal(parsed.asOf, response.data.asOf);
assert.equal(parsed.teams[0].sample, true);
assert.equal(parsed.features[0].authoritative, false);
assert.equal(parsed.assignments[0].version, 1);
assert.deepEqual(parsed.counts, response.data.counts);
assert.throws(() => parseMonitoringOperations({ data: { ...response.data, features: [{ ...response.data.features[0], authoritative: true }] } }));
console.log('Monitoring operations parser preserves sample and authority boundaries.');
