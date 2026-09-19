import { useCallback, useEffect, useRef } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { AlertDialog } from "radix-ui";
import { Button } from "@/components/ui";

export function DraftGuard({ dirty, pending = false, dashboard = false }: { dirty: boolean; pending?: boolean; dashboard?: boolean }) {
  const loggedOut = useRef(false);
  useEffect(() => {
    const approve = (event: Event) => {
      if (pending || (dirty && !window.confirm("Leave without saving? Your unsaved input and selected photos will be lost if logout succeeds."))) event.preventDefault();
    };
    const complete = () => { loggedOut.current = true; };
    window.addEventListener("draft-before-logout", approve);
    window.addEventListener("draft-logout-complete", complete);
    return () => { window.removeEventListener("draft-before-logout", approve); window.removeEventListener("draft-logout-complete", complete); };
  }, [dirty, pending]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !loggedOut.current && (pending || (dirty && !(dashboard && ["/dashboard", "/monitoring"].includes(currentLocation.pathname) && nextLocation.pathname === currentLocation.pathname && new URLSearchParams(currentLocation.search).get("view") === new URLSearchParams(nextLocation.search).get("view")))));
  useBeforeUnload(useCallback((event) => { if (dirty || pending) { event.preventDefault(); event.returnValue = ""; } }, [dirty, pending]));
  return <AlertDialog.Root open={blocker.state === "blocked"} onOpenChange={open => { if (!open && blocker.state === "blocked") blocker.reset(); }}><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-80 bg-forest/40" /><AlertDialog.Content className="fixed left-1/2 top-1/2 z-90 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"><AlertDialog.Title className="text-xl font-extrabold">{pending ? "Submission in progress" : "Leave without saving?"}</AlertDialog.Title><AlertDialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">{pending ? "Wait for the server response before leaving. A request may already have been received." : "Your unsaved input and selected photos will be lost. Nothing is stored on this device after you leave."}</AlertDialog.Description><div className="mt-6 flex justify-end gap-3"><AlertDialog.Cancel asChild><Button variant="outline" onClick={() => blocker.state === "blocked" && blocker.reset()}>Stay</Button></AlertDialog.Cancel><Button disabled={pending} onClick={() => blocker.state === "blocked" && blocker.proceed()}>Leave</Button></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>;
}
