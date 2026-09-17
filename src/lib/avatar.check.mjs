import assert from "node:assert/strict";
import console from "node:console";
import { cropRect, validateAvatarFile, avatarDimensions, googleAvatar, uploadedAvatar, avatarSource } from "./avatar.ts";
import { safeWorkspaceDestination, workspacePath } from "./dashboard.ts";
for (const [width, height] of [[512, 512], [8000, 64], [64, 8000], [3200, 4000]]) {
  for (const zoom of [1, 1.5, 4]) for (const x of [-1, 0, 0.5, 1, 2]) for (const y of [-1, 0, 0.5, 1, 2]) {
    const crop = cropRect(width, height, zoom, x, y);
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.size > 0);
    assert.ok(crop.x + crop.size <= width && crop.y + crop.size <= height);
  }
}
assert.deepEqual(cropRect(1000, 500, 1, 0.5, 0.5), { x: 250, y: 0, size: 500 });
for (const values of [[0, 10, 1, 0, 0], [10, 10, 5, 0, 0], [10, 10, 1, NaN, 0]]) assert.throws(() => cropRect(...values));
validateAvatarFile({ name: 'photo.jpeg', type: 'image/jpeg', size: 5242880 });
for (const file of [{ name: 'a.svg', type: 'image/svg+xml', size: 1 }, { name: 'a.png', type: 'image/jpeg', size: 1 }, { name: 'a.jpg', type: 'image/jpeg', size: 5242881 }, { name: 'a.jpg', type: 'image/jpeg', size: 0 }]) assert.throws(() => validateAvatarFile(file));
const png = new Uint8Array(24);
const header = new DataView(png.buffer);
header.setUint32(16, 512); header.setUint32(20, 512);
assert.deepEqual(avatarDimensions(png, 'image/png'), { width: 512, height: 512 });
header.setUint32(16, 100000);
assert.throws(() => avatarDimensions(png, 'image/png'));
assert.throws(() => avatarDimensions(new Uint8Array(0), 'image/jpeg'));
assert.equal(workspacePath('ADMIN'), '/dashboard');
assert.equal(safeWorkspaceDestination('/dashboard?panel=report&observation=a', 'ADMIN'), '/dashboard');
assert.equal(safeWorkspaceDestination('/monitoring?role=ADMIN', 'USER'), '/dashboard');
assert.equal(safeWorkspaceDestination('//evil.invalid', 'ADMIN'), '/dashboard');
const provider = 'https://lh3.googleusercontent.com/a/avatar';
assert.equal(googleAvatar(provider), provider);
assert.equal(googleAvatar('https://googleusercontent.com/avatar'), 'https://googleusercontent.com/avatar');
for (const url of ['http://lh3.googleusercontent.com/a', 'https://googleusercontent.com.evil.invalid/a', 'https://evilgoogleusercontent.com/a', 'https://user:pass@lh3.googleusercontent.com/a', 'https://lh3.googleusercontent.com:443/a', 'https://lh3.googleusercontent.com:444/a', 'https://lh3.googleusercontent.com./a', 'data:image/png;base64,abc', '//lh3.googleusercontent.com/a', 'https://lh3.googleusercontent.com\\@evil.invalid/a']) assert.equal(googleAvatar(url), undefined);
const uploaded = `avatars/${'a'.repeat(64)}/00000000-0000-4000-8000-000000000000.jpg`;
assert.equal(uploadedAvatar(uploaded), true);
assert.equal(avatarSource(uploaded, 'blob:uploaded'), 'blob:uploaded');
assert.equal(avatarSource(uploaded), undefined);
assert.equal(avatarSource(provider, 'blob:stale'), provider);
assert.equal(avatarSource('https://evil.invalid/a', 'blob:stale'), undefined);
console.log('Crop, Google host validation, custom-avatar precedence and fallback checks passed.');
