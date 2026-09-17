import type { StyleImageInterface } from "maplibre-gl";

export function flameImage(repaint: () => void): StyleImageInterface {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const change = () => { frame = -1; clearTimeout(timer); repaint(); };
  return {
    width: 64, height: 64, data: new Uint8Array(64 * 64 * 4),
    onAdd() { media.addEventListener("change", change); },
    onRemove() { clearTimeout(timer); media.removeEventListener("change", change); },
    render() {
      const next = media.matches ? 0 : Math.floor(performance.now() / 80);
      if (next === frame) return false;
      frame = next;
      const sway = media.matches ? 0 : Math.sin(next * 0.4) * 2;
      context.clearRect(0, 0, 64, 64);
      context.beginPath();
      context.moveTo(32 + sway, 5);
      context.bezierCurveTo(37 + sway, 20, 51, 23, 51, 39);
      context.bezierCurveTo(51, 62, 13, 62, 13, 39);
      context.bezierCurveTo(13, 30, 19, 24, 22, 21);
      context.quadraticCurveTo(20, 33, 27, 31);
      context.quadraticCurveTo(35, 23, 32 + sway, 5);
      context.fillStyle = "#f58a36";
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = "#ffffff";
      context.stroke();
      context.beginPath();
      context.moveTo(32, 30);
      context.bezierCurveTo(47, 45, 40, 53, 32, 53);
      context.bezierCurveTo(23, 53, 20, 44, 32, 30);
      context.fillStyle = "#ffe095";
      context.fill();
      this.data = context.getImageData(0, 0, 64, 64).data;
      if (!media.matches) { clearTimeout(timer); timer = setTimeout(repaint, 80); }
      return true;
    },
  };
}
