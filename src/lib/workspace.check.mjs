import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
import ts from "typescript";
import { reportPayload, validatePhoto, privateError } from "./reports.ts";
import { validatePasswordChange, passwordError, AuthError } from "./auth.ts";
import { boundPanel, reportDestination, safeWorkspaceDestination } from "./dashboard.ts";

assert.equal(reportDestination("?observation=a&panel=old"), "/dashboard?observation=a&panel=report");
assert.equal(safeWorkspaceDestination("/report?observation=a"), "/dashboard?observation=a&panel=report");
assert.equal(safeWorkspaceDestination("/dashboard?panel=report"), "/dashboard?panel=report");
assert.equal(safeWorkspaceDestination("/dashboard", "ADMIN"), "/dashboard");
assert.equal(safeWorkspaceDestination("/monitoring", "ADMIN"), "/monitoring");
assert.equal(safeWorkspaceDestination("/monitoring", "USER"), "/dashboard");
for (const path of ["/report", "/my-reports", "/my-reports/one", "/dashboard?panel=report", "/monitoring?panel=my-reports"]) assert.equal(safeWorkspaceDestination(path, "ADMIN"), "/dashboard");
for (const path of ["https://evil.invalid", "//evil.invalid", "/dashboard/../evil", "/dashboard\\\\evil", "/dashboard#evil", "/report\n"]) assert.equal(safeWorkspaceDestination(path), "/dashboard");
for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 320, height: 400 }]) {
  for (const box of [{ x: -1000, y: -1000, width: 1, height: 1 }, { x: 9999, y: 9999, width: 9999, height: 9999 }]) {
    const bounded = boundPanel(box, viewport);
    assert.ok(bounded.x >= 24 && bounded.y >= 96);
    assert.ok(bounded.x + bounded.width <= viewport.width - 16);
    assert.ok(bounded.y + bounded.height <= viewport.height - 24);
    assert.deepEqual(boundPanel(bounded, viewport), bounded);
  }
}

const draft = { observationTypes: ["SMOKE"], observedLocal: "2025-01-01T10:30", timeChoice: "EARLIER", locationMode: "OBSERVER_POSITION", latitude: "", longitude: "", confirmed: true, accuracyMeters: null, regionId: "verified-region", locationDescription: "North of the bridge", description: "Smoke seen across the river" };
const payload = reportPayload(draft, [], "a-stable-submission-key");
assert.equal(payload.latitude, null);
assert.equal(payload.longitude, null);
assert.equal(payload.observedAt, new Date("2025-01-01T10:30").toISOString());
assert.equal(Date.parse(payload.observedAt), new Date(2025, 0, 1, 10, 30).getTime());
const beforeNow = Date.now();
const nowPayload = reportPayload({ ...draft, timeChoice: "NOW", observedLocal: "" }, [], payload.idempotencyKey);
assert.ok(Date.parse(nowPayload.observedAt) >= beforeNow && Date.parse(nowPayload.observedAt) <= Date.now());
for (const locationDescription of ["", "   ", "N"]) {
  assert.equal(reportPayload({ ...draft, latitude: "0", longitude: "0", locationDescription }, [], payload.idempotencyKey).locationDescription, locationDescription.trim());
  assert.throws(() => reportPayload({ ...draft, locationDescription }, [], payload.idempotencyKey));
}
assert.throws(() => reportPayload({ ...draft, latitude: "0", longitude: "0", locationDescription: "x".repeat(1001) }, [], payload.idempotencyKey));
assert.equal(reportPayload({ ...draft, latitude: "0", longitude: "0" }, [], payload.idempotencyKey).regionId, null);
assert.equal("reporterId" in payload, false);
assert.deepEqual(payload.attachmentIds, []);
assert.deepEqual(reportPayload(draft, [], payload.idempotencyKey), payload);
for (const change of [{ confirmed: false }, { regionId: "" }, { latitude: "0", longitude: "" }, { latitude: "NaN", longitude: "12" }, { latitude: "91", longitude: "12" }, { observationTypes: [] }, { observedLocal: "2999-01-01T12:00" }]) assert.throws(() => reportPayload({ ...draft, ...change }, [], payload.idempotencyKey));
assert.equal(reportPayload({ ...draft, latitude: "0", longitude: "0" }, [], payload.idempotencyKey).latitude, 0);
assert.equal(validatePhoto({ name: "photo.jpg", type: "image/jpeg", size: 5242880 }), "");
for (const file of [{ name: "photo.svg", type: "image/svg+xml", size: 10 }, { name: "photo.png", type: "image/jpeg", size: 10 }, { name: "../photo.jpg", type: "image/jpeg", size: 10 }, { name: "photo.jpg", type: "image/jpeg", size: 5242881 }, { name: "photo.jpg", type: "image/jpeg", size: 0 }]) assert.ok(validatePhoto(file));
assert.doesNotMatch(privateError(new Error("secret upload URL")), /secret/);
assert.match(privateError({ status: 403 }), /same account/);

const profileSource = await readFile(new URL("../api/profile/profile-queries.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(profileSource
  .replace('import { createAuthClient } from "better-auth/react";', 'const createAuthClient = () => globalThis.__profileClient;')
  .replace('import { authURL } from "@/api/auth";', 'const authURL = () => "https://example.invalid/api/auth"; const window = { location: { origin: "https://example.invalid" } };')
  .replace('import { getSharedAccount } from "@/api/dashboard";', 'const getSharedAccount = async () => globalThis.__profileUser;')
  .replace('from "@/lib/auth"', `from "${new URL("./auth.ts", import.meta.url).href}"`)
  .replace('from "@/lib"', `from "${new URL("./auth.ts", import.meta.url).href}"`), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const { updateProfile, changePassword, hasPassword } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const user = { id: "a", role: "USER", name: "Before" };
let calls = 0;
globalThis.__profileUser = user;
globalThis.__profileClient = { updateUser: async body => { calls++; assert.deepEqual(Object.keys(body), ["name"]); return { error: { status: 503, message: "secret" } }; } };
try {
  await assert.rejects(updateProfile(user, "After"), { code: "PROFILE_UPDATE_FAILED" });
  globalThis.__profileUser = { ...user, id: "other" };
  await assert.rejects(updateProfile(user, "After"), { code: "ACCOUNT_CHANGED" });
  assert.equal(calls, 1);
  globalThis.__profileUser = user;
  globalThis.__profileClient.updateUser = async () => ({ data: { status: true } });
  await assert.rejects(updateProfile(user, "After"), { code: "PROFILE_NOT_CONFIRMED" });
  globalThis.__profileClient.updateUser = async body => { globalThis.__profileUser = { ...user, name: body.name }; return { data: { status: true } }; };
  assert.equal((await updateProfile(user, "After")).name, "After");
  const passwords = { currentPassword: 'current-test-password', newPassword: 'replacement-test-password', confirmPassword: 'replacement-test-password', revokeOtherSessions: true };
  assert.deepEqual(validatePasswordChange(passwords), {});
  for (const change of [{ currentPassword: '' }, { currentPassword: 'a'.repeat(129) }, { newPassword: 'a'.repeat(11) }, { newPassword: 'a'.repeat(129) }, { confirmPassword: 'mismatch' }, { newPassword: passwords.currentPassword }]) {
    assert.ok(Object.keys(validatePasswordChange({ ...passwords, ...change })).length);
    await assert.rejects(changePassword(user, { ...passwords, ...change }), { code: 'VALIDATION_ERROR' });
  }
  for (const length of [12, 128]) assert.deepEqual(validatePasswordChange({ ...passwords, newPassword: 'a'.repeat(length), confirmPassword: 'a'.repeat(length) }), {});
  globalThis.__profileClient.listAccounts = async () => ({ data: [{ providerId: 'google' }] });
  assert.equal(await hasPassword(user), false);
  globalThis.__profileClient.listAccounts = async () => ({ data: [{ providerId: 'credential' }] });
  assert.equal(await hasPassword(user), true);
  globalThis.__profileClient.changePassword = async body => { assert.deepEqual(body, { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword, revokeOtherSessions: true }); return { data: { user, token: 'synthetic-session' } }; };
  await changePassword(user, passwords);
  for (const code of ['INVALID_PASSWORD', 'CREDENTIAL_ACCOUNT_NOT_FOUND', 'SESSION_NOT_FRESH']) {
    globalThis.__profileClient.changePassword = async () => ({ error: { code, status: 400, message: 'secret' } });
    await assert.rejects(changePassword(user, passwords), { code });
    assert.doesNotMatch(passwordError(new AuthError(code, 400)), /secret/);
  }
  globalThis.__profileClient.changePassword = async () => ({ data: { user: { ...user, id: 'other' }, token: null } });
  await assert.rejects(changePassword(user, passwords), { code: 'PASSWORD_CHANGE_UNCONFIRMED' });
  globalThis.__profileUser = { ...user, id: 'other' };
  await assert.rejects(changePassword(user, passwords), { code: 'ACCOUNT_CHANGED' });
  assert.doesNotMatch(passwordError(new Error('secret')), /secret/);
  assert.match(profileSource, /credentials: "include".*cache: "no-store".*redirect: "error".*retry: 0/);
} finally { delete globalThis.__profileUser; delete globalThis.__profileClient; }

const reportForm = await readFile(new URL("../pages/report/ReportPage.tsx", import.meta.url), "utf8");
assert.match(reportForm, /submissionKey = useRef\(crypto.randomUUID\(\)\)/);
assert.match(reportForm, /reportPayload\(draft, \[\], submissionKey.current\)/);
assert.match(reportForm, /disabled=\{busy \|\| attempted\}/);
assert.match(reportForm, /fieldset disabled=\{busy\}/);
assert.match(reportForm, /if \(pending.current\) return/);
assert.match(reportForm, /DraftGuard dirty=\{\(dirty && !receipt\) \|\| detailDirty\} pending=\{busy \|\| detailPending\} dashboard/);
assert.doesNotMatch(reportForm, /localStorage|sessionStorage|<LocationMap/);
assert.equal((reportForm.match(/<form\b/g) || []).length, 1);
for (const section of ["Observation", "Location"]) assert.match(reportForm, new RegExp(`<summary[^>]*>${section}`));
assert.match(reportForm, /Photos \(optional\)/);
assert.doesNotMatch(reportForm, /photoPreviews\.length === 0|Wajib|required.*photo/i);
assert.match(reportForm, /useEffect\(\(\) => \(\) => \{ locationRequest.current\+\+; \}, \[open\]\)/);
assert.match(reportForm, /if \(location \|\| "confirmed" in values\) cancelLocation\(\)/);
assert.match(reportForm, /cancelLocation\(\); pending.current = true/g);
assert.match(reportForm, /cancelLocation\(\); onPick\?\./);
assert.match(reportForm, /latitude: draft\.latitude, longitude: draft\.longitude, locationMode: draft\.locationMode/);
assert.match(reportForm, /No precise point selected/);
assert.match(reportForm, /Estimated incident location/);
assert.match(reportForm, /Observer position/);
assert.match(reportForm, /Photos remain private/);
assert.match(reportForm, /onEscapeKeyDown=\{event => \{ if \(pending.current\) event.preventDefault\(\)/);
assert.match(reportForm, /function close\(\) \{\s*if \(pending.current\) return;\s*cancelLocation\(\);\s*onClose\?\.\(\);\s*\}/);
assert.match(reportForm, /onClick=\{close\} disabled=\{busy\}/);
assert.match(reportForm, /onClick=\{newReport\}>New report/);
for (const panelClass of ["right-6", "top-24", "h-[calc(100vh-120px)]", "w-[400px]", "max-w-[600px]"]) assert.ok(reportForm.includes(panelClass));
assert.match(reportForm, /initialHeight: 68, minHeight: 34, maxHeight: 86, snapPoints: \[68, 86\]/);
assert.match(reportForm, /useReducedMotion\(\)/);
assert.doesNotMatch(reportForm, /rounded-2xl bg-white p-5 shadow-sm/);
assert.ok(reportForm.indexOf('<DraftGuard') < reportForm.indexOf('<Dialog.Root'));
assert.doesNotMatch(reportForm, /if \(!open\) return|open && <DraftGuard|localStorage|sessionStorage|querySelector/);
const reportAST = ts.createSourceFile('ReportPage.tsx', reportForm, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const initialDeclaration = reportAST.statements.filter(ts.isVariableStatement).flatMap(node => node.declarationList.declarations).find(node => node.name.getText(reportAST) === 'initial');
const initialDraft = new Function(`return (${initialDeclaration.initializer.getText(reportAST)});`)();
assert.deepEqual(initialDraft.observationTypes, []);
for (const field of ['observedLocal', 'latitude', 'longitude', 'regionId', 'description', 'locationDescription']) assert.equal(initialDraft[field], '', `no fabricated ${field}`);
assert.equal(initialDraft.confirmed, false);
assert.equal(initialDraft.accuracyMeters, null);
assert.throws(() => reportPayload(initialDraft, [], 'test-submission-key'));
for (const change of [{ observedLocal: '' }, { observedLocal: '2025-02-30T10:30' }, { description: '    ' }, { locationDescription: '    ' }, { timeChoice: '' }, { timeChoice: 'INVALID' }]) assert.throws(() => reportPayload({ ...draft, ...change }, [], payload.idempotencyKey));
assert.equal(reportPayload({ ...draft, regionId: '', latitude: '-1', longitude: '110' }, [], payload.idempotencyKey).regionId, null);
const disclosures = [];
function visitReport(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(reportAST) === 'details') disclosures.push(node);
  ts.forEachChild(node, visitReport);
}
visitReport(reportAST);
assert.equal(disclosures.length, 5);
for (const disclosure of disclosures) {
  assert.ok(disclosure.children.some(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(reportAST) === 'summary'));
  assert.doesNotMatch(disclosure.openingElement.getText(reportAST), /onToggle|key=/);
  assert.ok(disclosure.children.some(ts.isJsxElement), 'fields stay mounted inside native details');
}
const regionDisclosure = disclosures.find(node => node.getText(reportAST).includes('id="region"') && !node.openingElement.getText(reportAST).includes('locationRef'));
assert.match(regionDisclosure.openingElement.getText(reportAST), /\bopen\b/);
assert.match(reportForm, /!hasCoordinates && <details/);
assert.doesNotMatch(reportForm, /observed-zone|draft\.offset|Region \(optional\)/);
assert.match(reportForm, /draft.timeChoice === "EARLIER" && <label/);
assert.match(reportForm, /name="observed-time" required/);
assert.equal(initialDraft.timeChoice, '');
assert.match(regionDisclosure.getText(reportAST), /required=\{!hasCoordinates\}/);
assert.match(regionDisclosure.getText(reportAST), /onInvalid=[\s\S]*?details.open = true/);
for (const disclosure of disclosures.filter(node => node !== regionDisclosure && !/ref=/.test(node.openingElement.getText(reportAST)))) {
  assert.doesNotMatch(disclosure.openingElement.getText(reportAST), /\bopen=/);
  assert.doesNotMatch(disclosure.getText(reportAST), /\brequired[\s=>]/);
}
assert.match(reportForm, /photos.some\(photo => photo.error\)/);
assert.match(reportForm, /ref=\{errorRef\} tabIndex=\{-1\} role="alert"/);
assert.match(reportForm, /requestAnimationFrame\(\(\) => errorRef.current\?\.focus\(\)\)/);
assert.match(reportForm, /<img src=\{`\/icons8-\$\{icon\}\.png`\} width=\{32\} height=\{32\} alt="" aria-hidden="true" \/>\{label\}/);
for (const label of ['Smoke', 'Flame', 'Burning smell']) assert.ok(reportForm.includes(`'${label}'`));
for (const icon of ['smoke', 'flame', 'smell']) {
  const png = await readFile(new URL(`../../public/icons8-${icon}.png`, import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 96);
  assert.equal(png.readUInt32BE(20), 96);
}
const component = reportAST.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'ReportPage');
const functions = component.body.statements.filter(node => ts.isFunctionDeclaration(node) && ['cancelLocation', 'change', 'locate', 'newReport', 'close'].includes(node.name.text)).map(node => node.getText(reportAST)).join('\n');
const runReport = new Function('state', ts.transpileModule(`
  const { pending, locationRequest, photoRef, submissionKey, mutation, navigator, URL, crypto } = state;
  let { review, receipt } = state;
  const initial = state.initial;
  const setGps = value => state.gps = value;
  const setDraft = value => state.draft = typeof value === 'function' ? value(state.draft) : value;
  const setPhotos = value => state.photos = value;
  const setRegionSearch = value => state.regionSearch = value;
  const setRegionQuery = value => state.regionQuery = value;
  const setReview = value => state.review = review = value;
  const setReceipt = value => state.receipt = receipt = value;
  const setAttempted = value => state.attempted = value;
  const setDirty = value => state.dirty = value;
  const setError = value => state.error = value;
  const onClose = () => state.closed = true;
  ${functions}
  return { locate, change, cancelLocation, newReport, close };
`, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText);
for (const transition of ['manual', 'confirmation', 'pick', 'review', 'pending', 'unmount', 'close', 'newer']) {
  const callbacks = [];
  const state = { pending: { current: false }, locationRequest: { current: 0 }, draft: {}, gps: '', navigator: { geolocation: { getCurrentPosition: (...args) => callbacks.push(args) } } };
  const actions = runReport(state);
  actions.locate();
  if (transition === 'manual') actions.change({ latitude: '12', longitude: '34' }, true);
  else if (transition === 'confirmation') actions.change({ confirmed: true });
  else if (transition === 'pending') { actions.cancelLocation(); state.pending.current = true; }
  else if (transition === 'close') actions.close();
  else if (transition === 'newer') actions.locate();
  else actions.cancelLocation();
  const before = { draft: state.draft, gps: state.gps };
  callbacks[0][0]({ coords: { latitude: 1, longitude: 2, accuracy: 3 } });
  callbacks[0][1]();
  assert.deepEqual({ draft: state.draft, gps: state.gps }, before, `stale GPS: ${transition}`);
}
const revoked = [];
const resetState = { receipt: { id: 'saved' }, review: payload, attempted: true, dirty: false, error: 'old', draft, initial: {}, photos: [{ preview: 'blob:old', id: 'old-photo' }], photoRef: { current: [{ preview: 'blob:old' }] }, submissionKey: { current: 'first' }, locationRequest: { current: 1 }, pending: { current: true }, URL: { revokeObjectURL: value => revoked.push(value) }, crypto: { randomUUID: () => 'second' }, mutation: { reset: () => {} } };
const resetActions = runReport(resetState);
resetActions.close(); resetActions.newReport();
assert.equal(resetState.closed, undefined);
assert.equal(resetState.submissionKey.current, 'first');
resetState.pending.current = false;
resetActions.newReport();
assert.deepEqual(revoked, ['blob:old']);
assert.deepEqual(resetState.photos, []);
assert.deepEqual(resetState.photoRef.current, []);
assert.equal(resetState.draft, resetState.initial);
assert.equal(resetState.submissionKey.current, 'second');
for (const field of ['review', 'receipt']) assert.equal(resetState[field], null);
for (const field of ['attempted', 'dirty']) assert.equal(resetState[field], false);
for (const field of ['regionSearch', 'regionQuery', 'gps', 'error']) assert.equal(resetState[field], '');
const brand = await readFile(new URL('../components/common/Brand.tsx', import.meta.url), 'utf8');
assert.match(brand, /src=\{brandLogo\}/);
assert.match(brand, />Blazemap<\/span>/);
assert.doesNotMatch(brand, /Sprout|lucide-react/);
const upload = await readFile(new URL("../api/reports/reports-queries.ts", import.meta.url), "utf8");
assert.match(upload, /withCredentials: false/);
assert.match(upload, /\/finalize/);
assert.doesNotMatch(upload, /localStorage|sessionStorage/);
assert.match(upload, /const result = await request<ReportList>[\s\S]*?await requireReportAccount\(user\);[\s\S]*?signal\.throwIfAborted\(\)/);
const feed = await readFile(new URL("../pages/dashboard/DashboardPage.tsx", import.meta.url), "utf8");
assert.match(feed, /feed \|\| publications, !feed && hotspots/);
assert.doesNotMatch(feed, /reporterEmail|reporterId|attachmentIds|downloadPhoto|voteScore|rating/);
assert.match(feed, /!feed && desktop && !myReports && <aside/);
assert.doesNotMatch(feed, /<select|Source: NASA FIRMS and approved publications\.|Points are not fire boundaries\./);
assert.match(feed, /Select.Portal/);
assert.match(feed, /radix-select-content-available-height/);
assert.match(feed, /setPointerCapture/);
assert.match(feed, /onPointerCancel=\{pointerEnd\}/);
assert.match(feed, /onKeyDown=\{event => keyboard\(event, true\)\}/);
assert.match(feed, /pathname === home && <ReportPage/);
assert.match(feed, /setPick\(\{ latitude, longitude, locationMode, receive \}\)/);
assert.match(feed, /onPick=\{pick \? \(latitude, longitude\) => setPick/);
assert.match(feed, /Confirm location/);
assert.match(feed, /open=\{reportOpen && !pick && !feed\}/);
assert.doesNotMatch(feed, /(?:reportOpen|!feed|!pick) && <ReportPage|<ReportPage[^\n]*\bkey=|Points and clusters do not represent fire boundaries\./);
assert.doesNotMatch(feed, /Situation overview|records in this view|A hotspot is a thermal anomaly/);
assert.match(feed, /import \{ ItemDetail \} from "\.\/components\/CitizenDashboard"/);
assert.match(feed, /min-width: 768px/);
assert.match(feed, /md:w-\[380px\]/);
assert.match(feed, /md:max-w-\[600px\]/);
assert.match(feed, /useState\(72\)/);
assert.match(feed, /width: 400, height: window.innerHeight - 120/);
assert.match(feed, /panel === "cases" && !selected \? <GovernmentWorklist/);
assert.doesNotMatch(feed, /perimeterDraft \? <GovernmentWorklist/);
assert.match(feed, /user.role === "USER" && pathname === home && <ReportPage/);
assert.match(feed, /reportOpener.current = event.currentTarget/);
assert.match(feed, /restoreFocus\(reportOpener.current, '\[data-report-trigger\]'\)/);
assert.match(feed, /onCloseAutoFocus=\{event => \{ event.preventDefault\(\); restoreFocus\(worklistOpener.current/);
assert.match(feed, /function closeReport\(\) \{ if \(reportPending\) return/);
const citizenDashboard = await readFile(new URL("../pages/dashboard/components/CitizenDashboard.tsx", import.meta.url), "utf8");
for (const panelClass of ["left-6", "top-24", "h-[calc(100vh-120px)]", "w-[380px]", "max-w-[600px]", "max-w-[520px]", "md:max-w-[700px]"]) assert.ok(citizenDashboard.includes(panelClass));
assert.match(citizenDashboard, /resetWhen: myReportsOpen && !desktop, maxHeight: 82/);
assert.match(citizenDashboard, /initialHeight: 68, minHeight: 34, maxHeight: 86, snapPoints: \[48, 68, 86\]/);
assert.match(citizenDashboard, /stiffness: 300, damping: 30/);
assert.match(citizenDashboard, /stiffness: 360, damping: 34/);
assert.match(citizenDashboard, /useReducedMotion\(\)/);
assert.match(citizenDashboard, /<FieldSelect id="map-window"/);
assert.doesNotMatch(citizenDashboard, /<select|window\.confirm|Close the report panel/);
assert.match(citizenDashboard, /function closeReport\(\) \{\s*if \(reportPending \|\| reportDraft\.pending\) return;\s*setPick\(null\);/);
assert.doesNotMatch(citizenDashboard, /reporterEmail|reporterId|attachmentIds|downloadPhoto|voteScore|rating/);
assert.match(citizenDashboard, /not a confirmed fire/);
assert.match(citizenDashboard, /not.*perimeter/i);
const reportsPanel = await readFile(new URL("../pages/reports/ReportsPage.tsx", import.meta.url), "utf8");
for (const text of ["Search my reports", "No reports yet", "You haven't submitted any observations."]) assert.ok(reportsPanel.includes(text));
assert.doesNotMatch(reportsPanel, /voteScore|rating|ThumbsUp|ThumbsDown/);
assert.match(reportsPanel, /className="grid size-16 place-items-center text-gray-500"/);
const workspaceNav = await readFile(new URL("../components/common/WorkspaceNav.tsx", import.meta.url), "utf8");
assert.match(workspaceNav, /max-w-5xl/);
assert.doesNotMatch(workspaceNav.match(/<header[^>]+>/)[0], /\bborder\b/);
const accountMenu = await readFile(new URL("../components/auth/AccountMenu.tsx", import.meta.url), "utf8");
assert.match(accountMenu, /rounded-full border-0 bg-transparent/);
assert.match(accountMenu, /hover:bg-secondary focus-visible:bg-secondary data-\[state=open\]:bg-secondary/);
assert.match(accountMenu, /to="\/profile"/);
assert.match(accountMenu, /user.role === "ADMIN" && <DropdownMenu.Item/);
assert.doesNotMatch(workspaceNav, /user.role === "USER" && <nav/);
assert.match(feed, /aria-label="Feed visibility"/);
assert.match(feed, /<DraftGuard dirty=\{!!perimeterDraft\} pending=\{!!perimeterDraft\?\.pending\}/);
const mobileSheet = await readFile(new URL("../hooks/useMobileSheetResize.ts", import.meta.url), "utf8");
assert.match(mobileSheet, /pointermove/);
assert.match(mobileSheet, /event\.isPrimary/);
assert.match(mobileSheet, /passive: false/);
assert.match(mobileSheet, /velocityY > closeVelocity/);
assert.match(mobileSheet, /snapPoints\.reduce/);
const dashboardAST = ts.createSourceFile('DashboardPage.tsx', feed, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const workspace = dashboardAST.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'Workspace');
const focusSource = workspace.body.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'restoreFocus').getText(dashboardAST);
const focus = new Function('document', `${ts.transpileModule(focusSource, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText}; return restoreFocus;`);
let focused;
const target = (id, visible) => ({ isConnected: true, getClientRects: () => visible ? [1] : [], closest: () => null, focus: () => focused = id });
const hidden = target('hidden', false), visible = target('visible', true), opener = target('opener', true);
const restore = focus({ querySelectorAll: () => [hidden, visible] });
restore(opener, '[data-report-trigger]'); assert.equal(focused, 'opener');
restore(hidden, '[data-report-trigger]'); assert.equal(focused, 'visible');
restore(null, '[data-worklist-trigger]'); assert.equal(focused, 'visible');
const guard = await readFile(new URL("../components/common/DraftGuard.tsx", import.meta.url), "utf8");
assert.match(guard, /pending \|\| \(dirty/);
assert.match(guard, /\["\/dashboard", "\/monitoring"\]\.includes\(currentLocation.pathname\) && nextLocation.pathname === currentLocation.pathname/);
assert.match(guard, /if \(dirty \|\| pending\)/);
assert.match(guard, /disabled=\{pending\}/);
const blockerExpression = guard.match(/useBlocker\((\(\{ currentLocation, nextLocation \}\) => [^;]+)\);/)[1];
const blocked = new Function('dirty', 'pending', 'dashboard', `const loggedOut = { current: false }; return (${blockerExpression});`);
assert.equal(blocked(true, false, true)({ currentLocation: { pathname: '/dashboard' }, nextLocation: { pathname: '/dashboard' } }), false);
for (const dirty of [false, true]) for (const pending of [false, true]) {
  const check = blocked(dirty, pending, true);
  assert.equal(check({ currentLocation: { pathname: '/dashboard', search: '?panel=report' }, nextLocation: { pathname: '/dashboard', search: '?view=feed' } }), pending);
  assert.equal(check({ currentLocation: { pathname: '/dashboard' }, nextLocation: { pathname: '/my-reports' } }), pending || dirty);
}
const guardAST = ts.createSourceFile('DraftGuard.tsx', guard, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const guardFunction = guardAST.statements.find(node => ts.isFunctionDeclaration(node));
const effect = guardFunction.body.statements.find(node => ts.isExpressionStatement(node) && node.expression.expression?.getText(guardAST) === 'useEffect').expression.arguments[0].getText(guardAST);
const mountGuard = new Function('window', 'dirty', 'pending', 'loggedOut', ts.transpileModule(`return (${effect})();`, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText);
for (const dirty of [false, true]) for (const pending of [false, true]) for (const answer of [false, true]) {
  const listeners = new Map();
  let confirmations = 0;
  const loggedOut = { current: false };
  const cleanup = mountGuard({ addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), confirm: () => { confirmations++; return answer; } }, dirty, pending, loggedOut);
  const event = new globalThis.Event('draft-before-logout', { cancelable: true });
  listeners.get(event.type)(event);
  assert.equal(event.defaultPrevented, pending || (dirty && !answer));
  assert.equal(confirmations, dirty && !pending ? 1 : 0);
  assert.equal(loggedOut.current, false, 'approval alone must not release the draft');
  listeners.get('draft-logout-complete')();
  assert.equal(loggedOut.current, true);
  cleanup();
  assert.equal(listeners.size, 0);
}
const logoutSource = await readFile(new URL('../hooks/useAccount.ts', import.meta.url), 'utf8');
const logoutBody = logoutSource.slice(logoutSource.indexOf('export function useLogout')).replace('export ', '');
const makeLogout = new Function('window', 'useRef', 'useState', 'signOut', 'queryClient', 'queryKeys', 'clearDashboardQueries', ts.transpileModule(`${logoutBody}; return useLogout();`, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText);
for (const approved of [false, true]) {
  const events = [];
  const window = { dispatchEvent: event => { events.push(event.type); return approved; } };
  const actions = makeLogout(window, value => ({ current: value }), value => [value, () => {}], async () => events.push('signOut'), { cancelQueries: async () => {}, setQueryData: () => events.push('account-clear') }, { account: ['account'] }, () => events.push('private-clear'));
  assert.equal(await actions.logout(), approved);
  assert.deepEqual(events, approved ? ['draft-before-logout', 'signOut', 'draft-logout-complete', 'private-clear', 'account-clear'] : ['draft-before-logout']);
}
{
  const events = [];
  let finish;
  const actions = makeLogout({ dispatchEvent: event => { events.push(event.type); return true; } }, value => ({ current: value }), value => [value, () => {}], () => new Promise((_, reject) => { finish = reject; }), { cancelQueries: async () => events.push('cancel'), setQueryData: () => events.push('account-clear') }, { account: ['account'] }, () => events.push('private-clear'));
  const attempt = actions.logout();
  assert.equal(await actions.logout(), false, 'duplicate logout is blocked');
  finish(new Error('failed'));
  assert.equal(await attempt, false);
  assert.deepEqual(events, ['draft-before-logout'], 'failed logout retains draft and caches');
}
const loaderSource = await readFile(new URL('../pages/dashboard/loader.ts', import.meta.url), 'utf8');
const loaderBody = loaderSource.slice(loaderSource.indexOf('export async function loader')).replace('export ', '');
const runLoader = new Function('fetchAccount', 'clearDashboardQueries', 'queryClient', 'queryKeys', 'AuthError', 'redirect', ts.transpileModule(`const accountQueryOptions = {}; queryClient.fetchQuery = fetchAccount; const workspacePath = role => role === 'ADMIN' ? '/monitoring' : '/dashboard'; ${loaderBody}; return loader;`, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText);
for (const scenario of ['same-url', 'search', 'forced', 'action', 'changed-user', 'changed-role', 'expired', 'unavailable']) {
  let checks = 0, clears = 0;
  class SessionError extends Error { status = 401; }
  const current = { id: 'a', role: 'USER' };
  const checked = scenario === 'changed-user' ? { ...current, id: 'b' } : scenario === 'changed-role' ? { ...current, role: 'ADMIN' } : current;
  const load = runLoader(async () => { checks++; if (scenario === 'expired') throw new SessionError(); if (scenario === 'unavailable') throw new Error(); return checked; }, () => clears++, { getQueriesData: () => [[['dashboard', 'a', 'USER', 'guard'], current]] }, { dashboard: { all: ['dashboard'] } }, SessionError, value => new globalThis.Response(null, { status: 302, headers: { Location: value } }));
  const result = load({ request: new globalThis.Request('https://example.invalid/dashboard') });
  if (['expired', 'unavailable'].includes(scenario)) await assert.rejects(result);
  else assert.deepEqual(await result, checked);
  assert.equal(checks, 1, `session check: ${scenario}`);
  assert.equal(clears, ['changed-user', 'changed-role', 'expired', 'unavailable'].includes(scenario) ? 1 : 0, `draft cache: ${scenario}`);
}
const routes = await readFile(new URL("../config/routes.ts", import.meta.url), "utf8");
assert.match(routes, /redirect\(reportDestination\(new URL\(request.url\).search\)\)/);
const revalidate = new Function(`return (${routes.match(/shouldRevalidate: (.*),/)[1]});`)();
for (const search of ['', '?view=feed']) for (const formMethod of [undefined, 'POST']) {
  assert.equal(revalidate({ currentUrl: new URL('https://example.invalid/dashboard'), nextUrl: new URL(`https://example.invalid/dashboard${search}`), formMethod, defaultShouldRevalidate: true }), !search || !!formMethod);
}
assert.equal(revalidate({ currentUrl: new URL('https://example.invalid/dashboard'), nextUrl: new URL('https://example.invalid/account'), defaultShouldRevalidate: true }), true);
const reportsPage = await readFile(new URL("../pages/reports/ReportsPage.tsx", import.meta.url), "utf8");
assert.match(reportsPage, /query\.isError \? undefined : query\.data/);
assert.doesNotMatch(reportsPage, /WorkspacePage|useParams|to=[^\n]*\/my-reports\//);
assert.match(routes, /await loader\(args\)/);
assert.match(routes, /\$\{home\}\?panel=my-reports/);
assert.match(feed, /<ReportsPage user=\{user\} id=\{params.get\("report"\)\} onDraft=\{handleDetailDraft\}/);
const profilePage = await readFile(new URL('../pages/profile/ProfilePage.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(profilePage, /Account access|Yanz|localStorage|sessionStorage/);
assert.match(profilePage, /DraftGuard dirty=\{dirtyName \|\| dirtyPassword \|\| photo.dirty\} pending=\{pending\}/);
assert.doesNotMatch(profilePage, /useDashboardSession/);
assert.match(profilePage, /setValues\(empty\); setVisible\(\{\}\)/);
assert.match(profilePage, /aria-controls=\{field\}/);
assert.match(profilePage, /src=\{rainforest\}/);
const passwordHook = await readFile(new URL('../hooks/profile/useProfile.ts', import.meta.url), 'utf8');
const passwordPart = passwordHook.slice(passwordHook.indexOf('export function usePassword'), passwordHook.indexOf('export function useMutationUpdateProfile'));
assert.doesNotMatch(passwordPart, /useMutation\(|console\.|localStorage|sessionStorage/);
assert.match(passwordPart, /if \(lock.current\) return false/);
assert.match(passwordPart, /finally \{ lock.current = false; setPending\(false\); \}/);
const flame = await readFile(new URL("../pages/dashboard/components/SituationMap.tsx", import.meta.url), "utf8");
assert.match(flame, /item\.kind !== "publication" \|\| item\.verification !== "CONFIRMED_FIRE"/);
assert.match(flame, /motion-safe:animate-pulse/);
assert.match(flame, /AttributionControl\(\{ compact: true \}\)/);
assert.match(flame, /draggable: !!onPick/);
assert.match(flame, /marker\.setDraggable\(!!onPick\)/);
assert.match(flame, /marker\.on\("dragend"/);
assert.match(flame, /use arrow keys to adjust/);
assert.match(flame, /element\.addEventListener\("click", event => event\.stopPropagation\(\)\)/);
assert.match(flame, /element\.tabIndex = onPick \? 0 : -1/);
assert.match(flame, /element\.addEventListener\("keydown"/);
assert.match(flame, /ArrowUp.*ArrowDown.*ArrowLeft.*ArrowRight/);
const mapSource = await readFile(new URL("../config/map.ts", import.meta.url), "utf8");
assert.match(mapSource, /maplibre-gl-worker\.mjs\?worker&url/);
assert.match(mapSource, /setWorkerUrl\(workerUrl\)/);
assert.doesNotMatch(mapSource, /customAttribution/);
const assetsURL = new URL("../../dist/assets/", import.meta.url);
const assets = await readdir(assetsURL);
const workers = assets.filter(name => /^maplibre-gl-worker-.*\.js$/.test(name));
assert.ok(workers.length > 0, "Vite must emit the actual worker");
for (const name of workers) {
  const code = await readFile(new URL(name, assetsURL), "utf8");
  assert.ok(code.length > 100000, "worker must contain its bundled dependencies");
  assert.doesNotMatch(code, /(?:from\s*|import\s*)["'](?:\.\/|@maplibre|maplibre-gl-shared)/);
  assert.doesNotMatch(code, /node_modules\/\.vite\/deps/);
  const consumers = await Promise.all(assets.filter(file => file.endsWith(".js") && file !== name).map(file => readFile(new URL(file, assetsURL), "utf8")));
  assert.ok(consumers.some(code => code.includes(name)), "app bundle must reference the emitted worker");
}
