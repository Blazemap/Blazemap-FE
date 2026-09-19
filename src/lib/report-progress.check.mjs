import assert from "node:assert/strict";
import console from "node:console";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import * as icons from "lucide-react";
import * as triage from "./report-triage.ts";

const source = path => readFile(new URL(path, import.meta.url), "utf8");
function compile(body, context) { return runInNewContext(ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: {}, require: () => jsx, ...context }); }
const timeline = compile((await source("../pages/reports/ReportTimeline.tsx")).replace(/^import .*;\n/gm, "").replace("export default function", "function") + "\nReportTimeline;", {});
const report = { id: "report", number: "R-12", description: "Original citizen words\nNot confirmed", observationTypes: ["BURNING_SMELL"], observedAt: "2026-09-01T01:00:00Z", createdAt: "2026-09-01T02:00:00Z", locationMode: "OBSERVER_POSITION", latitude: 0, longitude: 114, locationDescription: "Near the bridge", attachments: [{ id: "photo", filename: "original.jpg" }], case: null, reviewStatus: "NEW", region: null, regionId: null, triage: { level: "UNKNOWN", reasonCodes: [], missingData: [], ruleVersion: "1", evaluatedAt: "2026-09-01", satelliteMatch: null, settlementMatch: null } };
const markup = renderToStaticMarkup(createElement(timeline, { report: { ...report, progress: [{ id: "p", stage: "UNDER_REVIEW", description: "Checking the original observation.", createdAt: "2026-09-02T00:00:00Z", actorDisplay: "Government reviewer" }] } }));
assert.ok(markup.indexOf("Received") < markup.indexOf("In progress"));
assert.match(markup, /Checking the original observation/);
assert.doesNotMatch(markup, /Fire confirmed|Responding|Closed/);
const reports = await source("../pages/dashboard/components/GovernmentReports.tsx");
const review = compile(reports.replace(/^import .*;\n/gm, "").replace("export default function", "function").replaceAll("export function", "function").replace("export type", "type") + "\nReportReview;", {
  useState, useEffect, useRef, ...icons, ...triage, ReportTimeline: timeline, DraftGuard: () => null,
  CasePublication: () => null, ReportProgress: () => null, ReportPhotos: ({ photos }) => createElement("span", null, photos.map(photo => photo.filename).join(", ")),
  motion: { section: "section" }, useReducedMotion: () => true,
  Button: ({ children, ...props }) => createElement("button", props, children),
  FieldSelect: ({ options, onValueChange, ...props }) => createElement("select", { ...props, onChange: event => onValueChange(event.target.value) }, options.map(option => createElement("option", { key: option.value, value: option.value }, option.label))),
  useGovernmentMutation: () => ({}), hasPoint: value => value.latitude !== null && value.longitude !== null, formatTime: value => value,
});
const reviewMarkup = renderToStaticMarkup(createElement(review, { report, user: { id: "admin", role: "ADMIN" }, onDraft() {}, onCase() {}, onDraw() {}, canDraw: true }));
assert.ok(reviewMarkup.indexOf("What happened") < reviewMarkup.indexOf("Review priority and source coverage"));
assert.match(reviewMarkup, /Original citizen words/);
assert.match(reviewMarkup, /Burning smell/);
assert.match(reviewMarkup, /original.jpg/);
assert.doesNotMatch(reviewMarkup, /Case title|Association reason|Existing case ID/);
assert.match(reviewMarkup, /In progress/);
const ast = ts.createSourceFile("GovernmentReports.tsx", reports, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let action;
function collect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useGovernmentMutation") action = node.arguments[1].getText(ast);
  ts.forEachChild(node, collect);
}
collect(ast);
class GovernmentError extends Error { constructor(status) { super("Request failed"); this.status = status; } }
for (const scenario of ["new", "linked", "link-failure", "review-failure", "unknown-create", "rejected-create", "concurrent", "reviewed", "declined"]) {
  let current = { ...report, case: scenario === "linked" ? { id: "existing" } : null };
  let creates = 0, links = 0, reviews = 0, opened = null, fail = true, release;
  const created = { current: null }, uncertainCreation = { current: false }, inFlight = { current: false };
  const run = compile(`(${action});`, {
    report, description: "Checking reported smoke", created, uncertainCreation, inFlight, GovernmentError,
    AbortSignal: globalThis.AbortSignal,
    setUnfinished() {}, setDescription() {}, onCase: id => { opened = id; },
    getGovernmentReport: async () => current,
    createGovernmentCase: async body => {
      creates++;
      assert.equal(body.title, "Reported observation R-12");
      assert.equal(body.reason, "Checking reported smoke");
      assert.equal(body.latitude, null); assert.equal(body.longitude, null);
      if (scenario === "unknown-create") throw new Error("Connection lost");
      if (scenario === "rejected-create" && fail) { fail = false; throw new GovernmentError(422); }
      if (scenario === "concurrent") await new Promise(resolve => { release = resolve; });
      return { id: "case", number: "C-1" };
    },
    linkGovernmentReport: async (id, caseId, reason) => {
      links++;
      assert.equal(id, "report"); assert.equal(reason, "Checking reported smoke");
      if (scenario === "link-failure" && fail) { fail = false; throw new Error("Link failed"); }
      current = { ...current, case: { id: caseId } };
    },
    reviewGovernmentReport: async (_id, status) => {
      reviews++;
      if (scenario === "review-failure" && fail) { fail = false; throw new Error("Review failed"); }
      current = { ...current, reviewStatus: status };
    },
  });
  const status = scenario === "reviewed" ? "REVIEWED" : scenario === "declined" ? "DECLINED" : "UNDER_REVIEW";
  if (scenario === "unknown-create") {
    await assert.rejects(run(status));
    await assert.rejects(run(status), /could not be confirmed/);
    assert.equal(creates, 1); assert.equal(links, 0); assert.equal(reviews, 0);
    continue;
  }
  if (["link-failure", "review-failure", "rejected-create"].includes(scenario)) await assert.rejects(run(status));
  const pending = run(status);
  if (scenario === "concurrent") { await Promise.resolve(); await run(status); release(); }
  await pending;
  assert.equal(current.reviewStatus, status);
  assert.equal(creates, ["linked", "reviewed", "declined"].includes(scenario) ? 0 : scenario === "rejected-create" ? 2 : 1);
  assert.equal(opened, status === "UNDER_REVIEW" ? current.case.id : null);
  assert.equal(inFlight.current, false);
}
const api = await source("../api/dashboard/government.ts");
const linkSource = api.slice(api.indexOf("export async function linkGovernmentReport"), api.indexOf("export async function reviewGovernmentReport"));
assert.doesNotMatch(linkSource, /REVIEWED/);
const photoView = await source("../pages/reports/ReportPhotos.tsx");
assert.match(photoView, /downloadPhoto\(\{ id, role \} as DashboardUser, photo.id, signal\)/);
console.log("Report rendering, chronological progress, automatic In progress start, existing links, retry safety, concurrent clicks, uncertain creation and signed-photo path passed.");
