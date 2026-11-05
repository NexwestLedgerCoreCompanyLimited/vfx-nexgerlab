import { useTranslation } from 'react-i18next';
import { useEditor } from '../editor/use-editor-store';
import { ActControls } from '../timeline/act-lane';
import {
  BasicControls,
  EffectOptions,
  PalettePicker,
  Slider,
  entryFor,
  useLayerEdit,
} from './option-controls';
import type { EffectLayer } from '../../../../shared/schemas/project';

const PLACEMENTS = ['standalone', 'in-front-sprite', 'behind-sprite'] as const;
const BLENDS = ['normal', 'add', 'screen', 'multiply'] as const;

function Advanced({ layer }: { layer: EffectLayer }) {
  const { t } = useTranslation('editor');
  const edit = useLayerEdit(layer);
  const number = (label: string, key: 'x' | 'y' | 'startFrame') => (
    <div>
      <label className="label" htmlFor={`n-${key}`}>
        {label}
      </label>
      <input
        id={`n-${key}`}
        className="input mono"
        type="number"
        value={layer[key]}
        onChange={(e) => {
          if (Number.isInteger(Number(e.target.value))) edit.set({ [key]: Number(e.target.value) });
        }}
      />
    </div>
  );
  return (
    <details>
      <summary>{t('advanced')}</summary>
      <div className="stack tight pad-top">
        <div className="two">
          {number(t('x'), 'x')}
          {number(t('y'), 'y')}
        </div>
        {number(t('start'), 'startFrame')}
        <Slider
          label={t('opacity')}
          value={layer.opacity}
          shown={`${Math.round(layer.opacity * 100)}%`}
          min={0}
          max={1}
          step={0.05}
          onChange={(opacity) => edit.drag({ opacity })}
          onEnd={edit.endDrag}
        />
        <label className="label" htmlFor="placement">
          {t('placement')}
        </label>
        <select
          id="placement"
          className="input"
          value={layer.placement}
          onChange={(e) => edit.set({ placement: e.target.value as EffectLayer['placement'] })}
        >
          {PLACEMENTS.map((p) => (
            <option key={p} value={p}>
              {t(`placementNames.${p}`)}
            </option>
          ))}
        </select>
        <label className="label" htmlFor="blend">
          {t('blend')}
        </label>
        <select
          id="blend"
          className="input"
          value={layer.blend}
          onChange={(e) => edit.set({ blend: e.target.value as EffectLayer['blend'] })}
        >
          {BLENDS.map((b) => (
            <option key={b} value={b}>
              {t(`blendNames.${b}`)}
            </option>
          ))}
        </select>
      </div>
    </details>
  );
}

export function InspectorPanel() {
  const { t } = useTranslation('editor');
  const project = useEditor((s) => s.project);
  const selected = useEditor((s) => s.selectedLayerId);
  const layer = project?.layers.find((l) => l.id === selected);
  const entry = layer && entryFor(layer.effectId);
  if (!layer || !entry) return <aside className="side right" aria-label={t('basic')} />;
  return (
    <aside className="side right" aria-label={t('basic')}>
      <div>
        <h2>{t(`effects:items.${entry.id}.name`, { defaultValue: entry.meta.name })}</h2>
        <p className="mono small muted">{entry.id}</p>
      </div>
      <ActControls layer={layer} />
      <section className="stack tight">
        <span className="sect">{t('basic')}</span>
        <BasicControls layer={layer} />
        {entry.palettes ? (
          <PalettePicker layer={layer} />
        ) : (
          <p className="muted small">{t('noPalette')}</p>
        )}
      </section>
      <section className="stack tight">
        <EffectOptions layer={layer} />
      </section>
      <Advanced layer={layer} />
    </aside>
  );
}
