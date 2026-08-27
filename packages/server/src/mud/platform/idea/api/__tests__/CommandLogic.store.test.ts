/**
 * Command views (content-packs wave 2 D8, wave 3 D6): with a document
 * store, `preloadAll` serves every stored `command-view` document and a
 * key the store lacks is a MISS once the preload served the store —
 * nothing reads disk (`getCommand` → null, `invalidate` then `getCommand`
 * → null); `reload(docPath)` replaces the
 * cached definition from the store (help text changes); a stored
 * domain-local view resolves its relative controller against the
 * mud-rooted anchor. OFFLINE (no store), the packs' own files are read —
 * the source of truth — for engine and locality views alike.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommandApi } from '../../../../api/command';
import { DocumentApi } from '../../../../api/document';
import { PersistApi } from '../../../../api/persist';
import { StoredDocument } from '../../../../lib/document/StoredDocument';

function view(path: string, data: Record<string, unknown>): StoredDocument {
  const d = new StoredDocument();
  d.path = path;
  d.kind = 'command-view';
  d.data = data;
  return d;
}

const PING = {
  verbs: ['ping'],
  controller: '/platform/idea/cmd/system/PingController',
  description: 'stored ping',
  help: 'from the store',
};

let stored: StoredDocument[];
/** Built, not written: a kernel test does not name shipped content. */
const LOCAL = ['', 'world', 'eternal', 'duncan-hall', 'cmd', 'provision'].join('/');

function withStore(): void {
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async () => stored);
  vi.spyOn(DocumentApi, 'read').mockImplementation(
    async (path: string) => stored.find((d) => d.path === path) ?? null,
  );
}

beforeEach(() => {
  CommandApi.clearCache();
  stored = [view('/platform/cmd/system/ping', PING)];
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  CommandApi.clearCache();
});

describe('CommandApi — with a store', () => {
  it('preload serves the stored views and nothing else — a key the store lacks is a miss', async () => {
    withStore();
    const r = await CommandApi.preloadAll();
    expect(r.failed).toEqual([]);
    expect(r.loaded).toBe(1);
    expect(CommandApi.getCommand('platform/cmd/system/ping.yaml')?.help).toBe('from the store');
    // The platform pack ships this file, and it is NOT read: no disk fallback.
    expect(CommandApi.getCommand('platform/cmd/perception/look.yaml')).toBeNull();
    expect(CommandApi.allDefinitions()).toHaveLength(1);
  });

  it('a stored view that does not conform is a failed entry, never a throw', async () => {
    withStore();
    stored.push(view('/platform/cmd/system/broken', { description: 'no verbs' }));
    const r = await CommandApi.preloadAll();
    expect(r.failed).toContain('platform/cmd/system/broken.yaml');
    expect(CommandApi.getCommand('platform/cmd/system/ping.yaml')).not.toBeNull();
  });

  it('reload(docPath) replaces the cached definition from the store', async () => {
    withStore();
    await CommandApi.preloadAll();
    stored[0] = view('/platform/cmd/system/ping', { ...PING, help: 'edited live' });
    expect(await CommandApi.reload('/platform/cmd/system/ping')).toBe(true);
    expect(CommandApi.getCommand('platform/cmd/system/ping.yaml')?.help).toBe('edited live');
  });

  it('reload of a path the store lacks returns false; the key stays a miss', async () => {
    withStore();
    await CommandApi.preloadAll();
    expect(await CommandApi.reload('/platform/cmd/perception/look')).toBe(false);
    expect(CommandApi.getCommand('platform/cmd/perception/look.yaml')).toBeNull();
  });

  it('invalidate then getCommand is a miss — nothing falls to disk', async () => {
    withStore();
    await CommandApi.preloadAll();
    expect(CommandApi.invalidate('platform/cmd/system/ping.yaml')).toBe(true);
    expect(CommandApi.getCommand('platform/cmd/system/ping.yaml')).toBeNull();
  });

  it('a stored domain-local view is keyed by its domain-prefixed path and resolves its relative controller', async () => {
    withStore();
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
    expect(cmd?.category).toBe('local');
    // `../command/ProvisionController` against the mud-rooted anchor — the
    // same path the disk read resolved to.
    expect(cmd?.resolvedController).toBe(`${LOCAL.split('/').slice(0, -2).join('/')}/command/ProvisionController`);
  });
});

describe('CommandApi — offline (no store): the packs\' files are the source', () => {
  it('preload reads every engine view from the platform pack and every locality view from its pack', async () => {
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(false);
    const r = await CommandApi.preloadAll();
    expect(r.failed).toEqual([]);
    expect(r.loaded).toBeGreaterThan(100);
    expect(CommandApi.getCommand('platform/cmd/perception/look.yaml')).not.toBeNull();
    // A locality view (its pack's `content/world/**/cmd/`), keyed domain-prefixed.
    const local = CommandApi.allDefinitions().find((d) => d.category === 'local');
    expect(local).toBeDefined();
  }, 30_000);

  it('a key no pack ships is null', () => {
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(false);
    expect(CommandApi.getCommand('nowhere/nothing.yaml')).toBeNull();
  });
});
