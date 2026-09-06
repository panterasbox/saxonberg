/**
 * ⭐⭐ **One verb, one station — and the class name predicts its surface.**
 *
 * For one build the cooking trade's four larder verbs — `butcher`, `cure`,
 * `dry`, `smoke` — were all conferred by **`CookPot`**, which handed
 * anyone standing near a saucepan the power to take a hog apart. It is the
 * `wash`-on-`UnboundedReceptacle` mistake, whose own doc says it best:
 * *an urn is not a degraded basin*. A pot is not a degraded butcher's
 * block.
 *
 * Each verb now names one home, and the home is named for the verb:
 *
 *   - `heat`, `cook`, `plate` → the POT: what you cook in.
 *   - `butcher`              → the BLOCK: what you take an animal apart on.
 *   - `cure`                 → the TROUGH: what you pack meat down in salt in.
 *   - `dry`                  → the RACK: what you hang it on.
 *   - `smoke`                → the CHIMNEY: what makes hanging it *smoking*.
 *
 * ⚠ **This file exists because affordance is wiring, and wiring needs its
 * own assertion.** `wash` shipped afforded to NOBODY — wrong class, wrong
 * bucket — through four venues and a full controller suite, because every
 * test called the controller directly and none asked whether a person
 * standing there could see the verb.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import CookPot from '../thing/CookPot';
import ButcherBlock from '../thing/ButcherBlock';
import SaltingTrough from '../thing/SaltingTrough';
import DryingRack from '../thing/DryingRack';
import SmokeChimney from '../thing/SmokeChimney';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const V = (name: string) => `trade/cooking/cmd/crafting/${name}.yaml`;

const STATIONS: ReadonlyArray<
  readonly [string, { commandContributions: CommandContributions }, string[]]
> = [
  ['CookPot', CookPot, ['cook', 'plate']],
  ['ButcherBlock', ButcherBlock, ['butcher']],
  ['SaltingTrough', SaltingTrough, ['cure']],
  ['DryingRack', DryingRack, ['dry']],
  ['SmokeChimney', SmokeChimney, ['smoke']],
];

const afforded = (c: CommandContributions): string[] => [
  ...(c.environment ?? []),
  ...(c.peers ?? []),
];

describe('the kitchen affords each verb from exactly one station', () => {
  it('every station affords the verbs its NAME predicts, and no others', () => {
    for (const [name, cls, verbs] of STATIONS) {
      const mine = afforded(cls.commandContributions).filter((v) =>
        v.startsWith('trade/cooking/'),
      );
      expect(new Set(mine), name).toEqual(new Set(verbs.map(V)));
    }
  });

  it('⚠ the POT does not butcher, cure, dry or smoke', () => {
    // The regression this file is named for. A saucepan is not a block,
    // a trough, a rack or a chimney.
    const pot = afforded(CookPot.commandContributions);
    for (const verb of ['butcher', 'cure', 'dry', 'smoke']) {
      expect(pot, verb).not.toContain(V(verb));
    }
  });

  it('no verb is afforded by two different stations', () => {
    // ⚠ Deduped WITHIN a station first: `CookPot` lists its verbs in both
    // `environment` and `peers`, and that is correct — a pot is portable,
    // so it confers outward from your pack as well as sideways from the
    // table. What must not happen is one verb coming from two stations.
    const all = STATIONS.flatMap(([, cls]) => [
      ...new Set(
        afforded(cls.commandContributions).filter((v) =>
          v.startsWith('trade/cooking/'),
        ),
      ),
    ]);
    expect(all.length).toBe(new Set(all).size);
  });

  it('⭐ the fixed stations confer SIDEWAYS only; the portable pot both ways', () => {
    // A pot travels: reachable heat plus a pot is a kitchen, so it confers
    // outward from your pack too. A block, a trough, a rack and a chimney
    // are joinery — sideways is the only honest direction.
    expect(CookPot.commandContributions.environment ?? []).not.toHaveLength(0);
    for (const [name, cls] of STATIONS.slice(1)) {
      expect(cls.commandContributions.environment ?? [], name).toHaveLength(0);
    }
  });

  it('⭐ every larder verb has a home — none is afforded by nobody', () => {
    // The `wash` failure, inverted: a verb that ships with no station is
    // a verb no player can ever discover.
    const all = new Set(
      STATIONS.flatMap(([, cls]) => afforded(cls.commandContributions)),
    );
    for (const verb of ['cook', 'plate', 'butcher', 'cure', 'dry', 'smoke']) {
      expect(all.has(V(verb)), verb).toBe(true);
    }
  });

  it('⚠ the stations use the `peers` bucket, not `environment`', () => {
    // `environment` grants OUTWARD to the containers ABOVE a thing, which
    // is how `wash` reached nobody: a fixture stands in the room as your
    // SIBLING, and nobody carries a butcher's block.
    for (const [name, cls] of STATIONS.slice(1)) {
      expect(cls.commandContributions.peers ?? [], name).not.toHaveLength(0);
    }
  });
});
