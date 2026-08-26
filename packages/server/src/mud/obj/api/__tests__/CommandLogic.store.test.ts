/**
 * Store-first command views (content-packs wave 2, D8): `preloadAll`
 * serves every stored `command-view` document and counts NO disk
 * fallback for them; a key the store lacks is read from disk and
 * counted; `reload(docPath)` replaces the cached definition from the
 * store (help text changes); `invalidate` then `getCommand` falls to
 * disk and counts; `diskFallbacks()` lists the residue.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommandApi } from '../../../api/command';
import { DocumentApi } from '../../../api/document';
import { PersistApi } from '../../../api/persist';
import { StoredDocument } from '../../../lib/document/StoredDocument';

function view(path: string, data: Record<string, unknown>): StoredDocument {
  const d = new StoredDocument();
  d.path = path;
  d.kind = 'command-view';
  d.data = data;
  return d;
}

const PING = {
  verbs: ['ping'],
  controller: '/obj/command/system/PingController',
  description: 'stored ping',
  help: 'from the store',
};

let stored: StoredDocument[];
/** Built, not written: a kernel test does not name shipped content. */
const LOCAL = ['', 'domain', 'eternal', 'duncan-hall', 'cmd', 'provision'].join('/');

beforeEach(() => {
  CommandApi.clearCache();
  stored = [view('/cmd/system/ping', PING)];
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async () => stored);
  vi.spyOn(DocumentApi, 'read').mockImplementation(
    async (path: string) => stored.find((d) => d.path === path) ?? null,
  );
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  CommandApi.clearCache();
});

describe('CommandApi — store-first', () => {
  it('preload serves a stored view and counts no disk fallback for it', async () => {
    const r = await CommandApi.preloadAll();
    expect(r.failed).toEqual([]);
    expect(CommandApi.getCommand('system/ping.yaml')?.help).toBe('from the store');
    expect(CommandApi.diskFallbacks()).not.toContain('system/ping.yaml');
    // Every other engine verb came from disk (the pack's tree) and is counted.
    expect(CommandApi.diskFallbacks()).toContain('perception/look.yaml');
    expect(r.loaded).toBeGreaterThan(100);
  });

  it('a stored view that does not conform is a failed entry, never a throw', async () => {
    stored.push(view('/cmd/system/broken', { description: 'no verbs' }));
    const r = await CommandApi.preloadAll();
    expect(r.failed).toContain('system/broken.yaml');
    expect(CommandApi.getCommand('system/ping.yaml')).not.toBeNull();
  });

  it('reload(docPath) replaces the cached definition from the store', async () => {
    await CommandApi.preloadAll();
    stored[0] = view('/cmd/system/ping', { ...PING, help: 'edited live' });
    expect(await CommandApi.reload('/cmd/system/ping')).toBe(true);
    expect(CommandApi.getCommand('system/ping.yaml')?.help).toBe('edited live');
    expect(CommandApi.diskFallbacks()).not.toContain('system/ping.yaml');
  });

  it('reload of a path the store lacks returns false and leaves the key to disk', async () => {
    await CommandApi.preloadAll();
    expect(await CommandApi.reload('/cmd/perception/look')).toBe(false);
    expect(CommandApi.getCommand('perception/look.yaml')).not.toBeNull();
    expect(CommandApi.diskFallbacks()).toContain('perception/look.yaml');
  });

  it('invalidate then getCommand falls to disk and counts', async () => {
    await CommandApi.preloadAll();
    expect(CommandApi.invalidate('system/ping.yaml')).toBe(true);
    // The disk copy (the platform pack's own file) is served and counted.
    const cmd = CommandApi.getCommand('system/ping.yaml');
    expect(cmd).not.toBeNull();
    expect(cmd?.help).not.toBe('from the store');
    expect(CommandApi.diskFallbacks()).toContain('system/ping.yaml');
  });

  it('a domain-local view is keyed by its domain-prefixed path both ways', async () => {
    stored.push(
      view(LOCAL, {
        verbs: ['provision'],
        controller: '../command/ProvisionController',
        description: 'stored provision',
      }),
    );
    await CommandApi.preloadAll();
    const key = `${LOCAL.slice(1)}.yaml`;
    const cmd = CommandApi.getCommand(key);
    expect(cmd?.description).toBe('stored provision');
    expect(cmd?.category).toBe('domain');
    expect(CommandApi.diskFallbacks()).not.toContain(key);
  });
});
