export type EffectFamilyId =
  | 'fire'
  | 'explosions'
  | 'smoke'
  | 'lightning'
  | 'energy-orbs'
  | 'magic-circles'
  | 'portals'
  | 'healing-beams'
  | 'shields'
  | 'shockwaves'
  | 'sword-slashes'
  | 'hit-sparks'
  | 'auras'
  | 'glow'
  | 'lighting'
  | 'recolors'
  | 'projectiles'
  | 'ice-spikes'
  | 'bubbling';

export const EFFECT_FAMILIES: Record<EffectFamilyId, string[]> = {
  fire: ['fire/campfire', 'fire/torch', 'fire/flame-pillar', 'fire/fireball', 'fire/fire-breath'],
  explosions: [
    'explosions/small-explosion',
    'explosions/big-explosion',
    'explosions/plasma-explosion',
  ],
  smoke: ['explosions/smoke-bomb', 'spawn/poof'],
  lightning: ['lightning/lightning-strike', 'lightning/chain-lightning', 'lightning/thunderclap'],
  'energy-orbs': [
    'arcane/arcane-orb',
    'lightning/ball-lightning',
    'shadow/void-orb',
    'water/water-orb',
  ],
  'magic-circles': ['arcane/magic-circle-cast', 'arcane/rune-circle'],
  portals: ['arcane/portal', 'spawn/spawn-portal', 'scifi/teleporter-pad'],
  'healing-beams': ['holy/heal', 'holy/heal-aoe', 'holy/holy-pillar', 'spawn/respawn-beam'],
  shields: ['holy/divine-shield', 'scifi/force-field', 'impacts/shield-block'],
  shockwaves: ['impacts/ground-slam', 'lightning/thunderclap', 'scifi/emp-blast'],
  'sword-slashes': [
    'melee/sword-slash',
    'melee/double-slash',
    'melee/spin-slash',
    'moves/sword-combo',
  ],
  'hit-sparks': ['impacts/hit-spark', 'impacts/crit-hit', 'impacts/parry'],
  auras: ['arcane/rune-circle', 'nature/leaf-storm'],
  glow: ['holy/halo', 'holy/sunburst'],
  lighting: ['weather/god-rays', 'fire/candle'],
  recolors: ['status/frozen', 'status/poisoned', 'status/petrified', 'status/burning'],
  projectiles: [
    'projectiles/arrow',
    'projectiles/rocket',
    'projectiles/laser-bolt',
    'projectiles/plasma-shot',
  ],
  'ice-spikes': ['ice/ice-spikes', 'ice/ice-lance', 'ice/frost-nova'],
  bubbling: ['water/bubbles', 'nature/toxic-puddle'],
};

/** Families that also apply to an imported sprite, frame by frame. */
export const SPRITE_FAMILIES: Partial<
  Record<EffectFamilyId, 'aura' | 'glow' | 'light' | 'recolor'>
> = {
  auras: 'aura',
  glow: 'glow',
  lighting: 'light',
  recolors: 'recolor',
};
