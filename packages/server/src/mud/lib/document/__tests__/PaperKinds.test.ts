/**
 * The three paper kinds the logistics build adds — and the constraint
 * they are shaped by: **no new Mongo collection** (AC21). A bill of
 * lading, a warehouse receipt and a rate card are rows in `documents`,
 * path-keyed under the filing business's own branch.
 *
 * ⭐ All three are `onVanish: 'keep'`, on the `water-right` pattern and
 * for the same reason: they are **records of something that happened**,
 * and no absent file may erase one. `release`'s `'delete'` is safe only
 * because nothing files a release from a pack either; here the stakes of
 * getting it wrong are somebody's shipment.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import {
  DOCUMENT_KINDS,
  DECLARED_DOCUMENT_KINDS,
  FLAT_KEY_DOCUMENT_KINDS,
} from '../DocumentKinds';
import { Collections } from '../../persistence/Collections';
import { RESET_DISPOSITIONS } from '../../persistence/ResetPolicy';

const PAPER = ['bill-of-lading', 'warehouse-receipt', 'rate-card'] as const;

describe('the freight paper kinds', () => {
  it('all three are declared, path-keyed, and kept when their file vanishes', () => {
    for (const kind of PAPER) {
      const spec = DOCUMENT_KINDS[kind];
      expect(spec).toBeDefined();
      expect(spec.kind).toBe(kind);
      // Path-keyed: a depot's coverage is `list(prefix)`, so the branch
      // has to be in the path rather than in an index.
      expect(spec.naturalKey).toBeNull();
      expect(spec.onVanish).toBe('keep');
      expect(spec.ext).toBe('yaml');
      expect(DECLARED_DOCUMENT_KINDS).toContain(kind);
      // Path-keyed ⇒ no unique flat-key index is minted for it.
      expect(FLAT_KEY_DOCUMENT_KINDS).not.toContain(kind);
    }
  });

  it('⚠ AC21 — they add NO collection: they are rows in `documents`', () => {
    // The vocabulary of collections is closed and generated; if a kind
    // had brought a collection with it, this list would have grown.
    const names = Object.values(Collections) as string[];
    for (const kind of PAPER) {
      expect(names).not.toContain(kind);
      expect(names).not.toContain(DOCUMENT_KINDS[kind].contentDir);
    }
    expect(names).toContain('documents');
  });

  it('a filed record survives the nightly reset', () => {
    // Derived from DECLARED_DOCUMENT_KINDS, so this holds by
    // construction — asserted because a shipment that evaporates at
    // 04:00 is the failure nobody would see until a player complained.
    const d = RESET_DISPOSITIONS[Collections.Documents];
    expect(d.verb).toBe('wipe-except');
    const keep = (d as unknown as { keep: { kind: { $in: string[] } } }).keep
      .kind.$in;
    for (const kind of PAPER) expect(keep).toContain(kind);
  });

  it('each has its own content dir, and none collides', () => {
    const dirs = DECLARED_DOCUMENT_KINDS.map((k) => DOCUMENT_KINDS[k].contentDir);
    expect(new Set(dirs).size).toBe(dirs.length);
  });
});
