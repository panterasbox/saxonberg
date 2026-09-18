/**
 * Old age — ⭐⭐ **a stage you can SEE, and a death that bites for
 * non-sentient animals only.**
 *
 * `AgeCurveSpec.senescentAt` shipped with the curve and nothing ever read
 * it; five species rows author it. This closes that, and then stops
 * exactly where `race.md` drew its line.
 *
 * ⚠⚠ The sentience test is the whole safety property here, and it is not
 * decoration. `race.md` decided lifespans would not bite because of the
 * **succession problem** for named *persons* — offices, titles,
 * contracts, a chronicle. None of that is a question about a cat. So
 * these tests assert both halves: the cat dies, and the person does not,
 * by a structural fact rather than by anyone remembering to check.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrganismMixin } from '../Organism';
import Species from '../../../platform/idea/species/Species';
import Thing from '../../stuff/Thing';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { ConditionApi } from '../../../api/condition';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Body extends OrganismMixin(Thing) {}
class PlayedBody extends HasInteractiveMixin(OrganismMixin(Thing)) {}

let seq = 0;
function curved(opts: { sentient?: boolean; lifespanMax?: number }): Species {
  seq += 1;
  const sp = makeStuffAtPath(
    () => new Species(),
    `/stuff/idea/species/_test/sen-${seq}`,
  ) as Species;
  sp.setAgeCurve({ weanedAt: 10, matureAt: 100, agedAt: 1000, senescentAt: 2000 });
  sp.setSentient(opts.sentient ?? false);
  if (opts.lifespanMax !== undefined) sp.setLifespanMax(opts.lifespanMax);
  return sp;
}

function clock(): void {
  makeStuffAtPath(
    () => new WorldClockRegistry(),
    '/platform/idea/WorldClockRegistry',
  );
}

/**
 * ⭐ The assertion is **whether the reconcile decides to kill**, not
 * whether the dying choreography runs. `ConditionApi.die` owns the arc —
 * the corpse, the shade, the accountability record — and is tested where
 * it lives; a bare `OrganismMixin(Thing)` has none of the body a real
 * death needs. What is this file's to prove is the THREE CONDITIONS.
 */
const armDieSpy = () =>
  vi.spyOn(ConditionApi, 'die').mockResolvedValue(undefined);
let dieSpy: ReturnType<typeof armDieSpy>;
beforeEach(() => {
  StuffApi.clearAll();
  dieSpy = armDieSpy();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the senescent stage', () => {
  it('reads senescent past senescentAt, aged before it', () => {
    const sp = curved({});
    expect(sp.lifeStageAt(1500)).toBe('aged');
    expect(sp.lifeStageAt(2000)).toBe('senescent');
    expect(sp.lifeStageAt(9999)).toBe('senescent');
  });

  it('⚠ a senescent animal is still MATURE', () => {
    // Old is not reverted-to-juvenile. `isMature`'s other reader is
    // breeding, and an old animal has not stopped being an adult.
    clock();
    const b = makeStuff(() => new Body());
    b.setSpecies(curved({}));
    b.setAge(3000);
    expect(b.getLifeStage()).toBe('senescent');
    expect(b.isMature()).toBe(true);
  });

  it('a species with no curve reads null, not newborn', () => {
    clock();
    const b = makeStuff(() => new Body());
    expect(b.getLifeStage()).toBeNull();
  });
});

describe('death of old age', () => {
  it('a non-sentient animal past its span dies', () => {
    clock();
    const b = makeStuff(() => new Body());
    // ⚠ Both conditions must hold: past `senescentAt` (2000 days) AND
    // past `lifespanMax` (5 years = 1825 days). 2100 clears both.
    b.setSpecies(curved({ sentient: false, lifespanMax: 5 }));
    b.setAge(2100);
    b.setLifecycleState('alive');
    expect(b.getLifeStage()).toBe('senescent');
    b.reconcileSenescence();
    expect(dieSpy).toHaveBeenCalledOnce();
    expect(dieSpy.mock.calls[0]?.[1]).toBe('old age');
  });

  it('⚠⚠ a SENTIENT species never dies of it — race.md stays reserved', () => {
    clock();
    const b = makeStuff(() => new Body());
    b.setSpecies(curved({ sentient: true, lifespanMax: 5 }));
    b.setAge(2100);
    expect(b.getLifeStage()).toBe('senescent');
    b.reconcileSenescence();
    expect(dieSpy).not.toHaveBeenCalled();
  });

  it('⚠⚠ a PLAYED body never dies of it, whatever its species', () => {
    // Belt and braces: `getLifeStage()` is null for anything with an
    // Interactive, so the stage gate alone already excludes players.
    clock();
    const p = makeStuff(() => new PlayedBody());
    p.setSpecies(curved({ sentient: false, lifespanMax: 5 }));
    p.setAge(2100);
    expect(p.getLifeStage()).toBeNull();
    p.reconcileSenescence();
    expect(dieSpy).not.toHaveBeenCalled();
  });

  it('senescent but INSIDE its span does not die', () => {
    // ⭐ The stage is the warning and the span is the event: a keeper
    // gets to see it coming, which is the whole point of reading the
    // curve rather than the number.
    clock();
    const b = makeStuff(() => new Body());
    b.setSpecies(curved({ sentient: false, lifespanMax: 20 }));
    b.setAge(2100); // senescent (>2000d) but far short of 20y = 7300d
    expect(b.getLifeStage()).toBe('senescent');
    b.reconcileSenescence();
    expect(dieSpy).not.toHaveBeenCalled();
  });

  it('a species with no lifespanMax never dies of age', () => {
    clock();
    const b = makeStuff(() => new Body());
    b.setSpecies(curved({ sentient: false }));
    b.setAge(99999);
    b.reconcileSenescence();
    expect(dieSpy).not.toHaveBeenCalled();
  });
});
