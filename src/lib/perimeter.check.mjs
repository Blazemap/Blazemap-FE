import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
import ts from "typescript";
import { changeDrawing, drawingFrom, drawingPolygon, editDraft, parsePolygon, polygonArea } from "./perimeter.ts";
import { parseMap } from "../api/dashboard/parse.ts";
import { publicPerimeterFeatures, toGeoJSON } from "../pages/dashboard/utils/map.ts";

const geometry = { type: "Polygon", coordinates: [[[110, -2], [110.1, -2], [110.1, -1.9], [110.04, -1.94], [110, -1.9], [110, -2]]] };
assert.deepEqual(parsePolygon(geometry), geometry);
assert.ok(polygonArea(geometry) > 0);
assert.deepEqual(drawingPolygon(drawingFrom(geometry)), geometry);
const holes = { type: "Polygon", coordinates: [[[110, -2], [111, -2], [111, -1], [110, -1], [110, -2]], [[110.2, -1.8], [110.3, -1.8], [110.3, -1.7], [110.2, -1.7], [110.2, -1.8]]] };
assert.deepEqual(parsePolygon(holes), holes);
for (const coordinates of [
  [[[0, 0], [1, 0], [2, 0], [0, 0]]],
  [[[0, 0], [2, 2], [0, 2], [2, 0], [0, 0]]],
  [[[0, 0], [2, 0], [1, 0], [2, 2], [0, 0]]],
  [[[0, 0], [2, 0], [2, 2], [2, 0], [0, 0]]],
  [[[110, -2], [110.1, -2], [110.1, -1.9], [110, -1.9]]],
  [[[181, -2], [110.1, -2], [110.1, -1.9], [181, -2]]],
  [[[110, -91], [110.1, -2], [110.1, -1.9], [110, -91]]],
  [[[0, 0], [180, 0], [180, 1], [0, 0]]],
  [...holes.coordinates, holes.coordinates[1]],
  [holes.coordinates[0], [[112, -2], [113, -2], [113, -1], [112, -2]]],
]) assert.throws(() => parsePolygon({ type: "Polygon", coordinates }));
assert.throws(() => parsePolygon({ type: "MultiPolygon", coordinates: [geometry.coordinates] }));
const circle = Array.from({ length: 999 }, (_, i) => [110 + Math.cos(i * 2 * Math.PI / 999) * 0.01, -2 + Math.sin(i * 2 * Math.PI / 999) * 0.01]);
assert.equal(parsePolygon({ type: "Polygon", coordinates: [[...circle, circle[0]]] }).coordinates[0].length, 1000);
assert.throws(() => parsePolygon({ type: "Polygon", coordinates: [[...circle, [110.1, -2], circle[0]]] }));
let drawing = drawingFrom(null);
assert.equal(changeDrawing(drawing, { type: "close" }), drawing);
drawing = changeDrawing(drawing, { type: "add", point: [110, -2] });
assert.equal(changeDrawing(drawing, { type: "add", point: [110, -2] }), drawing);
assert.equal(changeDrawing(drawing, { type: "add", point: [NaN, 0] }), drawing);
drawing = changeDrawing(drawing, { type: "add", point: [110.1, -2] });
assert.equal(changeDrawing(drawing, { type: "close" }), drawing);
drawing = changeDrawing(drawing, { type: "add", point: [110.1, -1.9] });
assert.throws(() => drawingPolygon(drawing));
drawing = changeDrawing(drawing, { type: "close" });
assert.equal(drawing.closed[0], true);
assert.deepEqual(drawingPolygon(drawing).coordinates[0].at(-1), [110, -2]);
assert.equal(changeDrawing(drawing, { type: "add", point: [110, -1.9] }), drawing);
const moved = changeDrawing(drawing, { type: "move", index: 0, point: [109.9, -2] });
assert.deepEqual(drawingPolygon(moved).coordinates[0].at(-1), [109.9, -2]);
assert.equal(changeDrawing(moved, { type: "delete", index: 0 }).closed[0], false);
const reopened = changeDrawing(moved, { type: "reopen" });
assert.equal(changeDrawing(reopened, { type: "add", point: [110, -1.9] }).rings[0].length, 4);
const withHole = changeDrawing(drawing, { type: "hole" });
assert.equal(withHole.active, 1);
assert.deepEqual(changeDrawing(withHole, { type: "delete-hole" }), drawing);
const draft = { caseId: "private-case", version: 7, drawing, history: [], observedAt: "2026-01-01T00:00", source: "Field survey", reason: "Actual boundary", authority: "Authority", pending: false, fit: 0 };
const edited = editDraft(draft, { type: "move", index: 1, point: [110.2, -2] });
assert.deepEqual(editDraft(edited, { type: "undo" }), draft);
assert.equal(editDraft({ ...draft, pending: true }, { type: "delete", index: 0 }).drawing, drawing);
assert.equal(edited.version, 7, "drawing edits do not silently rebase a server revision");
assert.deepEqual(draft.drawing, drawing, "cancel can drop the draft without mutating saved geometry");
const full = drawingFrom({ type: "Polygon", coordinates: [[...circle, circle[0]]] });
assert.equal(changeDrawing(changeDrawing(full, { type: "reopen" }), { type: "add", point: [111, -2] }).rings[0].length, 999);

const publicPerimeter = { geometry, observedAt: "2026-01-01T00:00:00Z", source: "Audited field survey", areaHectares: polygonArea(geometry), revision: 2, reporterEmail: "private@example.invalid" };
const publication = { publicationId: "publication-check", title: "Public snapshot", publicLocationMode: "APPROVED_INCIDENT_PERIMETER", latitude: -2, longitude: 110, publishedAt: "2026-01-01T00:00:00Z", regions: [], verificationStatus: "CONFIRMED_FIRE", handlingStatus: "OPEN", publicPerimeter, perimeter: geometry, fieldUpdates: [{ description: "PRIVATE EVIDENCE" }], authorityReference: "PRIVATE AUTHORITY" };
const envelope = item => ({ data: { cases: [item], hotspots: [], updatedAt: null, sourceStatus: { status: "NOT_SYNCED" } } });
const parsed = parseMap(envelope(publication));
assert.equal(parsed.items[0].latitude, null);
assert.equal(toGeoJSON(parsed.items).features.length, 0);
assert.equal(publicPerimeterFeatures(parsed.items).features.length, 1);
assert.deepEqual(Object.keys(publicPerimeterFeatures(parsed.items).features[0].properties), ["id"]);
assert.equal(JSON.stringify(parsed).includes("PRIVATE"), false);
assert.equal(JSON.stringify(parsed).includes("reporterEmail"), false);
assert.notEqual(parsed.items[0].publicPerimeter.geometry, geometry);
for (const mode of ["NONE", "REGION_ONLY", "APPROVED_INCIDENT_POINT"]) {
  const safe = parseMap(envelope({ ...publication, publicLocationMode: mode }));
  assert.equal(safe.items[0].publicPerimeter, undefined);
  assert.equal(publicPerimeterFeatures(safe.items).features.length, 0);
  assert.equal(toGeoJSON(safe.items).features.length, mode === "APPROVED_INCIDENT_POINT" ? 1 : 0);
}
for (const patch of [
  { publicPerimeter: undefined }, { publicPerimeter: null }, { verificationStatus: "UNVERIFIED" },
  ...[{ revision: 0 }, { revision: 1.5 }, { areaHectares: 0 }, { areaHectares: 10 }, { source: "" }, { observedAt: "yesterday" }, { observedAt: "2026-01-01" }, { geometry: { type: "Point", coordinates: [110, -2] } }].map(value => ({ publicPerimeter: { ...publicPerimeter, ...value } })),
]) assert.throws(() => parseMap(envelope({ ...publication, ...patch })));

const source = await readFile(new URL("../api/dashboard/government.ts", import.meta.url), "utf8");
const requests = [];
const replies = [];
globalThis.__governmentCheck = { request: async config => { requests.push(config); return { data: replies.shift() }; } };
const compiled = ts.transpileModule(source
  .replace('import { apiClient } from "@/config/api-client";', 'const apiClient = globalThis.__governmentCheck;')
  .replace('from "@/constants"', `from "${new URL("../constants/api.ts", import.meta.url).href}"`)
  .replace('from "./parse"', `from "${new URL("../api/dashboard/parse.ts", import.meta.url).href}"`)
  .replace('from "@/lib/perimeter"', `from "${new URL("./perimeter.ts", import.meta.url).href}"`)
  .replace('from "@/lib/wind"', `from "${new URL("./wind.ts", import.meta.url).href}"`)
  .replace('from "axios"', `from "${import.meta.resolve("axios")}"`), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
try {
  const api = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  const report = { id: "r", number: "R-1", observationTypes: ["SMOKE"], observedAt: publication.publishedAt, createdAt: publication.publishedAt, locationMode: "OBSERVER_POSITION", latitude: 0, longitude: 0, accuracyMeters: null, locationDescription: "Field", description: "Saw smoke", reviewStatus: "NEW", regionId: null, region: null, case: null, attachments: [], triage: { level: "UNKNOWN", reasonCodes: ["INCIDENT_LOCATION_UNKNOWN"], missingData: ["INCIDENT_COORDINATES"], evaluatedAt: publication.publishedAt, ruleVersion: "report-triage-1", satelliteMatch: null, settlementMatch: null } };
  assert.equal(api.parseGovernmentReports({ data: [report], meta: { page: 1, pageSize: 20, total: 1 } }).data[0].triage.level, "UNKNOWN");
  assert.throws(() => api.parseGovernmentReports({ data: [{ ...report, triage: { ...report.triage, level: "CONFIRMED" } }], meta: { page: 1, pageSize: 20, total: 1 } }));
  const create = { title: "Investigation", reason: "Review report", latitude: null, longitude: null, regionId: null };
  replies.push({ data: { id: "c", number: "C-1" } });
  assert.equal((await api.createGovernmentCase(create)).id, "c");
  assert.deepEqual(requests.at(-1).data, create);
  assert.equal("reportIds" in requests.at(-1).data, false);
  replies.push({ data: report });
  await api.linkGovernmentReport("r", "c", "Review report");
  assert.equal(requests.at(-1).method, "patch");
  assert.deepEqual(requests.at(-1).data, { caseId: "c", reviewStatus: "REVIEWED", reason: "Review report" });
  const field = { findings: "VISIBLE_FIRE", description: "Visible burning", source: "Field team", observedAt: publication.publishedAt, latitude: -2, longitude: 110 };
  replies.push({ data: { id: "f" } });
  assert.equal(await api.recordField("c", field), "f");
  assert.ok(requests.at(-1).url.endsWith("/field-updates"));
  const decision = { outcome: "CONFIRMED_FIRE", fieldUpdateId: "f", version: 8, reason: "Actual visible fire", authorityReference: "AUTH-1" };
  replies.push({ data: { id: "c" } });
  await api.verifyGovernmentCase("c", decision);
  assert.deepEqual(requests.at(-1).data, decision);
  const perimeter = { version: 9, perimeter: geometry, perimeterObservedAt: publication.publishedAt, perimeterSource: "Survey", reason: "Boundary observed", authorityReference: "AUTH-1" };
  replies.push({ data: { id: "c" } });
  await api.savePerimeter("c", perimeter);
  assert.deepEqual(requests.at(-1).data, perimeter);
  assert.equal(requests.at(-1).method, "patch");
  const publicationInput = { title: "Public update", summary: "Reviewed summary", body: "Reviewed details", type: "UPDATE", sources: [{ title: "Source", url: "https://example.invalid/source" }], regionIds: [], caseId: "c", publicLocationMode: "APPROVED_INCIDENT_PERIMETER", privacyReview: "Reviewed disclosure" };
  replies.push({ data: { ...publicationInput, id: "p", status: "DRAFT", updatedAt: publication.publishedAt } });
  await api.savePublication(publicationInput);
  assert.ok(!requests.at(-1).url.endsWith("/publish"), "saving never publishes");
  replies.push({ data: { ...publicationInput, id: "p", status: "PUBLISHED", updatedAt: publication.publishedAt } });
  await api.publishPerimeter("p", publication.publishedAt, "AUTH-2");
  assert.deepEqual(requests.at(-1).data, { expectedUpdatedAt: publication.publishedAt, authorityReference: "AUTH-2" });
} finally { delete globalThis.__governmentCheck; }

const map = await readFile(new URL("../pages/dashboard/components/SituationMap.tsx", import.meta.url), "utf8");
assert.doesNotMatch(map, /DemoAreas/);
assert.match(map, /latest\.current\.onPick \|\| latest\.current\.perimeterDraft/);
const publicLayer = await readFile(new URL("../pages/dashboard/components/PerimeterMap.tsx", import.meta.url), "utf8");
assert.doesNotMatch(publicLayer, /cluster: true/);
assert.match(publicLayer, /draggable: !draft.pending/);
assert.match(publicLayer, /index === 0.*editDraft\(current, \{ type: "close" \}/);
