import { useTranslation } from 'react-i18next';
import type { Language } from '../../../../shared/models/preferences';

interface Props {
  value: Language;
  onChange(language: Language): void;
}

export function LanguageMenu({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="seg" role="group" aria-label={t('language.label')}>
      <button
        className="chip"
        type="button"
        aria-pressed={value === 'th'}
        onClick={() => onChange('th')}
      >
        ไทย
      </button>
      <button
        className="chip"
        type="button"
        aria-pressed={value === 'en'}
        onClick={() => onChange('en')}
      >
        EN
      </button>
    </div>
  );
}

export function LanguageChooser({ onChange }: { onChange(language: Language): void }) {
  return (
    <div className="chooser">
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Choose your language · เลือกภาษาที่ใช้</h1>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn big" type="button" onClick={() => onChange('en')}>
          English
        </button>
        <button className="btn big" type="button" onClick={() => onChange('th')}>
          ไทย
        </button>
      </div>
    </div>
  );
}
