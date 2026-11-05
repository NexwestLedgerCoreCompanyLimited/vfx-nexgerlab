import { useTranslation } from 'react-i18next';
import { useEditor } from '../editor/use-editor-store';

export function ExportScreen() {
  const { t } = useTranslation('export');
  const { t: te } = useTranslation('editor');
  const { project, go } = useEditor();
  return (
    <div className="screen">
      <header className="bar">
        <button className="btn" type="button" onClick={() => go('studio')}>
          ‹ {te('openStudio')}
        </button>
        <h1 className="bar-title">{t('title', { name: project?.name })}</h1>
      </header>
      <p className="muted pad">{t('note')}</p>
    </div>
  );
}
