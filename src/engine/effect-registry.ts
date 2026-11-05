import type { ActOverrides, JsonValue } from '../shared/schemas/project';
import { categories, effects } from './pixelfx/src/fx/index.js';

export interface EffectMeta {
  name: string;
  desc: string;
  tags: string[];
  size: number[];
  origin: number[];
  duration: number;
  loop: boolean;
  fps: number;
  bg: string;
  actor?: number;
  options: Record<string, unknown>;
}

export interface EffectModule {
  meta: EffectMeta;
  act?: any;
  draw?: unknown;
  drawBack?: unknown;
  create?: unknown;
}

export interface EffectEntry {
  id: string;
  category: string;
  meta: EffectMeta;
  module: EffectModule;
  hasAct: boolean;
  hasBack: boolean;
  palettes: boolean;
}

export type OptionControl =
  | { key: string; kind: 'slider'; min: number; max: number; step: number; default: number }
  | { key: string; kind: 'switch'; default: boolean }
  | { key: string; kind: 'color'; default: string }
  | { key: string; kind: 'text'; default: string }
  | { key: string; kind: 'palette'; default: string[] };

export type OptionResult =
  | { ok: true; options: Record<string, JsonValue> }
  | { ok: false; reason: 'unknown-effect' | 'unknown-option' | 'bad-value' };

export const ENGINE_VERSION = '0.3.0+a841596';
export const CATEGORIES: ReadonlyArray<{ id: string; name: string; blurb: string }> = categories;

const DEFAULTS = { fps: 30, bg: 'dark', loop: false, duration: 1, tags: [], options: {} };
const HEX = /^#[0-9a-f]{3,8}$/i;

const ENTRIES = new Map<string, EffectEntry>(
  Object.entries(effects as Record<string, EffectModule>).map(([id, raw]) => {
    const mod = { ...raw, meta: { ...DEFAULTS, ...raw.meta } };
    const entry: EffectEntry = {
      id,
      category: id.split('/')[0]!,
      meta: mod.meta,
      module: mod,
      hasAct: Boolean(mod.act),
      // shortcut: simulated effects only reveal drawBack once built, so this reads the source; replace if upstream restructures
      hasBack: Boolean(mod.drawBack) || String(mod.create ?? '').includes('drawBack'),
      palettes: Object.hasOwn(mod.meta.options, 'palette'),
    };
    return [id, entry];
  }),
);

export const listEffects = (): EffectEntry[] => [...ENTRIES.values()];
export const getEffect = (id: string): EffectModule | undefined => ENTRIES.get(id)?.module;

const isRamp = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 32 &&
  v.every((c) => typeof c === 'string' && HEX.test(c));
const isDefaultRamp = (v: unknown): boolean =>
  Array.isArray(v) &&
  v.every((c) => typeof c === 'number' || (typeof c === 'string' && HEX.test(c)));

const MAX_OPTION_SCALE = 16;
const MIN_OPTION_LIMIT = 256;

function validValue(value: unknown, fallback: unknown): boolean {
  if (typeof fallback === 'number') {
    // effects allocate from these, so a shared project must not be able to ask for millions
    const limit = Math.max(Math.abs(fallback) * MAX_OPTION_SCALE, MIN_OPTION_LIMIT);
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
  }
  if (typeof fallback === 'boolean') return typeof value === 'boolean';
  if (typeof fallback === 'string') {
    if (typeof value !== 'string') return false;
    return HEX.test(fallback) ? HEX.test(value) : value.length <= 64;
  }
  if (Array.isArray(fallback) && fallback.every((n) => typeof n === 'number')) {
    return (
      Array.isArray(value) &&
      value.length === fallback.length &&
      value.every((n) => typeof n === 'number' && Number.isFinite(n))
    );
  }
  return isDefaultRamp(fallback) && isRamp(value);
}

export function validateEffectOptions(id: string, options: unknown): OptionResult {
  const entry = ENTRIES.get(id);
  if (!entry) return { ok: false, reason: 'unknown-effect' };
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    return { ok: false, reason: 'bad-value' };
  }
  for (const [key, value] of Object.entries(options)) {
    if (!Object.hasOwn(entry.meta.options, key)) return { ok: false, reason: 'unknown-option' };
    if (!validValue(value, entry.meta.options[key])) return { ok: false, reason: 'bad-value' };
  }
  return { ok: true, options: options as Record<string, JsonValue> };
}

function sliderFor(key: string, value: number): OptionControl {
  const high = Math.max(Math.abs(value) * 3, 1);
  return {
    key,
    kind: 'slider',
    min: value < 0 ? -high : 0,
    max: high,
    step: Number.isInteger(value) && high >= 10 ? 1 : high / 100,
    default: value,
  };
}

export function optionControls(id: string): OptionControl[] {
  const entry = ENTRIES.get(id);
  if (!entry) return [];
  const controls: OptionControl[] = [];
  for (const [key, value] of Object.entries(entry.meta.options)) {
    if (key === 'seed' || key === 'palette') continue;
    if (typeof value === 'number') controls.push(sliderFor(key, value));
    else if (typeof value === 'boolean') controls.push({ key, kind: 'switch', default: value });
    else if (typeof value === 'string') {
      controls.push({ key, kind: HEX.test(value) ? 'color' : 'text', default: value });
    } else if (isRamp(value)) controls.push({ key, kind: 'palette', default: value });
  }
  return controls;
}

export function applyActOverrides(mod: EffectModule, overrides?: ActOverrides): EffectModule {
  if (!overrides || !mod.act) return mod;
  let poses = mod.act.poses;
  const lead = -Math.min(0, poses[0]?.[0] ?? 0);
  if (overrides.windupSeconds !== undefined && lead > 0) {
    const k = overrides.windupSeconds / lead;
    poses = poses.map((key: unknown[]) => {
      const t = key[0] as number;
      return t < 0 ? [t * k, ...key.slice(1)] : key;
    });
  }
  const hits = (mod.act.hits ?? []).map((hit: object, index: number) => {
    const { index: _index, ...edit } = overrides.hits?.find((h) => h.index === index) ?? { index };
    return { ...hit, ...edit };
  });
  return { ...mod, act: { ...mod.act, poses, hits } };
}
