import { describe, expect, it } from 'vitest';
import {
  createTileScheduler,
  tileLayout,
} from '../../src/renderer/src/features/home/tile-scheduler';

describe('tile scheduler', () => {
  it('steps only visible tiles at 15 fps', () => {
    const s = createTileScheduler({ maxActive: 24 });
    s.setVisible('a', true);
    s.setVisible('b', false);
    expect(s.due(0)).toEqual(['a']);
    expect(s.due(30)).toEqual([]);
    expect(s.due(67)).toEqual(['a']);
  });

  it('runs at 30 fps on hover or focus', () => {
    const s = createTileScheduler({ maxActive: 24 });
    s.setVisible('a', true);
    s.setHover('a', true);
    s.due(0);
    expect(s.due(34)).toEqual(['a']);
  });

  it('caps active tiles, keeps a hovered one, and frees a slot when one scrolls away', () => {
    const s = createTileScheduler({ maxActive: 2 });
    for (const id of ['a', 'b', 'c']) s.setVisible(id, true);
    expect(s.due(0)).toEqual(['a', 'b']);
    s.setHover('c', true);
    expect(s.due(67).sort()).toEqual(['a', 'c']);
    s.setHover('c', false);
    s.setVisible('a', false);
    expect(s.due(134).sort()).toEqual(['b', 'c']);
  });

  it('holds still under reduced motion unless hovered', () => {
    const s = createTileScheduler({ maxActive: 24 });
    s.setReduced(true);
    s.setVisible('a', true);
    expect(s.due(0)).toEqual([]);
    s.setHover('a', true);
    expect(s.due(10)).toEqual(['a']);
  });
});

describe('tileLayout', () => {
  it('uses 2x for small effects and 1x for medium ones', () => {
    expect(tileLayout(80, 90)).toEqual({ width: 120, height: 100, scale: 2 });
    expect(tileLayout(200, 150)).toEqual({ width: 240, height: 200, scale: 1 });
  });

  it('grows the art stage for effects bigger than a tile, keeping the aspect', () => {
    expect(tileLayout(360, 100)).toEqual({ width: 360, height: 300, scale: 0.6666666666666666 });
    expect(tileLayout(100, 300)).toEqual({ width: 360, height: 300, scale: 0.6666666666666666 });
  });
});
