import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL, URLSearchParams } from "node:url";
import { runInNewContext } from "node:vm";
import console from "node:console";
import ts from "typescript";
import { setTimeout as delay } from "node:timers/promises";
import { InfiniteQueryObserver, QueryClient, QueryObserver } from "@tanstack/react-query";

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const compile = path => {
  const exports = {};
  runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports });
  return exports;
};
const { boundPanel } = compile("lib/dashboard.ts");
assert.equal(boundPanel({ x: 0, y: 0, width: 380, height: 600 }, { width: 1200, height: 800 }).y, 0, "Panels must reach the top of the viewport");
const dashboard = read("pages/dashboard/DashboardPage.tsx");
assert.doesNotMatch(dashboard, /panel === "cases" && !selected \? <GovernmentWorklist/, "Marker selection must not unmount management");
assert.doesNotMatch(dashboard, /openWorklist\(opener\);/, "Marker selection must not open the list sheet");
assert.doesNotMatch(dashboard, />Management<|>Observations<\/Button>/, "List and Worklist must be independent windows, not tabs");
assert.match(dashboard, /<MapPanel title="List"/);
assert.match(dashboard, /<MapPanel title="Worklist"/);
assert.match(dashboard, /<MapLayers/);
assert.match(read("pages/dashboard/components/CitizenDashboard.tsx"), /<MapLayers/);
const reports = read("pages/dashboard/components/GovernmentReports.tsx");
assert.doesNotMatch(reports.slice(0, reports.indexOf("export function ReportReview")), /<ReportReview/, "Review must be a sibling, not a queue child");
const triage = compile("lib/report-triage.ts");
assert.equal(triage.triageAppearance.UNKNOWN.label, "Needs assessment");
assert.equal(triage.reportFilters.map(filter => filter.label).join(","), "All,Reviewed,In progress,Confirmed,Ended");
assert.match(reports, /Ended shows declined reports only/);
assert.match(reports, /View on map/);
assert.match(read("components/auth/AccountMenu.tsx"), /<Activity[^>]*\/>Monitoring/);
assert.match(read("hooks/dashboard/useDashboardResource.ts"), /gcTime: queryKey\[3\] === "map" \? 5 \* 60_000 : 0/, "Polled map ranges must survive inactive range switches without retaining other private resources");
const { queryKeys } = compile("api/queryKeys.ts");
const { filterMap, toGeoJSON } = compile("pages/dashboard/utils/map.ts");
let captured;
const hookExports = {};
runInNewContext(ts.transpileModule(read("hooks/dashboard/useDashboardResource.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: hookExports,
  require: name => name === "@tanstack/react-query" ? { useQuery: options => { captured = options; return {}; } } : name === "@/lib" ? { AuthError: class extends Error {} } : {},
});
hookExports.useDashboardResource({ id: "test", role: "ADMIN" }, ["dashboard", "test", "ADMIN", "map", 48], async () => ({}));
const mapGcTime = captured.gcTime;
assert.equal(mapGcTime, 300000);
hookExports.useDashboardResource({ id: "test", role: "ADMIN" }, ["dashboard", "test", "ADMIN", "case", "private"], async () => ({}));
assert.equal(captured.gcTime, 0);
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: mapGcTime } } });
const user = { id: "test-operator", role: "ADMIN" };
const recent = { id: "recent", kind: "hotspot", latitude: 0, longitude: 114, title: "Recent satellite detection", location: "Kalimantan", frp: 10 };
const older = { ...recent, id: "older" };
const cache = { 48: { items: [recent] }, 168: { items: [recent, older] } };
for (const hours of [48, 168]) client.setQueryData(queryKeys.dashboard.map(user, hours), cache[hours]);
let requests = 0;
const options = hours => ({ queryKey: queryKeys.dashboard.map(user, hours), queryFn: async () => { requests++; throw new Error("Cached switches must not need source updates"); }, staleTime: Infinity });
const observer = new QueryObserver(client, options(48));
const unsubscribe = observer.subscribe(() => {});
for (const hours of [48, 168, 48, 168, 48]) {
  observer.setOptions(options(hours));
  await delay(10);
  const result = observer.getCurrentResult();
  const geo = toGeoJSON(filterMap(result.data.items, "", true, true));
  assert.equal(geo.features.length, hours === 48 ? 1 : 2);
  assert.equal(geo.features[0].properties.id, recent.id);
}
assert.equal(requests, 0);
const mapSource = read("pages/dashboard/components/SituationMap.tsx");
const mapAst = ts.createSourceFile("SituationMap.tsx", mapSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let sourceEffect;
function findEffect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(mapAst) === "useEffect" && node.arguments[0]?.getText(mapAst).includes('getSource("observations")')) sourceEffect = node.arguments[0].getText(mapAst);
  ts.forEachChild(node, findEffect);
}
findEffect(mapAst);
assert.ok(sourceEffect);
let rendered;
let repaints = 0;
for (const hours of [48, 168, 48]) {
  const errors = [];
  const cleanup = runInNewContext(ts.transpileModule(`(${sourceEffect})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    mapRef: { current: { getSource: () => ({ setData: async data => { rendered = data; } }), triggerRepaint: () => repaints++ } },
    items: cache[hours].items, toGeoJSON, setState: value => errors.push(value),
  });
  await delay(0);
  assert.equal(rendered.features.length, hours === 48 ? 1 : 2);
  assert.equal(errors.length, 0);
  cleanup();
}
assert.equal(repaints, 3);
assert.notDeepEqual(queryKeys.dashboard.map(user, 48), queryKeys.dashboard.map({ ...user, id: "other" }, 48));
unsubscribe();
client.clear();
const worklist = read("pages/dashboard/components/GovernmentWorklist.tsx");
assert.doesNotMatch(worklist.slice(0, worklist.indexOf("export function CasePanel")), /<CasePanel|useQueryGetCases\(/);
assert.equal((dashboard.match(/useQueryGetCases\(user, caseFilters\)/g) ?? []).length, 1);
assert.match(dashboard, /const \[worklistOpen, setWorklistOpen\] = useState\(false\)/);
assert.equal((dashboard.match(/useGovernmentReports\(user, "", reportStatus, feed \? 10 : 20\)/g) ?? []).length, 1);
assert.match(dashboard, /<GovernmentWorklist reports=\{internalFeed\}/);
assert.match(dashboard, /privateReports=\{reportsUnavailable \|\| internalFeed.forbidden \? \[\] : authorizedReports\}/);
assert.match(dashboard, /item.kind === "hotspot" \? <img src="\/icons8-satellite.png" alt="" width=\{40\} height=\{40\}/);
assert.match(dashboard, /<FileText size=\{24\} aria-hidden="true"/);
assert.match(reports, /<FeedEmpty>No matching reports\.<\/FeedEmpty>/);
assert.doesNotMatch(reports, />Previous<|>Next<|Page \{/);
assert.match(reports, /reports.loadingMore && <GovernmentReportSkeleton/);
assert.match(reports, /reports.hasMore && <Button[^>]*disabled=\{reports.loading\}[^>]*onClick=\{reports.showMore\}/);
assert.match(dashboard, /internalFeed.loadingMore && <FeedRowsSkeleton/);
assert.match(dashboard, /<FeedSentinel enabled=\{internalFeed.hasMore && !internalFeed.loading && !internalFeed.failed\} onLoad=\{internalFeed.showMore\}/);
assert.match(read("pages/dashboard/components/FeedRow.tsx"), /text-gray-500"><Inbox size=\{40\}/);
assert.doesNotMatch(dashboard, /privateCases=|casesVisible/);
assert.match(dashboard, /const caseId = cases.forbidden \? null : params.get\("case"\)/);
assert.match(dashboard, /<MapPanel title="Worklist"[^>]*open=\{!feed && !perimeterDraft && worklistOpen && \(desktop \|\| !detailOpen\)\} keepMounted/);
assert.match(dashboard, /const detail = caseId \? <CasePanel/);
assert.match(reports, /hasPoint\(item\) && <Button/);
assert.match(worklist, /<GovernmentReports \{\.\.\.props\}/);
const citizen = read("pages/dashboard/components/CitizenDashboard.tsx");
assert.doesNotMatch(citizen, /privateCases|governmentCases|useQueryGetCases|CasePanel/);
assert.doesNotMatch(read("pages/dashboard/components/MapLayers.tsx"), /governmentCases|Internal cases/);
assert.match(read("hooks/dashboard/useDashboardResource.ts"), /error.status === 403\) \{ clearDashboardQueries\(\); return null;/);
const pageAst = ts.createSourceFile("DashboardPage.tsx", dashboard, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
function collectHandlers(node) {
  if (ts.isFunctionDeclaration(node) && node.name) handlers.set(node.name.text, node.getText(pageAst));
  ts.forEachChild(node, collectHandlers);
}
collectHandlers(pageAst);
const { hasPoint } = compile("pages/dashboard/utils/map.ts");
for (const blocked of [false, true]) {
  let params = new URLSearchParams("case=old&observation=public");
  let focus = null, linkedCase = null, reportId = "report";
  const context = {
    URLSearchParams, hasPoint, params, caseId: "old", desktop: true, feed: false,
    discardReview: () => !blocked,
    setLinkedCase: value => { linkedCase = value; },
    setFocusPoint: value => { focus = value; },
    setReportId: value => { reportId = value; },
    setWorklistOpen() {},
    setParams: update => { params = update(params); },
    navigate: url => { params = new URLSearchParams(url.split("?")[1]); },
  };
  const methods = runInNewContext(ts.transpileModule([...['clearSelection', 'selectReport', 'closeDetail'].map(name => handlers.get(name)), '({ selectReport, closeDetail })'].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  methods.selectReport({ id: "missing", latitude: null, longitude: null });
  assert.equal(focus, null);
  methods.selectReport({ id: "report-a", latitude: 0, longitude: 114, case: { id: "linked" } });
  assert.equal(linkedCase, blocked ? null : "linked");
  assert.equal(reportId, blocked ? "report" : "report-a");
  assert.equal(params.get("case"), blocked ? "old" : null, "Report selection must clear prior case details");
  assert.equal(focus?.longitude ?? null, blocked ? null : 114);
  methods.closeDetail();
  assert.equal(reportId, blocked ? "report" : null);
  assert.equal(params.get("case"), blocked ? "old" : null);
}
assert.doesNotMatch(handlers.get("closeDetail"), /setWorklistOpen/);
for (const pending of [false, true]) for (const drawing of [false, true]) for (const dirty of [false, true]) for (const approve of [false, true]) {
  const guard = runInNewContext(`${ts.transpileModule(handlers.get("discardReview"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText}; discardReview`, {
    reviewDraft: { dirty: false, pending: false }, caseDraft: { dirty, pending }, perimeterDraft: drawing ? {} : null, window: { confirm: () => approve },
  });
  assert.equal(guard(), !pending && !drawing && (!dirty || approve));
}
let privateRequests = 0;
const queryExports = {};
runInNewContext(ts.transpileModule(read("api/dashboard/dashboard-queries.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: queryExports, URLSearchParams,
  require: name => name === "@/api/queryKeys" ? { queryKeys } : name === "@/config/api-client" ? { apiClient: { get: async () => { privateRequests++; return { data: {} }; } } } : name === "./parse" ? { parseCases: value => value } : name === "@/constants" ? { apiEndpoints: { cases: "/admin/cases" } } : {},
});
const filtersForCases = { query: "", verification: "", priority: "", page: 1 };
const citizenCases = queryExports.casesQueryOptions({ ...user, role: "USER" }, filtersForCases);
assert.equal(citizenCases.enabled, false);
await assert.rejects(citizenCases.queryFn({ signal: { throwIfAborted() {} } }), error => error.status === 403);
assert.equal(privateRequests, 0);
await queryExports.casesQueryOptions(user, filtersForCases).queryFn({ signal: { throwIfAborted() {} } });
assert.equal(privateRequests, 1);
const markerEffect = [];
function collectCaseEffect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(mapAst) === "useEffect" && node.arguments[0]?.getText(mapAst).includes("privateReports.filter")) markerEffect.push(node.arguments[0].getText(mapAst));
  ts.forEachChild(node, collectCaseEffect);
}
collectCaseEffect(mapAst);
assert.equal(markerEffect.length, 1);
let buttons = [], markers = [], opened = null;
class FakeMarker {
  constructor({ element }) { this.element = element; markers.push(this); }
  setLngLat(point) { this.point = point; return this; }
  addTo() { return this; }
  remove() { this.removed = true; }
}
const markerContext = {
  readyMap: {}, state: "ready", perimeterDraft: null, onPick: null, focusedCase: "case-a", hasPoint, Marker: FakeMarker,
  triageAppearance: triage.triageAppearance,
  privateReports: [{ id: "report-a", number: "R1", triage: { level: "HIGH" }, locationMode: "OBSERVER_POSITION", latitude: 0, longitude: 114 }, { id: "missing", latitude: null, longitude: null }],
  onSelectReport: item => { opened = item.id; },
  document: { createElement: () => { const button = { style: {}, setAttribute(name, value) { this[name] = value; }, addEventListener(name, handler) { this[name] = handler; } }; buttons.push(button); return button; } },
};
const runMarkers = context => runInNewContext(ts.transpileModule(`(${markerEffect[0]})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const cleanupMarkers = runMarkers(markerContext);
assert.equal(markers.length, 1);
assert.equal(opened, null);
assert.equal(buttons[0].style.backgroundColor, triage.triageAppearance.HIGH.color);
assert.match(buttons[0]["aria-label"], /Observer position, not incident location/);
assert.equal(buttons[0].textContent, triage.triageAppearance.HIGH.symbol);
buttons[0].click({ stopPropagation() {} });
assert.equal(opened, "report-a");
cleanupMarkers();
assert.equal(markers[0].removed, true);
buttons = []; markers = [];
runMarkers({ ...markerContext, privateReports: [] });
runMarkers({ ...markerContext, perimeterDraft: { caseId: "case-a" } });
assert.equal(markers.length, 0);
assert.notDeepEqual(queryKeys.dashboard.cases(user, {}), queryKeys.dashboard.cases({ ...user, role: "USER" }, {}));
assert.match(read("api/dashboard/dashboard-queries.ts"), /if \(user.role !== "ADMIN"\) throw new DashboardError\(403\)/);
assert.match(read("pages/dashboard/components/CaseEvidence.tsx"), /version: detail.version/);
assert.match(read("pages/dashboard/components/CasePerimeter.tsx"), /input.version !== detail.version/);
assert.match(read("pages/dashboard/components/CasePublication.tsx"), /current.version !== detail.version/);
const governmentExports = {};
let infiniteOptions, infiniteResult = {};
let failNext = false;
const reportRequests = [];
class DashboardError extends Error { constructor(status) { super(); this.status = status; } }
runInNewContext(ts.transpileModule(read("hooks/dashboard/useGovernment.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: governmentExports,
  require: name => name === "@tanstack/react-query" ? { useInfiniteQuery: options => { infiniteOptions = options; return infiniteResult; } } : name === "@/lib" ? { AuthError: class extends Error {} } : name === "@/api/dashboard" ? { DashboardError } : name === "@/api/dashboard/government" ? {
    GovernmentError: class extends Error {},
    getGovernmentReports: async (page, search, status) => {
      reportRequests.push({ page, search, status });
      await delay(10);
      if (failNext) throw new Error("Offline");
      return { data: status === "REVIEWED" ? [] : page === 1 ? [{ id: "a" }, { id: "b" }] : [{ id: "b" }, { id: "c" }], meta: { page, pageSize: 2, total: status === "REVIEWED" ? 0 : 4 } };
    },
  } : name === "./session" ? { checkDashboardAccount: async () => user, clearDashboardQueries() {} } : {},
});
const renderReports = (account = user, status = "") => governmentExports.useGovernmentReports(account, "", status);
renderReports();
const reportClient = new QueryClient();
const reportObserver = new InfiniteQueryObserver(reportClient, infiniteOptions);
const stopReports = reportObserver.subscribe(result => { infiniteResult = result; });
await reportObserver.refetch();
let result = renderReports();
assert.equal(result.data.data.map(item => item.id).join(","), "a,b");
assert.equal(result.hasMore, true);
result.showMore();
result.showMore();
result = renderReports();
assert.equal(result.loadingMore, true);
assert.equal(result.data.data.length, 2, "Retain loaded rows during append");
await delay(40);
result = renderReports();
assert.equal(reportRequests.filter(request => request.page === 2).length, 1, "Double clicks must not duplicate requests");
assert.equal(result.data.data.map(item => item.id).join(","), "a,b,c", "Append pages and deduplicate report IDs");
assert.equal(result.hasMore, false);
failNext = true;
await reportObserver.refetch();
result = renderReports();
assert.equal(result.failed, true);
assert.equal(result.data.data.length, 3, "Refresh failures retain loaded rows");
failNext = false;
renderReports(user, "REVIEWED");
reportObserver.setOptions(infiniteOptions);
assert.equal(renderReports(user, "REVIEWED").data, null, "Filter changes must clear earlier rows");
await delay(40);
result = renderReports(user, "REVIEWED");
assert.equal(result.data.data.length, 0);
assert.equal(result.hasMore, false);
renderReports({ ...user, id: "another-account" });
reportObserver.setOptions(infiniteOptions);
assert.equal(renderReports({ ...user, id: "another-account" }).data, null, "Account changes must not reuse private rows");
await delay(40);
assert.equal(reportRequests.at(-1).page, 1);
assert.equal(renderReports({ ...user, role: "USER" }).forbidden, true);
assert.equal(infiniteOptions.enabled, false);
stopReports();
reportClient.clear();
const manifest = JSON.parse(readFileSync(new URL("../assets.json", import.meta.url), "utf8"));
for (const name of ["satellite", "warning", "map", "calendar", "photo", ...Object.values(triage.observationAppearance).map(item => item.icon)]) {
  const file = `public/icons8-${name}.png`;
  const image = readFileSync(new URL(`../${file}`, import.meta.url));
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
  assert.ok(image.readUInt32BE(16) > 0 && image.readUInt32BE(20) > 0, file);
  if (["satellite", "warning", "map", "calendar", "photo"].includes(name)) {
    const asset = manifest.graphics.find(item => item.file === file);
    assert.ok(asset?.license && asset?.licenseStatus && asset?.verification, `Missing license/verification metadata: ${file}`);
    assert.deepEqual(asset.dimensions, [image.readUInt32BE(16), image.readUInt32BE(20)]);
  }
}
console.log("Workspace, shared infinite reports, retained append/error rows, duplicate suppression, filter/account resets, empty state, satellite asset, markers and authorization checks passed; no browser verification.");
