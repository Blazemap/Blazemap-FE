import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import console from "node:console";
import ts from "typescript";
import { createExpression } from "@maplibre/maplibre-gl-style-spec";

const read = path => readFileSync(new URL(`../src/pages/dashboard/components/${path}.tsx`, import.meta.url), "utf8");
const map = read("SituationMap");
const citizen = read("CitizenDashboard");
const layers = [];
const sources = {};
const ast = ts.createSourceFile("map.tsx", map, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function visit(node) {
  if (ts.isCallExpression(node) && ["map.addLayer", "map.addSource"].includes(node.expression.getText(ast))) {
    runInNewContext(node.getText(ast), { map: { addLayer: layer => layers.push(JSON.parse(JSON.stringify(layer))), addSource: (id, source) => { sources[id] = JSON.parse(JSON.stringify(source)); } }, toGeoJSON: () => ({}), latest: { current: { items: [], selected: null } } });
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(new Set(layers.map(layer => layer.id)).size, layers.length);
function evaluate(expression, properties) {
  const result = createExpression(expression, "layers[0].filter");
  assert.equal(result.result, "success", JSON.stringify(result.value));
  return result.value.evaluate({ zoom: 5 }, { type: 1, properties });
}
const count = sources.observations.clusterProperties.hotspotCount;
assert.equal(count[0], "+");
const flame = layers.find(layer => layer.id === "hotspot-clusters");
const circle = layers.find(layer => layer.id === "clusters");
const label = layers.find(layer => layer.id === "counts");
for (const kinds of [["hotspot", "hotspot"], ["hotspot", "publication"], ["publication", "publication"], Array(200).fill("hotspot")]) {
  const properties = { point_count: kinds.length, hotspotCount: kinds.reduce((sum, kind) => sum + evaluate(count[1], { kind }), 0) };
  const allHotspots = kinds.every(kind => kind === "hotspot");
  assert.equal(evaluate(flame.filter, properties), allHotspots);
  for (const layer of [circle, label]) assert.equal(evaluate(layer.filter, properties), !allHotspots);
}
for (const layer of [flame, circle, label]) assert.equal(evaluate(layer.filter, { kind: "hotspot" }), false);
for (const [point_count, size] of [[2, 1.4], [10, 1.8], [50, 2.3], [200, 2.8], [10000, 2.8]]) {
  assert.equal(evaluate(flame.layout["icon-size"], { point_count }), size);
  assert.ok(evaluate(flame.layout["text-offset"], { point_count })[1] * 14 >= 16 * size);
}
assert.equal(flame.layout["icon-image"], "hotspot-flame");
for (const key of ["icon-allow-overlap", "icon-ignore-placement", "text-allow-overlap", "text-ignore-placement"]) assert.equal(flame.layout[key], true);
assert.equal(flame.layout["text-field"], "{point_count_abbreviated}");
assert.equal(flame.paint["text-halo-color"], "#ffffff");
assert.equal(flame.paint["text-halo-width"], 2);
assert.deepEqual(layers.find(layer => layer.id === "hotspots").layout["icon-size"], ["get", "flameSize"]);
assert.equal((map.match(/map.addImage\("hotspot-flame"/g) || []).length, 1);
assert.match(map, /map.on\("click", \["clusters", "counts", "hotspot-clusters"\], \(event\) => \{\s*if \(latest.current.onPick \|\| latest.current.perimeterDraft\) return/);
assert.match(map, /for \(const layer of \["points", "hotspots", "clusters", "counts", "hotspot-clusters"\]\)/);
assert.match(map, /getClusterExpansionZoom/);
assert.match(map, /grouped satellite detections, not unique fires/);
assert.match(map, /getSource\("observations"\)[\s\S]*?setData\(toGeoJSON\(items\)\)/);
const header = citizen.match(/<header[^>]*>\s*<h2 id="observation-detail-title"[\s\S]*?<\/header>/)?.[0];
assert.ok(header);
assert.match(header, /shrink-0[^"]*bg-white px-7 py-6/);
assert.match(header, /text-2xl font-extrabold tracking-tight/);
assert.match(header, /onPointerDown=\{startDetailDrag\}/);
assert.match(header, /onKeyDown=\{keyboardDetail\}/);
assert.match(citizen, /dragControls=\{detailDrag\} dragListener=\{false\} dragMomentum=\{false\} dragElastic=\{0\} dragConstraints=\{detailBounds\}/);
assert.match(header, /<\/h2>\s*<button type="button" onClick=\{closeItem\} aria-label="Close observation details"/);
assert.doesNotMatch(header.split('</h2>')[1], /onPointer|onKeyDown/);
const body = citizen.slice(citizen.indexOf("function ItemDetail"));
assert.match(body, /min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6/);
assert.doesNotMatch(body, /onClose|<h2|item.title|Close observation/);
assert.match(citizen, /aria-labelledby="observation-detail-title"/);
assert.match(citizen, /detailDrag.start\(event\)/);
assert.match(citizen, /detailX.set\(Math.max\(bounds.left, Math.min\(bounds.right, detailX.get\(\)\)\)\)/);
assert.match(citizen, /detailY.set\(Math.max\(bounds.top, Math.min\(bounds.bottom, detailY.get\(\)\)\)\)/);
assert.match(body, /md:grid-cols-2/);
assert.doesNotMatch(body, /<ItemIcon/);
assert.match(citizen, /width: 660/);
assert.match(citizen, /height: `\$\{detailSheet.height\}dvh`/);
console.log("Observation checks passed (MapLibre expressions and source wiring only; no browser interaction/layout verification).");
