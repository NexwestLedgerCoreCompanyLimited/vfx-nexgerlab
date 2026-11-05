import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RenderOptions } from '../../../../engine/render-types';
import { paintFrame } from '../../engine/canvas-renderer';
import { renderClient } from '../../engine/client';
import { useEditor } from '../editor/use-editor-store';
import { ActLane } from './act-lane';

const STRIP = 10;
const STRIP_DELAY_MS = 300;

function Filmstrip({ options }: { options: RenderOptions }) {
  const project = useEditor((s) => s.project);
  const refs = useRef<Array<HTMLCanvasElement | null>>([]);
  useEffect(() => {
    if (!project) return;
    let live = true;
    const timer = setTimeout(async () => {
      for (let i = 0; i < STRIP && live; i++) {
        const frame = Math.floor((i * project.timeline.frames) / STRIP);
        const result = await renderClient().render(project, frame, options);
        const canvas = refs.current[i];
        if (live && result && canvas) paintFrame(canvas, result.frame);
      }
    }, STRIP_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [project, options]);
  return (
    <div className="strip" aria-hidden="true">
      {Array.from({ length: STRIP }, (_, i) => (
        <canvas
          key={i}
          className="px"
          ref={(el) => {
            refs.current[i] = el;
          }}
        />
      ))}
    </div>
  );
}

export function TimelinePanel({ options }: { options: RenderOptions }) {
  const { t } = useTranslation('timeline');
  const { t: te } = useTranslation('editor');
  const { project, currentFrame, playback, setPlayback, setFrame, selectedLayerId, dispatch } =
    useEditor();
  if (!project) return null;
  const { frames, fps, loop } = project.timeline;
  const seconds = frames / fps;
  const layer = project.layers.find((l) => l.id === selectedLayerId);
  const ticks = Array.from({ length: 10 }, (_, i) => ((i * seconds) / 10).toFixed(1));
  const pct = frames > 1 ? (currentFrame / (frames - 1)) * 100 : 0;
  return (
    <section className="timeline" aria-label={t('transport')}>
      <div className="row tl-bar">
        <button
          className="ibtn"
          type="button"
          aria-label={t('previous')}
          onClick={() => setFrame(currentFrame - 1)}
        >
          ‹
        </button>
        <button
          className="btn pri"
          type="button"
          onClick={() => {
            if (playback !== 'playing' && currentFrame >= frames - 1) setFrame(0);
            setPlayback(playback === 'playing' ? 'stopped' : 'playing');
          }}
        >
          {playback === 'playing' ? te('pause') : te('play')}
        </button>
        <button
          className="ibtn"
          type="button"
          aria-label={t('next')}
          onClick={() => setFrame(currentFrame + 1)}
        >
          ›
        </button>
        <button
          className="chip"
          type="button"
          aria-pressed={loop}
          onClick={() => dispatch({ type: 'set-timeline', patch: { loop: !loop } })}
        >
          {t('loop')}
        </button>
        <span className="mono small">
          {t('position', { time: (currentFrame / fps).toFixed(2), total: seconds.toFixed(2) })}
        </span>
        <span className="mono small muted">{t('frame', { frame: currentFrame, fps })}</span>
      </div>
      <div className="tl-grid">
        <span />
        <div className="tl-ruler mono" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <span className="small">{t('act')}</span>
        {layer ? <ActLane layer={layer} seconds={seconds} /> : <span />}
        <span className="small">{t('frames')}</span>
        <Filmstrip options={options} />
        <span />
        <input
          aria-label={t('scrub')}
          className="tl-scrub"
          type="range"
          min={0}
          max={frames - 1}
          value={currentFrame}
          onChange={(e) => {
            setPlayback('stopped');
            setFrame(Number(e.target.value));
          }}
        />
        <div
          className="playhead"
          aria-hidden="true"
          style={{ left: `calc(var(--tl-label) + (100% - var(--tl-label) - 12px) * ${pct / 100})` }}
        />
      </div>
    </section>
  );
}
