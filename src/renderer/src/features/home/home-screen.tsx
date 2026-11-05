import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, listEffects, type EffectEntry } from '../../../../engine/effect-registry';
import type { RecentProject } from '../../../../shared/contracts/ipc';
import type { Language } from '../../../../shared/models/preferences';
import logoUrl from '../../assets/logo.png';
import { useEditor } from '../editor/use-editor-store';
import { LanguageMenu } from '../settings/language-menu';
import { EffectGrid, effectName } from './effect-grid';

interface Props {
  language: Language;
  onLanguage(language: Language): void;
}

const EFFECTS = listEffects();
const COUNTS = new Map<string, number>();
for (const e of EFFECTS) COUNTS.set(e.category, (COUNTS.get(e.category) ?? 0) + 1);

function searchText(e: EffectEntry, t: (k: string, o?: object) => string): string {
  const terms = t(`effects:items.${e.id}.terms`, { defaultValue: '' });
  return [
    e.id,
    e.meta.name,
    e.meta.desc,
    ...e.meta.tags,
    t(`effects:categories.${e.category}`),
    effectName(t as never, e),
    terms,
  ]
    .join(' ')
    .toLowerCase();
}

export function HomeScreen({ language, onLanguage }: Props) {
  const { t } = useTranslation();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [notice, setNotice] = useState<{ text: string; path?: string }>();
  const editor = useEditor();

  useEffect(() => {
    void window.vfxlab.listRecentProjects().then(setRecent);
  }, []);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = useMemo(
    () =>
      EFFECTS.filter((e) => {
        if (category !== 'all' && e.category !== category) return false;
        if (words.length === 0) return true;
        const text = searchText(e, t as never);
        return words.every((w) => text.includes(w));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, query, language],
  );

  async function openRecent(path: string) {
    try {
      const handle = await window.vfxlab.openProject(path);
      if (handle) editor.openHandle(handle);
    } catch (error) {
      const message = String(error);
      if (message.includes('unknown-version')) setNotice({ text: t('home.tooNew') });
      else if (message.includes('not-found')) setNotice({ text: t('home.notFound') });
      else {
        const choice = await window.vfxlab.recoverProject(path);
        if (choice.kind === 'backup-available') {
          setNotice({
            text: t('home.recover', { date: new Date(choice.updatedAt).toLocaleString(language) }),
            path,
          });
        } else setNotice({ text: t('home.unrecoverable') });
      }
    }
  }

  async function restore(path: string) {
    editor.openHandle(await window.vfxlab.applyBackup(path));
  }

  async function removeRecent(path: string) {
    await window.vfxlab.removeRecentProject(path);
    setRecent(await window.vfxlab.listRecentProjects());
  }

  const open = (e: EffectEntry) => editor.openEffect(e.id, effectName(t as never, e), language);

  return (
    <div className="screen">
      <header className="bar">
        <span className="brand">
          <img src={logoUrl} alt="" />
          {t('brand')}
        </span>
        <span className="sp" />
        <span className="tag ok">{t('home.offline')}</span>
        <LanguageMenu value={language} onChange={onLanguage} />
        <button
          className="btn"
          type="button"
          onClick={() => editor.openBlank(t('newProject'), 'sprites')}
        >
          {t('home.importSprite')}
        </button>
        <button className="btn pri" type="button" onClick={() => editor.openBlank(t('newProject'))}>
          {t('home.new')}
        </button>
      </header>
      <main className="home">
        <div className="home-in">
          <section className="home-top">
            <div className="stack">
              <h1>{t('home.title')}</h1>
              <label className="label" htmlFor="q">
                {t('home.searchLabel')}
              </label>
              <input
                id="q"
                className="input"
                type="search"
                autoComplete="off"
                placeholder={t('home.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="row">
                <span className="muted small">{t('home.try')}</span>
                {(['tryFire', 'tryBlast', 'tryHeal'] as const).map((k) => (
                  <button
                    key={k}
                    className="chip"
                    type="button"
                    aria-pressed="false"
                    onClick={() => setQuery(t(`home.${k}`).split(' ')[0]!)}
                  >
                    {t(`home.${k}`)}
                  </button>
                ))}
              </div>
            </div>
            <aside className="panel recent" aria-label={t('home.recent')}>
              <span className="sect">{t('home.recent')}</span>
              {recent.length === 0 && <p className="muted small">{t('home.noRecent')}</p>}
              {recent.slice(0, 3).map((r) => (
                <div className="row" key={r.path}>
                  <button
                    className="link"
                    type="button"
                    disabled={!r.available}
                    onClick={() => void openRecent(r.path)}
                  >
                    {r.name}
                  </button>
                  {!r.available && <span className="muted small">{t('home.unavailable')}</span>}
                  <span className="sp" />
                  <button
                    className="ibtn"
                    type="button"
                    aria-label={`${t('home.remove')}: ${r.name}`}
                    onClick={() => void removeRecent(r.path)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </aside>
          </section>
          {notice && (
            <p className="notice" role="alert">
              {notice.text}
              {notice.path && (
                <button className="btn" type="button" onClick={() => void restore(notice.path!)}>
                  {t('home.recoverAction')}
                </button>
              )}
            </p>
          )}
          <div className="cats" role="toolbar" aria-label={t('home.library')}>
            <button
              className="chip"
              type="button"
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              {t('home.all')}
              <b>{EFFECTS.length}</b>
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className="chip"
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
              >
                {t(`effects:categories.${c.id}`)}
                <b>{COUNTS.get(c.id)}</b>
              </button>
            ))}
          </div>
          {shown.length ? (
            <EffectGrid entries={shown} onOpen={open} />
          ) : (
            <p className="muted">{t('home.none')}</p>
          )}
        </div>
      </main>
    </div>
  );
}
