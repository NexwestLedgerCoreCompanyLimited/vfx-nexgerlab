// Loaded only by the Electron tests, so they can reach the real worker. Excluded from packages.
import { hashPixels } from '../../engine/frame-hash';
import { createWorkerRenderClient } from './engine/render-client';

Object.assign(window, { bench: { client: createWorkerRenderClient(), hashPixels } });
