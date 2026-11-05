import { constants } from 'node:fs';
import { access, copyFile, mkdir, open, readFile, rename, rm } from 'node:fs/promises';

/** The file steps a save depends on, so tests can fail each one without real power loss. */
export interface FileSystemAdapter {
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  flush(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
}

export const nodeFileSystem: FileSystemAdapter = {
  read: (path) => readFile(path, 'utf8'),
  write: async (path, data) => {
    const file = await open(path, 'w');
    try {
      await file.writeFile(data);
    } finally {
      await file.close();
    }
  },
  flush: async (path) => {
    const file = await open(path, 'r+');
    try {
      await file.sync();
    } finally {
      await file.close();
    }
  },
  rename,
  copy: (from, to) => copyFile(from, to),
  remove: (path) => rm(path, { force: true }),
  exists: (path) =>
    access(path, constants.F_OK).then(
      () => true,
      () => false,
    ),
  mkdir: async (path) => {
    await mkdir(path);
  },
};
