import { useId } from "react";
import { validatePhoto } from "@/lib/reports";

type EvidenceUploadProps = {
  count: number;
  disabled: boolean;
  error: string;
  onFiles: (files: File[]) => void;
  onError: (error: string) => void;
};

export function EvidenceUpload({ count, disabled, error, onFiles, onError }: EvidenceUploadProps) {
  const id = useId();
  const locked = disabled || count >= 5;
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-bold">Evidence photos (optional, up to 5)</label>
    <div className={`relative flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/50 bg-secondary/30 p-5 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${locked ? "opacity-60" : "hover:bg-secondary/60"}`}>
      <span className="text-center text-sm font-bold text-primary">{count >= 5 ? "5 photos selected" : "Click to upload photos"}</span>
      <input id={id} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={locked} aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} aria-invalid={!!error} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" onChange={event => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (locked || !files.length) return;
        const invalid = files.map(validatePhoto).find(Boolean);
        if (invalid || count + files.length > 5) { onError(invalid || "Choose up to five photos in total."); return; }
        onError("");
        onFiles(files);
      }} />
    </div>
    <p id={`${id}-help`} className="text-xs text-muted-foreground">JPEG, PNG or WebP with a matching filename · 1 byte–5 MiB each · Up to 5 photos total.</p>
    <p role="status" className="text-xs text-muted-foreground">{count} of 5 selected{count >= 5 ? ". Remove a photo to choose another." : ""}</p>
    {error && <p id={`${id}-error`} role="alert" className="text-sm">{error}</p>}
  </div>;
}
