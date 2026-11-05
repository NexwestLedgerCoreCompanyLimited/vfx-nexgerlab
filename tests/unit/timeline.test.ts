import { describe, expect, it } from 'vitest';
import { easeValue } from '../../src/engine/easing';
import { sampleNumberTrack } from '../../src/engine/timeline';

const key = (frame: number, value: number, easing: 'linear' | 'stepped' = 'linear') => ({
  frame,
  value,
  easing,
});

describe('sampleNumberTrack', () => {
  const track = [key(10, 0), key(20, 10, 'stepped'), key(30, 50)];

  it('hits exact endpoints and interpolates between', () => {
    expect(sampleNumberTrack(track, 0, 9)).toBe(0);
    expect(sampleNumberTrack(track, 10, 9)).toBe(0);
    expect(sampleNumberTrack(track, 15, 9)).toBe(5);
    expect(sampleNumberTrack(track, 20, 9)).toBe(10);
    expect(sampleNumberTrack(track, 99, 9)).toBe(50);
  });

  it('holds a stepped key until the next one', () => {
    expect(sampleNumberTrack(track, 29, 9)).toBe(10);
    expect(sampleNumberTrack(track, 30, 9)).toBe(50);
  });

  it('uses the fallback for an empty track', () => {
    expect(sampleNumberTrack([], 5, 7)).toBe(7);
    expect(sampleNumberTrack(undefined, 5, 7)).toBe(7);
  });

  it('takes the later key at a zero-length segment', () => {
    expect(sampleNumberTrack([key(5, 1), key(5, 2)], 5, 0)).toBe(2);
  });

  it('works at the first and the 600th frame', () => {
    const long = [key(0, 0), key(599, 599)];
    expect(sampleNumberTrack(long, 0, 9)).toBe(0);
    expect(sampleNumberTrack(long, 599, 9)).toBe(599);
  });
});

describe('easeValue', () => {
  it('handles both easings', () => {
    expect(easeValue('linear', 0.25)).toBe(0.25);
    expect(easeValue('stepped', 0.99)).toBe(0);
  });
});
