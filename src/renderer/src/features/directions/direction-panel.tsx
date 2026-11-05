import { useTranslation } from 'react-i18next';
import {
  resetDirectionOverride,
  setDirectionCount,
  setDirectionOverride,
} from '../../../../engine/directions';
import {
  DIRECTION_ORDER,
  type Direction,
  type DirectionCount,
} from '../../../../shared/directions';
import { LAYER_SPEEDS } from '../../../../shared/schemas/project';
import { useEditor } from '../editor/use-editor-store';
import { Slider } from '../inspector/option-controls';

const COUNTS: DirectionCount[] = [1, 4, 8, 16];

export function DirectionPanel() {
  const { t } = useTranslation('editor');
  const { project, selectedLayerId, previewDirection, setPreviewDirection, replaceProject } =
    useEditor();
  if (!project) return null;
  const count = (project.directions?.count ?? 1) as DirectionCount;
  const order: readonly Direction[] = DIRECTION_ORDER[count];
  const direction =
    previewDirection && order.includes(previewDirection) ? previewDirection : order[0]!;
  const override = project.directions?.overrides[direction];
  const hidden = selectedLayerId ? override?.hiddenLayers?.includes(selectedLayerId) : false;
  const patch = (p: Parameters<typeof setDirectionOverride>[2]) =>
    replaceProject(setDirectionOverride(project, direction, p));
  return (
    <section className="stack tight pad-top">
      <span className="sect">{t('directions')}</span>
      <div className="seg full" role="group" aria-label={t('directions')}>
        {COUNTS.map((n) => (
          <button
            key={n}
            className="chip"
            type="button"
            aria-pressed={count === n}
            onClick={() => replaceProject(setDirectionCount(project, n))}
          >
            {n}
          </button>
        ))}
      </div>
      {count > 1 && (
        <>
          <label className="label" htmlFor="direction">
            {t('direction')}
          </label>
          <select
            id="direction"
            className="input"
            value={direction}
            onChange={(e) => setPreviewDirection(e.target.value as Direction)}
          >
            {order.map((d) => (
              <option key={d} value={d}>
                {d}
                {project.directions?.overrides[d] ? ' *' : ''}
              </option>
            ))}
          </select>
          <Slider
            label={t('directionAngle')}
            value={override?.angle ?? 0}
            shown={`${Math.round(((override?.angle ?? 0) * 180) / Math.PI)}°`}
            min={-Math.PI}
            max={Math.PI}
            step={Math.PI / 36}
            onChange={(angle) => patch({ angle })}
          />
          <div className="seg" role="group" aria-label={t('directionSpeed')}>
            {LAYER_SPEEDS.map((speed) => (
              <button
                key={speed}
                className="chip"
                type="button"
                aria-pressed={override?.speed === speed}
                onClick={() => patch({ speed })}
              >
                {speed}×
              </button>
            ))}
          </div>
          {selectedLayerId && (
            <button
              className="btn"
              type="button"
              aria-pressed={Boolean(hidden)}
              onClick={() => {
                const list = override?.hiddenLayers ?? [];
                patch({
                  hiddenLayers: hidden
                    ? list.filter((id) => id !== selectedLayerId)
                    : [...list, selectedLayerId],
                });
              }}
            >
              {t('hideInDirection')}
            </button>
          )}
          <button
            className="btn"
            type="button"
            disabled={!override}
            onClick={() => replaceProject(resetDirectionOverride(project, direction))}
          >
            {t('resetDirection')}
          </button>
        </>
      )}
    </section>
  );
}
