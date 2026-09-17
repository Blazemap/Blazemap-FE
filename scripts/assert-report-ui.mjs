import assert from "node:assert/strict";
import console from "node:console";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as React from "react";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const report = read("src/pages/report/ReportPage.tsx");
const ast = ts.createSourceFile("ReportPage.tsx", report, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const reveal = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "revealDetails");
const revealDetails = runInNewContext(`${ts.transpileModule(reveal.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText}; revealDetails`);
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
for (const ref of ["observationRef", "locationRef"]) assert.ok(report.includes(`<details ref={${ref}} open`));
assert.match(report, /catch \(caught\) \{\s*revealDetails\(observationRef.current\);\s*revealDetails\(locationRef.current\);\s*return fail/);
assert.match(report, /if \(gps \|\| \(!hasCoordinates && regions.isError\)\) revealDetails\(locationRef.current\)/);
assert.match(report, /receive: \(latitude, longitude\) => \{ change\([\s\S]*?revealDetails\(locationRef.current\)/);
assert.doesNotMatch(report, /title="Observation"|title="Location"|onToggle=/);
assert.match(report, /ref=\{errorRef\} tabIndex=\{-1\} role="alert"/);
const disclosures = [];
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "details") disclosures.push(node);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(disclosures.length, 5);
for (const disclosure of disclosures) {
  assert.ok(disclosure.children.some(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "summary"));
  assert.doesNotMatch(disclosure.openingElement.getText(ast), /onToggle|key=/);
}
const exports = {};
runInNewContext(ts.transpileModule(read("src/pages/dashboard/components/LayerPreview.tsx"), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS } }).outputText, { exports, React });
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
for (const hotspot of [false, true]) {
  const preview = exports.LayerPreview({ hotspot });
  const elements = nodes(preview);
  assert.equal(preview.props["aria-hidden"], "true");
  assert.equal(preview.props.focusable, "false");
  assert.match(preview.props.className, /w-full/);
  assert.equal(elements.filter(node => node.type === "text" || node.type === "image").length, 0);
  assert.ok(elements.filter(node => node.type === "path").length >= 12);
  assert.equal(elements.filter(node => node.type === "g" && node.props.transform).length, hotspot ? 0 : 3);
  assert.equal(elements.filter(node => node.type === "rect" && node.props.width === "18").length, hotspot ? 5 : 0);
}
console.log("Report disclosures, nested validation reveal, retained values, GPS/map recovery wiring, and layer preview assertions passed.");
