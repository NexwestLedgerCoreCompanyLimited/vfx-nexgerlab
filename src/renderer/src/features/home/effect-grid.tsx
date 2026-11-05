import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { EffectEntry } from '../../../../engine/effect-registry';
import type { GalleryMessage } from './gallery.worker';
import { tileLayout } from './tile-scheduler';

let worker: Worker | undefined;

function send(message: GalleryMessage, transfer: Transferable[] = []): void {
  worker ??= new Worker(new URL('./gallery.worker.ts', import.meta.url), { type: 'module' });
  worker.postMessage(message, transfer);
}

export function setGalleryReduced(on: boolean): void {
  send({ type: 'reduced', on });
}

export function effectName(t: (key: string, o: object) => string, e: EffectEntry): string {
  return t(`effects:items.${e.id}.name`, {
    defaultValue: e.meta.name,
    keySeparator: '.',
    nsSeparator: ':',
  });
}

const Tile = memo(function Tile({
  entry,
  onOpen,
}: {
  entry: EffectEntry;
  onOpen(e: EffectEntry): void;
}) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const { id, meta } = entry;

  useEffect(() => {
    const el = canvas.current!;
    const observer = new IntersectionObserver(
      ([item]) => {
        const on = Boolean(item?.isIntersecting);
        // a canvas hands over only once; a remounted tile brings a new canvas
        if (on && !el.dataset.moved) {
          el.dataset.moved = 'true';
          const off = el.transferControlToOffscreen();
          send({ type: 'tile', id, canvas: off }, [off]);
        }
        send({ type: 'visible', id, on });
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      send({ type: 'visible', id, on: false });
    };
  }, [id]);

  const hover = (on: boolean) => send({ type: 'hover', id, on });
  const name = effectName(t as never, entry);
  const [w, h] = meta.size as [number, number];
  return (
    <button
      type="button"
      className="tile"
      onClick={() => onOpen(entry)}
      onPointerEnter={() => hover(true)}
      onPointerLeave={() => hover(false)}
      onFocus={() => hover(true)}
      onBlur={() => hover(false)}
    >
      <canvas
        ref={canvas}
        className={tileLayout(w, h).scale >= 1 ? 'px' : undefined}
        aria-hidden="true"
      />
      <span className="cap">
        <b>{name}</b>
        <span>
          {meta.loop ? t('home.loop') : t('home.seconds', { value: +meta.duration.toFixed(2) })}
        </span>
      </span>
    </button>
  );
});

export function EffectGrid({
  entries,
  onOpen,
}: {
  entries: EffectEntry[];
  onOpen(e: EffectEntry): void;
}) {
  return (
    <div className="grid">
      {entries.map((entry) => (
        <Tile key={entry.id} entry={entry} onOpen={onOpen} />
      ))}
    </div>
  );
}
