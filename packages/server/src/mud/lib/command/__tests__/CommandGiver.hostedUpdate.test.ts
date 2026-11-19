/**
 * CommandGiver hosted-app self-seeding (Step 2.4).
 *
 * Hosting an app onto a giver surfaces its `self`-bucket verbs (the
 * wallet app's `pay` / `wallet`) in `getAffordances()` with the app as
 * the affording source; unhosting retires them. Exercises the
 * no-`onCreate` construction path (the lazy `_ensureSelfEntry`
 * safety net) — affordances are read without ever calling onCreate.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { CommandGiverMixin } from '../CommandGiver';
import { AetherMixin } from '../../message/Aether';
import { AetherHostMixin } from '../../augmentation/AetherHost';
import WalletApp from '../../../platform/idea/WalletApp';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

// A giver that is also an aether host (composes CommandGiver + Aether).
class TestGiver extends CommandGiverMixin(AetherHostMixin(AetherMixin(Idea))) {}

const APP_VERBS = ['pay', 'wallet'];

function affordedVerbs(giver: TestGiver): string[] {
  return giver.getAffordances().map((a) => a.command.getPrimaryVerb());
}

describe('CommandGiver hosted-app seeding', () => {
  it('hosting an app surfaces its verbs with the app as source', () => {
    const giver = makeStuff(() => new TestGiver());
    const app = makeStuff(() => new WalletApp());
    giver.hostApp(app);

    const affordances = giver.getAffordances();
    const verbs = affordances.map((a) => a.command.getPrimaryVerb());
    for (const v of APP_VERBS) expect(verbs).toContain(v);

    // Every app verb is attributed to the app.
    for (const v of APP_VERBS) {
      const aff = affordances.find((a) => a.command.getPrimaryVerb() === v);
      expect(aff?.source).toBe(app);
    }
  });

  it('unhosting retires the verbs', () => {
    const giver = makeStuff(() => new TestGiver());
    const app = makeStuff(() => new WalletApp());
    giver.hostApp(app);
    expect(affordedVerbs(giver)).toContain('pay');

    giver.unhostApp(app);
    const verbs = affordedVerbs(giver);
    for (const v of APP_VERBS) expect(verbs).not.toContain(v);
  });

  it('a giver with no app affords none of the app verbs', () => {
    const giver = makeStuff(() => new TestGiver());
    const verbs = affordedVerbs(giver);
    for (const v of APP_VERBS) expect(verbs).not.toContain(v);
  });
});
