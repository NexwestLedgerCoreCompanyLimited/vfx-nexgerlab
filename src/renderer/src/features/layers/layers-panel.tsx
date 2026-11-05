import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listEffects } from '../../../../engine/effect-registry';
import { createEffectLayer } from '../../../../engine/project-factory';
import type { EffectLayer, ProjectV1 } from '../../../../shared/schemas/project';
import { useEditor } from '../editor/use-editor-store';
import { effectName } from '../home/effect-grid';

function Row({ layer, errored }: { layer: EffectLayer; errored?: string | undefined }) {
  const { t } = useTranslation('editor');
  const { t: tc } = useTranslation();
  const { selectedLayerId, select, dispatch } = useEditor();
  const entry = listEffects().find((e) => e.id === layer.effectId);
  const name = entry ? effectName(tc as never, entry) : layer.effectId;
  return (
    <div className="row layer-row">
      <button
        className="layer"
        type="button"
        aria-pressed={selectedLayerId === layer.id}
        onClick={() => select(layer.id)}
      >
        {name}
      </button>
      <button
        className="ibtn"
        type="button"
        aria-label={`${layer.visible ? t('hide') : t('show')}: ${name}`}
        aria-pressed={layer.visible}
        onClick={() =>
          dispatch({ type: 'set-layer', layerId: layer.id, patch: { visible: !layer.visible } })
        }
      >
        {layer.visible ? '●' : '○'}
      </button>
      <button
        className="ibtn"
        type="button"
        aria-label={`${t('removeLayer')}: ${name}`}
        onClick={() => dispatch({ type: 'remove-layer', layerId: layer.id })}
      >
        ×
      </button>
      {errored && (
        <p className="warn small">
          {t('layerError', {
            message: errored === 'unknown-effect' ? t('missingEffect') : errored,
          })}
        </p>
      )}
    </div>
  );
}

export function LayersPanel({
  project,
  errors,
}: {
  project: ProjectV1;
  errors: Map<string, string>;
}) {
  const { t } = useTranslation('editor');
  const group = (title: string, list: EffectLayer[]) =>
    list.length > 0 && (
      <div className="stack tight" key={title}>
        <span className="sect">{title}</span>
        {list.map((l) => (
          <Row key={l.id} layer={l} errored={errors.get(l.id)} />
        ))}
      </div>
    );
  return (
    <>
      {group(
        t('front'),
        project.layers.filter((l) => l.placement !== 'behind-sprite'),
      )}
      {group(
        t('behind'),
        project.layers.filter((l) => l.placement === 'behind-sprite'),
      )}
      {project.layers.length === 0 && <p className="muted small">{t('emptyStudio')}</p>}
    </>
  );
}

export function LibraryPanel() {
  const { t } = useTranslation('editor');
  const { t: tc } = useTranslation();
  const { project, dispatch, select } = useEditor();
  const [q, setQ] = useState('');
  if (!project) return null;
  const words = q.trim().toLowerCase();
  const list = listEffects()
    .filter(
      (e) =>
        !words ||
        `${e.id} ${e.meta.name} ${effectName(tc as never, e)}`.toLowerCase().includes(words),
    )
    .slice(0, 40);
  return (
    <div className="stack tight fill">
      <input
        className="input"
        type="search"
        aria-label={t('library')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="scroll">
        {list.map((e) => (
          <button
            key={e.id}
            className="layer"
            type="button"
            onClick={() => {
              const layer = createEffectLayer(
                e.id,
                project.canvas.width / 2,
                Math.min(project.canvas.height - 1, e.meta.origin[1]!),
              );
              dispatch({ type: 'add-layer', layer });
              select(layer.id);
            }}
          >
            {effectName(tc as never, e)}
          </button>
        ))}
      </div>
    </div>
  );
}
