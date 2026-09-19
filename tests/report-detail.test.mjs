import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { URL } from 'node:url';
import { drawingFrom, drawingPolygon, changeDrawing } from '../src/lib/perimeter.ts';
import { windArrow } from '../src/lib/wind.ts';
const { AbortController, AbortSignal } = globalThis;
const source = name => readFileSync(new URL(`../src/pages/dashboard/${name}`, import.meta.url), 'utf8');
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const photos = () => read('src/pages/reports/ReportPhotos.tsx');
test('thumbnail reserves width and minimum height independently of image loading and utilities', () => {
  assert.match(photos(), /data-report-thumbnail style=\{\{ position: "relative", display: "block", width: "100%", aspectRatio: "4 \/ 3", minHeight: "9rem" \}\}/);
  assert.match(photos(), /object-contain" : "object-cover/);
  assert.match(photos(), /role="status"/);
  assert.match(photos(), /Retry \$\{label\}/);
  assert.match(photos(), /Dialog.Description/);
  assert.match(photos(), /referrerPolicy="no-referrer"/);
  assert.match(photos(), /JSON.stringify\(\[user.id, user.role, reportId, photo.id\]\)/);
  assert.match(photos(), /account.data\?\.id !== user.id/);
  assert.match(photos(), /account.data\?\.role !== user.role/);
});
test('built assets retain explicit thumbnail sizing and responsive grid', () => {
  const directory = new URL('../dist/assets/', import.meta.url);
  const css = readdirSync(directory).filter(name => /^index-.*\.css$/.test(name)).map(name => readFileSync(new URL(name, directory), 'utf8')).join('\n');
  const scripts = readdirSync(directory).filter(name => name.endsWith('.js')).map(name => readFileSync(new URL(name, directory), 'utf8')).join('\n');
  const thumbnail = scripts.match(/.{0,100}data-report-thumbnail.{0,350}/)?.[0];
  assert.ok(thumbnail, 'Built thumbnail exists');
  assert.match(thumbnail, /aspectRatio:\s*["'`]4 \/ 3["'`]/);
  assert.match(thumbnail, /minHeight:\s*["'`]9rem["'`]/);
  assert.match(css, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,9rem\),1fr\)\)/);
});
test('signed photo metadata is guarded before and after fetching, cancellable, and HTTPS only', async () => {
  const text = readFileSync(new URL('../src/api/reports/reports-queries.ts', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('queries.ts', text, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'downloadPhoto');
  const compiled = ts.transpileModule(declaration.getText(ast).replace('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText;
  for (const deniedAt of [1, 2, 0]) {
    let checks = 0;
    let requests = 0;
    const download = runInNewContext(`${compiled}; downloadPhoto`, { URL, ReportError: Error, apiEndpoints: { uploads: '/uploads' }, requireReportAccount: async (_user, fresh) => { assert.equal(fresh, true); if (++checks === deniedAt) throw new Error('Account changed'); }, request: async path => { requests++; assert.equal(path, '/uploads/photo%2Fid/download'); return { data: { url: 'https://storage.example.invalid/photo?signature=test' } }; } });
    const result = download({ id: 'a', role: 'ADMIN' }, 'photo/id', new AbortController().signal);
    if (deniedAt) await assert.rejects(result, /Account changed/);
    else assert.equal(await result, 'https://storage.example.invalid/photo?signature=test');
    assert.equal(requests, deniedAt === 1 ? 0 : 1);
  }
  for (const url of ['http://storage.example.invalid/photo', 'https://user:pass@storage.example.invalid/photo']) {
    const download = runInNewContext(`${compiled}; downloadPhoto`, { URL, ReportError: Error, apiEndpoints: { uploads: '/uploads' }, requireReportAccount: async () => {}, request: async () => ({ data: { url } }) });
    await assert.rejects(download({}, 'photo'));
  }
  const download = runInNewContext(`${compiled}; downloadPhoto`, { requireReportAccount: () => assert.fail('Aborted request checked account') });
  await assert.rejects(download({}, 'photo', AbortSignal.abort()));
});
test('government feed is all-status chronological and report header has no selection count', () => {
  const page = source('DashboardPage.tsx');
  assert.match(page, /feed \? "" : reportStatus/);
  assert.match(page, /All authorized citizen reports, newest first/);
  assert.doesNotMatch(page, /FieldSelect id="feed-review-status"/);
  assert.match(page, /count=\{!report && detailOpen/);
  assert.doesNotMatch(page, /count=\{detailOpen \? "1 selected"/);
});
test('empty government and own photo sections are omitted', () => {
  assert.match(source('components/GovernmentReports.tsx'), /report.attachments.length > 0 && <section aria-label="Original photos"/);
  assert.doesNotMatch(source('components/GovernmentReports.tsx'), /No photos were submitted/);
  assert.match(read('src/pages/reports/ReportsPage.tsx'), /!!report.attachments.length && <section/);
});
test('citizen report cards and details lead with observations, human status, description, location and time instead of raw numbers', () => {
  const reports = read('src/pages/reports/ReportsPage.tsx');
  const receipt = read('src/pages/report/ReportPage.tsx');
  assert.match(reports, /icons8-smoke\.png/);
  assert.match(reports, /icons8-flame\.png/);
  assert.match(reports, /icons8-smell\.png/);
  assert.match(reports, /<ObservationIcons types=\{report\.observationTypes\} compact/);
  assert.match(reports, /\{report\.description\}<\/h3>/);
  assert.match(reports, /\{locationMode\(report\)\}/);
  assert.match(reports, /<Clock3/);
  assert.match(reports, />Observations<\/dt>/);
  assert.match(reports, />Current progress<\/dt>/);
  assert.doesNotMatch(reports, /\{report\.number\}/);
  assert.doesNotMatch(receipt, /\{receipt\.number\}/);
});
test('citizen map loads only account-scoped own reports, hides them with Published, and opens My reports detail', () => {
  const citizen = source('components/CitizenDashboard.tsx');
  const map = source('components/SituationMap.tsx');
  const queries = read('src/api/reports/reports-queries.ts');
  const keys = read('src/api/queryKeys.ts');
  const session = read('src/hooks/dashboard/session.ts');
  assert.match(citizen, /const ownReports = data\?\.ownReports \?\? \[\]/);
  assert.match(citizen, /ownReports=\{publications \? ownReports : \[\]\}/);
  assert.match(citizen, /next\.set\("panel", "my-reports"\); next\.set\("report", id\)/);
  assert.match(map, /ownReports\.filter\(hasPoint\)/);
  assert.match(map, /bg-orange-600/);
  assert.match(map, /Observer position, not incident location/);
  assert.match(map, /onSelectOwnReport\?\.\(report\.id\)/);
  const ownMarkerLayer = map.slice(map.indexOf('const markers = ownReports.filter(hasPoint)'), map.indexOf('if (readyMap && selectedReport'));
  assert.doesNotMatch(ownMarkerLayer, /hotspot-flame|flameImage/);
  assert.match(queries, /requireReportAccount\(user\)/);
  assert.match(keys, /\["dashboard", user\.id, user\.role, "map", hours\]/);
  assert.match(session, /removeQueries\(\{ queryKey: queryKeys\.dashboard\.all \}\)/);
});
test('map info uses an accessible upward popover instead of downward details content', () => {
  const map = source('components/SituationMap.tsx');
  assert.match(map, /<Popover\.Trigger asChild>/);
  assert.match(map, /<Popover\.Content side="top"/);
  assert.match(map, /aria-label="Close map info"/);
  assert.doesNotMatch(map, /<details[^>]*>[\s\S]*?<summary[^>]*>Map info/);
});
test('report review uses one atomic status, description, photo and perimeter form', () => {
  const report = source('components/GovernmentReports.tsx');
  assert.match(report, /FieldSelect id="report-review-status"/);
  assert.match(report, /value: "CONFIRMED_FIRE", label: "Confirmed"/);
  assert.match(report, /Evidence photos \(optional, up to 5\)/);
  assert.match(report, /Draw polygon/);
  assert.match(report, /submitGovernmentReportAction/);
  assert.doesNotMatch(report, /ReportProgress/);
  assert.doesNotMatch(report, /Progress update/);
  assert.doesNotMatch(report, /Save progress/);
  assert.doesNotMatch(report, /reviewGovernmentReport/);
  assert.doesNotMatch(report, /createGovernmentCase/);
  assert.doesNotMatch(report, /linkGovernmentReport/);
});
test('confirmed report action allows optional photos and requires a closed polygon before its single save', () => {
  const report = source('components/GovernmentReports.tsx');
  assert.doesNotMatch(report, /photos\.length === 0/);
  assert.doesNotMatch(report, /At least one evidence photo is required/);
  assert.match(report, /Evidence photos \(optional, up to 5\)/);
  assert.match(report, /drawingPolygon\(perimeterDraft\.drawing\)/);
  assert.match(report, /evidence: \{ findings: "VISIBLE_FIRE", source: "Authorized government review with operator-mapped boundary" \}/);
  assert.match(report, /expectedCaseVersion: report\.case\.version/);
  assert.match(report, /Save/);
  assert.match(report, /Cancel drawing/);
  assert.match(report, />Undo</);
  assert.match(report, /"canConfirmIncidents"/);
  assert.match(source('components/CasePerimeter.tsx'), /drawingPolygon\(input\.drawing\)/);
});
test('government action surfaces the first specific server validation error', () => {
  const text = read('src/api/dashboard/government.ts');
  const ast = ts.createSourceFile('government.ts', text, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'governmentErrorMessage');
  const compiled = ts.transpileModule(declaration.getText(ast).replace('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText;
  const message = runInNewContext(`${compiled}; governmentErrorMessage`, {})({ message: 'Validation failed', errors: [{ path: 'confirmed.perimeter', message: 'Polygon must be closed' }] });
  assert.equal(message, 'Polygon must be closed');
});
test('government map keeps the selected private report pin while drawing, then uses saved private case polygons', () => {
  const map = source('components/SituationMap.tsx');
  const perimeter = source('components/PerimeterMap.tsx');
  const dashboard = source('DashboardPage.tsx');
  const parser = read('src/api/dashboard/parse.ts');
  assert.match(map, /selectedReport\?\.id === report\.id/);
  assert.match(map, /selectedMarker && !!perimeterDraft/);
  assert.match(map, /!casesWithPerimeters\.has\(report\.case\.id\)/);
  assert.doesNotMatch(map, /state !== "ready" \|\| perimeterDraft \|\| onPick\) return;[\s\S]*privateReports\.filter/);
  assert.match(perimeter, /private-case-perimeters/);
  assert.match(perimeter, /PrivatePerimeters/);
  assert.match(dashboard, /data\?\.privateCases \?\? \[\]/);
  assert.match(dashboard, /privateReportMarkers\(data\?\.privateReports \?\? \[\], privateCases\)/);
  assert.match(dashboard, /privateCases=\{privateCases\}/);
  assert.match(dashboard, /onSelectCase=\{selectCase\}/);
  assert.match(parser, /data\.privateReports/);
  assert.match(parser, /data\.privateCases/);
  assert.match(map, /publishedCaseNumbers/);
  assert.match(map, /!report\.case \|\| !publishedCaseNumbers\.has\(report\.case\.number\)/);
});
test('private perimeter revisions are explicit, preload the saved ring, and retain versioned server save', () => {
  const perimeter = source('components/CasePerimeter.tsx');
  assert.match(perimeter, /"Revise boundary"/);
  assert.match(perimeter, /drawingFrom\(detail\.perimeter\)/);
  assert.match(perimeter, /version: detail\.version/);
  assert.match(perimeter, /"Save boundary revision"/);
  assert.match(perimeter, /Change reason\s*<span[^>]*aria-hidden="true"/);
  assert.match(perimeter, /setDraft\(null\)/);
});
test('public perimeter remains publication-only and polygon detail includes operational context', () => {
  const publicService = read('../Blazemap-BE/src/modules/public/public.service.ts');
  const map = source('components/PerimeterMap.tsx');
  const detail = read('src/pages/dashboard/components/PublicPerimeterDetail.tsx');
  assert.match(publicService, /status: 'PUBLISHED'/);
  assert.match(publicService, /publicCaseSnapshot/);
  assert.match(publicService, /publicPerimeter\(p\)/);
  assert.match(map, /publicPerimeterFeatures\(items\)/);
  assert.match(detail, /Handling status/);
  assert.match(detail, /Downwind attention/);
  assert.doesNotMatch(detail, /arrival time|spread speed/i);
});
test('required text controls in touched report forms pair visual stars with native and ARIA requirements', () => {
  for (const name of ['components/CaseEvidence.tsx', 'components/CasePerimeter.tsx', 'components/GovernmentReports.tsx', 'components/CasePublication.tsx']) {
    const text = source(name);
    const requiredTextControls = [...text.matchAll(/<(?:input|textarea)[^>]*\brequired(?:=\{true\})?[^>]*>/g)].map(match => match[0]);
    assert.ok(requiredTextControls.length > 0, `${name} has required controls`);
    for (const control of requiredTextControls) assert.match(control, /aria-required=(?:"true"|\{[^}]+\})/, `${name}: ${control}`);
    assert.doesNotMatch(text, /\(optional[^)]*\)<span[^>]*aria-hidden="true"[^>]*>\s*\*\s*<\/span>/i);
  }
  const report = read('src/pages/report/ReportPage.tsx');
  assert.match(report, /Date and time[^<]*<span[^>]*aria-hidden="true"/);
  assert.match(report, /Describe the location[^<]*<span[^>]*aria-hidden="true"/);
  assert.match(report, /required=\{!hasCoordinates\} aria-required=\{!hasCoordinates\}/);
  assert.match(read('src/components/ui/select.tsx'), /aria-required=\{required\}/);
});
test('report route does not render the advanced case status form below the unified action', () => {
  const page = source('DashboardPage.tsx');
  assert.doesNotMatch(page, /<CasePanel key=\{linkedCase\}/);
  assert.doesNotMatch(page, /setLinkedCase/);
});
test('arbitrary perimeter requires a closed valid polygon', () => {
  let drawing = drawingFrom(null);
  assert.throws(() => drawingPolygon(drawing));
  for (const point of [[110, -2], [111, -2], [110.5, -1]]) drawing = changeDrawing(drawing, { type: 'add', point });
  assert.throws(() => drawingPolygon(drawing), /Close each ring/);
  drawing = changeDrawing(drawing, { type: 'close' });
  assert.deepEqual(drawingPolygon(drawing).coordinates[0], [[110, -2], [111, -2], [110.5, -1], [110, -2]]);
  assert.throws(() => drawingPolygon({ rings: [[[0, 0], [1, 1], [0, 1], [1, 0]]], closed: [true], active: 0 }));
});
test('wind arrows require confirmed case, valid context and freshness', () => {
  const now = Date.now();
  const detail = { id: 'case', title: 'Case', verification: 'CONFIRMED_FIRE', latitude: -2, longitude: 110, windContext: { status: 'READY', windToDegrees: 90, evaluatedAt: new Date(now - 1000).toISOString(), usableUntil: new Date(now + 1000).toISOString() } };
  assert.equal(windArrow(detail, now).degrees, 90);
  assert.equal(windArrow({ ...detail, verification: 'UNVERIFIED' }, now), null);
  assert.equal(windArrow(detail, now + 1000), null);
  assert.equal(windArrow({ ...detail, windContext: null }, now), null);
  assert.match(source('components/CaseWind.tsx'), /Wind and potential impact/);
  assert.match(source('components/CaseWind.tsx'), /No physical fire-spread model/);
});
test('citizen report and government case expose safe BMKG context and explicit mapping prerequisites', () => {
  const reports = read('src/pages/reports/ReportsPage.tsx');
  const government = source('components/GovernmentWorklist.tsx');
  const mapping = source('components/CaseForecastRegion.tsx');
  assert.match(reports, /BMKG forecast, not on-site measurement/);
  assert.match(reports, /Potential impact unavailable/);
  assert.match(reports, /Issued/);
  assert.match(reports, /Valid from/);
  assert.match(reports, /Fetched/);
  assert.match(government, /<CaseForecastRegion/);
  assert.match(mapping, /Operator-selected mapping/);
  assert.match(mapping, /No verified administrative level IV BMKG mappings are available/);
  assert.doesNotMatch(mapping, /nearest|infer|automatic/i);
});
