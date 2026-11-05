// MCP over stdio: one JSON-RPC message per line. stdout carries only protocol messages.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { handleMessage, type RpcMessage } from './server';

const root = process.env.VFXLAB_MCP_OUTPUT ?? join(homedir(), 'VFX NexgerLab', 'MCP output');
const send = (message: unknown) => process.stdout.write(`${JSON.stringify(message)}\n`);

let pending = Promise.resolve();

createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  // tools run one at a time, in the order they arrive
  pending = pending.then(async () => {
    let message: RpcMessage;
    try {
      message = JSON.parse(line) as RpcMessage;
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      return;
    }
    try {
      const response = await handleMessage(message, root);
      if (response) send(response);
    } catch (error) {
      console.error(error);
      if (message.id !== undefined)
        send({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32603, message: 'Internal error' },
        });
    }
  });
});
