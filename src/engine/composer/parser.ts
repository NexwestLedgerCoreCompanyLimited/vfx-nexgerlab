import { listEffects } from '../effect-registry';
import { FILLER, TERMS, type ComposerAction } from './vocabulary';

export interface UnsupportedTerm {
  text: string;
  reason: 'unknown' | 'no-palette' | 'out-of-range';
}

export interface ComposerParseResult {
  recognizedActions: ComposerAction[];
  unsupportedTerms: UnsupportedTerm[];
  supported: string[];
}

export interface ComposerContext {
  selectedEffectId?: string | undefined;
}

const DURATION = /^(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s|วินาที|วิ)(?![a-z])/i;
const MAX_SECONDS = 20;

const palettes = new Set(
  listEffects()
    .filter((e) => e.palettes)
    .map((e) => e.id),
);
const canRecolor = (id?: string) => id === undefined || palettes.has(id);

/** Local keyword reading. Every word is either understood or shown back as not understood. */
export function parseInstruction(
  input: string,
  _language: 'en' | 'th',
  context: ComposerContext,
): ComposerParseResult {
  const recognizedActions: ComposerAction[] = [];
  const unsupportedTerms: UnsupportedTerm[] = [];
  const supported = TERMS.map((t) => t.term);
  const text = input.trim();
  const lower = text.toLowerCase();

  let rest = '';
  const flush = () => {
    for (const word of rest.split(/\s+/)) {
      if (word && !FILLER.has(word)) unsupportedTerms.push({ text: word, reason: 'unknown' });
    }
    rest = '';
  };

  for (let i = 0; i < lower.length;) {
    const tail = lower.slice(i);
    const time = DURATION.exec(tail);
    if (time) {
      flush();
      const seconds = Number(time[1]);
      if (seconds > 0 && seconds <= MAX_SECONDS)
        recognizedActions.push({ type: 'duration', seconds });
      else
        unsupportedTerms.push({ text: text.slice(i, i + time[0].length), reason: 'out-of-range' });
      i += time[0].length;
      continue;
    }
    const startsWord = i === 0 || !/[a-z]/.test(lower[i - 1]!);
    const match = TERMS.find(({ term }) => {
      if (!tail.startsWith(term)) return false;
      if (!/^[a-z]/.test(term)) return true;
      return startsWord && !/[a-z]/.test(tail[term.length] ?? '');
    });
    if (match) {
      flush();
      if (match.action.type === 'palette' && !canRecolor(context.selectedEffectId)) {
        unsupportedTerms.push({ text: text.slice(i, i + match.term.length), reason: 'no-palette' });
      } else {
        recognizedActions.push(match.action);
      }
      i += match.term.length;
      continue;
    }
    rest += lower[i];
    i++;
    if (FILLER.has(rest.trim())) rest = '';
  }
  flush();
  return { recognizedActions, unsupportedTerms, supported };
}
