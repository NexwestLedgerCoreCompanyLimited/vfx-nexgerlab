const IDLE_MS = 1000 / 15;
const ACTIVE_MS = 1000 / 30;
const TILE_W = 240;
const TILE_H = 200;

/** The art-pixel stage for a tile: an integer scale when the effect fits, a larger stage when it does not. */
export function tileLayout(w: number, h: number): { width: number; height: number; scale: number } {
  if (w <= TILE_W / 2 && h <= TILE_H / 2)
    return { width: TILE_W / 2, height: TILE_H / 2, scale: 2 };
  if (w <= TILE_W && h <= TILE_H) return { width: TILE_W, height: TILE_H, scale: 1 };
  const k = Math.max(w / TILE_W, h / TILE_H);
  const width = Math.ceil(TILE_W * k);
  return { width, height: Math.round((width * TILE_H) / TILE_W), scale: TILE_W / width };
}

export function createTileScheduler({ maxActive }: { maxActive: number }) {
  const visible = new Set<string>();
  const hovered = new Set<string>();
  const last = new Map<string, number>();
  let reduced = false;

  return {
    setVisible(id: string, on: boolean) {
      if (on) visible.add(id);
      else visible.delete(id);
    },
    setHover(id: string, on: boolean) {
      if (on) hovered.add(id);
      else hovered.delete(id);
    },
    setReduced(on: boolean) {
      reduced = on;
    },
    /** Which tiles should step now. Hovered tiles always run; visible ones share the rest of the cap. */
    due(now: number): string[] {
      const active = [...hovered].filter((id) => visible.has(id));
      if (!reduced) {
        for (const id of visible) {
          if (active.length >= maxActive) break;
          if (!active.includes(id)) active.push(id);
        }
      }
      return active.filter((id) => {
        const wait = hovered.has(id) ? ACTIVE_MS : IDLE_MS;
        const seen = last.get(id);
        if (seen !== undefined && now - seen < wait - 0.5) return false;
        last.set(id, now);
        return true;
      });
    },
  };
}
