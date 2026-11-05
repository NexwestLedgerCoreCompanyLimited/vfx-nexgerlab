import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyComposerTurn } from '../../../../engine/composer/actions';
import { parseInstruction } from '../../../../engine/composer/parser';
import type { ComposerAction } from '../../../../engine/composer/vocabulary';
import { useEditor } from '../editor/use-editor-store';
import { ComposerHistory } from './composer-history';

export function describeAction(t: (k: string, o?: object) => string, a: ComposerAction): string {
  switch (a.type) {
    case 'effect':
      return t('action.effect', { value: a.effectId });
    case 'palette':
      return t('action.palette', { value: a.palette });
    case 'duration':
      return t('action.duration', { value: a.seconds });
    case 'speed':
      return t('action.speed', { value: a.value });
    case 'intensity':
      return t(`action.intensity-${a.direction}`);
    case 'flip':
      return t('action.flip');
    case 'placement':
      return t('action.placement', { value: a.placement });
  }
}

export function ComposerDock({ language }: { language: 'en' | 'th' }) {
  const { t } = useTranslation('composer');
  const { project, selectedLayerId, replaceProject } = useEditor();
  const [input, setInput] = useState('');
  const layer = project?.layers.find((l) => l.id === selectedLayerId);
  const parsed = useMemo(
    () => parseInstruction(input, language, { selectedEffectId: layer?.effectId }),
    [input, language, layer?.effectId],
  );
  if (!project) return null;
  const apply = () => {
    const next = applyComposerTurn(project, { input, language, parsed, layerId: selectedLayerId });
    if (next !== project) {
      replaceProject(next);
      setInput('');
    }
  };
  return (
    <section className="composer" aria-label={t('label')}>
      <div className="row">
        <input
          className="input"
          aria-label={t('label')}
          placeholder={t('placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
        <button
          className="btn"
          type="button"
          disabled={parsed.recognizedActions.length === 0}
          onClick={apply}
        >
          {t('apply')}
        </button>
      </div>
      <div className="row wrap" aria-live="polite">
        {parsed.recognizedActions.map((a, i) => (
          <span className="tag ok" key={i}>
            {t('understood', { text: describeAction(t as never, a) })}
          </span>
        ))}
        {parsed.unsupportedTerms.map((u, i) => (
          <span className="tag warn" key={i}>
            {t('cannot', { text: `${u.text} (${t(`reason.${u.reason}`)})` })}
          </span>
        ))}
      </div>
      <ComposerHistory />
      <details>
        <summary className="small">{t('vocabulary')}</summary>
        <p className="muted small">{t('hint')}</p>
        <p className="small">{parsed.supported.join(', ')}</p>
      </details>
    </section>
  );
}
