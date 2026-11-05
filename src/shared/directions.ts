export const DIRECTION_ORDER = {
  1: ['S'],
  4: ['S', 'W', 'N', 'E'],
  8: ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
  16: [
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
  ],
} as const;

export type Direction = (typeof DIRECTION_ORDER)[16][number];
export type DirectionCount = keyof typeof DIRECTION_ORDER;
