import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import logoUrl from '../../assets/logo.png';
import { SPLASH_TIMING, STATIC_FRAME, drawSplash, nextSplashTime } from './splash-effect';

const STILL_HOLD_MS = 600;

interface Props {
  start: number;
  ready: boolean;
  progress: number;
  status: string;
  onDone(): void;
}

export function SplashScreen({ start, ready, progress, status, onDone }: Props) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ ready, progress, status });
  live.current = { ready, progress, status };
  const still = start === STATIC_FRAME;

  useEffect(() => {
    canvas.current?.focus();
    const ctx = canvas.current!.getContext('2d')!;
    const logo = new Image();
    let raf = 0;
    let stop = false;
    let hold: ReturnType<typeof setTimeout> | undefined;
    logo.src = logoUrl;
    void logo.decode().then(() => {
      if (stop) return;
      if (still) {
        drawSplash(ctx, logo, STATIC_FRAME, live.current);
        const wait = () => {
          if (stop) return;
          if (live.current.ready) onDone();
          else hold = setTimeout(wait, 50);
        };
        hold = setTimeout(wait, STILL_HOLD_MS);
        return;
      }
      let t = start;
      let last = performance.now();
      const tick = (now: number) => {
        t = nextSplashTime(t, now - last, live.current.ready);
        last = now;
        drawSplash(ctx, logo, t, live.current);
        if (t >= SPLASH_TIMING.end) onDone();
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      clearTimeout(hold);
    };
  }, [start, still, onDone]);

  return (
    <div className="splash">
      <canvas
        ref={canvas}
        width={1280}
        height={720}
        tabIndex={0}
        role="img"
        aria-label={t('splash.label')}
        data-static={still}
        onClick={onDone}
        onKeyDown={onDone}
      />
    </div>
  );
}
