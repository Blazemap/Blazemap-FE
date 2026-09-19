export type Place = { name: string; label: string; latitude: number; longitude: number; bbox: [number, number, number, number] | null };
export function parsePlaces(value: unknown): Place[] {
  if (!Array.isArray(value) || value.length > 5) throw new Error('Invalid place results');
  return value.map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid place');
    const p = raw as Record<string, unknown>;
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 200 || typeof p.label !== 'string' || p.label.length > 650 || typeof p.latitude !== 'number' || !Number.isFinite(p.latitude) || p.latitude < -12 || p.latitude > 7 || typeof p.longitude !== 'number' || !Number.isFinite(p.longitude) || p.longitude < 94 || p.longitude > 142) throw new Error('Invalid place');
    const b = p.bbox;
    if (b !== null && (!Array.isArray(b) || b.length !== 4 || b.some(n => typeof n !== 'number' || !Number.isFinite(n)) || b[0] < 94 || b[2] > 142 || b[1] < -12 || b[3] > 7 || b[0] >= b[2] || b[1] >= b[3] || p.longitude < b[0] || p.longitude > b[2] || p.latitude < b[1] || p.latitude > b[3])) throw new Error('Invalid place bounds');
    return { name: p.name, label: p.label, latitude: p.latitude, longitude: p.longitude, bbox: b as Place['bbox'] };
  });
}
