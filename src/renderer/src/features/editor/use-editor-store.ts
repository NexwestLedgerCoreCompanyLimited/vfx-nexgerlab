import { create } from 'zustand';
import type { EditorCommand } from '../../../../engine/commands';
import { createHistory, execute, redo, undo, type History } from '../../../../engine/history';
import { createProjectFromEffect } from '../../../../engine/project-factory';
import type { ProjectHandle } from '../../../../shared/contracts/ipc';
import type { Direction } from '../../../../shared/directions';
import { newProject } from '../../../../shared/models/new-project';
import type { ProjectV1 } from '../../../../shared/schemas/project';

export type Route = 'home' | 'quick-look' | 'studio' | 'export' | 'characters' | 'maps' | 'connect';
export type Playback = 'stopped' | 'playing';

interface EditorState {
  route: Route;
  returnRoute: Route;
  assetsReady: boolean;
  missingAssets: string[];
  project?: ProjectV1 | undefined;
  handle?: ProjectHandle | undefined;
  history?: History | undefined;
  selectedLayerId?: string | undefined;
  currentFrame: number;
  playback: Playback;
  zoom: number;
  startTab: 'layers' | 'sprites';
  previewDirection?: Direction | undefined;
  dirty: boolean;
  renderRevision: number;
  reset(): void;
  go(route: Route): void;
  openEffect(id: string, name: string, language: 'en' | 'th'): void;
  openBlank(name: string, startTab?: 'layers' | 'sprites'): void;
  openHandle(handle: ProjectHandle): void;
  setHandle(handle: ProjectHandle): void;
  markSaved(): void;
  dispatch(command: EditorCommand): void;
  replaceProject(project: ProjectV1): void;
  undo(): void;
  redo(): void;
  setFrame(frame: number): void;
  select(layerId: string | undefined): void;
  setPlayback(playback: Playback): void;
  setZoom(zoom: number): void;
  setPreviewDirection(direction: Direction | undefined): void;
}

const blank = {
  route: 'home' as Route,
  returnRoute: 'home' as Route,
  assetsReady: true,
  missingAssets: [] as string[],
  project: undefined,
  handle: undefined,
  history: undefined,
  selectedLayerId: undefined,
  currentFrame: 0,
  playback: 'playing' as Playback,
  zoom: 2,
  startTab: 'layers' as 'layers' | 'sprites',
  previewDirection: undefined,
  dirty: false,
  renderRevision: 0,
};

export const useEditor = create<EditorState>((set, get) => {
  const apply = (project: ProjectV1, dirty = true) => {
    const { selectedLayerId, currentFrame, renderRevision } = get();
    set({
      project,
      dirty,
      renderRevision: renderRevision + 1,
      currentFrame: Math.min(currentFrame, project.timeline.frames - 1),
      selectedLayerId: project.layers.some((l) => l.id === selectedLayerId)
        ? selectedLayerId
        : project.layers[0]?.id,
    });
  };
  const load = (project: ProjectV1, route: Route, handle?: ProjectHandle) =>
    set({
      project,
      handle,
      route,
      history: createHistory(project),
      selectedLayerId: project.layers[0]?.id,
      currentFrame: 0,
      playback: 'playing',
      dirty: false,
      assetsReady: project.assets.length === 0,
      missingAssets: [],
      previewDirection: undefined,
    });

  return {
    ...blank,
    reset: () => set(blank),
    go: (route) =>
      set((s) => ({
        route,
        currentFrame: 0,
        returnRoute: route === 'export' ? s.route : s.returnRoute,
      })),
    openEffect: (id, name, language) =>
      load(createProjectFromEffect(id, { name, language }), 'quick-look'),
    openBlank: (name, startTab = 'layers') => {
      set({ startTab });
      load(newProject(name), 'studio');
    },
    openHandle: (handle) => load(handle.project, 'studio', handle),
    setHandle: (handle) => set({ handle }),
    markSaved: () => set({ dirty: false }),
    dispatch: (command) => {
      const { history } = get();
      if (history) apply(execute(history, command));
    },
    replaceProject: (project) => {
      const { history } = get();
      if (history) apply(execute(history, { type: 'replace', project }));
    },
    undo: () => {
      const { history } = get();
      if (history) apply(undo(history));
    },
    redo: () => {
      const { history } = get();
      if (history) apply(redo(history));
    },
    setFrame: (frame) => {
      const { project } = get();
      if (project) set({ currentFrame: Math.max(0, Math.min(project.timeline.frames - 1, frame)) });
    },
    select: (selectedLayerId) => set({ selectedLayerId }),
    setPlayback: (playback) => set({ playback }),
    setZoom: (zoom) => set({ zoom }),
    setPreviewDirection: (previewDirection) => set({ previewDirection }),
  };
});
