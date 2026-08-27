/**
 * The move map's own tests. The map is the spine of the whole lib/→obj/
 * migration — the codemod, the lint and the data migration all read it —
 * so its ordering and idempotency properties are asserted here rather
 * than discovered against a live database.
 */

import { describe, it, expect } from 'vitest';
import { MOVES, rewrite, rewriteRepoPath } from '../lib-to-obj-moves';

describe('lib-to-obj move map', () => {
  it('every rule moves out of /lib/ and none moves back in', () => {
    for (const r of MOVES) {
      expect(r.from.startsWith('/lib/'), `${r.from} must start /lib/`).toBe(true);
      expect(r.to.startsWith('/lib/'), `${r.to} must not start /lib/`).toBe(false);
    }
  });

  it('is idempotent — the structural guarantee a half-migrated DB relies on', () => {
    for (const r of MOVES) {
      const once = rewrite(r.from, [r.axis]);
      expect(once).toBe(r.to);
      // A second pass must find nothing left to do.
      expect(rewrite(once!, [r.axis])).toBeNull();
    }
  });

  it('returns null for a string no rule matches', () => {
    expect(rewrite('/obj/Avatar')).toBeNull();
    expect(rewrite('/domain/terminus/bar')).toBeNull();
    expect(rewrite('not a path at all')).toBeNull();
  });

  it('leaves the /lib/ classes that stay put alone on the file axis', () => {
    // Substrate that is only ever inherited, plus the framework
    // attachment and the never-stamped fixtures.
    for (const stays of [
      '/lib/stuff/Stuff',
      '/lib/stuff/Shadow',
      '/lib/stuff/Idea',
      '/lib/zone/Zone',
      '/lib/perception/Modality',
      '/lib/boundary/BoundaryAnchor',
      '/lib/weather/LightningStrike',
      '/lib/sandbox/SandboxCrossingExit',
      '/lib/boundary/ExitableVessel',
      '/lib/behavior/wary',
    ]) {
      expect(rewrite(stays, ['file']), stays).toBeNull();
    }
  });

  describe('the split classes', () => {
    // The base stays in lib/; only a template's class: is repointed.
    const splits: ReadonlyArray<readonly [string, string]> = [
      ['/lib/stuff/Thing', '/obj/Prop'],
      ['/lib/location/CartesianLocation', '/obj/location/Room'],
      ['/lib/npc/NPC', '/obj/NPC'],
      ['/lib/creature/Creature', '/obj/Corpse'],
    ];

    it('repoints a template class: reference', () => {
      for (const [from, to] of splits) {
        expect(rewrite(from, ['classref']), from).toBe(to);
      }
    });

    it('does NOT touch imports or gate strings — the base has not moved', () => {
      for (const [from] of splits) {
        expect(rewrite(from, ['file']), from).toBeNull();
      }
    });
  });

  describe('rule ordering', () => {
    it('prefers the longer prefix — /lib/magic/ must not swallow Spell/', () => {
      expect(rewrite('/lib/magic/Spell/firebolt', ['path'])).toBe(
        '/obj/magic/Spell/firebolt'
      );
      expect(rewrite('/lib/magic/conditions/dread', ['path'])).toBe(
        '/obj/Condition/magic/dread'
      );
    });

    it('lets an exact rule and a prefix rule share a stem', () => {
      // /lib/address is a FolderZone row AND the parent of 12 leaves.
      expect(rewrite('/lib/address', ['path'])).toBe('/obj/Locality');
      expect(rewrite('/lib/address/terminus', ['path'])).toBe('/obj/Locality/terminus');
    });

    it('preserves leaf names exactly — ${prefix}${key} lookups depend on it', () => {
      for (const leaf of ['walk', 'sneak', 'run', 'swim']) {
        expect(rewrite(`/lib/locomotion/${leaf}`, ['path'])).toBe(
          `/obj/LocomotionMode/${leaf}`
        );
      }
      // A unit key with regrettable characters still round-trips.
      expect(rewrite('/lib/persistence/QuantityMarshaller/J-per-kg-K', ['path'])).toBe(
        '/obj/persistence/QuantityMarshaller/J-per-kg-K'
      );
      expect(rewrite('/lib/persistence/QuantityMarshaller/Ω', ['path'])).toBe(
        '/obj/persistence/QuantityMarshaller/Ω'
      );
    });
  });

  describe('axis isolation', () => {
    it('a moved file rewrites on the file axis but is not a path rule', () => {
      expect(rewrite('/lib/messaging/Topic', ['file'])).toBe('/obj/Topic');
      // The Topic *family* moves on the path axis via its prefix rule.
      expect(rewrite('/lib/messaging/Topic/world.narration', ['path'])).toBe(
        '/obj/Topic/world.narration'
      );
    });

    it('narrowing to no axis at all still resolves via the full table', () => {
      expect(rewrite('/lib/equipment/Weapon')).toBe('/obj/equipment/Weapon');
    });
  });

  describe('repo file paths', () => {
    it('moves the pack content trees (the seed tree is gone — content-packs wave 3)', () => {
      expect(rewriteRepoPath('packages/server/src/mud/seeds/lib/magic/Spell')).toBeNull();
      expect(rewriteRepoPath('packages/content/base-library/content/lib/material')).toBe(
        'packages/content/base-library/content/obj/material'
      );
    });

    it('returns null when there is nothing to move', () => {
      expect(rewriteRepoPath('packages/server/src/mud/obj/Avatar.ts')).toBeNull();
    });
  });
});
