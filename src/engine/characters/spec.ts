export type CharacterRole =
  | 'villager'
  | 'knight'
  | 'wizard'
  | 'archer'
  | 'rogue'
  | 'ninja'
  | 'skeleton'
  | 'zombie'
  | 'robot'
  | 'pirate';

export interface CharacterSpec {
  name: string;
  seed: number;
  role: CharacterRole;
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  boots: string;
  hat: 'none' | 'pointed' | 'helmet' | 'hood';
  weapon: string | undefined;
}

export interface CharacterParse {
  spec: CharacterSpec;
  unsupported: string[];
}

const SKINS = ['#f3c49d', '#e0a97f', '#c98b6c', '#9a6647', '#6e4630'];
const HAIR = ['#2a2230', '#5e3a20', '#a8682a', '#d8b050', '#8a3a24', '#c8c8d0'];
const CLOTH = ['#b5493a', '#3f6fb5', '#4f8f5a', '#a8842f', '#7a5a98', '#8a6a4a'];

const ROLES: Record<CharacterRole, Partial<CharacterSpec>> = {
  villager: { weapon: undefined },
  knight: {
    top: '#8a95a8',
    bottom: '#5c6678',
    boots: '#3a4252',
    hat: 'helmet',
    hair: '#8a95a8',
    weapon: 'sword',
  },
  wizard: {
    top: '#48309a',
    bottom: '#38267a',
    boots: '#2a1c58',
    hat: 'pointed',
    hair: '#c8c8d0',
    weapon: undefined,
  },
  archer: {
    top: '#3f7a48',
    bottom: '#6a4a2a',
    boots: '#4a3220',
    hat: 'hood',
    hair: '#3f7a48',
    weapon: 'bow',
  },
  rogue: {
    top: '#34303f',
    bottom: '#28242f',
    boots: '#1c1a24',
    hat: 'hood',
    hair: '#34303f',
    weapon: 'dagger',
  },
  ninja: {
    top: '#20202a',
    bottom: '#20202a',
    boots: '#14141c',
    hat: 'hood',
    hair: '#20202a',
    weapon: 'sword',
  },
  skeleton: {
    skin: '#dcd8c8',
    hair: '#dcd8c8',
    top: '#c8c4b4',
    bottom: '#b8b4a4',
    boots: '#a8a494',
    weapon: 'sword',
  },
  zombie: {
    skin: '#7da06a',
    hair: '#3a4a30',
    top: '#5a5a4a',
    bottom: '#44443a',
    boots: '#2e2e28',
    weapon: undefined,
  },
  robot: {
    skin: '#7a8aa0',
    hair: '#5c6c84',
    top: '#4a7a9a',
    bottom: '#3a5a78',
    boots: '#2a3a50',
    hat: 'helmet',
    weapon: undefined,
  },
  pirate: {
    top: '#a83a30',
    bottom: '#2a2a38',
    boots: '#1e1a18',
    hat: 'hood',
    hair: '#2a2230',
    weapon: 'sword',
  },
};

const ROLE_TERMS: Array<[string, CharacterRole]> = [
  ['knight', 'knight'],
  ['warrior', 'knight'],
  ['soldier', 'knight'],
  ['อัศวิน', 'knight'],
  ['นักรบ', 'knight'],
  ['ทหาร', 'knight'],
  ['wizard', 'wizard'],
  ['mage', 'wizard'],
  ['witch', 'wizard'],
  ['พ่อมด', 'wizard'],
  ['แม่มด', 'wizard'],
  ['นักเวท', 'wizard'],
  ['archer', 'archer'],
  ['ranger', 'archer'],
  ['นักธนู', 'archer'],
  ['rogue', 'rogue'],
  ['thief', 'rogue'],
  ['โจร', 'rogue'],
  ['ninja', 'ninja'],
  ['นินจา', 'ninja'],
  ['skeleton', 'skeleton'],
  ['โครงกระดูก', 'skeleton'],
  ['zombie', 'zombie'],
  ['ซอมบี้', 'zombie'],
  ['robot', 'robot'],
  ['android', 'robot'],
  ['หุ่นยนต์', 'robot'],
  ['pirate', 'pirate'],
  ['โจรสลัด', 'pirate'],
  ['villager', 'villager'],
  ['farmer', 'villager'],
  ['person', 'villager'],
  ['ชาวบ้าน', 'villager'],
  ['ชาวนา', 'villager'],
];

const COLOR_TERMS: Array<[string, string]> = [
  ['red', '#c0342c'],
  ['สีแดง', '#c0342c'],
  ['blue', '#2f6bd0'],
  ['สีฟ้า', '#2f6bd0'],
  ['สีน้ำเงิน', '#2f6bd0'],
  ['green', '#2f8f4f'],
  ['สีเขียว', '#2f8f4f'],
  ['purple', '#6b2cc0'],
  ['violet', '#6b2cc0'],
  ['สีม่วง', '#6b2cc0'],
  ['gold', '#d8a428'],
  ['yellow', '#d8a428'],
  ['สีทอง', '#d8a428'],
  ['สีเหลือง', '#d8a428'],
  ['black', '#2a2b33'],
  ['สีดำ', '#2a2b33'],
  ['white', '#e4e6ec'],
  ['สีขาว', '#e4e6ec'],
  ['orange', '#d8701f'],
  ['สีส้ม', '#d8701f'],
  ['pink', '#e060b0'],
  ['สีชมพู', '#e060b0'],
  ['brown', '#6a4a2a'],
  ['สีน้ำตาล', '#6a4a2a'],
];

const WEAPON_TERMS: Array<[string, string]> = [
  ['sword', 'sword'],
  ['ดาบ', 'sword'],
  ['bow', 'bow'],
  ['ธนู', 'bow'],
  ['dagger', 'dagger'],
  ['มีด', 'dagger'],
  ['hammer', 'hammer'],
  ['ค้อน', 'hammer'],
  ['spear', 'spear'],
  ['หอก', 'spear'],
  ['axe', 'hammer'],
  ['ขวาน', 'hammer'],
];

const FILLER = new Set(
  'a an the with and in of wearing holding cape robe armor armour outfit clothes hat small big tall ชุด ผ้าคลุม ใส่ ถือ ตัว คน และ ที่ มี'.split(
    ' ',
  ),
);

type Term = { term: string; apply(spec: CharacterSpec): CharacterSpec };

const TERMS: Term[] = [
  ...ROLE_TERMS.map(([term, role]) => ({
    term,
    apply: (s: CharacterSpec) => ({ ...s, role, ...ROLES[role] }),
  })),
  ...COLOR_TERMS.map(([term, top]) => ({ term, apply: (s: CharacterSpec) => ({ ...s, top }) })),
  ...WEAPON_TERMS.map(([term, weapon]) => ({
    term,
    apply: (s: CharacterSpec) => ({ ...s, weapon }),
  })),
].sort((a, b) => b.term.length - a.term.length);

function pick<T>(list: readonly T[], seed: number, salt: number): T {
  let x = Math.imul(seed + 1, 2654435761) ^ Math.imul(salt + 7, 40503);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return list[(x >>> 0) % list.length]!;
}

function baseCharacter(name: string, seed: number): CharacterSpec {
  return {
    name,
    seed,
    role: 'villager',
    skin: pick(SKINS, seed, 1),
    hair: pick(HAIR, seed, 2),
    top: pick(CLOTH, seed, 3),
    bottom: pick(CLOTH, seed, 4),
    boots: '#3a2a20',
    hat: 'none',
    weapon: undefined,
  };
}

/** Reads known words only. Roles apply first so a color can restyle them; other words come back as unsupported. */
export function parseCharacterDescription(text: string, seed: number): CharacterParse {
  const lower = text.trim().toLowerCase();
  const found: Term[] = [];
  const unsupported: string[] = [];
  let rest = '';
  const flush = () => {
    for (const word of rest.split(/\s+/)) if (word && !FILLER.has(word)) unsupported.push(word);
    rest = '';
  };
  for (let i = 0; i < lower.length;) {
    const tail = lower.slice(i);
    const wordStart = i === 0 || !/[a-z]/.test(lower[i - 1]!);
    const match = TERMS.find(({ term }) =>
      /^[a-z]/.test(term)
        ? wordStart && tail.startsWith(term) && !/[a-z]/.test(tail[term.length] ?? '')
        : tail.startsWith(term),
    );
    if (match) {
      flush();
      found.push(match);
      i += match.term.length;
    } else {
      rest += lower[i];
      i++;
      if (FILLER.has(rest.trim())) rest = '';
    }
  }
  flush();
  const isRole = (t: Term) => ROLE_TERMS.some(([term]) => term === t.term);
  const ordered = [...found.filter(isRole), ...found.filter((t) => !isRole(t))];
  const spec = ordered.reduce(
    (s, t) => t.apply(s),
    baseCharacter(text.trim().slice(0, 60) || 'Character', seed),
  );
  return { spec, unsupported };
}
