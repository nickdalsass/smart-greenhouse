import { useRef } from "react";

const DRAG_PX = 6;

type Ptr = {
  stopPropagation: () => void;
  clientX?: number;
  clientY?: number;
  nativeEvent?: { clientX: number; clientY: number };
};

function clientXY(e: Ptr) {
  return {
    x: e.nativeEvent?.clientX ?? e.clientX ?? 0,
    y: e.nativeEvent?.clientY ?? e.clientY ?? 0,
  };
}

/**
 * OrbitControls fires a synthetic click when you drag and release.
 * Only run `onClick` when the pointer barely moved.
 */
export function useSolidClick(onClick: () => void) {
  const origin = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (e: Ptr) => {
      origin.current = clientXY(e);
    },
    onPointerUp: (e: Ptr) => {
      const o = origin.current;
      origin.current = null;
      if (!o) return;
      const { x, y } = clientXY(e);
      const dx = x - o.x;
      const dy = y - o.y;
      if (dx * dx + dy * dy > DRAG_PX * DRAG_PX) return;
      e.stopPropagation();
      onClick();
    },
    onPointerOver: (e: Ptr) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
      origin.current = null;
    },
  };
}
