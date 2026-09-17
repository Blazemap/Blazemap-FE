export function googleAvatar(value: unknown): string | undefined {
  if (typeof value !== "string" || /[\s\\]/.test(value)) return;
  try {
    const url = new URL(value);
    const authority = value.slice(8).split(/[/?#]/, 1)[0];
    if (!authority || authority.includes(":")) return;
    if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"))) return url.href;
  } catch { return; }
}
export function uploadedAvatar(value: unknown): value is string {
  return typeof value === "string" && /^avatars\/[a-f0-9]{64}\/[a-f0-9-]{36}\.jpg$/.test(value);
}
export function avatarSource(image: unknown, uploadedUrl?: string): string | undefined {
  return uploadedAvatar(image) ? uploadedUrl : googleAvatar(image);
}
export function cropRect(width: number, height: number, zoom: number, x: number, y: number) {
  if (![width, height, zoom, x, y].every(Number.isFinite) || width < 1 || height < 1 || zoom < 1 || zoom > 4) throw new Error("Invalid crop");
  const size = Math.min(width, height) / zoom;
  return { x: (width - size) * Math.max(0, Math.min(1, x)), y: (height - size) * Math.max(0, Math.min(1, y)), size };
}
export function validateAvatarFile(file: Pick<File, "size" | "type" | "name">) {
  const extensions: Record<string, RegExp> = { "image/jpeg": /\.jpe?g$/i, "image/png": /\.png$/i, "image/webp": /\.webp$/i };
  if (!extensions[file.type]?.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) throw new Error("Choose a JPEG, PNG or WebP image up to 5 MB.");
}
export function avatarDimensions(bytes: Uint8Array, type: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0;
  if (type === "image/png" && bytes.length >= 24) { width = view.getUint32(16); height = view.getUint32(20); }
  if (type === "image/jpeg") {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194].includes(marker) && length >= 7) { height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break; }
      offset += length;
    }
  }
  if (type === "image/webp" && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") {
      if (bytes[20] & 2) throw new Error("Choose a still image, not an animation.");
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === "VP8 " && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = view.getUint16(26, true) & 16383; height = view.getUint16(28, true) & 16383;
    } else if (chunk === "VP8L" && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1;
    }
  }
  if (width < 64 || height < 64 || width > 8192 || height > 8192 || width * height > 20000000) throw new Error("Use a valid image at least 64 × 64, at most 8192 per side and 20 megapixels.");
  return { width, height };
}
export async function decodeAvatar(file: File) {
  validateAvatarFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b) : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!valid) throw new Error("Image content does not match its file type.");
  avatarDimensions(bytes, file.type);
  const image = await createImageBitmap(file, { imageOrientation: "from-image" });
  if (image.width < 64 || image.height < 64 || image.width > 8192 || image.height > 8192 || image.width * image.height > 20000000) {
    image.close();
    throw new Error("Use an image at least 64 × 64, at most 8192 per side and 20 megapixels.");
  }
  return image;
}
export function paintCrop(canvas: HTMLCanvasElement, image: ImageBitmap, zoom: number, x: number, y: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image editing is unavailable in this browser.");
  const crop = cropRect(image.width, image.height, zoom, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, canvas.width, canvas.height);
}
export async function encodeCrop(image: ImageBitmap, zoom: number, x: number, y: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  paintCrop(canvas, image, zoom, x, y);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Unable to prepare the image.")), "image/jpeg", 0.88));
}
