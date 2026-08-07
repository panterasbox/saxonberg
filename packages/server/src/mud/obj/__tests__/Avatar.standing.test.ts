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
import { _clearDominantTraitCache } from '../api/TraitLogic';
import { _clearPractisingCache } from '../api/AdvancementLogic';

const FIGURES = [
  'playStanding',
  'makeStanding',
  'renown',
  'dominantTrait',
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

  it('every figure declares at least one change source', () => {
    for (const d of Avatar.subscribableFields) {
      expect(d.changes?.length ?? 0, `${d.name} has no change source`)
        .toBeGreaterThan(0);
    }
  });

  it('the two folded figures also re-resolve on a warm', () => {
    // Without the warm source, a figure whose cache was cold at
    // subscribe time would stay blank until something unrelated
    // happened to trigger a re-resolve.
    for (const name of ['dominantTrait', 'practisingCompetence']) {
      const d = Avatar.subscribableFields.find((x) => x.name === name)!;
      const kinds = (d.changes ?? []).map((c) => c.on.KIND);
      expect(kinds, `${name}`).toContain('standing.warmed');
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
    _clearDominantTraitCache();
    _clearPractisingCache();
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
      ['dominantTrait', 'practisingCompetence'],
      avatar as unknown as Stuff & Sensor
    );
    // `read` returned undefined -> projectFields skipped the key
    // entirely. The client renders nothing. If this ever becomes `0`
    // or `null`-by-default, the honesty convention has been broken.
    expect('dominantTrait' in out).toBe(false);
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
