import type { ProjectV1 } from '../shared/schemas/project';
import { applyCommand, type EditorCommand } from './commands';

// Snapshots share unchanged objects, and binary assets live on disk, so entries stay small.
const MAX_ENTRIES = 200;

export interface History {
  past: ProjectV1[];
  present: ProjectV1;
  future: ProjectV1[];
  lastGesture?: string | undefined;
}

export function createHistory(project: ProjectV1): History {
  return { past: [], present: project, future: [] };
}

export function execute(history: History, command: EditorCommand): ProjectV1 {
  const next = applyCommand(history.present, command);
  const sameGesture = command.gestureId !== undefined && command.gestureId === history.lastGesture;
  if (!sameGesture) {
    history.past.push(history.present);
    if (history.past.length > MAX_ENTRIES) history.past.shift();
  }
  history.present = next;
  history.future = [];
  history.lastGesture = command.gestureId;
  return next;
}

export function undo(history: History): ProjectV1 {
  const previous = history.past.pop();
  if (previous) {
    history.future.push(history.present);
    history.present = previous;
    history.lastGesture = undefined;
  }
  return history.present;
}

export function redo(history: History): ProjectV1 {
  const next = history.future.pop();
  if (next) {
    history.past.push(history.present);
    history.present = next;
    history.lastGesture = undefined;
  }
  return history.present;
}
