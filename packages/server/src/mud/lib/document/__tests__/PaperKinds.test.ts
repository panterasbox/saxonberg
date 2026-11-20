/**
 * The filed record kinds — freight paper (bill of lading, warehouse
 * receipt, rate card), the fishery and the water body — and the constraint
 * they are shaped by: **no new Mongo collection** (AC21). Each is a row in
 * `documents`, path-keyed under its keeper's own branch, declared by the
 * pack that owns it (`<pack>/content/kinds/<kind>.yaml`).
 *
 * ⭐ Records of something that happened: nothing ships them (no `shipped`
 * trait, so no pack file can vanish and erase one, and no content dir is
 * reserved), and the nightly reset keeps the whole collection.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { DocumentKind } from '../DocumentKind';
import { Collections } from '../../persistence/Collections';
import { RESET_DISPOSITIONS } from '../../persistence/ResetPolicy';

const CONTENT = join(fileURLToPath(new URL('.', import.meta.url)), '../../../../../../content');

function declared(name: string): DocumentKind {
  for (const pack of readdirSync(CONTENT)) {
    const file = join(CONTENT, pack, 'content', 'kinds', `${name}.yaml`);
    if (existsSync(file)) return new DocumentKind(name, YAML.parse(readFileSync(file, 'utf8')) ?? {});
  }
  throw new Error(`no declaration for ${name}`);
}

const RECORDS = ['bill-of-lading', 'warehouse-receipt', 'rate-card', 'fishery', 'body'] as const;

describe('the filed record kinds', () => {
  it('each is declared, runtime-only (nothing ships it) and path-keyed (no words)', () => {
    for (const name of RECORDS) {
      const kind = declared(name);
      expect(kind.shipped()).toBeNull();
      expect(kind.keyworded()).toBeNull();
    }
  });

  it('⚠ AC21 — they add NO collection: they are rows in `documents`', () => {
    const names = Object.values(Collections) as string[];
    for (const name of RECORDS) expect(names).not.toContain(name);
    expect(names).toContain('documents');
  });

  it('a filed record survives the nightly reset — the collection is kept', () => {
    // A shipment, or a reservoir's withdrawal, that evaporated at 04:00 is
    // the failure nobody would see until a player complained.
    expect(RESET_DISPOSITIONS[Collections.Documents].verb).toBe('keep');
  });
});
