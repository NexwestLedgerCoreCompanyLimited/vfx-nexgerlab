export type Easing = 'linear' | 'stepped';

export function easeValue(easing: Easing, t: number): number {
  return easing === 'stepped' ? 0 : t;
}
