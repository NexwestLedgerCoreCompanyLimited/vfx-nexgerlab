import { describe, expect, it } from 'vitest';
import { parseInstruction } from '../../src/engine/composer/parser';

const types = (r: ReturnType<typeof parseInstruction>) => r.recognizedActions.map((a) => a.type);
const noContext = {};
const moves = { selectedEffectId: 'moves/ground-pound' };
const fire = { selectedEffectId: 'fire/campfire' };

describe('parseInstruction', () => {
  it('reads an English instruction', () => {
    const r = parseInstruction('fire breath for 2 seconds in blue', 'en', noContext);
    expect(r.recognizedActions).toEqual([
      { type: 'effect', effectId: 'fire/fire-breath' },
      { type: 'duration', seconds: 2 },
      { type: 'palette', palette: 'ice' },
    ]);
    expect(r.unsupportedTerms).toEqual([]);
  });

  it('reads Thai with no spaces', () => {
    const r = parseInstruction('ไฟสีฟ้า2วินาที', 'th', noContext);
    expect(r.recognizedActions).toEqual([
      { type: 'effect', effectId: 'fire/campfire' },
      { type: 'palette', palette: 'ice' },
      { type: 'duration', seconds: 2 },
    ]);
  });

  it('understands refinements on the selected effect', () => {
    expect(types(parseInstruction('หนักขึ้น', 'th', moves))).toEqual(['intensity']);
    expect(parseInstruction('make it stronger', 'en', moves).recognizedActions[0]).toEqual({
      type: 'intensity',
      direction: 'up',
    });
    expect(parseInstruction('softer', 'en', fire).recognizedActions[0]).toEqual({
      type: 'intensity',
      direction: 'down',
    });
    expect(types(parseInstruction('faster', 'en', fire))).toEqual(['speed']);
    expect(types(parseInstruction('กลับด้าน', 'th', fire))).toEqual(['flip']);
    expect(parseInstruction('behind the sprite', 'en', fire).recognizedActions[0]).toEqual({
      type: 'placement',
      placement: 'behind-sprite',
    });
  });

  it('flags a request the selected effect cannot honor', () => {
    const r = parseInstruction('กระแทกหนักขึ้น เปลี่ยนเป็นสีฟ้า', 'th', moves);
    expect(types(r)).toEqual(['intensity']);
    expect(r.unsupportedTerms).toEqual([{ text: 'สีฟ้า', reason: 'no-palette' }]);
  });

  it('never silently drops unknown words', () => {
    const r = parseInstruction('fire with dragons', 'en', noContext);
    expect(types(r)).toEqual(['effect']);
    expect(r.unsupportedTerms).toEqual([{ text: 'dragons', reason: 'unknown' }]);
    expect(parseInstruction('มังกรบิน', 'th', noContext).unsupportedTerms).toEqual([
      { text: 'มังกรบิน', reason: 'unknown' },
    ]);
  });

  it('handles a mixed-language instruction', () => {
    expect(types(parseInstruction('ice ระเบิด', 'th', noContext))).toEqual(['effect', 'effect']);
  });

  it('is deterministic and handles empty input', () => {
    const a = parseInstruction('fire 3 seconds', 'en', noContext);
    expect(parseInstruction('fire 3 seconds', 'en', noContext)).toEqual(a);
    expect(parseInstruction('   ', 'en', noContext)).toMatchObject({
      recognizedActions: [],
      unsupportedTerms: [],
    });
  });

  it('rejects an impossible duration as unsupported', () => {
    expect(parseInstruction('fire 500 seconds', 'en', noContext).unsupportedTerms[0]).toEqual({
      text: '500 seconds',
      reason: 'out-of-range',
    });
  });

  it('offers its vocabulary', () => {
    expect(parseInstruction('', 'th', noContext).supported.length).toBeGreaterThan(10);
  });
});
