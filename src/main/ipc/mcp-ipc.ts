import { app, ipcMain } from 'electron';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { IPC, type McpConfig } from '../../shared/contracts/ipc';

/** Electron runs the bundled server as plain Node, so AI clients need nothing else installed. */
export function registerMcpIpc(): void {
  ipcMain.handle(IPC.getMcpConfig, (): McpConfig => ({
    command: process.execPath,
    args: [join(app.getAppPath(), 'out/main/mcp.js')],
    env: { ELECTRON_RUN_AS_NODE: '1' },
    outputDir: join(homedir(), 'VFX NexgerLab', 'MCP output'),
  }));
}
