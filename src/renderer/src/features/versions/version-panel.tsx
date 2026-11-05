import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { branchVersion, createVersion, restoreVersion } from '../../../../engine/versions';
import { useEditor } from '../editor/use-editor-store';

export function VersionPanel() {
  const { t } = useTranslation('editor');
  const { project, replaceProject } = useEditor();
  const [label, setLabel] = useState('');
  if (!project) return null;
  return (
    <section className="stack tight">
      <span className="sect">{t('versions')}</span>
      <div className="row">
        <input
          className="input"
          aria-label={t('versionName')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          className="btn"
          type="button"
          disabled={!label.trim()}
          onClick={() => {
            replaceProject(createVersion(project, label.trim()));
            setLabel('');
          }}
        >
          {t('newVersion')}
        </button>
      </div>
      <ul className="plain">
        {project.versions.map((v) => (
          <li className="row" key={v.id}>
            <span className={`small${v.id === project.activeVersionId ? ' strong' : ''}`}>
              {v.label}
            </span>
            <span className="sp" />
            <button
              className="chip"
              type="button"
              aria-label={`${t('restore')}: ${v.label}`}
              aria-pressed="false"
              onClick={() => replaceProject(restoreVersion(project, v.id))}
            >
              {t('restore')}
            </button>
            <button
              className="chip"
              type="button"
              aria-label={`${t('branch')}: ${v.label}`}
              aria-pressed="false"
              onClick={() => replaceProject(branchVersion(project, v.id, `${v.label} +`))}
            >
              {t('branch')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
