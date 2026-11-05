import { useTranslation } from 'react-i18next';
import { applyActOverrides, getEffect } from '../../../../engine/effect-registry';
import { actTiming } from '../../../../engine/pixelfx/src/core/index.js';
import type { EffectLayer } from '../../../../shared/schemas/project';
import { Slider, useLayerEdit } from '../inspector/option-controls';

interface Timing {
  windup: number;
  recovery: number;
  hits: Array<{ t: number; freeze: number; amp: number; shake: number }>;
}

function timing(layer: EffectLayer): Timing | undefined {
  const mod = getEffect(layer.effectId);
  if (!mod?.act) return undefined;
  return actTiming(applyActOverrides(mod, layer.actOverrides)) as Timing;
}

/** The body's beats on the timeline, in project seconds, where 0 is the start of the wind-up. */
export function ActLane({ layer, seconds }: { layer: EffectLayer; seconds: number }) {
  const { t } = useTranslation('timeline');
  const act = timing(layer);
  if (!act) return null;
  const hit = act.hits.find((h) => h.freeze > 0);
  const first = act.windup + (hit?.t ?? act.hits[0]?.t ?? 0);
  const freeze = hit?.freeze ?? 0;
  const parts = [
    { key: 'windup', width: act.windup },
    { key: 'rise', width: Math.max(0, first - act.windup) },
    { key: 'freeze', width: freeze },
    { key: 'recover', width: Math.max(0, seconds - first - freeze) },
  ];
  return (
    <div className="act-lane" role="group" aria-label={t('act')}>
      {parts
        .filter((p) => p.width > 0)
        .map((p) => (
          <div key={p.key} className={`act-${p.key}`} style={{ flexGrow: p.width }}>
            {t(p.key)}
          </div>
        ))}
    </div>
  );
}

export function ActControls({ layer }: { layer: EffectLayer }) {
  const { t } = useTranslation('editor');
  const edit = useLayerEdit(layer);
  const act = timing(layer);
  if (!act) return null;
  const hitIndex = act.hits.findIndex((h) => h.freeze > 0 || h.amp > 0);
  const hit = act.hits[hitIndex];
  const setHit = (patch: { stop?: number; amp?: number }) => {
    const others = (layer.actOverrides?.hits ?? []).filter((h) => h.index !== hitIndex);
    const current = layer.actOverrides?.hits?.find((h) => h.index === hitIndex);
    edit.drag({
      actOverrides: {
        ...layer.actOverrides,
        hits: [...others, { ...current, index: hitIndex, ...patch }],
      },
    });
  };
  return (
    <section className="stack tight">
      <span className="sect">{t('actTiming')}</span>
      {act.windup > 0 && (
        <Slider
          label={t('windup')}
          value={act.windup}
          shown={`${act.windup.toFixed(2)} s`}
          min={0.05}
          max={2}
          step={0.05}
          onChange={(windupSeconds) =>
            edit.drag({ actOverrides: { ...layer.actOverrides, windupSeconds } })
          }
          onEnd={edit.endDrag}
        />
      )}
      {hit && (
        <>
          <Slider
            label={t('freeze')}
            value={hit.freeze}
            shown={`${Math.round(hit.freeze * 1000)} ms`}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(stop) => setHit({ stop })}
            onEnd={edit.endDrag}
          />
          <Slider
            label={t('shake')}
            value={hit.amp}
            shown={`${hit.amp} px`}
            min={0}
            max={8}
            step={1}
            onChange={(amp) => setHit({ amp })}
            onEnd={edit.endDrag}
          />
        </>
      )}
    </section>
  );
}
