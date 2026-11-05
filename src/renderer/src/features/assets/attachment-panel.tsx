import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  mapOutputFrames,
  resolveAttachmentFrame,
  setFrameAnchor,
} from '../../../../engine/sprite-attachment';
import type { AssetFrame, StripLayout } from '../../../../shared/models/asset';
import type { AssetRef, SpriteAttachment } from '../../../../shared/schemas/project';
import { newId } from '../../../../shared/utils/id';
import { renderClient } from '../../engine/client';
import { useEditor } from '../editor/use-editor-store';
import { ImportDialog } from './import-dialog';

const CODES = ['missing', 'too-large', 'unsupported', 'corrupt', 'bad-strip', 'in-use'];

export function AttachmentPanel({ onSave }: { onSave(): Promise<void> }) {
  const { t } = useTranslation('editor');
  const { project, handle, currentFrame, replaceProject } = useEditor();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string>();

  const assetsKey = project?.assets.map((a) => a.id).join();
  useEffect(() => {
    if (!handle || !project) return;
    void (async () => {
      const map = new Map<string, AssetFrame[]>();
      for (const ref of project.assets) {
        if (!handle.missingAssets.includes(ref.id))
          map.set(ref.id, await window.vfxlab.readAssetFrames(handle.path, ref));
      }
      renderClient().setAssets(map);
      useEditor.setState((s) => ({ renderRevision: s.renderRevision + 1 }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle?.path, assetsKey]);

  if (!project) return null;
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
      const ref = await window.vfxlab.importAsset(
        { ...current.handle, project: current.project },
        strip,
      );
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
