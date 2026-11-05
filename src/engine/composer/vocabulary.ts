import type { EffectLayer } from '../../shared/schemas/project';

export type ComposerAction =
  | { type: 'effect'; effectId: string }
  | { type: 'palette'; palette: string }
  | { type: 'duration'; seconds: number }
  | { type: 'speed'; value: number }
  | { type: 'intensity'; direction: 'up' | 'down' }
  | { type: 'flip' }
  | { type: 'placement'; placement: EffectLayer['placement'] };

type Entry = { terms: string[]; action: ComposerAction };

const effect = (effectId: string, ...terms: string[]): Entry => ({
  terms,
  action: { type: 'effect', effectId },
});
const palette = (name: string, ...terms: string[]): Entry => ({
  terms,
  action: { type: 'palette', palette: name },
});

/** Longer terms win, so "fire breath" beats "fire". */
export const VOCABULARY: Entry[] = [
  effect('fire/fire-breath', 'fire breath', 'พ่นไฟ', 'ลมหายใจไฟ'),
  effect('fire/campfire', 'fire', 'campfire', 'flame', 'ไฟ', 'กองไฟ', 'เปลวไฟ'),
  effect('explosions/small-explosion', 'explosion', 'blast', 'ระเบิด'),
  effect('explosions/smoke-bomb', 'smoke', 'ควัน'),
  effect('lightning/lightning-strike', 'lightning', 'thunder', 'สายฟ้า', 'ฟ้าผ่า'),
  effect('arcane/arcane-orb', 'energy orb', 'orb', 'ลูกพลัง'),
  effect('arcane/magic-circle-cast', 'magic circle', 'วงเวท'),
  effect('arcane/portal', 'portal', 'ประตูมิติ'),
  effect('holy/heal', 'heal', 'healing', 'ฮีล', 'ฟื้นพลัง'),
  effect('holy/divine-shield', 'shield', 'โล่'),
  effect('impacts/ground-slam', 'shockwave', 'คลื่นกระแทก'),
  effect('melee/sword-slash', 'sword slash', 'slash', 'ฟันดาบ'),
  effect('impacts/hit-spark', 'hit spark', 'spark', 'ประกาย'),
  effect('holy/halo', 'glow', 'halo', 'เรืองแสง'),
  effect('projectiles/arrow', 'projectile', 'arrow', 'กระสุน', 'ลูกธนู'),
  effect('ice/ice-spikes', 'ice spikes', 'ice', 'น้ำแข็ง', 'หนามน้ำแข็ง'),
  effect('water/bubbles', 'bubbles', 'bubbling', 'ฟอง'),
  palette('ice', 'blue', 'สีฟ้า', 'ฟ้า'),
  palette('heal', 'green', 'สีเขียว'),
  palette('blood', 'red', 'สีแดง'),
  palette('arcane', 'purple', 'violet', 'สีม่วง'),
  palette('gold', 'gold', 'yellow', 'สีทอง', 'สีเหลือง'),
  palette('neon', 'pink', 'สีชมพู'),
  palette('cyber', 'cyan', 'teal', 'สีเขียวฟ้า'),
  { terms: ['faster', 'เร็วขึ้น'], action: { type: 'speed', value: 2 } },
  { terms: ['slower', 'ช้าลง'], action: { type: 'speed', value: 0.5 } },
  {
    terms: ['stronger', 'harder', 'heavier', 'more intense', 'หนักขึ้น', 'แรงขึ้น'],
    action: { type: 'intensity', direction: 'up' },
  },
  {
    terms: ['softer', 'weaker', 'lighter', 'เบาลง', 'อ่อนลง'],
    action: { type: 'intensity', direction: 'down' },
  },
  { terms: ['flip', 'mirror', 'กลับด้าน'], action: { type: 'flip' } },
  {
    terms: ['behind the sprite', 'behind', 'หลังตัวละคร'],
    action: { type: 'placement', placement: 'behind-sprite' },
  },
  {
    terms: ['in front of the sprite', 'in front', 'หน้าตัวละคร'],
    action: { type: 'placement', placement: 'in-front-sprite' },
  },
];

/** Words that carry no instruction in either language. */
export const FILLER = new Set(
  'a an the it in on for with make made please and to of เป็น ให้ เปลี่ยน กระแทก หน่อย ที ด้วย แบบ และ นะ ครับ ค่ะ'.split(
    ' ',
  ),
);

export const TERMS = VOCABULARY.flatMap((entry) =>
  entry.terms.map((term) => ({ term, action: entry.action })),
).sort((a, b) => b.term.length - a.term.length);
