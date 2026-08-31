/**
 * The schema-doc loader and the index plan it drives.
 *
 * Three properties, and the first two are the reason the loader throws
 * rather than defaulting: a collection nobody described is exactly the
 * state the schema docs exist to end, so the boot has to say so.
 *
 * The plan is asserted rather than the driver, because the plan is the
 * part with a decision in it — `createIndexes()` is a loop that issues
 * what the plan says and catches per index.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readdirSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PersistenceManager, Collections } from '../PersistenceManager';
import { COLLECTION_POLICIES } from '../../mud/lib/persistence/CollectionPolicy';

const SCHEMA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../schema'
);

const temps: string[] = [];

/** A copy of the real schema directory, minus/plus whatever a test says. */
function schemaDirWith(opts: {
  omit?: string[];
  extra?: Record<string, string>;
}): string {
  const dir = mkdtempSync(join(tmpdir(), 'schema-'));
  temps.push(dir);
  for (const file of readdirSync(SCHEMA_DIR)) {
    if (!file.endsWith('.yaml')) continue;
    if (opts.omit?.includes(file)) continue;
    copyFileSync(join(SCHEMA_DIR, file), join(dir, file));
  }
  for (const [file, body] of Object.entries(opts.extra ?? {})) {
    writeFileSync(join(dir, file), body, 'utf-8');
  }
  return dir;
}

afterEach(() => {
  // Restore the real docs so a later test in this file sees the world.
  PersistenceManager.get().loadSchemaDocs(SCHEMA_DIR);
  while (temps.length > 0) {
    rmSync(temps.pop()!, { recursive: true, force: true });
  }
});

describe('loadSchemaDocs', () => {
  it('loads one doc per collection in the vocabulary', () => {
    const pm = PersistenceManager.get();
    pm.loadSchemaDocs(SCHEMA_DIR);
    const docs = pm.allSchemaDocs();
    expect(docs).toHaveLength(Object.values(Collections).length);
    expect(new Set(docs.map((d) => d.collection))).toEqual(
      new Set(Object.values(Collections))
    );
  });

  it('⚠ a known collection with no doc THROWS, naming it', () => {
    const dir = schemaDirWith({ omit: ['bank_ledger.yaml'] });
    expect(() => PersistenceManager.get().loadSchemaDocs(dir)).toThrow(
      /no schema doc for bank_ledger/
    );
  });

  it('names every undescribed collection, not just the first', () => {
    const dir = schemaDirWith({ omit: ['wiki.yaml', 'chattel.yaml'] });
    expect(() => PersistenceManager.get().loadSchemaDocs(dir)).toThrow(
      /chattel, wiki/
    );
  });

  it('⚠ a doc naming a collection that does not exist THROWS', () => {
    const dir = schemaDirWith({
      extra: {
        'sprockets.yaml': [
          'collection: sprockets',
          'owner: none',
          'subsystem: persistence.md',
          'summary: A collection nobody declared.',
          'purpose: |',
          '  Nothing writes here, because it is not in the vocabulary.',
          'sandbox: refuse',
          'reset: wipe',
          'indexes: []',
          '',
        ].join('\n'),
      },
    });
    expect(() => PersistenceManager.get().loadSchemaDocs(dir)).toThrow(
      /sprockets.*name no collection in the vocabulary/s
    );
  });

  it('throws when the filename and the declared collection disagree', () => {
    const dir = schemaDirWith({
      extra: {
        'widgets.yaml': [
          'collection: wiki',
          'owner: none',
          'subsystem: wiki.md',
          'summary: Mislabelled.',
          'purpose: |',
          '  The stem must be the collection name.',
          'sandbox: pass',
          'reset: wipe',
          'indexes: []',
          '',
        ].join('\n'),
      },
    });
    expect(() => PersistenceManager.get().loadSchemaDocs(dir)).toThrow(
      /the filename must be the collection name/
    );
  });

  it('surfaces a malformed doc through SchemaDocError, naming the file', () => {
    const dir = schemaDirWith({
      omit: ['chattel.yaml'],
      extra: { 'chattel.yaml': 'collection: chattel\nowner: none\n' },
    });
    expect(() => PersistenceManager.get().loadSchemaDocs(dir)).toThrow(
      /SchemaDoc\(chattel\.yaml\)/
    );
  });
});

describe('plannedIndexes', () => {
  const pm = PersistenceManager.get();

  it('issues exactly the indexes the docs declare, with their options', () => {
    pm.loadSchemaDocs(SCHEMA_DIR);
    const plan = pm.plannedIndexes();

    const ledger = plan.filter(
      (i) => i.collection === Collections.BankLedger && i.source === 'authored'
    );
    expect(ledger.map((i) => i.keys)).toEqual([
      { fromAccount: 1 },
      { toAccount: 1 },
      { kind: 1 },
      { at: 1 },
    ]);

    const ttl = plan.find(
      (i) =>
        i.collection === Collections.Diagnostics &&
        i.options.expireAfterSeconds !== undefined
    );
    expect(ttl?.keys).toEqual({ expiresAt: 1 });
    expect(ttl?.options.expireAfterSeconds).toBe(0);

    const subjects = plan.find(
      (i) => i.collection === Collections.ForumSubjects && i.options.unique
    );
    expect(subjects?.options.collation).toEqual({ locale: 'en', strength: 2 });
  });

  it('routes a `text: true` index through the text path, not createIndex', () => {
    pm.loadSchemaDocs(SCHEMA_DIR);
    const text = pm.plannedIndexes().filter((i) => i.text);
    expect(text.map((i) => i.collection).sort()).toEqual([
      Collections.ForumEntries,
      Collections.PlayerFrames,
      Collections.Wiki,
    ]);
    // ⚠ The frames one is compound on `owner` first — an equality prefix
    // is the only way a per-owner text search uses it.
    const frames = text.find((i) => i.collection === Collections.PlayerFrames);
    expect(Object.keys(frames!.keys)).toEqual(['owner', 'body']);
  });

  it('⭐ derives the circleScope partial from the sandbox policy, not a list', () => {
    pm.loadSchemaDocs(SCHEMA_DIR);
    const derived = pm.plannedIndexes().filter((i) => i.source === 'derived');
    const stamped = Object.entries(COLLECTION_POLICIES)
      .filter(([, policy]) => policy.verb === 'stamp')
      .map(([collection]) => collection)
      .sort();
    expect(derived.map((i) => i.collection).sort()).toEqual(stamped);
    for (const index of derived) {
      expect(index.keys).toEqual({ circleScope: 1 });
      expect(index.options.partialFilterExpression).toEqual({
        circleScope: { $exists: true },
      });
    }
  });

  it('carries every authored `why` into the plan', () => {
    pm.loadSchemaDocs(SCHEMA_DIR);
    for (const index of pm.plannedIndexes()) {
      expect(index.why.length).toBeGreaterThan(0);
    }
  });

  it('a doc with no indexes contributes none', () => {
    pm.loadSchemaDocs(SCHEMA_DIR);
    const plan = pm.plannedIndexes();
    // `chattel` declares no index today, and is not STAMP, so nothing.
    expect(plan.filter((i) => i.collection === Collections.Chattel)).toEqual([]);
  });
});
