/**
 * The registry's three reads, and which question each answers.
 *
 * `byTemplatePath` is keyed on `identity ?? templatePath` (D17), so an
 * identity-stamped clone is filed away from its lineage. That made
 * `findAllByTemplatePath` a liar: asked for a ROW it returned only the
 * row's *unstamped* clones, which is how a market stall's uniqueness
 * check came to scan a bucket holding one object (itself) and pass.
 *
 * So the reads are three, by name:
 *   - `findAllByTemplatePath(row)`  — every instance cloned from the row,
 *     minted identities included.
 *   - `findByIdentityPath(path)`    — the bucket filed at exactly `path`.
 *   - `findByTemplatePath(path)`    — the one instance there, or throw.
 *
 * ⚠ The row read's lineage filter applies to the NESTED half only. An
 * identity passed to it must still return its exact hit, because a
 * minted instance's `getTemplatePath()` is its row and never the
 * identity it was stamped with — the corpse's ordinal probe is the case
 * that proves it (and that probe asks `findByIdentityPath` now).
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../stuff';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

const ROW = '/stuff/idea/widget';

class Widget extends Idea {}

beforeEach(() => {
  StuffApi.clearAll();
});

describe('a row is enumerated honestly', () => {
  it('⭐ returns unstamped clones AND row-prefixed stamped ones', () => {
    const bareA = makeStuffAtPath(() => new Widget(), ROW);
    const bareB = makeStuffAtPath(() => new Widget(), ROW);
    const mintedA = makeStuffAtPath(() => new Widget(), ROW, `${ROW}/one`);
    const mintedB = makeStuffAtPath(() => new Widget(), ROW, `${ROW}/two`);

    const all = StuffApi.findAllByTemplatePath(ROW);
    expect(all).toHaveLength(4);
    expect(new Set(all)).toEqual(new Set([bareA, bareB, mintedA, mintedB]));
  });

  it('the identity read sees only what is filed at exactly that path', () => {
    makeStuffAtPath(() => new Widget(), ROW);
    makeStuffAtPath(() => new Widget(), ROW);
    const mintedA = makeStuffAtPath(() => new Widget(), ROW, `${ROW}/one`);

    // Two unstamped clones fall back to the row as their index key.
    expect(StuffApi.findByIdentityPath(ROW)).toHaveLength(2);
    expect(StuffApi.findByIdentityPath(`${ROW}/one`)).toEqual([mintedA]);
  });

  it('⚠ an IDENTITY passed to the row read still returns its exact hit', () => {
    const minted = makeStuffAtPath(() => new Widget(), ROW, `${ROW}/one`);
    // The filter is scoped to the nested half; applying it to the whole
    // union would drop this, because the minted instance's template path
    // is the ROW, not the identity it is filed under.
    expect(StuffApi.findAllByTemplatePath(`${ROW}/one`)).toEqual([minted]);
  });

  it('the singleton read is untouched: one resolves, two throw', () => {
    const mintedA = makeStuffAtPath(() => new Widget(), ROW, `${ROW}/one`);
    expect(StuffApi.findByTemplatePath(`${ROW}/one`)).toBe(mintedA);

    makeStuffAtPath(() => new Widget(), ROW);
    makeStuffAtPath(() => new Widget(), ROW);
    expect(() => StuffApi.findByTemplatePath(ROW)).toThrow(
      /expected singleton, found 2/,
    );
  });

  it('⭐⭐ a CONTINUITY family is out of the index\'s reach — the roster owns it', () => {
    // ⭐ The two identity patterns point opposite ways, and this is where
    // that bites. INDIVIDUATION is row-prefixed (one row, many
    // identities nested under it), so the row read finds it by prefix.
    // CONTINUITY is family-prefixed: many lineages (`PrimaryAvatar`,
    // `ShadeAvatar`, the wire body) wear ONE identity under a family
    // namespace that is deliberately not any of their rows. Neither
    // string is a prefix of the other, so neither direction resolves —
    // and that is not a gap to be clever about: `PlayerApi`'s roster
    // (`registerAvatar` / `findAvatarByPlayerId`) is what answers
    // "every avatar", and it always has.
    const row = '/platform/agent/PrimaryAvatar';
    const family = '/platform/agent/Avatar';
    const one = makeStuffAtPath(() => new Widget(), row, `${family}/p1`);
    const two = makeStuffAtPath(() => new Widget(), row, `${family}/p2`);

    // Asking the index for the family: nothing is cloned FROM it.
    expect(StuffApi.findAllByTemplatePath(family)).toEqual([]);
    // Asking it for the lineage: the identities are filed elsewhere.
    expect(StuffApi.findAllByTemplatePath(row)).toEqual([]);
    // Asking for one person: resolves, and this is the read every
    // identity-keyed ledger actually performs.
    expect(StuffApi.findByIdentityPath(`${family}/p1`)).toEqual([one]);
    expect(StuffApi.findByIdentityPath(`${family}/p2`)).toEqual([two]);
    expect(StuffApi.findByTemplatePath(`${family}/p2`)).toBe(two);
  });

  it('a destroyed-and-unregistered instance leaves the row read', () => {
    const bare = makeStuffAtPath(() => new Widget(), ROW);
    const minted = makeStuffAtPath(() => new Widget(), ROW, `${ROW}/one`);
    expect(StuffApi.findAllByTemplatePath(ROW)).toHaveLength(2);

    StuffApi.unregister(minted);
    expect(StuffApi.findAllByTemplatePath(ROW)).toEqual([bare]);
  });
});
