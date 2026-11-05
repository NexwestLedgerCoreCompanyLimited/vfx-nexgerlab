import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { savePreset } from '../../../../engine/presets';
import type { BackdropKind } from '../../../../engine/render-types';
import { PreviewCanvas, fitZoom, usePlayback } from '../canvas/preview-canvas';
import { useEditor } from '../editor/use-editor-store';
import {
  BasicControls,
  EffectOptions,
  PalettePicker,
  entryFor,
} from '../inspector/option-controls';

const RATES = [0.25, 0.5, 1];
const BACKDROPS: Array<BackdropKind | 'none'> = ['dark', 'ground', 'sky', 'light', 'none'];
const STAGE_W = 840;
const STAGE_H = 680;

export function QuickLook() {
  const { t } = useTranslation('editor');
  const { project, currentFrame, playback, setPlayback, go, replaceProject } = useEditor();
  const layer = project?.layers[0];
  const entry = layer && entryFor(layer.effectId);
  const [rate, setRate] = useState(1);
  const [backdrop, setBackdrop] = useState<BackdropKind | 'none' | undefined>(undefined);
  usePlayback(rate, true);

  const options = useMemo(() => {
    const kind = backdrop ?? (entry?.meta.bg as BackdropKind);
    return {
      partFilter: 'whole' as const,
      includeStage: true,
      ...(kind !== 'none' ? { backdrop: kind } : {}),
    };
  }, [backdrop, entry]);

  if (!project || !layer || !entry) return null;
  const { meta } = entry;
  const kindNow = backdrop ?? meta.bg;
  const zoom = fitZoom(project.canvas.width, project.canvas.height, STAGE_W, STAGE_H);
  const playing = playback === 'playing';
  const name = project.name;

  return (
    <div className="screen">
      <header className="bar">
        <button className="btn" type="button" onClick={() => go('home')}>
          ‹ {t('back')}
        </button>
        <span className="mono small muted">{entry.id}</span>
        <span className="sp" />
        <button
          className="btn"
          type="button"
          onClick={() => replaceProject(savePreset(project, { name, tags: meta.tags }))}
        >
          {t('saveEffect')}
        </button>
      </header>
      <div className="look">
        <div className={`look-stage${kindNow === 'none' ? ' ck' : ''}`}>
          <PreviewCanvas
            project={project}
            frame={currentFrame}
            options={options}
            zoom={zoom}
            label={name}
          />
          <div className="row look-bar">
            <button
              className="btn"
              type="button"
              onClick={() => setPlayback(playing ? 'stopped' : 'playing')}
            >
              {playing ? t('pause') : t('play')}
            </button>
            <div className="seg" role="group" aria-label={t('speed')}>
              {RATES.map((r) => (
                <button
                  key={r}
                  className="chip"
                  type="button"
                  aria-pressed={rate === r}
                  onClick={() => setRate(r)}
                >
                  {r}×
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label={t('backdrop')}>
              {BACKDROPS.map((b) => (
                <button
                  key={b}
                  className="chip"
                  type="button"
                  aria-pressed={kindNow === b}
                  onClick={() => setBackdrop(b)}
                >
                  {t(`backdrops.${b}`)}
                </button>
              ))}
            </div>
            <span className="sp" />
            <span className="mono small muted">{t('zoom', { value: zoom })}</span>
          </div>
        </div>
        <aside className="look-side">
          <div className="stack tight">
            <h1>{name}</h1>
            <p className="muted">{meta.desc}</p>
            <p className="mono small muted">
              {t('facts', {
                kind: meta.loop ? t('loop') : t('once'),
                seconds: +meta.duration.toFixed(2),
                frames: Math.round(meta.duration * meta.fps),
                fps: meta.fps,
                w: meta.size[0],
                h: meta.size[1],
              })}
            </p>
          </div>
          {entry.palettes ? (
            <PalettePicker layer={layer} />
          ) : (
            <p className="muted small">{t('noPalette')}</p>
          )}
          <EffectOptions layer={layer} />
          <BasicControls layer={layer} />
          <span className="sp" />
          <button className="btn pri big" type="button" onClick={() => go('studio')}>
            {t('openStudio')}
          </button>
          <button className="btn big" type="button" onClick={() => go('export')}>
            {t('exportNow')}
          </button>
        </aside>
      </div>
    </div>
  );
}
