import { useTranslation } from 'react-i18next';
import type { Language } from '../../../../shared/models/preferences';
import logoUrl from '../../assets/logo.png';
import { LanguageMenu } from '../settings/language-menu';

interface Props {
  language: Language;
  onLanguage(language: Language): void;
}

export function HomeScreen({ language, onLanguage }: Props) {
  const { t } = useTranslation();
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
        <button className="btn" type="button">
          {t('home.importSprite')}
        </button>
        <button className="btn pri" type="button">
          {t('home.new')}
        </button>
      </header>
      <main style={{ width: 1264, maxWidth: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>{t('home.title')}</h1>
      </main>
    </div>
  );
}
