/**
 * ⭐ **The five standing figures as data.**
 *
 * `score` has always been able to tell you your renown. What it could
 * not do was hand a client a *number* — it rendered one into a
 * sentence, so a shelf widget would have had to re-parse prose. These
 * tests pin the structured path.
 *
 * The assertions worth reading are the two negative ones:
 *
 *   - a cold derived cache yields `undefined`, which
 *     `projectFields` OMITS — so the client shows **no value**, never a
 *     zero. A zero would be a claim the server never made.
 *   - the figures are self-only; another viewer's subscription must not
 *     carry them, because `profile` already owns other-viewer standing
 *     and its redaction rules must not get a second copy here.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import Avatar from '../Avatar';
import { MqlSubscriptionApi } from '../../api/mql-subscription';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  makeStuffAtPath,
  makeStuff,
} from '../../lib/security/__tests__/test-setup';
import type { Sensor } from '../../lib/message/Sensor';
import { AdvancementApi } from '../../api/advancement';

/**
 * ⚠ `dominantTrait` is deliberately NOT a figure. Your trait position
 * stays off the live dashboard so the psychology vocation stays
 * buildable — you cannot read yourself; another person can. A pinnable
 * "your most pronounced trait" widget is the stat sheet that forecloses
 * it. See Avatar.subscribableFields.
 */
const FIGURES = [
  'playStanding',
  'makeStanding',
  'renown',
  'practisingCompetence',
];

/**
 * Synchronous construction — `makeStuffAtPath` skips the clone
 * pipeline, so no `postRegister` and no mongo. These tests are about
 * the field descriptors, not about how an avatar comes to exist.
 */
function makeAvatar(playerId: string): Avatar {
  return makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
}

describe('Avatar standing figures — declaration', () => {
  it('declares all five as subscribable fields', () => {
    const names = Avatar.subscribableFields.map((d) => d.name);
    for (const f of FIGURES) expect(names).toContain(f);
  });

  it('⭐ every figure declares a durableKey, not a bus change source', () => {
    // A `changes` source keyed on anything but 'target'/'field' is
    // indexed under `null` and can never match — which is exactly how
    // the first cut of these fields shipped wired to nothing. The
    // re-resolve path is the durable-subject witness instead.
    for (const d of Avatar.subscribableFields) {
      expect(d.durableKey, `${d.name} has no durableKey`).toBeTypeOf(
        'function'
      );
      expect(d.changes ?? [], `${d.name} should not ride the bus`).toEqual([]);
    }
  });

  it('durableKey resolves to the ledger key, and is absent for a guest', () => {
    const d = Avatar.subscribableFields[0]!;
    expect(d.durableKey!(makeAvatar('tester') as unknown as Stuff)).toBe(
      '/obj/Avatar/tester'
    );
    expect(d.durableKey!(makeStuff(() => new Avatar()) as unknown as Stuff))
      .toBeUndefined();
  });

  it('⭐⭐ never exposes a trait position — the psychology vocation depends on it', () => {
    // "You cannot read yourself; another person can." A live widget
    // showing your own dominant trait is the stat sheet that makes the
    // therapist unnecessary, and it would foreclose the vocation before
    // it is built. If a trait figure ever appears here, that is a
    // product decision that must be made deliberately — not by someone
    // adding a field because the data was reachable.
    const names = Avatar.subscribableFields.map((d) => d.name);
    for (const n of names) {
      expect(
        /trait|disposition|personality/i.test(n),
        `${n} exposes a trait position on the live dashboard`
      ).toBe(false);
    }
  });

  it('no figure is marked static — a standing that never changes is a bug', () => {
    for (const d of Avatar.subscribableFields) {
      expect(d.static).not.toBe(true);
    }
  });
});

describe('Avatar standing figures — projection', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    AdvancementApi._clearDerivedCacheForTesting();
  });

  it('projects the sync figures as structured values, never strings', () => {
    const avatar = makeAvatar('tester');
    const out = MqlSubscriptionApi.projectFields(
      avatar as unknown as Stuff,
      ['playStanding', 'makeStanding', 'renown'],
      avatar as unknown as Stuff & Sensor
    );
    for (const f of ['playStanding', 'makeStanding', 'renown']) {
      expect(out[f], `${f} missing`).toBeDefined();
      expect(
        typeof out[f],
        `${f} must be structured data, not a rendered string`
      ).toBe('object');
    }
  });

  it('⭐ omits a folded figure while its cache is cold — absent, not zero', () => {
    const avatar = makeAvatar('tester');
    const out = MqlSubscriptionApi.projectFields(
      avatar as unknown as Stuff,
      ['practisingCompetence'],
      avatar as unknown as Stuff & Sensor
    );
    // `read` returned undefined -> projectFields skipped the key
    // entirely. The client renders nothing. If this ever becomes `0`
    // or `null`-by-default, the honesty convention has been broken.
    expect('practisingCompetence' in out).toBe(false);
  });

  it('always carries the stuffId, whatever else resolves', () => {
    const avatar = makeAvatar('tester');
    const out = MqlSubscriptionApi.projectFields(
      avatar as unknown as Stuff,
      FIGURES,
      avatar as unknown as Stuff & Sensor
    );
    expect(out.stuffId).toBe(avatar.stuffId);
  });

  it('⭐ is self-only — another viewer sees no standing at all', () => {
    // `profile` already owns other-viewer standing, redaction rules and
    // all. If these fields ever answer for a third party, there are two
    // implementations of that policy and they will drift.
    const subject = makeAvatar('subject');
    const onlooker = makeAvatar('onlooker');
    const out = MqlSubscriptionApi.projectFields(
      subject as unknown as Stuff,
      FIGURES,
      onlooker as unknown as Stuff & Sensor
    );
    for (const f of FIGURES) expect(f in out, `${f} leaked`).toBe(false);
  });

  it('yields nothing for an avatar with no durable key', () => {
    // A guest has no `/obj/Avatar/<playerId>` stamp, so there is no
    // subject the ledgers could be keyed on. Better to answer nothing
    // than to answer for the wrong subject.
    const guest = makeStuff(() => new Avatar());
    const out = MqlSubscriptionApi.projectFields(
      guest as unknown as Stuff,
      FIGURES,
      guest as unknown as Stuff & Sensor
    );
    for (const f of FIGURES) expect(f in out).toBe(false);
  });
});
