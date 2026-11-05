import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getEffect, listEffects, optionControls } from '../../../../engine/effect-registry';
import { PAL } from '../../../../engine/pixelfx/src/core/index.js';
import { LAYER_SPEEDS, type EffectLayer } from '../../../../shared/schemas/project';
import { useEditor } from '../editor/use-editor-store';

export const PALETTES = Object.entries(PAL as Record<string, string[]>);
const SHORT_LIST = new Set(['fire', 'cyber', 'arcane', 'neon']);
const NON_ASCII = /[^\x20-\x7e]/;

export function useLayerEdit(layer: EffectLayer) {
  const dispatch = useEditor((s) => s.dispatch);
  const gesture = useRef(0);
  return {
    set: (patch: Partial<EffectLayer>) => dispatch({ type: 'set-layer', layerId: layer.id, patch }),
    /** Each drag gets one id, so it undoes in one step. */
    drag: (patch: Partial<EffectLayer>) =>
      dispatch({
        type: 'set-layer',
        layerId: layer.id,
        patch,
        gestureId: `${layer.id}:${gesture.current}`,
      }),
    endDrag: () => {
      gesture.current++;
    },
    option: (key: string, value: unknown) =>
      dispatch({
        type: 'set-layer',
        layerId: layer.id,
        patch: { options: { ...layer.options, [key]: value as never } },
      }),
  };
}

export function Slider(props: {
  label: string;
  value: number;
  shown: string;
  min: number;
  max: number;
  step: number;
  onChange(v: number): void;
  onEnd?(): void;
}) {
  const id = `s-${props.label}`;
  return (
    <div>
      <label className="label between" htmlFor={id}>
        {props.label}
        <span className="mono">{props.shown}</span>
      </label>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        onPointerUp={props.onEnd}
        onKeyUp={props.onEnd}
      />
    </div>
  );
}

export function PalettePicker({ layer }: { layer: EffectLayer }) {
  const { t } = useTranslation('editor');
  const edit = useLayerEdit(layer);
  const [all, setAll] = useState(false);
  const current = JSON.stringify(layer.options.palette ?? null);
  const list = all ? PALETTES : PALETTES.filter(([name]) => SHORT_LIST.has(name));
  return (
    <div className="stack tight">
      <span className="label">{t('palette')}</span>
      <div className={all ? 'pal-list' : undefined}>
        <button
          className="pal"
          type="button"
          aria-pressed={current === 'null'}
          onClick={() => {
            const { palette: _drop, ...options } = layer.options;
            edit.set({ options });
          }}
        >
          <span>{t('ownPalette')}</span>
        </button>
        {list.map(([name, ramp]) => (
          <button
            key={name}
            className="pal"
            type="button"
            aria-pressed={current === JSON.stringify(ramp)}
            onClick={() => edit.option('palette', ramp)}
          >
            <span>{name}</span>
            <i className="ramp" aria-hidden="true">
              {ramp.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </i>
          </button>
        ))}
      </div>
      <button className="btn" type="button" onClick={() => setAll(!all)}>
        {all ? t('showLess') : t('showAll', { count: PALETTES.length })}
      </button>
    </div>
  );
}

export function EffectOptions({ layer }: { layer: EffectLayer }) {
  const { t } = useTranslation('editor');
  const edit = useLayerEdit(layer);
  const name = (key: string) => t(`optionNames.${key}`, { defaultValue: key });
  return (
    <>
      {optionControls(layer.effectId).map((c) => {
        const value = layer.options[c.key] ?? c.default;
        if (c.kind === 'slider') {
          return (
            <Slider
              key={c.key}
              label={name(c.key)}
              value={value as number}
              shown={String(+Number(value).toFixed(2))}
              min={c.min}
              max={c.max}
              step={c.step}
              onChange={(v) => edit.option(c.key, v)}
            />
          );
        }
        if (c.kind === 'switch') {
          return (
            <label key={c.key} className="row">
              <input
                type="checkbox"
                checked={value as boolean}
                onChange={(e) => edit.option(c.key, e.target.checked)}
              />
              {name(c.key)}
            </label>
          );
        }
        if (c.kind === 'color') {
          return (
            <label key={c.key} className="row">
              <input
                type="color"
                value={String(value).slice(0, 7)}
                onChange={(e) => edit.option(c.key, e.target.value)}
              />
              {name(c.key)}
            </label>
          );
        }
        if (c.kind === 'text') {
          return (
            <div key={c.key}>
              <label className="label" htmlFor={`o-${c.key}`}>
                {name(c.key)}
              </label>
              <input
                id={`o-${c.key}`}
                className="input"
                maxLength={64}
                value={String(value)}
                onChange={(e) => edit.option(c.key, e.target.value)}
              />
              {NON_ASCII.test(String(value)) && <p className="warn small">{t('missingGlyphs')}</p>}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

export function BasicControls({ layer }: { layer: EffectLayer }) {
  const { t } = useTranslation('editor');
  const edit = useLayerEdit(layer);
  const ground = getEffect(layer.effectId)?.meta.bg === 'ground';
  return (
    <>
      <Slider
        label={t('light')}
        value={layer.light}
        shown={`${Math.round(layer.light * 100)}%`}
        min={0}
        max={2}
        step={0.05}
        onChange={(light) => edit.drag({ light })}
        onEnd={edit.endDrag}
      />
      <div className="row">
        <span className="muted small">
          {t('seed')} <span className="mono">{layer.seed}</span>
        </span>
        <span className="sp" />
        <button
          className="btn"
          type="button"
          onClick={() => edit.set({ seed: 1 + Math.floor(Math.random() * 9999) })}
        >
          {t('newSeed')}
        </button>
      </div>
      <button
        className="btn"
        type="button"
        aria-pressed={layer.flip}
        onClick={() => edit.set({ flip: !layer.flip })}
      >
        {t('flip')}
      </button>
      {!ground && (
        <Slider
          label={t('angle')}
          value={layer.angle}
          shown={`${Math.round((layer.angle * 180) / Math.PI)}°`}
          min={-Math.PI}
          max={Math.PI}
          step={Math.PI / 36}
          onChange={(angle) => edit.drag({ angle })}
          onEnd={edit.endDrag}
        />
      )}
      <div className="seg" role="group" aria-label={t('speed')}>
        {LAYER_SPEEDS.map((speed) => (
          <button
            key={speed}
            className="chip"
            type="button"
            aria-pressed={layer.speed === speed}
            onClick={() => edit.set({ speed })}
          >
            {speed}×
          </button>
        ))}
      </div>
    </>
  );
}

export const entryFor = (id: string) => listEffects().find((e) => e.id === id);
