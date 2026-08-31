/**
 * SchemaDoc tests — the parser, and every shipped doc through it.
 *
 * Two halves, deliberately different in kind:
 *
 *   1. **Rejection** — one fixture per way a doc can be malformed. A
 *      parser nobody has watched refuse is a parser nobody has tested.
 *   2. **The real directory** — every file under `src/schema/` parses.
 *      The cheapest possible guard against a typo in 48 authored files,
 *      and it fails at `pnpm test:near` rather than at boot.
 *
 * No wiring: `SchemaDoc` is a pure value object, and the directory read
 * is `fs`, not the mudlib's `SourceTreeApi`.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { SchemaDoc, SchemaDocError } from '../SchemaDoc';

const SCHEMA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../schema'
);

const WELL_FORMED = {
  collection: 'bank_ledger',
  owner: 'LedgerEntry',
  subsystem: 'banking.md',
  summary: 'The money system of record.',
  purpose: 'Every movement of money, append-only.',
  invariants: ['Only postTransaction writes here.'],
  sandbox: 'stamp',
  reset: 'wipe',
  indexes: [
    { keys: { account: 1, at: -1 }, why: 'the statement read' },
    { keys: { txId: 1 }, unique: true, why: 'the idempotency key' },
  ],
};

function parse(overrides: Record<string, unknown>): SchemaDoc {
  return SchemaDoc.parse({ ...WELL_FORMED, ...overrides }, 'fixture.yaml');
}

describe('SchemaDoc.parse', () => {
  it('parses a well-formed doc and every field lands', () => {
    const doc = SchemaDoc.parse(WELL_FORMED, 'bank_ledger.yaml');
    expect(doc.collection).toBe('bank_ledger');
    expect(doc.owner).toBe('LedgerEntry');
    expect(doc.subsystem).toBe('banking.md');
    expect(doc.summary).toBe('The money system of record.');
    expect(doc.purpose).toBe('Every movement of money, append-only.');
    expect(doc.invariants).toEqual(['Only postTransaction writes here.']);
    expect(doc.sandbox).toEqual({ verb: 'stamp' });
    expect(doc.reset).toEqual({ verb: 'wipe' });
    expect(doc.indexes).toHaveLength(2);
    expect(doc.indexes[0]!.keys).toEqual({ account: 1, at: -1 });
    expect(doc.indexes[1]!.unique).toBe(true);
  });

  it('reads `owner: none` as no owning class', () => {
    expect(parse({ owner: 'none' }).owner).toBeNull();
  });

  it('takes the mapping form of a sandbox policy with options', () => {
    expect(parse({ sandbox: { verb: 'pass', mark: true } }).sandbox).toEqual({
      verb: 'pass',
      mark: true,
    });
    expect(
      parse({ sandbox: { verb: 'shadow', mode: 'skip' } }).sandbox
    ).toEqual({ verb: 'shadow', mode: 'skip' });
  });

  it('takes the wipe-except reset with its named derivation', () => {
    const doc = parse({
      reset: {
        verb: 'wipe-except',
        keep: 'declared-document-kinds',
        because: 'pack-installed reference data',
      },
    });
    expect(doc.reset).toEqual({
      verb: 'wipe-except',
      keep: 'declared-document-kinds',
      because: 'pack-installed reference data',
    });
  });

  it('derives the enum key from the collection name', () => {
    expect(SchemaDoc.enumKey('bank_ledger')).toBe('BankLedger');
    expect(SchemaDoc.enumKey('wiki')).toBe('Wiki');
    expect(SchemaDoc.enumKey('google_profiles')).toBe('GoogleProfiles');
  });

  // ── Rejections: one fixture per way a doc can be wrong ──────────────

  it('rejects a missing `collection`', () => {
    expect(() => parse({ collection: undefined })).toThrow(SchemaDocError);
    expect(() => parse({ collection: undefined })).toThrow(/`collection`/);
  });

  it('rejects an empty `summary`', () => {
    expect(() => parse({ summary: '   ' })).toThrow(/`summary`/);
  });

  it('rejects an empty `purpose`', () => {
    expect(() => parse({ purpose: '' })).toThrow(/`purpose`/);
  });

  it('rejects an `owner` that is neither a class name nor `none`', () => {
    expect(() => parse({ owner: undefined })).toThrow(/`owner`/);
  });

  it('rejects a `subsystem` that does not name a .md file', () => {
    expect(() => parse({ subsystem: 'banking' })).toThrow(/`subsystem`/);
  });

  it('rejects an unknown sandbox verb', () => {
    expect(() => parse({ sandbox: 'allow' })).toThrow(/unknown `sandbox` verb/);
  });

  it('rejects `sandbox: shadow` with no mode', () => {
    expect(() => parse({ sandbox: 'shadow' })).toThrow(/`mode:`/);
  });

  it('rejects `reset: keep` with no `because`', () => {
    expect(() => parse({ reset: { verb: 'keep' } })).toThrow(/`because`/);
  });

  it('rejects `wipe-except` with an unknown keep derivation', () => {
    expect(() =>
      parse({
        reset: { verb: 'wipe-except', keep: 'everything', because: 'x' },
      })
    ).toThrow(/`reset.keep`/);
  });

  it('rejects an index with no `why`', () => {
    expect(() => parse({ indexes: [{ keys: { a: 1 } }] })).toThrow(
      /`indexes\[0\]\.why`/
    );
  });

  it('rejects an index key direction that is not 1 / -1 / text', () => {
    expect(() =>
      parse({ indexes: [{ keys: { a: 2 }, why: 'x' }] })
    ).toThrow(/must be 1, -1 or 'text'/);
  });

  it('rejects an index with no keys at all', () => {
    expect(() => parse({ indexes: [{ keys: {}, why: 'x' }] })).toThrow(
      /must name at least one field/
    );
  });

  it('names the file and the field in the error', () => {
    expect(() =>
      SchemaDoc.parse({ ...WELL_FORMED, summary: '' }, 'chattel.yaml')
    ).toThrow(/SchemaDoc\(chattel\.yaml\).*`summary`/);
  });
});

describe('the shipped schema directory', () => {
  const files = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.yaml'));

  it('is not empty (the test would otherwise prove nothing)', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files)('%s parses, and its stem is its collection', (file) => {
    const raw = YAML.parse(readFileSync(join(SCHEMA_DIR, file), 'utf-8'));
    const doc = SchemaDoc.parse(raw, file);
    expect(doc.collection).toBe(file.replace(/\.yaml$/, ''));
  });
});
