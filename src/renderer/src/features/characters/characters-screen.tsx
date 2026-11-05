import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ANIMATIONS,
  LOOPING,
  animationFrames,
  renderCharacterFrame,
  renderCharacterSheet,
  type AnimationName,
} from '../../../../engine/characters/animate';
import { parseCharacterDescription } from '../../../../engine/characters/spec';
import { encodeGif } from '../../../../engine/exporters/gif';
import { encodePng } from '../../../../engine/exporters/png';
import { DIRECTION_ORDER, type DirectionCount } from '../../../../shared/directions';
import { paintFrame } from '../../engine/canvas-renderer';
import { useEditor } from '../editor/use-editor-store';
import { saveFiles, type SaveFile } from '../export/save-files';

const NAMES = Object.keys(ANIMATIONS) as AnimationName[];
const FRAME_MS = 1000 / 12;
const COUNTS: DirectionCount[] = [1, 4, 8, 16];
const utf8 = (text: string) => new TextEncoder().encode(text);

function Preview({
  spec,
  animation,
  direction,
  index,
}: {
  spec: ReturnType<typeof parseCharacterDescription>['spec'];
  animation: AnimationName;
  direction: (typeof DIRECTION_ORDER)[16][number];
  index: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current)
      paintFrame(canvas.current, renderCharacterFrame(spec, animation, index, direction));
  }, [spec, animation, direction, index]);
  return (
    <figure className="char-cell">
      <canvas ref={canvas} className="px" aria-label={direction} role="img" />
      <figcaption className="mono small muted">{direction}</figcaption>
    </figure>
  );
}

export function CharactersScreen() {
  const { t } = useTranslation('generate');
  const go = useEditor((s) => s.go);
  const [description, setDescription] = useState('knight in blue with a sword');
  const [seed, setSeed] = useState(1);
  const [animation, setAnimation] = useState<AnimationName>('walk');
  const [count, setCount] = useState<DirectionCount>(4);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState<string>();
  const { spec, unsupported } = useMemo(
    () => parseCharacterDescription(description, seed),
    [description, seed],
  );

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), FRAME_MS);
    return () => clearInterval(timer);
  }, []);

  async function save() {
    const files: SaveFile[] = [];
    const base = spec.role;
    for (const name of NAMES) {
      const { sheet, metadata, frames } = renderCharacterSheet(spec, name, count);
      const rowFrames = frames.slice(0, animationFrames(name).length);
      files.push({ path: `${base}/${name}.png`, bytes: encodePng(sheet) });
      files.push({ path: `${base}/${name}.json`, bytes: utf8(JSON.stringify(metadata, null, 1)) });
      files.push({
        path: `${base}/${name}.gif`,
        bytes: encodeGif(
          rowFrames,
          rowFrames.map(() => Math.round(FRAME_MS)),
          LOOPING.has(name),
        ),
      });
    }
    files.push({ path: `${base}/character.json`, bytes: utf8(JSON.stringify(spec, null, 2)) });
    const saved = await saveFiles(files, (n) => window.confirm(t('overwrite', { count: n })));
    if (saved) setMessage(t('saved', { count: saved }));
  }

  return (
    <div className="screen">
      <header className="bar">
        <button className="btn" type="button" onClick={() => go('home')}>
          ‹ {t('back')}
        </button>
        <h1 className="bar-title">{t('charactersTitle')}</h1>
      </header>
      <div className="gen">
        <aside className="side">
          <label className="label" htmlFor="char-desc">
            {t('describe')}
          </label>
          <input
            id="char-desc"
            className="input"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="muted small">{t('describeHint')}</p>
          <div className="row wrap" aria-live="polite">
            <span className="tag ok">{spec.role}</span>
            {unsupported.map((word) => (
              <span className="tag warn" key={word}>
                {t('unknownWord', { word })}
              </span>
            ))}
          </div>
          <button className="btn" type="button" onClick={() => setSeed(seed + 1)}>
            {t('newLook')}
          </button>
          <span className="sect">{t('animation')}</span>
          <div className="row wrap">
            {NAMES.map((name) => (
              <button
                key={name}
                className="chip"
                type="button"
                aria-pressed={animation === name}
                onClick={() => setAnimation(name)}
              >
                {t(`animations.${name}`)}
              </button>
            ))}
          </div>
          <span className="sect">{t('directions')}</span>
          <div className="seg full" role="group" aria-label={t('directions')}>
            {COUNTS.map((n) => (
              <button
                key={n}
                className="chip"
                type="button"
                aria-pressed={count === n}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="sp" />
          {message && (
            <p className="tag ok" role="status">
              {message}
            </p>
          )}
          <button className="btn pri big" type="button" onClick={() => void save()}>
            {t('exportAll')}
          </button>
        </aside>
        <section className="gen-stage char-grid">
          {DIRECTION_ORDER[count].map((direction) => (
            <Preview
              key={direction}
              spec={spec}
              animation={animation}
              direction={direction}
              index={tick}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
