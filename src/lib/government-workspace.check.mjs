import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL, URLSearchParams } from "node:url";
import { setTimeout } from "node:timers";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { QueryClient, InfiniteQueryObserver } from "@tanstack/react-query";
import { createElement, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import * as icons from "lucide-react";
import * as triage from "./report-triage.ts";
import { reportStatusLabel } from "./report-status.ts";
import { hasPoint } from "../pages/dashboard/utils/map.ts";
import { workspacePath, safeWorkspaceDestination } from "./dashboard.ts";

assert.equal(workspacePath("ADMIN"), "/dashboard");
assert.equal(workspacePath("USER"), "/dashboard");
assert.equal(safeWorkspaceDestination("/monitoring", "ADMIN"), "/monitoring");
assert.equal(safeWorkspaceDestination("/monitoring", "USER"), "/dashboard");
for (const path of ["/report", "/my-reports", "/my-reports/one", "/dashboard?panel=report", "/monitoring?panel=my-reports"]) assert.equal(safeWorkspaceDestination(path, "ADMIN"), "/dashboard");
const source = path => readFile(new URL(path, import.meta.url), "utf8");
const dashboard = await source("../pages/dashboard/DashboardPage.tsx");
assert.match(dashboard, /<MapPanel title="Worklist"[^>]*keepMounted/);
assert.match(dashboard, /<MapPanel title="List"[^>]*keepMounted/);
assert.doesNotMatch(dashboard, /panel === "cases" && !selected/);
assert.doesNotMatch(dashboard, /perimeterDraft \? <GovernmentWorklist/);
assert.match(dashboard, /user.role === "USER" \? <CitizenDashboard/);
assert.doesNotMatch(dashboard, /Feed category|feedCategory|Published summary|feedScroll/);
assert.match(dashboard, /aria-label="Citizen reports feed"/);
assert.match(dashboard, /authorizedReports.map\(item => <FeedRow/);
assert.match(dashboard, /onOpen=\{\(\) => viewReport\(item\)\}/);
assert.match(dashboard, /onSelectReport=\{selectReport\} onViewReport=\{viewReport\}/);
assert.match(dashboard, /open=\{!feed && detailOpen\}/);
assert.match(dashboard, /!hasPoint\(item\) \? "Location unavailable"/);
const ast = ts.createSourceFile("DashboardPage.tsx", dashboard, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
function collect(node) {
  if (ts.isFunctionDeclaration(node) && node.name) handlers.set(node.name.text, node.getText(ast));
  ts.forEachChild(node, collect);
}
collect(ast);
const selection = ts.transpileModule(["discardReview", "clearSelection", "selectReport", "viewReport"].map(name => handlers.get(name)).join("\n") + "\n({ viewReport, selectReport })", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const feed of [false, true]) for (const desktop of [false, true]) for (const coordinates of [true, false]) for (const state of ["clean", "declined", "accepted", "review-pending", "case-pending", "perimeter"]) {
  let params = new URLSearchParams("view=feed&case=old&observation=public&keep=yes");
  let selected = "old", focus = "old-point", worklist = true, destination = null, confirms = 0;
  const dirty = state === "declined" || state === "accepted";
  const context = {
    URLSearchParams, hasPoint, params, feed, desktop,
    reviewDraft: { dirty, pending: state === "review-pending" },
    caseDraft: { dirty, pending: state === "case-pending" },
    perimeterDraft: state === "perimeter" ? {} : null,
    window: { confirm: () => { confirms++; return state === "accepted"; } },
    setParams: update => { params = update(params); },
    setReportId: value => { selected = value; },
    setFocusPoint: value => { focus = value; },
    setWorklistOpen: value => { worklist = value; },
    navigate: value => { destination = value; },
  };
  const methods = runInNewContext(selection, context);
  methods.viewReport({ id: "report-a", case: null, latitude: coordinates ? 0 : null, longitude: coordinates ? 114 : null });
  const allowed = state === "clean" || state === "accepted";
  assert.equal(selected, allowed ? "report-a" : "old");
  assert.equal(worklist, allowed ? desktop : true);
  assert.equal(confirms, dirty ? 1 : 0, "Selection must not confirm twice");
  if (allowed) {
    assert.equal(destination, "/dashboard?keep=yes");
    assert.equal(focus?.longitude ?? null, coordinates ? 114 : null);
    assert.equal(focus?.latitude ?? null, coordinates ? 0 : null);
  } else {
    assert.equal(destination, null);
    assert.equal(focus, "old-point");
    assert.equal(params.get("case"), "old");
  }
}
const hooks = await source("../hooks/dashboard/useGovernment.ts");
assert.match(hooks, /getGovernmentReports\(pageParam, search, status, signal, pageSize\)/);
assert.match(hooks, /enabled: user.role === "ADMIN"/);
assert.match(hooks, /user.role === "ADMIN" && !!id/);
assert.match(dashboard, /useGovernmentReports\(user, "", feed \? "" : reportStatus, feed \? 10 : 20\)/);
assert.match(dashboard, /All authorized citizen reports, newest first/);
assert.doesNotMatch(dashboard, /FieldSelect id="feed-review-status"/);
assert.doesNotMatch(dashboard, /feedPage|setFeedPage/);
assert.match(dashboard, /<DraftGuard dashboard dirty=\{!!perimeterDraft \|\| caseDraft.dirty\} pending=\{!!perimeterDraft\?\.pending \|\| caseDraft.pending\}/);
assert.match(dashboard, /import \{ ItemDetail \} from "\.\/components\/CitizenDashboard"/);
const worklist = await source("../pages/dashboard/components/GovernmentWorklist.tsx");
assert.match(dashboard, /if \(reviewDraft.pending \|\| caseDraft.pending \|\| perimeterDraft\) return false/);
assert.doesNotMatch(worklist.slice(0, worklist.indexOf("export function CasePanel")), /<CasePanel/);
assert.match(worklist, /Open case on map/);
assert.match(worklist, /<CaseEvidence[^>]*draft=\{draft\} setDraft=\{setDraft\} canDraw=\{canDraw\}/);
const evidence = await source("../pages/dashboard/components/CaseEvidence.tsx");
assert.match(evidence, /if \(!authorized \|\| field\?\.findings !== "NO_INDICATION"\)/);
const reports = await source("../pages/dashboard/components/GovernmentReports.tsx");
assert.match(reports, /disabled=\{reports.failed\}/);
assert.match(reports, /!hasPoint\(report\) \? "Location unavailable"/);
const api = await source("../api/dashboard/government.ts");
assert.match(api, /governmentRequest\(`\$\{apiEndpoints.adminReports\}\?\$\{params\}`/);
assert.match(api, /governmentRequest\(`\$\{apiEndpoints.adminReports\}\/\$\{encodeURIComponent\(id\)\}`/);
assert.match(dashboard, /fieldset disabled=\{reportsUnavailable\}/);
const account = await source("../components/auth/AccountMenu.tsx");
assert.match(account, /hover:bg-secondary focus-visible:bg-secondary/);
assert.match(account, /to="\/profile"/);

assert.doesNotMatch(reports, /Previous|>Next<|Page \{|setPage/);
assert.match(reports, /reports.loadingMore && <GovernmentReportSkeleton/);
const feedRow = await source("../pages/dashboard/components/FeedRow.tsx");
assert.match(feedRow, /role="status"[^>]*text-gray-500/);
assert.match(feedRow, /<Inbox size=\{40\}[^>]*aria-hidden="true"/);
assert.doesNotMatch(feedRow.slice(feedRow.indexOf("export function FeedEmpty"), feedRow.indexOf("export function FeedFoliage")), /rounded-full|bg-/);
function compile(body, context) {
  return runInNewContext(ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: {}, ...context });
}
const reportComponent = compile(reports.slice(0, reports.indexOf("export function ReportReview")).replace(/^import .*;\n/gm, "").replace("export type", "type").replace("export default function", "function") + "\nGovernmentReports;", {
  require: () => jsxRuntime, useEffect, useRef, useState, ...icons, ...triage, reportStatusLabel,
  Button: ({ children, ...props }) => createElement("button", props, children),
  FeedEmpty: ({ children }) => createElement("div", { role: "status" }, children),
  GovernmentReportSkeleton: () => createElement("div", { role: "status", "aria-label": "Loading reports" }),
  hasPoint, formatTime: value => value,
});
const row = id => ({ id, number: id, description: id, observationTypes: ["SMOKE"], triage: { level: "UNKNOWN", reasonCodes: [], missingData: [] }, observedAt: "2026-09-18", reviewStatus: "NEW" });
const renderReports = resource => renderToStaticMarkup(createElement(reportComponent, { reports: resource, status: "", setStatus() {}, onSelectReport() {}, onViewReport() {} }));
const emptyMarkup = renderReports({ data: { data: [], meta: { total: 0 } }, hasMore: false });
assert.match(emptyMarkup, /role="status">No matching reports/);
assert.doesNotMatch(emptyMarkup, /Show more|Previous|>Next<|Page /);
const moreMarkup = renderReports({ data: { data: [row("first")], meta: { total: 3 } }, hasMore: true, loading: true, loadingMore: true });
assert.match(moreMarkup, /first/);
assert.match(moreMarkup, /aria-label="Loading reports"/);
assert.match(moreMarkup, /disabled="">Show more/);
const refreshMarkup = renderReports({ data: { data: [row("retained")] }, loading: true, loadingMore: false });
assert.doesNotMatch(refreshMarkup, /aria-label="Loading reports"/);
assert.match(refreshMarkup, /aria-busy="true"/);
assert.match(refreshMarkup, /retained/);
assert.doesNotMatch(refreshMarkup, />Loading[^<]*</);
const located = { ...row("located"), latitude: 0, longitude: 114, triage: { level: "HIGH", reasonCodes: ["SATELLITE_SPATIOTEMPORAL_MATCH"], missingData: ["SETTLEMENT_COVERAGE"] } };
const locatedMarkup = renderReports({ data: { data: [located] } });
assert.match(locatedMarkup, /<article[\s\S]*View on map<\/button><\/article>/);
assert.match(locatedMarkup, /icons8-warning.png/);
assert.match(locatedMarkup, /A nearby satellite detection/);
assert.doesNotMatch(locatedMarkup, /SATELLITE_SPATIOTEMPORAL_MATCH|SETTLEMENT_COVERAGE/);
assert.doesNotMatch(moreMarkup, /View on map/);
assert.equal(new Set(Object.values(triage.triageAppearance).map(item => item.color)).size, 4);

class DashboardError extends Error { constructor(status) { super("Fixture error"); this.status = status; } }
class AuthError extends DashboardError {}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
let observer, options, responseError = null, accountError = null, release = null, requests = [], checks = 0, cleared = 0;
const hookBody = hooks.slice(hooks.indexOf("async function load"), hooks.indexOf("export function useGovernmentReport(user")).replace("export function", "function");
const useReports = compile(hookBody + "\nuseGovernmentReports;", {
  useInfiniteQuery: value => { options = value; return observer ? observer.getCurrentResult() : {}; },
  DashboardError, GovernmentError: DashboardError, AuthError,
  checkDashboardAccount: async () => { checks++; if (accountError) throw accountError; },
  clearDashboardQueries: () => { cleared++; client.setQueriesData({ queryKey: ["dashboard"] }, null); client.removeQueries({ queryKey: ["dashboard"] }); },
  dashboardLogin: () => "/login", window: { location: { replace() {} } },
  getGovernmentReports: async (page, search, status, signal) => {
    requests.push({ page, status, signal });
    if (release) await new Promise(resolve => { release = resolve; });
    if (responseError) throw responseError;
    return { data: [row(`${status || "all"}-${page}`)], meta: { page, pageSize: 1, total: 3 } };
  },
});
const user = { id: "fixture-a", role: "ADMIN" };
useReports(user, "", "");
observer = new InfiniteQueryObserver(client, options);
let unsubscribe = observer.subscribe(() => {});
try {
  await observer.refetch();
  assert.equal(useReports(user, "", "").data.data.length, 1);
  release = true;
  useReports(user, "", "").showMore();
  useReports(user, "", "").showMore();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(requests.filter(request => request.page === 2).length, 1);
  assert.equal(useReports(user, "", "").data.data.length, 1);
  const finish = release; release = null; finish();
  await observer.fetchNextPage({ cancelRefetch: false });
  assert.equal(useReports(user, "", "").data.data.length, 2);
  assert.equal(useReports(user, "", "").data.meta.total, 3);
  responseError = new Error("Offline");
  const checkedBefore = checks;
  await observer.fetchNextPage();
  assert.ok(checks >= checkedBefore + 2, "Ordinary errors revalidate the current account before retaining rows");
  assert.equal(useReports(user, "", "").data.data.length, 2);
  responseError = null;
  await observer.fetchNextPage();
  assert.equal(useReports(user, "", "").data.data.length, 3);
  assert.equal(useReports(user, "", "").hasMore, false);
  for (const [nextUser, status] of [[user, "NEW"], [{ id: "fixture-b", role: "ADMIN" }, "NEW"], [user, ""]]) {
    unsubscribe();
    useReports(nextUser, "", status);
    observer.setOptions(options);
    assert.equal(useReports(nextUser, "", status).data, null, "New scope cannot render prior rows");
    unsubscribe = observer.subscribe(() => {});
    await observer.refetch();
    assert.equal(requests.at(-1).page, 1);
    assert.equal(useReports(nextUser, "", status).data.data.length, 1);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  for (const status of [401, 403]) {
    responseError = new DashboardError(status);
    await observer.fetchNextPage();
    assert.equal(useReports(user, "", "").data, null);
    assert.ok(cleared > 0);
    responseError = null;
    await observer.refetch();
  }
  for (const error of [new AuthError(401), new Error("Account check unavailable")]) {
    accountError = error;
    await observer.fetchNextPage();
    assert.equal(useReports(user, "", "").data, null);
    accountError = null;
    await observer.refetch();
  }
  assert.equal(useReports({ ...user, role: "USER" }, "", "").data, null);
  assert.equal(options.getNextPageParam({ data: [], meta: { page: 1, pageSize: 20, total: 100 } }), undefined);
  release = true;
  useReports(user, "", "").showMore();
  await new Promise(resolve => setTimeout(resolve, 0));
  const oldRequest = requests.at(-1);
  const finishOld = release;
  release = null;
  useReports(user, "", "REVIEWED");
  observer.setOptions(options);
  assert.equal(oldRequest.signal.aborted, true);
  assert.equal(useReports(user, "", "REVIEWED").data, null);
  finishOld();
  await observer.refetch();
  assert.equal(useReports(user, "", "REVIEWED").data.data[0].id, "REVIEWED-1");
  assert.equal(useReports(user, "", "REVIEWED").data.data.length, 1);
} finally { unsubscribe(); client.clear(); }
