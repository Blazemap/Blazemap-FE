import assert from "node:assert/strict";
import console from "node:console";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as React from "react";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const search = read("src/pages/dashboard/components/ObservationSearch.tsx");
const report = read("src/pages/report/ReportPage.tsx");
const map = read("src/pages/dashboard/components/SituationMap.tsx");
const citizen = read("src/pages/dashboard/components/CitizenDashboard.tsx");
const dashboard = read("src/pages/dashboard/DashboardPage.tsx");
const reports = read("src/pages/reports/ReportsPage.tsx");
const profile = read("src/pages/profile/ProfilePage.tsx");
const resource = read("src/hooks/dashboard/useDashboardResource.ts");
const select = read("src/components/ui/select.tsx");

for (const source of [search, reports]) for (const pattern of [/role="combobox"/, /role="listbox"/, /role="option"/, /ArrowDown/, /Enter/, /Escape/]) assert.match(source, pattern);
assert.match(search, /items: MapItem\[\]/);
assert.doesNotMatch(search, /apiClient|dangerouslySetInnerHTML|innerHTML/);
assert.match(reports, /reports: OwnReport\[\]/);
assert.match(reports, /reports=\{reports\}/);
assert.doesNotMatch(reports, /apiClient|dangerouslySetInnerHTML|innerHTML/);
assert.match(resource, /initialLoading: query\.isPending && !data/);
assert.match(resource, /refreshing: query\.isFetching && !!data/);
assert.match(report, /FieldSelect id="location-mode"/);
assert.match(report, /latitude: "", longitude: "", accuracyMeters: null/);
assert.doesNotMatch(report, /<select id="location-mode"/);
assert.match(select, /Select\.Portal/);
assert.match(select, /min-h-11/);
assert.match(select, /z-\[100\]/);
assert.match(profile, /relative isolate min-h-\[calc\(100dvh-80px\)\] overflow-hidden bg-white lg:min-h-\[calc\(100dvh-88px\)\]/);
assert.match(profile, /aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-forest"/);
assert.match(profile, /bg-linear-to-b from-background from-30% to-transparent/);
assert.match(map, /draftLocation/);
assert.match(map, /setDraggable\(!!onPick\)/);
assert.match(map, /useEffect\(\(\) => \(\) => \{ pickMarker\.current\?\.remove\(\)/);
for (const source of [citizen, dashboard]) {
  assert.match(source, /draftLocation=\{pick \?\? reportLocation\}/);
  assert.match(source, /onLocationChange=\{handleReportLocation\}/);
  assert.match(source, /fallback=\{<MapSkeleton \/>\}/);
  assert.doesNotMatch(source, /fallback=\{<p role="status"[^>]*>Loading map/);
}

const skeletons = read("src/pages/dashboard/components/DashboardSkeletons.tsx");
function compile(source, react = React) {
  const exports = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, React: react, require: name => name === "react" ? react : name === "lucide-react" ? {} : { formatTime: value => value },
  });
  return exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree.type === "function") return nodes(tree.type(tree.props));
  return [tree, ...nodes(tree.props?.children)];
}
function renderSearch({ loading = false, highlighted = 5, count = 6, query = "fire", focused = true, dismissed = false, top = 420, bottom = 496 } = {}) {
  const effects = [], selections = [];
  const states = [focused, dismissed, highlighted];
  const scrolls = [];
  const list = { clientTop: 0, clientHeight: 200, scrollTop: 0, getBoundingClientRect: () => ({ top: 100 }), scrollBy: options => scrolls.push(options.top), querySelector: () => ({ getBoundingClientRect: () => ({ top, bottom }) }) };
  const refs = [{ blur() {} }, list];
  const react = { ...React, useId: () => "test", useState: () => [states.shift(), () => {}], useRef: () => ({ current: refs.shift() }), useEffect: effect => effects.push(effect) };
  const { ObservationSearch } = compile(search, react);
  const tree = ObservationSearch({ id: "search", query, items: Array.from({ length: count }, (_, i) => ({ id: String(i), title: "Fire", time: "now" })), initialLoading: loading, onSelect: id => selections.push(id), onQueryChange() {} });
  effects.forEach(effect => effect());
  const rendered = nodes(tree);
  const input = rendered.find(node => node.props.role === "combobox");
  input.props.onKeyDown({ key: "Enter", preventDefault() {} });
  const active = input.props["aria-activedescendant"];
  assert.ok(!active || rendered.some(node => node.props.id === active && node.props.role === "option"), "active descendant must exist");
  return { selections, scrolls };
}
assert.deepEqual(renderSearch({ loading: true }).selections, [], "loading must not select hidden stale results");
assert.deepEqual(renderSearch({ loading: true }).scrolls, []);
assert.deepEqual(renderSearch().selections, ["5"]);
assert.deepEqual(renderSearch().scrolls, [196], "scroll only the list by the nearest bottom edge");
assert.deepEqual(renderSearch({ top: 80, bottom: 156 }).scrolls, [-20]);
assert.deepEqual(renderSearch({ top: 120, bottom: 196 }).scrolls, []);
for (const options of [{ count: 0 }, { query: " " }, { focused: false }, { dismissed: true }]) {
  const result = renderSearch(options);
  assert.deepEqual(result.selections, []);
  assert.deepEqual(result.scrolls, []);
}
assert.doesNotMatch(search, /scrollIntoView\(/, "scrolling must stay inside the listbox");
assert.doesNotMatch(search.split("function SearchResultsSkeleton")[1].split("function ObservationIcon")[0], /space-y-1|p-1\.5/);
const { FeedSkeleton, ObservationListSkeleton } = compile(skeletons);
assert.doesNotMatch(ObservationListSkeleton().props.className, /\bp-4\b/);
assert.match(dashboard, /className="p-4">[\s\S]*?<ObservationListSkeleton/);
const citizenFeed = nodes(FeedSkeleton({ variant: "citizen" }));
const staffFeed = nodes(FeedSkeleton({}));
const badge = node => node.type === "span" && node.props.className?.includes("h-7 w-24");
const action = node => node.type === "span" && node.props.className?.includes("h-10 w-28");
assert.equal(citizenFeed.filter(badge).length, 0);
assert.equal(citizenFeed.filter(action).length, 0);
assert.equal(staffFeed.filter(badge).length, 3);
assert.equal(staffFeed.filter(action).length, 3);
for (const node of citizenFeed.filter(node => node.type === "footer")) assert.doesNotMatch(node.props.className, /min-h-16|\bflex\b/);
assert.equal(citizenFeed.filter(node => node.props.className?.includes("divide-y") && node.props.className.includes("border-y")).length, 3);
assert.equal(staffFeed.filter(node => node.props.className?.includes("divide-y") && node.props.className.includes("rounded-xl")).length, 3);
const observationRows = nodes(ObservationListSkeleton()).filter(node => node.props.className?.includes("flex gap-3"));
assert.equal(observationRows.length, 5);
for (const row of observationRows) assert.match(row.props.className, /rounded-xl border border-primary\/10 bg-white p-4/);
assert.match(citizen, /<FeedSkeleton variant="citizen" \/>/);
assert.match(dashboard, /<FeedSkeleton \/>/);
const keyHandler = map.match(/element\.addEventListener\("keydown", event => \{([\s\S]*?)\n {6}\}\);/)[1];
for (const [lat, lng, key, shiftKey, expected] of [
  [90, 180, "ArrowUp", false, [90, 180]], [-90, -180, "ArrowDown", true, [-90, -180]],
  [0, 180, "ArrowRight", false, [0, -179.999]], [0, -180, "ArrowLeft", true, [0, 179.99]],
  [1, 110, "ArrowUp", false, [1.001, 110]], [1, 110, "ArrowDown", true, [0.99, 110]],
]) {
  let actual;
  runInNewContext(`(() => { ${keyHandler} })()`, { event: { key, shiftKey, preventDefault() {}, stopPropagation() {} }, marker: { getLngLat: () => ({ lat, lng }) }, latest: { current: { onPick: (...point) => { actual = point.map(Number); } } } });
  assert.deepEqual(actual, expected);
}
const markerUpdate = map.slice(map.indexOf("    const marker = pickMarker.current;"), map.indexOf("    marker.setLngLat([longitude, latitude]).addTo(map);"));
const element = { style: {}, setAttribute(name, value) { this[name] = value; } };
for (const onPick of [undefined, () => {}, undefined]) {
  let draggable;
  runInNewContext(markerUpdate, { onPick, pickMarker: { current: { setDraggable(value) { draggable = value; }, getElement: () => element } } });
  assert.equal(draggable, !!onPick);
  assert.equal(element.tabIndex, onPick ? 0 : -1);
  assert.equal(element["aria-label"], onPick ? "Selected report location. Drag it or use arrow keys to adjust." : "Selected report location.");
  assert.equal(element.title, onPick ? "Drag or use arrow keys to adjust report location" : "Selected report location");
}

const reportAST = ts.createSourceFile("ReportPage.tsx", report, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const reveal = reportAST.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "revealDetails");
const revealDetails = runInNewContext(`${ts.transpileModule(reveal.getText(reportAST), { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText}; revealDetails`);
const outer = { open: false, closest() { return this; }, parentElement: null };
const inner = { open: false, closest() { return this; }, parentElement: outer };
const field = { value: "kept", closest: () => inner };
revealDetails(field);
assert.equal(inner.open, true);
assert.equal(outer.open, true);
assert.equal(field.value, "kept");
outer.open = false;
revealDetails(outer);
assert.equal(outer.open, true);
revealDetails(null);
revealDetails({ closest: () => null });
assert.match(report, /onInvalidCapture=\{event => revealDetails\(event.target as HTMLElement\)\}/);
for (const ref of ["observationRef", "locationRef"]) assert.match(report, new RegExp(`<details ref=\\{${ref}\\} open`));
assert.match(report, /catch \(caught\) \{\s*revealDetails\(observationRef.current\);\s*revealDetails\(locationRef.current\);\s*return fail/);
assert.match(report, /if \(gps \|\| \(!hasCoordinates && regions.isError\)\) revealDetails\(locationRef.current\)/);
assert.match(report, /receive: \(latitude, longitude\) => \{ change\([\s\S]*?revealDetails\(locationRef.current\)/);
assert.doesNotMatch(report, /title="Observation"|title="Location"|onToggle=/);
const { LayerPreview } = compile(read("src/pages/dashboard/components/LayerPreview.tsx"));
for (const hotspot of [false, true]) {
  const preview = LayerPreview({ hotspot });
  const elements = nodes(preview);
  assert.equal(preview.props["aria-hidden"], "true");
  assert.equal(preview.props.focusable, "false");
  assert.match(preview.props.className, /w-full/);
  assert.equal(elements.filter(node => node.type === "text" || node.type === "image").length, 0);
  assert.ok(elements.filter(node => node.type === "path").length >= 12);
  assert.equal(elements.filter(node => node.type === "g" && node.props.transform).length, hotspot ? 0 : 3);
  assert.equal(elements.filter(node => node.type === "rect" && node.props.width === "18").length, hotspot ? 5 : 0);
}

console.log("UI assertions passed.");
