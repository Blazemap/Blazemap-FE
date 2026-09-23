export type Position = [number, number];
export type Polygon = { type: "Polygon"; coordinates: Position[][] };
export type PublicPerimeter = { geometry: Polygon; observedAt: string; source: string; areaHectares: number; revision: number };
export type Drawing = { rings: Position[][]; closed: boolean[]; active: number };
export type DrawingAction = { type: "add"; point: Position } | { type: "move"; index: number; point: Position } | { type: "delete"; index: number } | { type: "close" } | { type: "reopen" } | { type: "ring"; index: number } | { type: "hole" } | { type: "delete-hole" };
export type PerimeterDraft = { attempted?: boolean; confirmation?: { fieldUpdateId: string; reuseFieldObservation?: boolean }; caseId: string; version: number; drawing: Drawing; history: Drawing[]; observedAt: string; source: string; reason: string; authority: string; pending: boolean; fit: number };

const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
const cross = (a: Position, b: Position, c: Position) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function validPosition(value: unknown): value is Position {
  return Array.isArray(value) && value.length === 2 && value.every(v => typeof v === "number" && Number.isFinite(v)) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
function onSegment(p: Position, a: Position, b: Position) {
  return Math.abs(cross(a, b, p)) <= 1e-12 && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
}
function intersects(a: Position, b: Position, c: Position, d: Position) {
  return ((cross(a, b, c) > 0) !== (cross(a, b, d) > 0) && (cross(c, d, a) > 0) !== (cross(c, d, b) > 0)) || onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}
function inRing(p: Position, ring: Position[]) {
  let inside = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    if (onSegment(p, a, b)) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function ringArea(ring: Position[]) {
  const rad = Math.PI / 180;
  return Math.abs(ring.slice(0, -1).reduce((sum, a, i) => sum + (ring[i + 1][0] - a[0]) * rad * (2 + Math.sin(a[1] * rad) + Math.sin(ring[i + 1][1] * rad)), 0)) * 6371008.8 ** 2 / 2;
}
export function polygonArea(polygon: Polygon) {
  return (ringArea(polygon.coordinates[0]) - polygon.coordinates.slice(1).reduce((sum, ring) => sum + ringArea(ring), 0)) / 10000;
}
export function parsePolygon(value: unknown): Polygon {
  if (!value || typeof value !== "object" || !("type" in value) || value.type !== "Polygon" || !("coordinates" in value) || !Array.isArray(value.coordinates)) throw new Error("A Polygon geometry is required.");
  const rings: Position[][] = value.coordinates.map((ring: unknown) => {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(validPosition)) throw new Error("Each ring needs three valid vertices and a closing position.");
    return ring.map(p => [p[0], p[1]]);
  });
  if (!rings.length || rings.reduce((n, ring) => n + ring.length, 0) > 1000) throw new Error("Use at most 1,000 positions including ring closures.");
  const longitudes = rings.flatMap(ring => ring.map(p => p[0]));
  if (Math.max(...longitudes) - Math.min(...longitudes) >= 180) throw new Error("Longitude span must be below 180 degrees.");
  for (const ring of rings) {
    const vertices = ring.slice(0, -1);
    const area = vertices.reduce((sum, a, i) => sum + cross(vertices[0], a, vertices[(i + 1) % vertices.length]), 0);
    if (!same(ring[0], ring[ring.length - 1]) || new Set(vertices.map(p => p.join(","))).size !== vertices.length || Math.abs(area) <= Number.EPSILON || ringArea(ring) <= 0) throw new Error("Rings must be closed, have distinct vertices and nonzero area.");
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i], b = vertices[(i + 1) % vertices.length], c = vertices[(i + 2) % vertices.length];
      if (Math.abs(cross(a, b, c)) <= 1e-12 && (onSegment(c, a, b) || onSegment(a, b, c))) throw new Error("Edges must not overlap or fold back.");
      for (let j = i + 2; j < vertices.length; j++) {
        if (i === 0 && j === vertices.length - 1) continue;
        if (intersects(a, b, vertices[j], vertices[(j + 1) % vertices.length])) throw new Error("Polygon edges must not intersect.");
      }
    }
  }
  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      const a = rings[i], b = rings[j];
      for (let k = 0; k < a.length - 1; k++) for (let l = 0; l < b.length - 1; l++) if (intersects(a[k], a[k + 1], b[l], b[l + 1])) throw new Error("Rings must not intersect.");
      if (i > 0 && (inRing(a[0], b) || inRing(b[0], a))) throw new Error("Holes must be disjoint.");
    }
    if (i > 0 && !inRing(rings[i][0], rings[0])) throw new Error("Holes must be inside the outer ring.");
  }
  const polygon: Polygon = { type: "Polygon", coordinates: rings };
  if (polygonArea(polygon) <= 0) throw new Error("Polygon area must be positive.");
  return polygon;
}
export function drawingFrom(polygon: Polygon | null): Drawing {
  return polygon ? { rings: polygon.coordinates.map(ring => ring.slice(0, -1)), closed: polygon.coordinates.map(() => true), active: 0 } : { rings: [[]], closed: [false], active: 0 };
}
export function drawingPolygon(drawing: Drawing): Polygon {
  if (drawing.closed.some(closed => !closed)) throw new Error("Close each ring before saving.");
  return parsePolygon({ type: "Polygon", coordinates: drawing.rings.map(ring => [...ring, ring[0]]) });
}
export function changeDrawing(state: Drawing, action: DrawingAction): Drawing {
  const { active } = state;
  const ring = state.rings[active];
  if (action.type === "ring") return action.index >= 0 && action.index < state.rings.length ? { ...state, active: action.index } : state;
  if (action.type === "delete-hole") return active > 0 ? { rings: state.rings.filter((_, i) => i !== active), closed: state.closed.filter((_, i) => i !== active), active: 0 } : state;
  if (action.type === "hole") return state.closed.every(Boolean) && state.rings.reduce((n, r) => n + r.length + 1, 0) <= 996 ? { rings: [...state.rings, []], closed: [...state.closed, false], active: state.rings.length } : state;
  if (action.type === "close") return ring.length >= 3 && new Set(ring.map(p => p.join(","))).size === ring.length ? { ...state, closed: state.closed.map((v, i) => i === active ? true : v) } : state;
  if (action.type === "reopen") return { ...state, closed: state.closed.map((v, i) => i === active ? false : v) };
  if (action.type === "add" && (state.closed[active] || !validPosition(action.point) || ring.some(p => same(p, action.point)) || state.rings.reduce((n, r) => n + r.length + 1, 0) >= 1000)) return state;
  if (action.type === "move" && (!validPosition(action.point) || !ring[action.index])) return state;
  if (action.type === "delete" && !ring[action.index]) return state;
  const next = action.type === "add" ? [...ring, action.point] : action.type === "delete" ? ring.filter((_, i) => i !== action.index) : ring.map((p, i) => i === action.index ? action.point : p);
  return { ...state, rings: state.rings.map((r, i) => i === active ? next : r), closed: state.closed.map((v, i) => i === active && next.length < 3 ? false : v) };
}
export function editDraft(draft: PerimeterDraft, action: DrawingAction | { type: "undo" }): PerimeterDraft {
  if (draft.pending || draft.attempted) return draft;
  if (action.type === "undo") return draft.history.length ? { ...draft, drawing: draft.history[draft.history.length - 1], history: draft.history.slice(0, -1) } : draft;
  const drawing = changeDrawing(draft.drawing, action);
  return drawing === draft.drawing ? draft : { ...draft, drawing, history: [...draft.history.slice(-99), draft.drawing] };
}
