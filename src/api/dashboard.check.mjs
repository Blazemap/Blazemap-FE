import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import ts from "typescript";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.ts";
import { parseMap } from "./dashboard/parse.ts";
import { dashboardLogin, sameDashboardAccount } from "../lib/dashboard.ts";
import { ageMap, filterMap, mapAvailability, toGeoJSON } from "../pages/dashboard/utils/map.ts";

const publication = { id: "case-check", publicationId: "publication-check", title: "Assertion fixture", publicLocationMode: "REGION_ONLY", latitude: 1, longitude: 110, publishedAt: "2026-01-01T00:00:00Z", regions: [{ name: "Test region" }], verificationStatus: "UNVERIFIED", handlingStatus: "OPEN", reporterEmail: "private@example.invalid" };
const response = { data: { cases: [publication], hotspots: [], updatedAt: null, sourceStatus: { status: "NOT_SYNCED" } } };
const parsed = parseMap(response);
assert.equal(parsed.items[0].latitude, null);
assert.equal(toGeoJSON(parsed.items).features.length, 0);
assert.equal(JSON.stringify(parsed).includes("reporterEmail"), false);
assert.equal(parsed.sourceStatus, "NOT_SYNCED");
assert.equal(mapAvailability(parsed, false), "Satellite data is temporarily unavailable.");
assert.equal(mapAvailability(null, false), "");
assert.match(mapAvailability(null, true), /unavailable/);
assert.match(mapAvailability(parsed, true), /earlier results/);
assert.equal(mapAvailability({ ...parsed, sourceStatus: "AVAILABLE" }, false), "");
assert.match(mapAvailability({ ...parsed, sourceStatus: "STALE" }, false), /out of date/);
for (const sourceStatus of ["UNAVAILABLE", "NOT_CONFIGURED", "NOT_SYNCED"]) {
  assert.equal(mapAvailability({ ...parsed, sourceStatus }, false), "Satellite data is temporarily unavailable.");
}
assert.equal(dashboardLogin("ADMIN"), "/login?next=%2Fmonitoring&portal=government");
assert.equal(dashboardLogin("USER"), "/login?next=%2Fdashboard");
assert.equal(sameDashboardAccount({ id: "a", role: "ADMIN" }, { id: "a", role: "ADMIN" }), true);
assert.equal(sameDashboardAccount({ id: "a", role: "ADMIN" }, { id: "b", role: "ADMIN" }), false);
assert.equal(sameDashboardAccount({ id: "a", role: "ADMIN" }, { id: "a", role: "USER" }), false);
const syncedAt = Date.parse(publication.publishedAt);
const fresh = { ...parsed, sourceStatus: "AVAILABLE", lastSuccessAt: publication.publishedAt, items: [...parsed.items, { ...parsed.items[0], kind: "hotspot", stale: false }] };
assert.equal(ageMap(fresh, syncedAt + 3600000).sourceStatus, "AVAILABLE");
const aged = ageMap(fresh, syncedAt + 3600001);
assert.equal(aged.sourceStatus, "STALE");
assert.equal(aged.items[0].stale, false);
assert.equal(aged.items[1].stale, true);
assert.equal(fresh.items[1].stale, false);
assert.equal(ageMap({ ...fresh, lastSuccessAt: null }, syncedAt).sourceStatus, "NOT_SYNCED");
for (const sourceStatus of ["UNAVAILABLE", "NOT_CONFIGURED", "NOT_SYNCED", "STALE"]) {
  assert.equal(ageMap({ ...fresh, sourceStatus }, syncedAt + 7200000).sourceStatus, sourceStatus);
}
assert.equal(filterMap(parsed.items, "TEST REGION", true, false).length, 1);
assert.equal(filterMap(parsed.items, "", false, true).length, 0);
const approved = parseMap({ data: { ...response.data, cases: [{ ...publication, publicLocationMode: "APPROVED_INCIDENT_POINT", latitude: 0, longitude: 0 }] } });
assert.deepEqual(toGeoJSON(approved.items).features[0].geometry.coordinates, [0, 0]);
assert.deepEqual(Object.keys(toGeoJSON(approved.items).features[0].properties).sort(), ["id", "kind"]);
assert.throws(() => parseMap({ data: { ...response.data, cases: [{ ...publication, publicLocationMode: "APPROVED_INCIDENT_POINT", latitude: 200 }] } }));
assert.throws(() => parseMap({ data: { ...response.data, cases: [{ ...publication, verificationStatus: "AI_CONFIRMED" }] } }));

const mapSource = await readFile(new URL("../pages/dashboard/components/SituationMap.tsx", import.meta.url), "utf8");
const containerTag = mapSource.match(/<div ref=\{container\}[^>]+>/)[0];
assert.match(containerTag, /className="h-full w-full /);
assert.doesNotMatch(containerTag, /\babsolute\b/);
assert.match(mapSource, /import "maplibre-gl\/dist\/maplibre-gl.css"/);
assert.match(mapSource, /map\.on\("load", \(\) => \{\s*if \(disposed\) return;\s*clearTimeout\(timeout\);/);
assert.doesNotMatch(mapSource, /map\.loaded\(\)/);

const account = { id: "a", role: "ADMIN", name: "Test" };
const filters = { query: "", verification: "", priority: "", page: 1 };
assert.notDeepEqual(queryKeys.dashboard.cases(account, filters), queryKeys.dashboard.cases({ ...account, id: "b" }, filters));
assert.notDeepEqual(queryKeys.dashboard.cases(account, filters), queryKeys.dashboard.cases({ ...account, role: "USER" }, filters));
assert.notDeepEqual(queryKeys.dashboard.cases(account, filters), queryKeys.dashboard.cases(account, { ...filters, page: 2 }));
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
let release;
let requests = 0;
const key = queryKeys.dashboard.map(account, 48);
const options = { queryKey: key, queryFn: () => { requests++; return new Promise((resolve) => { release = resolve; }); } };
try {
  const first = client.fetchQuery(options);
  const second = client.fetchQuery(options);
  assert.equal(requests, 1);
  release(parsed);
  await Promise.all([first, second]);
  await assert.rejects(client.fetchQuery({ queryKey: key, queryFn: async () => { throw new Error("unavailable"); } }));
  assert.deepEqual(client.getQueryData(key), parsed);
  const source = await readFile(new URL("../hooks/dashboard/session.ts", import.meta.url), "utf8");
  const clearBody = source.match(/export function clearDashboardQueries\(\) \{([\s\S]*?)\n\}/)[1];
  client.setQueryData(["public", "status"], { available: true });
  new Function("queryClient", "queryKeys", clearBody)(client, queryKeys);
  assert.equal(client.getQueryCache().getAll().length, 1);
  assert.deepEqual(client.getQueryData(["public", "status"]), { available: true });
  let aborted = false;
  const pending = client.fetchQuery({ queryKey: key, queryFn: ({ signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => { aborted = true; reject(new Error("cancelled")); })) });
  new Function("queryClient", "queryKeys", clearBody)(client, queryKeys);
  await assert.rejects(pending);
  assert.equal(aborted, true);
  assert.equal(client.getQueryData(key), undefined);
} finally { client.clear(); }

const querySource = await readFile(new URL("./dashboard/dashboard-queries.ts", import.meta.url), "utf8");
const testSource = querySource
  .replace('import { apiClient } from "@/config/api-client";', 'const apiClient = { get: () => { throw new Error("Unexpected private request"); } };')
  .replace('from "@/constants"', `from "${new URL("../constants/api.ts", import.meta.url).href}"`)
  .replace('from "@/api/queryKeys"', `from "${new URL("./queryKeys.ts", import.meta.url).href}"`)
  .replace('from "./parse"', `from "${new URL("./dashboard/parse.ts", import.meta.url).href}"`)
  .replace('from "axios"', `from "${import.meta.resolve("axios")}"`);
const compiled = ts.transpileModule(testSource, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const citizenCases = api.casesQueryOptions({ ...account, role: "USER" }, filters);
assert.equal(citizenCases.enabled, false);
await assert.rejects(citizenCases.queryFn({ signal: new globalThis.AbortController().signal }), { status: 403 });
