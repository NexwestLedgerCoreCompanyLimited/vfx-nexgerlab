import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateSheetLayout, packSheet } from '../../../../engine/exporters/spritesheet';
import { buildExportMetadata } from '../../../../engine/exporters/metadata';
import { resolveDirectionProject } from '../../../../engine/directions';
import { generateNormalMap } from '../../../../engine/normal-map';
import { paintFrame } from '../../engine/canvas-renderer';
import { renderClient } from '../../engine/client';
import { useEditor } from '../editor/use-editor-store';
import { NormalControls } from '../normals/normal-preview';
import {
  ExportTooLargeError,
  exportSize,
  renderDirection,
  runExport,
  type ExportFormat,
  type ExportSettings,
} from './export-service';

const FORMATS: ExportFormat[] = ['spritesheet-json', 'gif', 'apng', 'png-sequence', 'game-pack'];
const COUNTS = [1, 4, 8, 16] as const;
const PREVIEW_DELAY_MS = 250;

export function ExportScreen() {
  const { t } = useTranslation('export');
  const { t: te } = useTranslation('editor');
  const { project, go, handle } = useEditor();
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'spritesheet-json',
    directions: 1,
    split: false,
    includeAct: true,
    normal: false,
    normalStrength: 2,
    name: project?.name ?? 'effect',
  });
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string }>();
  const abort = useRef<AbortController>(undefined);
  const preview = useRef<HTMLCanvasElement>(null);
  const change = (patch: Partial<ExportSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const size = useMemo(() => project && exportSize(project, settings), [project, settings]);
  const layout = useMemo(
    () =>
      size &&
      calculateSheetLayout({
        frameWidth: size.width,
        frameHeight: size.height,
        frames: size.frames,
        directions: size.order,
      }),
    [size],
  );
  const json = useMemo(() => {
    if (!project || !layout) return '';
    const data = buildExportMetadata({
      project,
      layout,
      image: `${settings.name}.png`,
      includeAct: settings.includeAct,
    });
    const { schemaVersion: _v, source: _s, layers: _l, ...shown } = data.meta.vfxlab;
    return JSON.stringify(
      {
        frame: data.frames[1]?.frame ?? data.frames[0]?.frame,
        duration: data.frames[0]?.duration,
        meta: shown,
      },
      null,
      2,
    );
  }, [project, layout, settings.name, settings.includeAct]);

  useEffect(() => {
    if (!project || !size || !layout) return;
    const stop = new AbortController();
    const timer = setTimeout(async () => {
      const frames = [];
      for (const direction of size.order) {
        const view = resolveDirectionProject(project, direction, settings.directions);
        frames.push(
          ...(await renderDirection(
            renderClient(),
            view,
            size.frames,
            { partFilter: 'whole', includeStage: false },
            stop.signal,
            () => {},
          )),
        );
      }
      if (stop.signal.aborted || !preview.current) return;
      const shown = settings.normal
        ? frames.map((f) => generateNormalMap(f, { strength: settings.normalStrength }))
        : frames;
      paintFrame(preview.current, packSheet(layout, shown));
    }, PREVIEW_DELAY_MS);
    return () => {
      stop.abort();
      clearTimeout(timer);
    };
  }, [project, size, layout, settings.directions, settings.normal, settings.normalStrength]);

  if (!project || !size || !layout) return null;

  async function start() {
    setMessage(undefined);
    abort.current = new AbortController();
    setProgress({ done: 0, total: 1 });
    try {
      const result = await runExport(
        renderClient(),
        project!,
        settings,
        (done, total) => setProgress({ done, total }),
        abort.current.signal,
        (files) => window.confirm(t('overwrite', { count: files.length })),
      );
      if (result.status === 'done')
        setMessage({ kind: 'ok', text: t('done', { count: result.files.length }) });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof ExportTooLargeError ? t('tooLarge') : t('failed'),
      });
    } finally {
      setProgress(undefined);
    }
  }

  return (
    <div className="screen">
      <header className="bar">
        <button className="btn" type="button" onClick={() => go(handle ? 'studio' : 'quick-look')}>
          ‹ {t('backToEdit')}
        </button>
        <h1 className="bar-title">{t('title', { name: project.name })}</h1>
        <span className="sp" />
        <span className="muted small">{t('note')}</span>
      </header>
      <div className="export">
        <aside className="side">
          <div className="stack tight">
            <span className="sect">{t('format')}</span>
            {FORMATS.map((f) => (
              <button
                key={f}
                className="fmt"
                type="button"
                aria-pressed={settings.format === f}
                onClick={() => change({ format: f })}
              >
                {t(`formats.${f}.name`)}
                <small>{t(`formats.${f}.body`)}</small>
              </button>
            ))}
          </div>
          <div className="stack tight">
            <span className="sect">{t('directions')}</span>
            <div className="seg full" role="group" aria-label={t('directions')}>
              {COUNTS.map((n) => (
                <button
                  key={n}
                  className="chip"
                  type="button"
                  aria-pressed={settings.directions === n}
                  onClick={() => change({ directions: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="stack tight">
            <span className="sect">{t('include')}</span>
            <div className="row wrap">
              <button
                className="chip"
                type="button"
                aria-pressed={settings.split}
                onClick={() => change({ split: !settings.split })}
              >
                {t('split')}
              </button>
              <button
                className="chip"
                type="button"
                aria-pressed={settings.includeAct}
                onClick={() => change({ includeAct: !settings.includeAct })}
              >
                {t('act')}
              </button>
            </div>
            <NormalControls
              enabled={settings.normal}
              strength={settings.normalStrength}
              onToggle={() => change({ normal: !settings.normal })}
              onStrength={(normalStrength) => change({ normalStrength })}
            />
          </div>
        </aside>
        <section className="export-mid">
          <div className="row between-row">
            <span className="sect">{t('preview')}</span>
            <span className="mono small muted">
              {t('size', {
                frames: size.frames,
                columns: layout.columns,
                width: layout.width,
                height: layout.height,
              })}
            </span>
          </div>
          <div className="ck export-stage">
            <canvas ref={preview} className="px" role="img" aria-label={t('preview')} />
          </div>
        </section>
        <aside className="side right">
          <span className="sect">{t('json')}</span>
          <pre className="panel json">{json}</pre>
          <p className="muted small">{t('engineNote')}</p>
          <span className="sp" />
          <label className="label" htmlFor="export-name">
            {t('fileName')}
          </label>
          <input
            id="export-name"
            className="input mono"
            maxLength={120}
            value={settings.name}
            onChange={(e) => change({ name: e.target.value })}
          />
          {message && (
            <p className={message.kind === 'ok' ? 'tag ok' : 'warn small'} role="status">
              {message.text}
            </p>
          )}
          {progress ? (
            <>
              <progress max={progress.total} value={progress.done} aria-label={t('progress')} />
              <button className="btn big" type="button" onClick={() => abort.current?.abort()}>
                {te('cancel')}
              </button>
            </>
          ) : (
            <button className="btn pri big" type="button" onClick={() => void start()}>
              {t('run')}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
