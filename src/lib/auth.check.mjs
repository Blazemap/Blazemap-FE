import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import ts from "typescript";
import { AuthError, getAuthErrorMessage, getOAuthErrorMessage, validateAuth } from "./auth.ts";

const fallback = "Unable to complete the request. Please try again.";
for (const value of [null, undefined, "private server details", new Error("private server details"), new TypeError("Failed to fetch: secret"), { code: "INVALID_EMAIL", message: "secret" }]) {
  assert.equal(getAuthErrorMessage(value), fallback);
}
for (const code of ["unknown_provider_code", "<script>secret</script>", "__proto__", "constructor", "toString", "INVALID_EMAIL secret"]) {
  assert.equal(getAuthErrorMessage(new AuthError(code)), fallback);
  assert.equal(getOAuthErrorMessage(code), "Unable to complete Google login. Try again or use email and password.");
}
for (const value of [null, undefined, 42, {}, ["access_denied"]]) {
  assert.equal(getOAuthErrorMessage(value), "Unable to complete Google login. Try again or use email and password.");
}
assert.equal(getAuthErrorMessage(new AuthError("INVALID_EMAIL")), "Enter a valid email address.");
assert.equal(getAuthErrorMessage(new AuthError("NETWORK_ERROR")), "Unable to connect. Check your connection and try again.");
assert.equal(getAuthErrorMessage(new AuthError("unknown", 408)), "The request timed out. Please try again.");
assert.equal(getAuthErrorMessage(new AuthError("INVALID_EMAIL", 429)), "Too many requests. Please wait before trying again.");
for (const status of [500, 502, 503, 504, 599]) {
  assert.equal(getAuthErrorMessage(new AuthError("INVALID_PASSWORD", status)), "Authentication is temporarily unavailable. Please try again later.");
}
assert.match(getOAuthErrorMessage("ACCESS_DENIED"), /cancelled/);
assert.match(getOAuthErrorMessage("provider_not_found"), /unavailable/);
assert.match(getOAuthErrorMessage("state_mismatch"), /expired/);
assert.ok(validateAuth({ name: "", email: "bad", password: "short", confirmPassword: "different" }, "register").confirmPassword);

const source = await readFile(new URL("../api/auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace('from "@/lib"', `from "${new URL("./auth.ts", import.meta.url).href}"`), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const original = { fetch: globalThis.fetch, window: globalThis.window, sessionStorage: globalThis.sessionStorage };
const storage = new Map();
const user = { id: "user", name: "Test", email: "test@example.invalid", active: true, emailVerified: true, role: "ADMIN" };
let session = null;
let signOuts = 0;
globalThis.window = { location: { origin: "https://app.example.invalid", search: "" } };
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.fetch = async (url, options) => {
  if (url.endsWith("/get-session")) return globalThis.Response.json(session);
  if (url.endsWith("/sign-out")) { signOuts++; session = null; return globalThis.Response.json({ success: true }); }
  if (url.endsWith("/sign-in/social")) {
    globalThis.window.location.search = new URL(JSON.parse(options.body).callbackURL).search;
    return globalThis.Response.json({ redirect: false, url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=test" });
  }
  throw new Error("Unexpected request");
};
try {
  await api.startOAuth("login", "citizen");
  session = { session: { id: "new-session", userId: user.id }, user };
  await assert.rejects(api.completeOAuth("citizen"), { code: "GOVERNMENT_PORTAL_REQUIRED" });
  assert.equal(signOuts, 1);
  assert.equal(session, null);
  session = { session: { id: "existing-session", userId: user.id }, user };
  await api.startOAuth("login", "citizen");
  await assert.rejects(api.completeOAuth("citizen"), { code: "GOVERNMENT_PORTAL_REQUIRED" });
  assert.equal(signOuts, 1);
  globalThis.window.location.search = "?oauth=google&complete=1&attempt=forged";
  await assert.rejects(api.completeOAuth("citizen"), { code: "GOVERNMENT_PORTAL_REQUIRED" });
  assert.equal(signOuts, 1);
  await api.startOAuth("login", "government");
  await api.completeOAuth("government");
  assert.equal(storage.size, 0);
  globalThis.fetch = async () => globalThis.Response.json({ code: "unknown", message: "private server details" }, { status: 400 });
  await assert.rejects(api.signIn("test@example.invalid", "password", "citizen"), (error) => getAuthErrorMessage(error) === fallback);
  globalThis.fetch = async () => { throw new Error("private connection details"); };
  await assert.rejects(api.signIn("test@example.invalid", "password", "citizen"), { code: "NETWORK_ERROR" });
} finally {
  Object.assign(globalThis, original);
}
