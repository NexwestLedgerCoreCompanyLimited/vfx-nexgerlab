import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { encodePng } from '../../../../engine/exporters/png';
import {
  BIOMES,
  MAP_KINDS,
  TILES,
  createMap,
  renderMap,
  setTile,
  tileColor,
  type Biome,
  type GameMap,
  type MapKind,
} from '../../../../engine/maps/map';
import { buildVoxelMesh, encodeGlb, encodeObj } from '../../../../engine/maps/mesh';
import { TILE, renderWangTileset, tilesetFrame, toTiledJson } from '../../../../engine/maps/tiles';
import { paintFrame } from '../../engine/canvas-renderer';
import { useEditor } from '../editor/use-editor-store';
import { saveFiles, type SaveFile } from '../export/save-files';

const SIZES = [16, 32, 64, 128];
const utf8 = (text: string) => new TextEncoder().encode(text);

export function MapsScreen() {
  const { t } = useTranslation('generate');
  const go = useEditor((s) => s.go);
  const [kind, setKind] = useState<MapKind>('topdown');
  const [biome, setBiome] = useState<Biome>('temperate');
  const [size, setSize] = useState(32);
  const [seed, setSeed] = useState(1);
  const [brush, setBrush] = useState(TILES.indexOf('grass'));
  const [edited, setEdited] = useState<GameMap>();
  const [message, setMessage] = useState<string>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);

  const generated = useMemo(
    () => createMap({ kind, biome, width: size, height: size, seed }),
    [kind, biome, size, seed],
  );
  useEffect(() => setEdited(undefined), [generated]);
  const map = edited ?? generated;
  const flat = kind === 'topdown' || kind === 'sidescroller';

  useEffect(() => {
    if (canvas.current) paintFrame(canvas.current, renderMap(map));
  }, [map]);

  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!flat || !painting.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - box.left) / box.width) * map.width);
    const y = Math.floor(((e.clientY - box.top) / box.height) * map.height);
    setEdited(setTile(map, x, y, brush));
  }

  async function save() {
    const files: SaveFile[] = [
      { path: 'map/map.png', bytes: encodePng(renderMap(map)) },
      { path: 'map/tileset.png', bytes: encodePng(tilesetFrame(map.seed)) },
      {
        path: 'map/wang-grass-sand.png',
        bytes: encodePng(renderWangTileset('grass', 'sand', map.seed)),
      },
      { path: 'map/map.tmj', bytes: utf8(JSON.stringify(toTiledJson(map, 'tileset.png'))) },
    ];
    if (kind === 'voxel3d') {
      const mesh = buildVoxelMesh(map);
      files.push(
        { path: 'map/map.glb', bytes: encodeGlb(mesh) },
        { path: 'map/map.obj', bytes: utf8(encodeObj(mesh)) },
      );
    }
    const saved = await saveFiles(files, (n) => window.confirm(t('overwrite', { count: n })));
    if (saved) setMessage(t('saved', { count: saved }));
  }

  return (
    <div className="screen">
      <header className="bar">
        <button className="btn" type="button" onClick={() => go('home')}>
          ‹ {t('back')}
        </button>
        <h1 className="bar-title">{t('mapsTitle')}</h1>
      </header>
      <div className="gen">
        <aside className="side">
          <span className="sect">{t('mapKind')}</span>
          <div className="stack tight">
            {MAP_KINDS.map((k) => (
              <button
                key={k}
                className="fmt"
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {t(`kinds.${k}`)}
              </button>
            ))}
          </div>
          <label className="label" htmlFor="biome">
            {t('biome')}
          </label>
          <select
            id="biome"
            className="input"
            value={biome}
            onChange={(e) => setBiome(e.target.value as Biome)}
          >
            {BIOMES.map((b) => (
              <option key={b} value={b}>
                {t(`biomes.${b}`)}
              </option>
            ))}
          </select>
          <div className="seg full" role="group" aria-label={t('mapSize')}>
            {SIZES.map((n) => (
              <button
                key={n}
                className="chip"
                type="button"
                aria-pressed={size === n}
                onClick={() => setSize(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="btn" type="button" onClick={() => setSeed(seed + 1)}>
            {t('newMap')}
          </button>
          {flat && (
            <>
              <span className="sect">{t('brush')}</span>
              <div className="row wrap">
                {TILES.slice(1).map((name) => {
                  const [r, g, b] = tileColor(TILES.indexOf(name));
                  return (
                    <button
                      key={name}
                      className="chip"
                      type="button"
                      aria-pressed={TILES[brush] === name}
                      onClick={() => setBrush(TILES.indexOf(name))}
                    >
                      <i className="swatch" style={{ background: `rgb(${r} ${g} ${b})` }} />
                      {t(`tiles.${name}`)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <span className="sp" />
          {message && (
            <p className="tag ok" role="status">
              {message}
            </p>
          )}
          <button className="btn pri big" type="button" onClick={() => void save()}>
            {t('exportMap')}
          </button>
        </aside>
        <section className="gen-stage">
          <canvas
            ref={canvas}
            className="px map-canvas"
            role="img"
            aria-label={t('mapsTitle')}
            style={{
              cursor: flat ? 'crosshair' : 'default',
              maxWidth: flat ? map.width * TILE * 2 : undefined,
            }}
            onPointerDown={(e) => {
              painting.current = true;
              paint(e);
            }}
            onPointerMove={paint}
            onPointerUp={() => {
              painting.current = false;
            }}
            onPointerLeave={() => {
              painting.current = false;
            }}
          />
        </section>
      </div>
    </div>
  );
}
