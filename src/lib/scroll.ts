export function resolveAnchor(hash: string, root: Pick<Document, "getElementById"> = document): HTMLElement | null {
  const index = hash.indexOf("#");
  if (index === -1 || index === hash.length - 1) return null;

  let id: string;
  try {
    id = decodeURIComponent(hash.slice(index + 1));
  } catch {
    return null;
  }
  return root.getElementById(id);
}
