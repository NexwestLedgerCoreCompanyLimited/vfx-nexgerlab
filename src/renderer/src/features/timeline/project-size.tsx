import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_CANVAS, MAX_FRAMES } from '../../../../shared/schemas/project';
import { useEditor } from '../editor/use-editor-store';

function NumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit(value: number): void;
}) {
  const { label, value, min, max, onCommit } = props;
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const parsed = Number.parseInt(text, 10);
    if (Number.isNaN(parsed)) return setText(String(value));
    const next = Math.max(min, Math.min(max, parsed));
    setText(String(next));
    if (next === value) return;
    try {
      onCommit(next);
    } catch {
      // a shorter timeline can orphan keyframes, and the schema refuses that
      setText(String(value));
    }
  };

  return (
    <label className="row small num">
      <span className="muted">{label}</span>
      <input
        className="input"
        type="number"
        min={min}
        max={max}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
    </label>
  );
}

export function ProjectSize() {
  const { t } = useTranslation('timeline');
  const project = useEditor((s) => s.project);
  const dispatch = useEditor((s) => s.dispatch);
  if (!project) return null;
  const { canvas, timeline } = project;
  return (
    <>
      <NumberField
        label={t('canvasWidth')}
        value={canvas.width}
        min={16}
        max={MAX_CANVAS}
        onCommit={(width) => dispatch({ type: 'set-canvas', patch: { width } })}
      />
      <NumberField
        label={t('canvasHeight')}
        value={canvas.height}
        min={16}
        max={MAX_CANVAS}
        onCommit={(height) => dispatch({ type: 'set-canvas', patch: { height } })}
      />
      <NumberField
        label={t('frameCount')}
        value={timeline.frames}
        min={1}
        max={MAX_FRAMES}
        onCommit={(frames) => dispatch({ type: 'set-timeline', patch: { frames } })}
      />
      <NumberField
        label={t('fps')}
        value={timeline.fps}
        min={1}
        max={60}
        onCommit={(fps) => dispatch({ type: 'set-timeline', patch: { fps } })}
      />
    </>
  );
}
