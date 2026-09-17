import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { URL } from "node:url";
import { readFile } from "node:fs/promises";
import { reportPayload } from "./reports.ts";

const draft = { observationTypes: ["SMOKE"], timeChoice: "EARLIER", observedLocal: "2025-01-01T10:30", locationMode: "OBSERVER_POSITION", latitude: "0", longitude: "0", confirmed: true, accuracyMeters: null, regionId: "", locationDescription: "", description: "Smoke across the river" };
const key = "stable-report-test-key";
const originalTZ = process.env.TZ;
try {
  for (const [zone, expected] of [["Asia/Jakarta", "2025-01-01T03:30:00.000Z"], ["Asia/Makassar", "2025-01-01T02:30:00.000Z"], ["America/New_York", "2025-01-01T15:30:00.000Z"]]) {
    process.env.TZ = zone;
    assert.equal(reportPayload(draft, [], key).observedAt, expected);
    for (const observedLocal of ["", "2025-02-30T10:30", "2999-01-01T12:00", "2025-01-01T10:30Z"]) assert.throws(() => reportPayload({ ...draft, observedLocal }, [], key));
  }
  assert.throws(() => reportPayload({ ...draft, observedLocal: "2025-03-09T02:30" }, [], key));
} finally {
  if (originalTZ === undefined) delete process.env.TZ;
  else process.env.TZ = originalTZ;
}
const before = Date.now();
const snapshot = reportPayload({ ...draft, timeChoice: "NOW", observedLocal: "" }, [], key);
assert.ok(Date.parse(snapshot.observedAt) >= before && Date.parse(snapshot.observedAt) <= Date.now());
assert.equal(snapshot.locationMode, "OBSERVER_POSITION");
assert.equal(snapshot.idempotencyKey, key);
assert.equal(snapshot.locationDescription, "");
for (const change of [{ timeChoice: "" }, { timeChoice: "INVALID" }, { confirmed: false }, { latitude: "91" }, { longitude: "" }, { latitude: "NaN" }, { locationDescription: "x".repeat(1001) }]) assert.throws(() => reportPayload({ ...draft, ...change }, [], key));
for (const locationDescription of ["", "   ", "N"]) {
  assert.equal(reportPayload({ ...draft, locationDescription }, [], key).locationDescription, locationDescription.trim());
  assert.throws(() => reportPayload({ ...draft, latitude: "", longitude: "", regionId: "verified-region", locationDescription }, [], key));
}
assert.equal(reportPayload({ ...draft, latitude: "", longitude: "", regionId: "verified-region", locationDescription: "North of bridge" }, [], key).latitude, null);
assert.throws(() => reportPayload({ ...draft, latitude: "", longitude: "", locationDescription: "North of bridge" }, [], key));
assert.equal(reportPayload({ ...draft, regionId: "stale-region" }, [], key).regionId, null);
const source = await readFile(new URL("../pages/report/ReportPage.tsx", import.meta.url), "utf8");
assert.match(source, /setReview\(\{ \.\.\.payload, attachmentIds: ids \}\)/);
assert.match(source, /mutation\.mutateAsync\(review\)/);
assert.match(source, /disabled=\{busy \|\| attempted\}/);
assert.match(source, /accuracyMeters: position.coords.accuracy, locationMode: "OBSERVER_POSITION"/);
assert.doesNotMatch(source, /observed-zone|draft\.offset/);
console.log("Report Now/Earlier, timezone conversion, invalid dates, location requirements and retry snapshot checks passed.");
