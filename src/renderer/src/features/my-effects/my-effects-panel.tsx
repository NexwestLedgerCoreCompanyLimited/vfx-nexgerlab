import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyPreset, savePreset, searchMyEffects } from '../../../../engine/presets';
import { useEditor } from '../editor/use-editor-store';

export function MyEffectsPanel() {
  const { t } = useTranslation('editor');
  const { project, replaceProject } = useEditor();
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [query, setQuery] = useState('');
  if (!project) return null;
  const found = searchMyEffects(project, query);
  return (
    <section className="stack tight">
      <span className="sect">{t('myEffects')}</span>
      <input
        className="input"
        aria-label={t('presetName')}
        placeholder={t('presetName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input"
        aria-label={t('presetTags')}
        placeholder={t('presetTags')}
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <button
        className="btn"
        type="button"
        disabled={!name.trim() || project.layers.length === 0}
        onClick={() => {
          replaceProject(
            savePreset(project, { name: name.trim(), tags: tags.split(/[\s,]+/).filter(Boolean) }),
          );
          setName('');
          setTags('');
        }}
      >
        {t('savePreset')}
      </button>
      <input
        className="input"
        type="search"
        aria-label={t('searchMine')}
        placeholder={t('searchMine')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {found.length === 0 && <p className="muted small">{t('noPresets')}</p>}
      <ul className="plain">
        {found.map((p) => (
          <li className="row" key={p.id}>
            <span className="small">{p.name}</span>
            <span className="sp" />
            <button
              className="chip"
              type="button"
              aria-pressed="false"
              aria-label={`${t('applyPreset')}: ${p.name}`}
              onClick={() => replaceProject(applyPreset(project, p.id))}
            >
              {t('applyPreset')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
