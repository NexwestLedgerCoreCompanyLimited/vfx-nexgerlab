import { useEffect } from 'react';
import { missingAssetIds } from '../../../../engine/project-factory';
import type { AssetFrame } from '../../../../shared/models/asset';
import { renderClient } from '../../engine/client';
import { useEditor } from '../editor/use-editor-store';

/** Loads sprites when a project opens, whichever tab it lands on, so preview and export always have them. */
export function useProjectAssets(): void {
  const path = useEditor((s) => s.handle?.path);
  const assetsKey = useEditor((s) => s.project?.assets.map((a) => a.id).join());

  useEffect(() => {
    const { project, handle } = useEditor.getState();
    if (!project || !handle) return;
    let live = true;
    useEditor.setState({ assetsReady: false });
    void (async () => {
      const map = new Map<string, AssetFrame[]>();
      for (const ref of project.assets) {
        try {
          map.set(ref.id, await window.vfxlab.readAssetFrames(handle.path, ref));
        } catch {
          // one unreadable file must not stop the rest; missingAssetIds reports it
        }
      }
      if (!live) return;
      renderClient().setAssets(map);
      useEditor.setState((s) => ({
        assetsReady: true,
        missingAssets: missingAssetIds(project, new Set(map.keys())),
        renderRevision: s.renderRevision + 1,
      }));
    })();
    return () => {
      live = false;
    };
  }, [path, assetsKey]);
}
