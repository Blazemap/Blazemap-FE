import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type MobileSheetResizeOptions = {
  enabled?: boolean;
  resetWhen?: boolean;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  snapPoints?: number[];
  closeHeight?: number;
  closeVelocity?: number;
  onClose?: () => void;
};

export function useMobileSheetResize({
  enabled = true,
  resetWhen = false,
  initialHeight = 72,
  minHeight = 44,
  maxHeight = 92,
  snapPoints,
  closeHeight,
  closeVelocity = 0.65,
  onClose,
}: MobileSheetResizeOptions = {}) {
  const [height, setHeight] = useState(initialHeight);
  const state = useRef<{ startY: number; startHeight: number; lastY: number; lastTime: number; velocityY: number } | null>(null);
  const resizeMovedRef = useRef(false);
  const latestHeight = useRef(initialHeight);

  useEffect(() => { latestHeight.current = height; }, [height]);
  useEffect(() => {
    if (!resetWhen) return;
    const frame = window.requestAnimationFrame(() => setHeight(initialHeight));
    return () => window.cancelAnimationFrame(frame);
  }, [initialHeight, resetWhen]);

  const startResize = useCallback((event: ReactPointerEvent) => {
    if (!enabled || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    resizeMovedRef.current = false;
    state.current = { startY: event.clientY, startHeight: height, lastY: event.clientY, lastTime: performance.now(), velocityY: 0 };

    const handleMove = (moveEvent: PointerEvent) => {
      const current = state.current;
      if (!current) return;
      moveEvent.preventDefault();
      const deltaY = current.startY - moveEvent.clientY;
      if (Math.abs(deltaY) > 2) resizeMovedRef.current = true;
      const now = performance.now();
      current.velocityY = (moveEvent.clientY - current.lastY) / Math.max(1, now - current.lastTime);
      current.lastY = moveEvent.clientY;
      current.lastTime = now;
      setHeight(Math.min(maxHeight, Math.max(minHeight, current.startHeight + deltaY / window.innerHeight * 100)));
    };

    const handleEnd = () => {
      const current = state.current;
      const currentHeight = latestHeight.current;
      state.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      if (current && onClose && closeHeight !== undefined && (currentHeight <= closeHeight || (current.velocityY > closeVelocity && currentHeight < initialHeight))) {
        onClose();
        return;
      }
      if (snapPoints?.length) setHeight(snapPoints.reduce((nearest, point) => Math.abs(point - currentHeight) < Math.abs(nearest - currentHeight) ? point : nearest));
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  }, [closeHeight, closeVelocity, enabled, height, initialHeight, maxHeight, minHeight, onClose, snapPoints]);

  return { height, resizeMovedRef, setHeight, startResize };
}
