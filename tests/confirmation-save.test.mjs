import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { drawingFrom, drawingPolygon, editDraft } from '../src/lib/perimeter.ts';

const source = readFileSync(new URL('../src/pages/dashboard/components/GovernmentReports.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('GovernmentReports.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'save') callback = node.initializer.arguments[1].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
test('actual field observation submits operator-entered coordinates without requiring photos', async () => {
  const text = readFileSync(new URL('../src/pages/dashboard/components/CaseEvidence.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('CaseEvidence.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let action;
  function find(node) { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'evidence') action = node.initializer.arguments[1].getText(tree); ts.forEachChild(node, find); }
  find(tree);
  let payload;
  const execute = runInNewContext(ts.transpileModule(`const action = ${action}; action;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    observed: '2026-01-01T12:00', latitude: '-2', longitude: '110', findings: 'VISIBLE_FIRE', fieldDescription: 'Visible flames observed', source: 'Field patrol', detail: { id: 'case' }, confirmation: false,
    recordField: async (_id, body) => { payload = body; return 'field'; }, setFieldId() {}, setSource() {}, setObserved() {}, setFieldDescription() {}, setLatitude() {}, setLongitude() {},
  });
  await execute();
  assert.equal(payload.latitude, -2);
  assert.equal(payload.longitude, 110);
});
test('map editing cannot change a submitted drawing awaiting an exact retry', () => {
  const draft = { attempted: true, pending: false, drawing: drawingFrom(polygon), history: [] };
  assert.equal(editDraft(draft, { type: 'move', index: 1, point: [112, -2] }), draft);
});
const polygon = { type: 'Polygon', coordinates: [[[110, -2], [111, -2], [110.5, -1], [110, -2]]] };
function harness(failure) {
  const sent = [];
  const context = {
    description: 'Observed visible flames', reviewStatus: 'CONFIRMED_FIRE', drawingId: 'report:report',
    perimeterDraft: { caseId: 'report:report', drawing: drawingFrom(polygon), pending: false },
    report: { id: 'report', case: { version: 1 } }, photos: [], key: 'ec511181-f67f-453f-9ba0-d9df568758d5',
    attempted: false, submitted: { current: null }, drawingPolygon, structuredClone,
    setError() {}, setPhotos() {}, setDescription() {}, setKey() {}, crypto: { randomUUID: () => 'next-key' },
    setAttempted(value) { context.attempted = value; },
    setPerimeterDraft(update) { context.perimeterDraft = update(context.perimeterDraft); },
    uploadPhoto: () => assert.fail('No photo upload should occur'),
    submitGovernmentReportAction: async (_id, payload) => { sent.push(JSON.parse(JSON.stringify(payload))); if (sent.length === 1) throw failure; },
  };
  const save = runInNewContext(ts.transpileModule(`const action = ${callback}; action;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { context, sent, save };
}
test('no-photo retry resends the exact payload after case refresh and map edits', async () => {
  const { context, sent, save } = harness(new Error('Response lost'));
  await assert.rejects(save(), /Response lost/);
  assert.equal(context.perimeterDraft.pending, false);
  context.report.case.version = 2;
  context.perimeterDraft.drawing = drawingFrom({ ...polygon, coordinates: [[[110, -2], [112, -2], [110.5, -1], [110, -2]]] });
  await save();
  assert.deepEqual(sent[1], sent[0]);
  assert.deepEqual(sent[0].attachmentIds, []);
});
test('uncertain retry remains possible after refreshed confirmation and an invalid current drawing', async () => {
  const { context, sent, save } = harness(new Error('Response lost'));
  await assert.rejects(save());
  context.report.case.verificationStatus = 'CONFIRMED_FIRE';
  context.perimeterDraft.drawing = drawingFrom(null);
  await save();
  assert.deepEqual(sent[1], sent[0]);
});
for (const code of ['VERSION_CONFLICT', 'INVALID_ATTACHMENT']) test(`definitive ${code} rejection unlocks the form rather than trapping unchanged retries`, async () => {
  const { context, save } = harness(Object.assign(new Error('Case changed'), { status: 409, code }));
  await assert.rejects(save(), /Case changed/);
  assert.equal(context.attempted, false);
});
