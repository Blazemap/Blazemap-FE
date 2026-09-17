import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

export function mapStyleUrl() {
  const value: unknown = import.meta.env.VITE_MAP_STYLE_URL;
  const style = typeof value === "string" && value ? value : "https://tiles.openfreemap.org/styles/liberty";
  const url = new URL(style);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid map configuration");
  return url.href;
}
