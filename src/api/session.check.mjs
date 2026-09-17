import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import console from 'node:console';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import { AuthError, sessionRetryDelay } from '../lib/auth.ts';

assert.equal(sessionRetryDelay(null), 60000);
assert.equal(sessionRetryDelay('5'), 5000);
assert.equal(sessionRetryDelay('invalid'), 60000);
assert.equal(sessionRetryDelay('9999999'), 300000);
const now = Date.now();
assert.ok(sessionRetryDelay(new Date(now + 30000).toUTCString(), now) <= 30000);
const source = await readFile(new URL('./dashboard/session.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source
  .replace('from "@/lib"', `from "${new URL('../lib/auth.ts', import.meta.url).href}"`)
  .replace('from "@/lib/auth"', `from "${new URL('../lib/auth.ts', import.meta.url).href}"`)
  .replace('from "@/lib/avatar"', `from "${new URL('../lib/avatar.ts', import.meta.url).href}"`)
  .replace('from "@/api/queryKeys"', `from "${new URL('./queryKeys.ts', import.meta.url).href}"`)
  .replace('from "@/constants"', `from "${new URL('../constants/api.ts', import.meta.url).href}"`)
  .replace('import { queryClient } from "@/config/react-query";', 'const queryClient = { fetchQuery: () => { throw new Error("Unexpected shared query"); } };'), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const { accountQueryOptions } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const original = globalThis.fetch;
const realNow = Date.now;
let clock = now, calls = 0, limited = false;
Date.now = () => clock;
const user = { id: 'fixture', name: 'Fixture', email: 'fixture@example.invalid', active: true, emailVerified: true, role: 'USER', image: 'https://lh3.googleusercontent.com/a/fixture' };
globalThis.fetch = async () => {
  calls++;
  return limited ? new globalThis.Response('{}', { status: 429, headers: { 'X-Retry-After': '120' } }) : globalThis.Response.json({ user, session: { id: 'fixture-session', userId: user.id, expiresAt: new Date(now + 3600000).toISOString() } });
};
const client = new QueryClient();
try {
  const results = await Promise.all(Array.from({ length: 20 }, () => client.fetchQuery(accountQueryOptions)));
  assert.equal(calls, 1);
  assert.equal(results[0].image, user.image);
  assert.equal(results[0].canPublishInformation, false);
  assert.equal(results[0].canConfirmIncidents, false);
  for (let step = 0; step < 11; step++) { clock += 5000; await client.fetchQuery(accountQueryOptions); }
  assert.equal(calls, 1, 'five-second resource checks reuse the shared fresh session');
  clock += 5001;
  limited = true;
  await assert.rejects(client.fetchQuery(accountQueryOptions), error => error instanceof AuthError && error.status === 429);
  assert.equal(calls, 2);
  for (let step = 0; step < 23; step++) { clock += 5000; await assert.rejects(client.fetchQuery(accountQueryOptions), { status: 429 }); }
  assert.equal(calls, 2, 'no network request during Retry-After, even with forced resource checks');
  clock += 5001;
  limited = false;
  await client.fetchQuery(accountQueryOptions);
  assert.equal(calls, 3);
  assert.equal(accountQueryOptions.retry, false);
  assert.equal(accountQueryOptions.retryOnMount, false);
  assert.equal(accountQueryOptions.refetchInterval, 60000);
} finally { client.clear(); globalThis.fetch = original; Date.now = realNow; }
console.log('Shared session scheduling, deduplication and 429 cooldown checks passed without network access.');
