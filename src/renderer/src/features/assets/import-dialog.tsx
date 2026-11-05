import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StripLayout } from '../../../../shared/models/asset';

export function ImportDialog({
  onImport,
  onCancel,
}: {
  onImport(strip?: StripLayout): void;
  onCancel(): void;
}) {
  const { t } = useTranslation('editor');
  const [strip, setStrip] = useState(false);
  const [frameCount, setFrames] = useState(4);
  const [fps, setFps] = useState(12);
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('import')}>
      <p className="small">{t('stripQuestion')}</p>
      <label className="row small">
        <input type="checkbox" checked={strip} onChange={(e) => setStrip(e.target.checked)} />
        {t('strip')}
      </label>
      {strip && (
        <div className="two">
          <div>
            <label className="label" htmlFor="strip-frames">
              {t('frames')}
            </label>
            <input
              id="strip-frames"
              className="input"
              type="number"
              min={1}
              max={600}
              value={frameCount}
              onChange={(e) => setFrames(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="strip-fps">
              {t('fps')}
            </label>
            <input
              id="strip-fps"
              className="input"
              type="number"
              min={1}
              max={60}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
            />
          </div>
        </div>
      )}
      <div className="row">
        <button className="btn" type="button" onClick={onCancel}>
          {t('cancel')}
        </button>
        <button
          className="btn pri"
          type="button"
          onClick={() => onImport(strip ? { frameCount, fps } : undefined)}
        >
          {t('confirmImport')}
        </button>
      </div>
    </div>
  );
}
