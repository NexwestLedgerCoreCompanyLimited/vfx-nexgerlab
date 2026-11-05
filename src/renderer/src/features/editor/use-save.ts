import { useCallback, useEffect, useState } from 'react';
import { useEditor } from './use-editor-store';

const AUTOSAVE_MS = 1000;

/** Writes the project. An edit that lands during the write stays dirty, so autosave comes back for it. */
export async function saveCurrent(): Promise<void> {
  const { project, handle, setHandle, renderRevision } = useEditor.getState();
  if (!project) return;
  const target = handle ?? (await window.vfxlab.createProject(project.name));
  if (!target) return;
  const stamped = { ...project, updatedAt: new Date().toISOString() };
  await window.vfxlab.saveProject(target.path, stamped);
  if (!handle) setHandle({ ...target, project: stamped });
  if (useEditor.getState().renderRevision === renderRevision) useEditor.getState().markSaved();
}

/** Saves through the atomic project service. Autosave starts once the project has a folder. */
export function useSave() {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const dirty = useEditor((s) => s.dirty);
  const revision = useEditor((s) => s.renderRevision);
  const path = useEditor((s) => s.handle?.path);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await saveCurrent();
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!dirty || !path) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, path, revision, save]);

  return { save, saving, failed };
}
