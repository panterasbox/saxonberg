/**
 * `Document.toBatchWrite` — a row as one write of a `PersistApi.saveMany`
 * batch (db-performance D7): what `save` prepares, returned instead of
 * sent. Keyed, keyed-and-partial, or by its own `_id`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import ParticipationStanding from '../../standing/ParticipationStanding';

function row(): ParticipationStanding {
  const r = new ParticipationStanding();
  r.subject = '/platform/agent/Avatar/p1';
  r.value = 2.5;
  r.recomputedAt = 10;
  r.recomputedRealAt = 20;
  return r;
}

describe('Document.toBatchWrite', () => {
  it('keyed: the whole row, the key named, updatedAt stamped', async () => {
    const r = row();
    const w = await r.toBatchWrite({ key: ['subject', 'scope'] });
    expect(w.key).toEqual(['subject', 'scope']);
    expect(w.insert).toBeUndefined();
    expect(w.doc).toMatchObject({ subject: r.subject, scope: '*', value: 2.5, recomputedAt: 10, recomputedRealAt: 20 });
    expect(w.doc.updatedAt).toBeInstanceOf(Date);
    expect('_id' in w.doc).toBe(false);
  });

  it('partial: only the named fields, the key and updatedAt', async () => {
    const w = await row().toBatchWrite({ key: ['subject', 'scope'], fields: ['value'], insert: false });
    expect(Object.keys(w.doc).sort()).toEqual(['scope', 'subject', 'updatedAt', 'value']);
    expect(w.insert).toBe(false);
  });

  it('unkeyed: addressed by its own _id, as save would', async () => {
    const r = row();
    r._id = '0123456789abcdef01234567';
    const w = await r.toBatchWrite();
    expect(w.key).toBeUndefined();
    expect(w.doc._id).toBe('0123456789abcdef01234567');
  });
});
