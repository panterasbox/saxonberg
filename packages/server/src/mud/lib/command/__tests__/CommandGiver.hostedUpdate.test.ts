/**
 * CommandGiver hosted-update self-seeding (Step 2.4).
 *
 * Hosting a comms update onto a giver surfaces its `self`-bucket verbs
 * (dm / reply / broadcast / chat) in `getAffordances()` with the update
 * as the affording source; unhosting retires them. Exercises the
 * no-`postRegister` construction path (the lazy `_ensureSelfEntry`
 * safety net) — affordances are read without ever calling postRegister.
 */

import { describe, it, expect } from 'vitest';
import { CommandGiverMixin } from '../CommandGiver';
import { AetherMixin } from '../../message/Aether';
import CommsUpdate from '../../comms/CommsUpdate';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

// A giver that is also an aether host (composes CommandGiver + Aether).
class TestGiver extends CommandGiverMixin(AetherMixin(Idea)) {}

const COMMS_VERBS = ['dm', 'reply', 'broadcast', 'chat'];

function affordedVerbs(giver: TestGiver): string[] {
  return giver.getAffordances().map((a) => a.command.getPrimaryVerb());
}

describe('CommandGiver hosted-update seeding', () => {
  it('hosting a comms update surfaces its verbs with the update as source', () => {
    const giver = makeStuff(() => new TestGiver());
    const comms = makeStuff(() => new CommsUpdate());
    giver.hostUpdate(comms);

    const affordances = giver.getAffordances();
    const verbs = affordances.map((a) => a.command.getPrimaryVerb());
    for (const v of COMMS_VERBS) expect(verbs).toContain(v);

    // Every comms verb is attributed to the comms update.
    for (const v of COMMS_VERBS) {
      const aff = affordances.find((a) => a.command.getPrimaryVerb() === v);
      expect(aff?.source).toBe(comms);
    }
  });

  it('unhosting retires the verbs', () => {
    const giver = makeStuff(() => new TestGiver());
    const comms = makeStuff(() => new CommsUpdate());
    giver.hostUpdate(comms);
    expect(affordedVerbs(giver)).toContain('dm');

    giver.unhostUpdate(comms);
    const verbs = affordedVerbs(giver);
    for (const v of COMMS_VERBS) expect(verbs).not.toContain(v);
  });

  it('a giver with no hosted update affords none of the comms verbs', () => {
    const giver = makeStuff(() => new TestGiver());
    const verbs = affordedVerbs(giver);
    for (const v of COMMS_VERBS) expect(verbs).not.toContain(v);
  });
});
