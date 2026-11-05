import { supportsCustomActor } from '../../../../engine/actor-adapter';
import { encodePng } from '../../../../engine/exporters/png';
import { ASE_MAGIC, decodeAseprite } from '../../../../engine/importers/aseprite';
import type { ProjectHandle } from '../../../../shared/contracts/ipc';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  mapOutputFrames,
  resolveAttachmentFrame,
  setFrameAnchor,
} from '../../../../engine/sprite-attachment';
import type { StripLayout } from '../../../../shared/models/asset';
import type { AssetRef, SpriteAttachment, SpriteFx } from '../../../../shared/schemas/project';
import { newId } from '../../../../shared/utils/id';
import { useEditor } from '../editor/use-editor-store';
import { decodeImage } from './decode-image';
import { ImportDialog } from './import-dialog';

/** PNG and GIF go straight to main. Other formats decode here and arrive as a PNG. */
async function importPicked(handle: ProjectHandle, strip?: StripLayout): Promise<AssetRef> {
  const { name, bytes } = await window.vfxlab.readPickedAsset();
  const png = bytes[0] === 0x89 && bytes[1] === 0x50;
  const gif = bytes[0] === 0x47 && bytes[1] === 0x49;
  if (png || gif) return window.vfxlab.importAsset(handle, strip);
  if (new DataView(bytes.buffer, bytes.byteOffset).getUint16(4, true) === ASE_MAGIC) {
    const frames = decodeAseprite(bytes);
    const first = frames[0]!;
    const pixels = new Uint8ClampedArray(first.width * frames.length * first.height * 4);
    frames.forEach((f, i) => {
      for (let y = 0; y < first.height; y++) {
        const row = f.rgba.subarray(y * first.width * 4, (y + 1) * first.width * 4);
        pixels.set(row, (y * first.width * frames.length + i * first.width) * 4);
      }
    });
    const strip2 = { width: first.width * frames.length, height: first.height, pixels };
    return window.vfxlab.importAssetBytes(handle, name, encodePng(strip2), {
      frameCount: frames.length,
      fps: Math.max(1, Math.min(60, Math.round(1000 / first.durationMs))),
    });
  }
  const frame = await decodeImage(bytes);
  return window.vfxlab.importAssetBytes(
    handle,
    name,
    encodePng({ width: frame.width, height: frame.height, pixels: frame.rgba }),
    strip,
  );
}

const FX_KINDS = ['aura', 'glow', 'light', 'recolor'] as const;
const FX_DEFAULTS: Record<SpriteFx['kind'], Pick<SpriteFx, 'color' | 'placement'>> = {
  aura: { color: '#32e6f2', placement: 'behind-sprite' },
  glow: { color: '#9b6cff', placement: 'behind-sprite' },
  light: { color: '#ffd84a', placement: 'in-front-sprite' },
  recolor: { color: '#58b4ec', placement: 'in-front-sprite' },
};
const CODES = ['missing', 'too-large', 'unsupported', 'corrupt', 'bad-strip', 'in-use'];

function SpriteFxControls({
  attachment,
  onChange,
}: {
  attachment: SpriteAttachment;
  onChange(a: SpriteAttachment): void;
}) {
  const { t } = useTranslation('editor');
  const list = attachment.fx ?? [];
  const set = (fx: SpriteFx[]) => onChange({ ...attachment, fx });
  return (
    <div className="stack tight">
      <span className="sect">{t('spriteFx')}</span>
      <div className="row wrap">
        {FX_KINDS.map((kind) => (
          <button
            key={kind}
            className="chip"
            type="button"
            aria-pressed="false"
            onClick={() =>
              set([...list, { id: newId(), kind, strength: 0.8, ...FX_DEFAULTS[kind] }])
            }
          >
            {t(`addFx.${kind}`)}
          </button>
        ))}
      </div>
      {list.map((fx) => {
        const name = t(`fxNames.${fx.kind}`);
        const patch = (p: Partial<SpriteFx>) =>
          set(list.map((o) => (o.id === fx.id ? { ...o, ...p } : o)));
        return (
          <div className="row" key={fx.id}>
            <span className="small">{name}</span>
            <input
              type="color"
              aria-label={`${t('fxColor')}: ${name}`}
              value={fx.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
            <input
              type="range"
              aria-label={`${t('fxStrength')}: ${name}`}
              min={0}
              max={1}
              step={0.05}
              value={fx.strength}
              onChange={(e) => patch({ strength: Number(e.target.value) })}
            />
            <button
              className="ibtn"
              type="button"
              aria-label={`${t('removeFx')}: ${name}`}
              onClick={() => set(list.filter((o) => o.id !== fx.id))}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function AttachmentPanel({ onSave }: { onSave(): Promise<void> }) {
  const { t } = useTranslation('editor');
  const { project, handle, currentFrame, replaceProject, selectedLayerId } = useEditor();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string>();

  if (!project) return null;
  const layer = project.layers.find((l) => l.id === selectedLayerId);
  const fail = (e: unknown) => {
    const code = CODES.find((c) => String(e).includes(c));
    setError(code ? t(`importError.${code}`) : String(e));
  };

  async function pick() {
    setError(undefined);
    if (!handle) await onSave();
    if (await window.vfxlab.pickAssetFile()) setAsking(true);
  }

  async function runImport(strip?: StripLayout) {
    setAsking(false);
    const current = useEditor.getState();
    if (!current.handle || !current.project) return;
    try {
      const ref = await importPicked({ ...current.handle, project: current.project }, strip);
      if (!current.project.assets.some((a) => a.id === ref.id)) {
        current.replaceProject({ ...current.project, assets: [...current.project.assets, ref] });
      }
    } catch (e) {
      fail(e);
    }
  }

  function attach(ref: AssetRef) {
    const { fps, frames } = project!.timeline;
    const attachment: SpriteAttachment = {
      id: newId(),
      assetId: ref.id,
      outputToSourceFrames: mapOutputFrames(ref.frameCount, ref.fps ?? fps, frames, fps),
      frameAnchors: [],
      behindPartIds: [],
      inFrontPartIds: [],
    };
    replaceProject({ ...project!, spriteAttachments: [...project!.spriteAttachments, attachment] });
  }

  const update = (a: SpriteAttachment) =>
    replaceProject({
      ...project,
      spriteAttachments: project.spriteAttachments.map((o) => (o.id === a.id ? a : o)),
    });

  async function remove(ref: AssetRef) {
    if (!handle || !window.confirm(t('confirmDelete', { name: ref.originalName }))) return;
    try {
      await window.vfxlab.removeAsset(handle.path, project!, ref.id);
      replaceProject({ ...project!, assets: project!.assets.filter((a) => a.id !== ref.id) });
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div className="stack tight">
      <button className="btn" type="button" onClick={() => void pick()}>
        {t('import')}
      </button>
      {!handle && <p className="muted small">{t('saveFirst')}</p>}
      {error && (
        <p className="warn small" role="alert">
          {error}
        </p>
      )}
      {asking && (
        <ImportDialog onImport={(s) => void runImport(s)} onCancel={() => setAsking(false)} />
      )}
      {project.assets.length === 0 && <p className="muted small">{t('noSprites')}</p>}
      {project.assets.map((ref) => {
        const attachment = project.spriteAttachments.find((a) => a.assetId === ref.id);
        const frame = Math.min(currentFrame, (attachment?.outputToSourceFrames.length ?? 1) - 1);
        const resolved = attachment && resolveAttachmentFrame(attachment, frame);
        return (
          <div className="stack tight sprite" key={ref.id}>
            <span className="small">{ref.originalName}</span>
            <span className="mono small muted">
              {ref.width} × {ref.height} · {ref.frameCount}
            </span>
            {attachment && resolved ? (
              <>
                <div className="two">
                  {(['x', 'y'] as const).map((axis) => (
                    <div key={axis}>
                      <label className="label" htmlFor={`a-${axis}`}>
                        {t(axis === 'x' ? 'anchorX' : 'anchorY')}
                      </label>
                      <input
                        id={`a-${axis}`}
                        className="input mono"
                        type="number"
                        value={resolved.anchor[axis]}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (Number.isFinite(value))
                            update(
                              setFrameAnchor(
                                attachment,
                                resolved.sourceFrameIndex,
                                resolved.pivot,
                                { ...resolved.anchor, [axis]: value },
                              ),
                            );
                        }}
                      />
                    </div>
                  ))}
                </div>
                <SpriteFxControls attachment={attachment} onChange={update} />
                {layer && (
                  <button
                    className="btn"
                    type="button"
                    disabled={!supportsCustomActor(layer.effectId)}
                    aria-pressed={layer.actorAssetId === ref.id}
                    onClick={() => {
                      const { actorAssetId: _old, ...rest } = layer;
                      const next =
                        layer.actorAssetId === ref.id ? rest : { ...rest, actorAssetId: ref.id };
                      replaceProject({
                        ...project,
                        layers: project.layers.map((l) => (l.id === layer.id ? next : l)),
                      });
                    }}
                  >
                    {layer.actorAssetId === ref.id ? t('usingCharacter') : t('useAsCharacter')}
                  </button>
                )}
                {layer && !supportsCustomActor(layer.effectId) && (
                  <p className="muted small">{t('noActor')}</p>
                )}
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    replaceProject({
                      ...project,
                      spriteAttachments: project.spriteAttachments.filter(
                        (a) => a.id !== attachment.id,
                      ),
                    })
                  }
                >
                  {t('detach')}
                </button>
              </>
            ) : (
              <button className="btn" type="button" onClick={() => attach(ref)}>
                {t('attach')}
              </button>
            )}
            <button className="btn" type="button" onClick={() => void remove(ref)}>
              {t('deleteSprite')}
            </button>
          </div>
        );
      })}
    </div>
  );
}
