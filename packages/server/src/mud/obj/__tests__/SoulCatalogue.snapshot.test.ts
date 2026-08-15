/**
 * `SoulCatalogue.snapshot()` — the catalogue projected for the client's
 * emote picker.
 *
 * The projection is the whole point of the method, so that is what is
 * asserted: canonical verbs only, slots in declaration order, and
 * `required` derived from the author's `optional` flag rather than
 * restated.
 *
 * ⚠ The client draws its picker from this and from nothing else. It
 * previously drew from a hardcoded six-entry array, so a projection that
 * silently dropped or reordered slots would be invisible until somebody
 * tried to `;wave` at a person and waved at a manner instead.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SoulCatalogue from '../SoulCatalogue';
import { Emote } from '../../lib/social/Emote';
import { SoulApi } from '../../api/soul';
import { StuffApi } from '../../api/stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

function emote(
  verb: string,
  over: Partial<{
    aliases: string[];
    emoji: string;
    tags: string[];
    slots: Record<string, { kind: 'stuff' | 'free'; optional?: boolean; scope?: string }>;
  }> = {},
): Emote {
  const e = new Emote();
  e.verb = verb;
  e.aliases = over.aliases ?? [];
  e.tags = over.tags ?? [];
  if (over.emoji !== undefined) e.emoji = over.emoji;
  e.grammar = { slots: over.slots ?? {}, template: '' };
  return e;
}

/**
 * Seed the warm cache directly, the way `warmCache` does — including the
 * alias entries, because indexing aliases into the same map is exactly
 * the thing `snapshot` has to undo.
 *
 * ⚠ Deliberate white-box seam: `cache` is TypeScript-private, and the
 * alternative is a Mongo round trip for a pure projection test.
 */
function seed(cat: SoulCatalogue, emotes: Emote[]): void {
  const map = new Map<string, Emote>();
  for (const e of emotes) {
    map.set(e.verb, e);
    for (const a of e.aliases) map.set(a, e);
  }
  (cat as unknown as { cache: Map<string, Emote> }).cache = map;
}

/*
 * ⚠ ONE catalogue for the whole file, seeded per test.
 *
 * `SoulLogic` caches the resolved catalogue in a module-level ref that
 * survives `StuffApi.clearAll()`, so tearing the singleton down between
 * tests would leave the logic pointing at a destroyed Stuff. Re-seeding
 * the same instance is the honest way to keep the tests independent.
 *
 * The call goes through `SoulApi` rather than touching the catalogue
 * directly: its methods are gated to admit only the facade and the logic
 * singleton, and a test that reached past that would be testing a path
 * production does not have.
 */
describe('SoulCatalogue.snapshot', () => {
  let cat: SoulCatalogue;

  beforeAll(() => {
    StuffApi.clearAll();
    cat = makeStuffAtPath(
      () => new SoulCatalogue(),
      '/obj/SoulCatalogue',
    ) as SoulCatalogue;
  });
  afterAll(() => StuffApi.clearAll());

  it('emits one entry per canonical verb, never one per alias', async () => {
    seed(cat, [
      emote('nod', { aliases: ['agree', 'yes'], emoji: '\u{1F642}' }),
      emote('wave', { emoji: '\u{1F44B}' }),
    ]);
    const snap = await SoulApi.snapshot();
    expect(snap.map((e) => e.verb).sort()).toEqual(['nod', 'wave']);
    // The aliases ride their canonical entry rather than becoming cells.
    expect(snap.find((e) => e.verb === 'nod')!.aliases).toEqual([
      'agree',
      'yes',
    ]);
  });

  it('keeps slots in declaration order — that is binding order', async () => {
    seed(cat, [
      emote('wave', {
        emoji: '\u{1F44B}',
        slots: {
          at: { kind: 'stuff' },
          manner: { kind: 'free' },
        },
      }),
    ]);
    const [wave] = await SoulApi.snapshot();
    expect(wave!.slots.map((s) => s.name)).toEqual(['at', 'manner']);
    expect(wave!.slots.map((s) => s.kind)).toEqual(['stuff', 'free']);
  });

  it('derives `required` from the author’s `optional` flag', async () => {
    seed(cat, [
      emote('point', {
        slots: {
          at: { kind: 'stuff' },
          how: { kind: 'free', optional: true },
        },
      }),
    ]);
    const [point] = await SoulApi.snapshot();
    // Absent `optional` means required — the binder raises on a
    // required slot that does not bind.
    expect(point!.slots.find((s) => s.name === 'at')!.required).toBe(true);
    expect(point!.slots.find((s) => s.name === 'how')!.required).toBe(false);
  });

  it('carries a stuff slot’s resolution scope and omits it for free', async () => {
    seed(cat, [
      emote('salute', {
        slots: {
          at: { kind: 'stuff', scope: 'room' },
          note: { kind: 'free' },
        },
      }),
    ]);
    const [salute] = await SoulApi.snapshot();
    expect(salute!.slots[0]!.scope).toBe('room');
    expect(salute!.slots[1]!.scope).toBeUndefined();
  });

  it('omits emoji entirely for a glyph-less emote', async () => {
    seed(cat, [emote('sigh')]);
    const [sigh] = await SoulApi.snapshot();
    // Present-but-undefined and absent read the same on the wire, but
    // the client filters on `emoji !== undefined` to keep glyph-less
    // emotes out of the grid, so this is the field that matters.
    expect(sigh!.emoji).toBeUndefined();
  });
});
