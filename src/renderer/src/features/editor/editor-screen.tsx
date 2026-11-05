import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { restoreVersion } from '../../../../engine/versions';
import type { BackdropKind, LayerError } from '../../../../engine/render-types';
import type { Language } from '../../../../shared/models/preferences';
import logoUrl from '../../assets/logo.png';
import { AttachmentPanel } from '../assets/attachment-panel';
import { PreviewCanvas, usePlayback } from '../canvas/preview-canvas';
import { ComposerDock } from '../composer/composer-dock';
import { InspectorPanel } from '../inspector/inspector-panel';
import { LayersPanel, LibraryPanel } from '../layers/layers-panel';
import { MyEffectsPanel } from '../my-effects/my-effects-panel';
import { LanguageMenu } from '../settings/language-menu';
import { TimelinePanel } from '../timeline/timeline-panel';
import { VersionPanel } from '../versions/version-panel';
import { useEditor } from './use-editor-store';
import { useSave } from './use-save';

const TABS = ['layers', 'library', 'sprites'] as const;
const ZOOMS = [1, 2, 3];
const BACKDROPS: Array<BackdropKind | 'none'> = ['ground', 'dark', 'none'];

export function EditorScreen({
  language,
  onLanguage,
}: {
  language: Language;
  onLanguage(l: Language): void;
}) {
  const { t } = useTranslation('editor');
  const editor = useEditor();
  const { project, currentFrame, zoom, dirty, handle } = editor;
  const { save, saving, failed } = useSave();
  const [tab, setTab] = useState<(typeof TABS)[number]>(editor.startTab);
  const [backdrop, setBackdrop] = useState<BackdropKind | 'none'>('ground');
  const [onion, setOnion] = useState(false);
  const [before, setBefore] = useState(false);
  const [errors, setErrors] = useState<LayerError[]>([]);
  usePlayback(1, false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const options = useMemo(
    () => ({
      partFilter: 'whole' as const,
      includeStage: true,
      ...(backdrop !== 'none' ? { backdrop } : {}),
    }),
    [backdrop],
  );
  const errorMap = useMemo(() => new Map(errors.map((e) => [e.layerId, e.message])), [errors]);
  if (!project) return null;

  const parent = project.versions.find((v) => v.id === project.activeVersionId)?.parentId;
  const shown = before && parent ? restoreVersion(project, parent) : project;

  return (
    <div className="studio">
      <header className="bar">
        <button
          className="brand"
          type="button"
          aria-label={t('back')}
          onClick={() => editor.go('home')}
        >
          <img src={logoUrl} alt="" />
        </button>
        <b>{project.name}</b>
        <span className={`tag ${dirty || !handle ? 'warn' : 'ok'}`} role="status">
          {failed
            ? t('unsaved')
            : saving
              ? t('saving')
              : dirty || !handle
                ? t('unsaved')
                : t('saved')}
        </span>
        <button className="btn" type="button" onClick={() => void save()}>
          {t('save')}
        </button>
        <button className="ibtn" type="button" aria-label={t('undo')} onClick={editor.undo}>
          ↶
        </button>
        <button className="ibtn" type="button" aria-label={t('redo')} onClick={editor.redo}>
          ↷
        </button>
        <span className="sp" />
        <LanguageMenu value={language} onChange={onLanguage} />
        <button className="btn pri" type="button" onClick={() => editor.go('export')}>
          {t('export')}
        </button>
      </header>
      <div className="studio-mid">
        <aside className="side">
          <div className="seg full" role="tablist">
            {TABS.map((id) => (
              <button
                key={id}
                className="chip"
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {t(id)}
              </button>
            ))}
          </div>
          {tab === 'layers' && (
            <>
              <LayersPanel project={project} errors={errorMap} />
              <button className="btn" type="button" onClick={() => setTab('library')}>
                {t('addEffect')}
              </button>
              <VersionPanel />
              <MyEffectsPanel />
            </>
          )}
          {tab === 'library' && <LibraryPanel />}
          {tab === 'sprites' && <AttachmentPanel onSave={save} />}
        </aside>
        <section className="center">
          <div className="row tools">
            <div className="seg" role="group" aria-label={t('zoom', { value: zoom })}>
              {ZOOMS.map((z) => (
                <button
                  key={z}
                  className="chip"
                  type="button"
                  aria-pressed={zoom === z}
                  onClick={() => editor.setZoom(z)}
                >
                  {z}×
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label={t('backdrop')}>
              {BACKDROPS.map((b) => (
                <button
                  key={b}
                  className="chip"
                  type="button"
                  aria-pressed={backdrop === b}
                  onClick={() => setBackdrop(b)}
                >
                  {t(`backdrops.${b}`)}
                </button>
              ))}
            </div>
            <span className="sp" />
            <button
              className="chip"
              type="button"
              aria-pressed={onion}
              onClick={() => setOnion(!onion)}
            >
              {t('onion')}
            </button>
            <button
              className="chip"
              type="button"
              aria-pressed={before}
              disabled={!parent}
              onClick={() => setBefore(!before)}
            >
              {t('compare')}
            </button>
          </div>
          <div className={`canvas-area${backdrop === 'none' ? ' ck' : ''}`}>
            <div className="canvas-stack">
              {onion && currentFrame > 0 && (
                <div className="onion" aria-hidden="true">
                  <PreviewCanvas
                    project={shown}
                    frame={currentFrame - 1}
                    options={options}
                    zoom={zoom}
                    label=""
                  />
                </div>
              )}
              <PreviewCanvas
                project={shown}
                frame={currentFrame}
                options={options}
                zoom={zoom}
                label={project.name}
                onErrors={setErrors}
              />
            </div>
          </div>
          <ComposerDock language={language} />
        </section>
        <InspectorPanel />
      </div>
      <TimelinePanel options={options} />
    </div>
  );
}
