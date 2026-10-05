/**
 * Test seam: stand in for the corpse template so a death can mint a body.
 *
 * ⭐⭐ **Why every death-touching test needs this now.** Since the
 * carcass-chain build `ConditionApi.die` mints a `Corpse` from the dead
 * thing and destructs it — for a beast and an NPC as well as a player.
 * The mint clones the authored row `/stuff/thing/Corpse` and **throws**
 * when it is missing, deliberately: a body failing to appear where
 * somebody died would leave a death with no evidence, no loot and nothing
 * to examine, and forensics simply would not work in that world.
 *
 * A unit world has no Template store, so the clone reaches Mongo and the
 * rejection surfaces as an unhandled one — several `die` callers are
 * fire-and-forget (`Vitals.expireDying` from a sync reconcile). That is
 * the loud failure doing its job in a place where loudness is noise.
 *
 * So this stubs **only** the corpse path and leaves every other clone
 * alone (the `sandbox.crossing` precedent, lifted out of it so eight test
 * files stop each carrying a copy).
 *
 * ⚠ **It applies the `dataOverlay`**, because a bare `new Corpse()` stand-in
 * would make every assertion about what a corpse CARRIES vacuous. The
 * dispatch mirrors the `TemplateApplier`'s Phase 1 — prefer `set<Field>`,
 * else assign — plus the one coercion the real marshaller performs
 * (`mass` is authored as a bare number and stored as a `Quantity<'kg'>`).
 *
 * Lives under `__tests__/` without a `.test.ts` suffix so vitest's default
 * include glob skips it; it is only imported explicitly by tests.
 *
 * @internal — do not import from production code.
 */

import { vi } from 'vitest';
import Corpse from '../../../platform/thing/Corpse';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../paths';
import { Quantity } from '../../quantity';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/**
 * Install the stub. Returns the live array of corpses minted since the
 * call, in mint order — so a test can assert that a death left exactly
 * one body and read what it carries.
 *
 * Call in `beforeEach` (paired with `vi.restoreAllMocks()` and
 * `StuffApi.clearAll()` in `afterEach`).
 */
export function installCorpseMintStub(opts?: {
  stampRequestedIdentity?: boolean;
}): Corpse[] {
  const minted: Corpse[] = [];
  let seq = 0;
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (
    path: string,
    ...rest: unknown[]
  ) => {
    if (path !== TemplatePaths.mortalityCorpse) {
      return realClone(path, ...(rest as []));
    }
    const cloneOpts = rest[1] as
      | { dataOverlay?: Record<string, unknown>; asIdentityPath?: string }
      | undefined;
    // ⚠ A distinct path per body, through the sanctioned stamping seam.
    // The real mint stamps a derived identity (`corpseIdentityFor`), and
    // `byTemplatePath` throws on two live objects at one path — so a test
    // that kills twice needs two keys.
    //
    // ⭐⭐ `stampRequestedIdentity` files the body under the identity the
    // MINT ASKED FOR instead of a stub key, and a test that exercises
    // `corpseIdentityFor`'s own ordinal needs it. The registry indexes on
    // `_identityStampOf(obj) ?? getTemplatePath()` (`api/stuff.ts:230`),
    // so stamping the requested identity as the path reproduces the
    // index state the real mint's probe reads. ⚠ Without it the probe
    // would find nothing — every stub corpse sits under `/stub/<n>` — and
    // a collision test would pass VACUOUSLY while asserting the opposite
    // of what production does.
    // ⭐ In `stampRequestedIdentity` mode the body is filed exactly where
    // production would file it: under the minted identity when the mint
    // asked for one, and **under the bare corpse ROW when it did not** —
    // which is now the ordinary case for a beast, whose identity is a row
    // its flock shares. Two live objects at one row is legal (only
    // `findByTemplatePath` demands a singleton, and nothing reads this row
    // that way), so a test can assert the un-minted case directly.
    const corpse = opts?.stampRequestedIdentity
      ? makeStuffAtPath(
          () => new Corpse(),
          cloneOpts?.asIdentityPath ?? TemplatePaths.mortalityCorpse,
        )
      : makeStuffAtPath(
          () => new Corpse(),
          `${TemplatePaths.mortalityCorpse}/stub/${++seq}`,
        );
    corpse.setKeywords(['body', 'corpse', 'carcass']);
    corpse.setLifecycleState('dead');
    for (const [field, value] of Object.entries(cloneOpts?.dataOverlay ?? {})) {
      if (field === 'mass') {
        corpse.setMass(Quantity.of(value as number, 'kg'));
        continue;
      }
      const setter = `set${field.charAt(0).toUpperCase()}${field.slice(1)}`;
      const fn = (corpse as unknown as Record<string, unknown>)[setter];
      if (typeof fn === 'function') {
        (fn as (v: unknown) => void).call(corpse, value);
      } else {
        (corpse as unknown as Record<string, unknown>)[field] = value;
      }
    }
    minted.push(corpse);
    return corpse;
  }) as unknown as typeof StuffApi.clone);
  return minted;
}
