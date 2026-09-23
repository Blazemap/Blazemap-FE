import type { ReactNode } from "react";

export type RichTextMark = { type: "bold" | "italic" } | { type: "link"; attrs: { href: string } };
export type RichTextNode = {
  type: "paragraph" | "heading" | "bulletList" | "orderedList" | "listItem" | "blockquote" | "text";
  attrs?: { level?: 2 | 3; start?: number };
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
};
export type RichTextDocument = { type: "doc"; content: RichTextNode[] };

export const emptyRichText: RichTextDocument = { type: "doc", content: [{ type: "paragraph" }] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseMark(value: unknown): RichTextMark | null {
  if (!isRecord(value)) return null;
  if (value.type === "bold" || value.type === "italic") return { type: value.type };
  if (value.type !== "link" || !isRecord(value.attrs) || typeof value.attrs.href !== "string") return null;
  try {
    const url = new URL(value.attrs.href);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { type: "link", attrs: { href: url.toString() } };
  } catch { return null; }
}

function parseNode(value: unknown, depth = 0): RichTextNode | null {
  if (!isRecord(value) || depth > 12 || typeof value.type !== "string") return null;
  if (value.type === "text") {
    if (typeof value.text !== "string" || !value.text.length) return null;
    const marks = value.marks === undefined ? [] : Array.isArray(value.marks) ? value.marks.map(parseMark) : [null];
    if (marks.some(mark => !mark)) return null;
    return { type: "text", text: value.text, ...(marks.length ? { marks: marks as RichTextMark[] } : {}) };
  }
  if (!["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote"].includes(value.type)) return null;
  const rawContent = value.content === undefined ? [] : Array.isArray(value.content) ? value.content : null;
  if (!rawContent) return null;
  const content = rawContent.map(child => parseNode(child, depth + 1));
  if (content.some(child => !child)) return null;
  if (value.type === "heading") {
    if (!isRecord(value.attrs) || value.attrs.level !== 2 && value.attrs.level !== 3) return null;
    return { type: "heading", attrs: { level: value.attrs.level }, ...(content.length ? { content: content as RichTextNode[] } : {}) };
  }
  if (value.type === "orderedList") {
    const start = isRecord(value.attrs) && typeof value.attrs.start === "number" && Number.isInteger(value.attrs.start) && value.attrs.start > 0 ? value.attrs.start : undefined;
    return { type: "orderedList", ...(start && start !== 1 ? { attrs: { start } } : {}), content: content as RichTextNode[] };
  }
  return { type: value.type as Exclude<RichTextNode["type"], "text" | "heading" | "orderedList">, ...(content.length ? { content: content as RichTextNode[] } : {}) };
}

export function parseRichText(value: unknown): RichTextDocument | null {
  if (!isRecord(value) || value.type !== "doc" || !Array.isArray(value.content)) return null;
  const content = value.content.map(node => parseNode(node));
  return content.some(node => !node) ? null : { type: "doc", content: content as RichTextNode[] };
}

function MarkedText({ node }: { node: RichTextNode }) {
  let content: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") content = <strong>{content}</strong>;
    else if (mark.type === "italic") content = <em>{content}</em>;
    else if (mark.type === "link") content = <a href={mark.attrs.href} target="_blank" rel="noreferrer noopener" className="font-bold text-primary underline">{content}</a>;
  }
  return content;
}

function RichNode({ node }: { node: RichTextNode }) {
  if (node.type === "text") return <MarkedText node={node} />;
  const children = node.content?.map((child, index) => <RichNode key={index} node={child} />);
  if (node.type === "paragraph") return <p>{children}</p>;
  if (node.type === "heading") return node.attrs?.level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
  if (node.type === "bulletList") return <ul>{children}</ul>;
  if (node.type === "orderedList") return <ol start={node.attrs?.start}>{children}</ol>;
  if (node.type === "listItem") return <li>{children}</li>;
  return <blockquote>{children}</blockquote>;
}

export function RichTextRenderer({ document, fallback }: { document: RichTextDocument | null; fallback?: string }) {
  if (!document) return fallback ? <p className="whitespace-pre-wrap">{fallback}</p> : null;
  return <div className="rich-text-content">{document.content.map((node, index) => <RichNode key={index} node={node} />)}</div>;
}
