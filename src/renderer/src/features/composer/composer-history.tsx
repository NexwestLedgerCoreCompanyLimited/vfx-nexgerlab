import { useTranslation } from 'react-i18next';
import { useEditor } from '../editor/use-editor-store';
import { restoreVersion } from '../../../../engine/versions';

export function ComposerHistory() {
  const { t } = useTranslation('composer');
  const { t: te } = useTranslation('editor');
  const { project, replaceProject } = useEditor();
  if (!project?.composerHistory.length) return null;
  return (
    <details>
      <summary className="small">{t('history')}</summary>
      <ul className="plain">
        {project.composerHistory.map((turn) => (
          <li className="row" key={turn.id}>
            <span className="small">{turn.input}</span>
            <span className="sp" />
            <button
              className="chip"
              type="button"
              aria-pressed={project.activeVersionId === turn.versionId}
              onClick={() => replaceProject(restoreVersion(project, turn.versionId))}
            >
              {te('restore')}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
