import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { boundPanel } from "@/lib/dashboard";

export default function MapPanel({ title, count, open, desktop, side = "right", onClose, children, keepMounted = false, disabled = false, drawing = false }: { title: string; count?: string; open: boolean; desktop: boolean; side?: "left" | "center" | "right"; onClose: () => void; children: ReactNode; keepMounted?: boolean; disabled?: boolean; drawing?: boolean }) {
  const panel = useRef<HTMLElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState(() => boundPanel({ x: side === "left" ? 24 : side === "center" ? Math.max(48, (window.innerWidth - 420) / 2) : window.innerWidth - 444, y: 96, width: side === "left" ? 380 : 420, height: window.innerHeight - 120 }, { width: window.innerWidth, height: window.innerHeight }));
  const [height, setHeight] = useState(68);
  const gesture = useRef<{ x: number; y: number; box: typeof box; height: number; resize: boolean } | null>(null);
  function adjust(next: typeof box) { setBox(boundPanel(next, { width: window.innerWidth, height: window.innerHeight })); }
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!desktop) handle.current?.focus();
    return () => { if (opener.current?.isConnected && opener.current.getClientRects().length) opener.current.focus(); };
  }, [open, desktop]);
  useEffect(() => {
    const element = panel.current;
    if (!element || !open || !desktop) return;
    const constrain = () => setBox(current => boundPanel({ ...current, width: element.offsetWidth || current.width, height: element.offsetHeight || current.height }, { width: window.innerWidth, height: window.innerHeight }));
    const observer = new ResizeObserver(constrain);
    observer.observe(element);
    window.addEventListener("resize", constrain);
    return () => { observer.disconnect(); window.removeEventListener("resize", constrain); };
  }, [open, desktop]);
  function start(event: PointerEvent<HTMLButtonElement>, resize = false) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { x: event.clientX, y: event.clientY, box, height, resize };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const initial = gesture.current;
    if (!initial || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const x = event.clientX - initial.x, y = event.clientY - initial.y;
    if (!desktop) setHeight(Math.max(34, Math.min(86, initial.height - y / window.innerHeight * 100)));
    else adjust(initial.resize ? { ...initial.box, width: initial.box.width + x, height: initial.box.height + y } : { ...initial.box, x: initial.box.x + x, y: initial.box.y + y });
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, resize = false) {
    const x = event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0;
    const y = event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0;
    if (!x && !y) return;
    event.preventDefault();
    if (!desktop) setHeight(value => Math.max(34, Math.min(86, value - y / 4)));
    else adjust(resize ? { ...box, width: box.width + x, height: box.height + y } : { ...box, x: box.x + x, y: box.y + y });
  }
  const end = () => { gesture.current = null; };
  if (!open && !keepMounted) return null;
  return <aside ref={panel} aria-label={title} data-map-panel={side} hidden={!open} inert={!open} onKeyDown={event => { if (event.key === "Escape" && !disabled) { event.stopPropagation(); onClose(); } }} style={{ display: open ? "flex" : "none", ...(desktop ? { left: box.x, top: box.y, width: box.width, height: box.height } : { height: `${drawing ? Math.min(height, 38) : height}dvh` }) }} className={`absolute z-40 flex-col overflow-hidden border border-primary/10 bg-white text-forest shadow-2xl ${desktop ? "resize rounded-sm" : "inset-x-0 bottom-0 rounded-t-2xl"}`}>
    <header className="flex shrink-0 items-center gap-3 border-b border-primary/10 bg-white px-5 py-3">
      <h2 className="min-w-0 flex-1"><button ref={handle} type="button" aria-label={`${title}. ${desktop ? "Move panel using arrow keys or drag" : "Resize sheet using up and down arrow keys or drag"}`} onPointerDown={event => start(event)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={event => keyboard(event)} className="min-h-11 w-full touch-none cursor-move text-left focus-visible:outline-2 focus-visible:outline-primary"><span className="block text-lg font-extrabold">{title}</span>{count && <span className="mt-1 block text-xs font-normal text-muted-foreground">{count}</span>}</button></h2>
      <button type="button" disabled={disabled} onClick={onClose} aria-label={`Close ${title}`} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-secondary disabled:opacity-50"><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    {desktop && <button type="button" aria-label={`Resize ${title} using arrow keys or drag`} onPointerDown={event => start(event, true)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={event => keyboard(event, true)} className="absolute bottom-0 right-0 size-6 touch-none cursor-nwse-resize focus-visible:outline-2 focus-visible:outline-primary"><span aria-hidden="true">◢</span></button>}
  </aside>;
}
