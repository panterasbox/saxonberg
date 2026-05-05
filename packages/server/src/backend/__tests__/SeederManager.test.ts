/**
 * SeederManager unit tests. The seeder's logic is filesystem walk +
 * insert-if-missing, which we exercise against a fake Mongo
 * collection. We point the seeder at a tmpdir laid out with the same
 * shape the engine uses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PersistenceManager } from '../PersistenceManager';
import { SeederManager } from '../SeederManager';

function installFakeCollection(): {
  docs: Map<string, Record<string, unknown>>;
  findCalls: Array<unknown>;
  insertCalls: Array<unknown>;
} {
  const docs = new Map<string, Record<string, unknown>>();
  const findCalls: Array<unknown> = [];
  const insertCalls: Array<unknown> = [];
  const fake = {
    findOne: vi.fn(async (filter: { path: string }) => {
      findCalls.push(filter);
      return docs.get(filter.path) ?? null;
    }),
    insertOne: vi.fn(async (doc: Record<string, unknown>) => {
      insertCalls.push(doc);
      docs.set(doc.path as string, doc);
      return { insertedId: 'fake' };
    }),
  };
  vi.spyOn(PersistenceManager.get(), 'getCollection').mockReturnValue(
    fake as unknown as ReturnType<PersistenceManager['getCollection']>
  );
  return { docs, findCalls, insertCalls };
}

describe('SeederManager', () => {
  let seedsDir: string;

  beforeEach(() => {
    seedsDir = mkdtempSync(join(tmpdir(), 'seeder-'));
  });

  afterEach(() => {
    rmSync(seedsDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('inserts a missing template and skips it on re-run', async () => {
    mkdirSync(join(seedsDir, 'obj'), { recursive: true });
    writeFileSync(
      join(seedsDir, 'obj', 'EventRegistry.yaml'),
      'class: /obj/EventRegistry\nhydratorClass: /lib/persistence/PersistentHydrator\ndata: {}\n'
    );

    const fake = installFakeCollection();

    const firstRun = await SeederManager.run({ seedsDir });
    expect(firstRun).toBe(1);
    expect(fake.insertCalls).toHaveLength(1);
    const inserted = fake.insertCalls[0] as Record<string, unknown>;
    expect(inserted.path).toBe('/obj/EventRegistry');
    expect(inserted.class).toBe('/obj/EventRegistry');

    const secondRun = await SeederManager.run({ seedsDir });
    expect(secondRun).toBe(0);
    expect(fake.insertCalls).toHaveLength(1); // unchanged
  });

  it('walks subdirectories', async () => {
    mkdirSync(join(seedsDir, 'rooms', 'plaza'), { recursive: true });
    writeFileSync(
      join(seedsDir, 'rooms', 'plaza', 'fountain.yaml'),
      'class: /lib/Location\ndata: {}\n'
    );
    writeFileSync(
      join(seedsDir, 'rooms', 'plaza', 'bench.yaml'),
      'class: /lib/Location\ndata: {}\n'
    );

    const fake = installFakeCollection();

    const inserted = await SeederManager.run({ seedsDir });
    expect(inserted).toBe(2);
    const paths = fake.insertCalls.map(
      (d) => (d as { path: string }).path
    );
    expect(paths.sort()).toEqual([
      '/rooms/plaza/bench',
      '/rooms/plaza/fountain',
    ]);
  });

  it('throws on malformed YAML', async () => {
    writeFileSync(join(seedsDir, 'broken.yaml'), 'not: valid: yaml: [');
    installFakeCollection();
    await expect(SeederManager.run({ seedsDir })).rejects.toThrow();
  });

  it('throws when YAML parses to a non-object value', async () => {
    writeFileSync(join(seedsDir, 'plain.yaml'), 'just-a-string\n');
    installFakeCollection();
    await expect(SeederManager.run({ seedsDir })).rejects.toThrow(
      /malformed YAML/
    );
  });

  it('skips files starting with a dot', async () => {
    writeFileSync(join(seedsDir, '.gitkeep'), '');
    installFakeCollection();
    const inserted = await SeederManager.run({ seedsDir });
    expect(inserted).toBe(0);
  });

  it('returns 0 with no errors when seeds dir is empty', async () => {
    installFakeCollection();
    const inserted = await SeederManager.run({ seedsDir });
    expect(inserted).toBe(0);
  });
});
