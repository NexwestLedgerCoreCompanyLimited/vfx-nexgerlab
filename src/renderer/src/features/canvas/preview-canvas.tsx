import { useEffect, useRef, useState } from 'react';
import type { LayerError, RenderOptions } from '../../../../engine/render-types';
import type { ProjectV1 } from '../../../../shared/schemas/project';
import { renderClient } from '../../engine/client';
import { paintFrame } from '../../engine/canvas-renderer';
import { useEditor } from '../editor/use-editor-store';

const ONE_SHOT_REST_MS = 450;

/** Moves the playhead at the project's frame rate while playing. */
export function usePlayback(rate: number, restart: boolean): void {
  const playback = useEditor((s) => s.playback);
  const fps = useEditor((s) => s.project?.timeline.fps ?? 30);

  useEffect(() => {
    if (playback !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    let held = 0;
    let carry = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const { project, currentFrame, setFrame, setPlayback } = useEditor.getState();
      if (project) {
        const end = project.timeline.frames - 1;
        if (currentFrame >= end && !project.timeline.loop) {
          if (!restart) {
            setPlayback('stopped');
            return;
          }
          held += dt;
          if (held > ONE_SHOT_REST_MS) {
            held = 0;
            setFrame(0);
          }
        } else {
          carry += (dt / 1000) * fps * rate;
          const steps = Math.floor(carry);
          if (steps > 0) {
            carry -= steps;
            setFrame(
              currentFrame + steps > end ? (project.timeline.loop ? 0 : end) : currentFrame + steps,
            );
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playback, fps, rate, restart]);
}

interface Props {
  project: ProjectV1;
  frame: number;
  options: RenderOptions;
  zoom: number;
  label: string;
  onErrors?(errors: LayerError[]): void;
}

export function PreviewCanvas({ project, frame, options, zoom, label, onErrors }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: project.canvas.width, height: project.canvas.height });

  useEffect(() => {
    let live = true;
    void renderClient()
      .renderLatest(project, frame, options)
      .then((result) => {
        if (!live || !result || !canvas.current) return;
        paintFrame(canvas.current, result.frame);
        setSize({ width: result.frame.width, height: result.frame.height });
        onErrors?.(result.errors);
      });
    return () => {
      live = false;
    };
    // the options object is rebuilt each render; its fields are the real dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, frame, options.partFilter, options.includeStage, options.backdrop]);

  return (
    <canvas
      ref={canvas}
      className="px stage"
      role="img"
      aria-label={label}
      style={{ width: size.width * zoom, height: size.height * zoom }}
    />
  );
}

/** The largest integer scale that fits, so pixels stay square. */
export function fitZoom(width: number, height: number, areaW: number, areaH: number): number {
  return Math.max(1, Math.floor(Math.min(areaW / width, areaH / height)));
}
