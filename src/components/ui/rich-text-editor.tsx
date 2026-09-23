import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Redo2, Undo2, Unlink } from "lucide-react";
import type { RichTextDocument } from "@/lib/rich-text";

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    hardBreak: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    trailingNode: false,
    link: {
      autolink: false,
      linkOnPaste: false,
      openOnClick: false,
      defaultProtocol: "https",
      isAllowedUri: value => {
        try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
        catch { return false; }
      },
    },
  }),
  Placeholder.configure({ placeholder: "Write the public report…" }),
];

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={active || undefined} disabled={disabled} onClick={onClick} className={`grid size-10 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-35 ${active ? "bg-primary text-white" : "text-forest hover:bg-secondary"}`}>{children}</button>;
}

export default function RichTextEditor({ value, disabled = false, onChange }: { value: RichTextDocument; disabled?: boolean; onChange: (value: RichTextDocument, textLength: number) => void }) {
  const editor = useEditor({
    extensions,
    content: value as JSONContent,
    editable: !disabled,
    immediatelyRender: true,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: instance }) => onChange(instance.getJSON() as RichTextDocument, instance.getText().length),
    editorProps: { attributes: { "aria-label": "Report body", "aria-required": "true" } },
  }, []);
  if (!editor) return null;
  const setLink = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const value = window.prompt("HTTPS link", current ?? "https://");
    if (value === null) return;
    if (!value.trim()) { editor.chain().focus().unsetLink().run(); return; }
    try {
      const url = new URL(value.trim());
      if (url.protocol !== "https:" || url.username || url.password) return;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.toString() }).run();
    } catch { return; }
  };
  return <div className="rich-text-editor overflow-hidden rounded-xl border border-input bg-white focus-within:ring-2 focus-within:ring-ring/30"><div role="toolbar" aria-label="Report formatting" className="flex flex-wrap items-center gap-1 border-b border-primary/10 bg-secondary/40 p-2"><ToolbarButton label="Paragraph" active={editor.isActive("paragraph")} disabled={disabled} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={17} aria-hidden="true" /></ToolbarButton><span aria-hidden="true" className="mx-1 h-6 w-px bg-primary/15" /><ToolbarButton label="Bold" active={editor.isActive("bold")} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Italic" active={editor.isActive("italic")} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Add or edit HTTPS link" active={editor.isActive("link")} disabled={disabled} onClick={setLink}><Link2 size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Remove link" disabled={disabled || !editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={17} aria-hidden="true" /></ToolbarButton><span aria-hidden="true" className="mx-1 h-6 w-px bg-primary/15" /><ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Ordered list" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Blockquote" active={editor.isActive("blockquote")} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={17} aria-hidden="true" /></ToolbarButton><span aria-hidden="true" className="mx-1 h-6 w-px bg-primary/15" /><ToolbarButton label="Undo" disabled={disabled || !editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} aria-hidden="true" /></ToolbarButton><ToolbarButton label="Redo" disabled={disabled || !editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} aria-hidden="true" /></ToolbarButton></div><EditorContent editor={editor} /></div>;
}
