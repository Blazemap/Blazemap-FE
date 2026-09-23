import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Toast } from "radix-ui";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastTone = "success" | "error";
type ToastMessage = { id: string; title: string; description?: string; tone: ToastTone };
type ToastListener = (message: ToastMessage) => void;

const listeners = new Set<ToastListener>();
const ToastContext = createContext<(message: Omit<ToastMessage, "id">) => void>(() => undefined);

export function notifyToast(message: Omit<ToastMessage, "id">) {
  const value = { ...message, id: crypto.randomUUID() };
  listeners.forEach(listener => listener(value));
}

export function safeMutationError() {
  return "We couldn't save your change. Review the form and try again.";
}

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const show = useCallback((message: Omit<ToastMessage, "id">) => notifyToast(message), []);
  useEffect(() => {
    const listener: ToastListener = message => setMessages(current => [...current.slice(-3), message]);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  const context = useMemo(() => show, [show]);
  return <ToastContext.Provider value={context}><Toast.Provider label="Notification" duration={5000} swipeDirection="right">{children}{messages.map(message => {
    const Icon = message.tone === "success" ? CheckCircle2 : CircleAlert;
    return <Toast.Root key={message.id} role={message.tone === "error" ? "alert" : "status"} type={message.tone === "error" ? "foreground" : "background"} onOpenChange={open => { if (!open) setMessages(current => current.filter(item => item.id !== message.id)); }} className={`grid w-[min(380px,calc(100vw-32px))] grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border bg-white p-4 text-forest shadow-xl data-[state=open]:animate-[toast-in_.18s_ease-out] data-[state=closed]:animate-[toast-out_.14s_ease-in] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:animate-[toast-swipe-out_.12s_ease-out] ${message.tone === "error" ? "border-red-200" : "border-emerald-200"}`}><Icon size={19} aria-hidden="true" className={message.tone === "error" ? "text-red-700" : "text-emerald-700"} /><span className="min-w-0"><Toast.Title className="text-sm font-extrabold">{message.title}</Toast.Title>{message.description && <Toast.Description className="mt-1 text-xs leading-5 text-muted-foreground">{message.description}</Toast.Description>}</span><Toast.Close aria-label="Dismiss notification" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-forest"><X size={15} aria-hidden="true" /></Toast.Close></Toast.Root>;
  })}<Toast.Viewport label="Notifications ({hotkey})" className="fixed bottom-4 right-4 z-[120] m-0 flex max-h-[calc(100dvh-32px)] list-none flex-col gap-2 p-0 outline-none" /></Toast.Provider></ToastContext.Provider>;
}
