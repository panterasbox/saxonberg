/**
 * ⚠⚠ `bestInstrument` picks the BEST rung, not the first one it is
 * handed — and for the whole build's life its predecessor did the
 * opposite.
 *
 * Every trade here is built on one shape: **rung zero is portable and
 * bad, rung one is fixed and good.** A drop spindle against a spinning
 * wheel, a hand loom against a broad loom, a household vat against a
 * dye vat, a sewing kit against a sewing machine, shears against a
 * cutting table. `findCapability` scanned held kit first and returned
 * the first match, so **carrying your cheap tool made you worse off
 * than leaving it at home**: walk into a workshop with a spindle in
 * your pack and you spun at the spindle's rate beside an idle wheel.
 *
 * ⭐ Nothing reported it, and nothing could have. A slower step is not
 * an error — it completes, it produces the right goods, and the only
 * symptom is a number nobody sees. It surfaced from a design question
 * about which object should afford `cut`.
 *
 * ⭐⭐ The helper no longer WALKS. The view declares the instrument
 * (`default: "reachable:[capability.spinning]"`, `type: objects`) and
 * the binder resolves every reachable thing offering the kind, held
 * gear first; what is tested here is the one thing left to the
 * controller — which of those is best. So the fixture is a bound list
 * in binder order, not a room (`lint:instrument-args`).
 *
 * ⚠ Ties keep binder order — held-first — so no existing arrangement
 * moves where the rungs are equal.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { ManualBuildController } from '../ManualBuildController';
import { ToolMixin } from '../../../../../lib/craft/Tooled';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import Thing from '../../../../../lib/stuff/Thing';
import { StuffApi } from '../../../../../api/stuff';
import type { MqlManyResult } from '../../../../../api/mql';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

/** A tool with one authored capability entry. */
class Tool extends ToolMixin(ContainableMixin(Thing)) {
  static _mixinName = 'Tool';
}

/**
 * The protected helper, reached the way a subclass reaches it. The
 * method is `protected` by design — it is a controller's own seam, not
 * external surface — so the test subclasses rather than casting.
 */
class Probe extends ManualBuildController<never> {
  execute(): void {
    /* not dispatched — this exists for `bestInstrument` alone */
  }
  probe(bound: MqlManyResult | undefined, cap: string): Stuff | null {
    return this.bestInstrument(bound, cap);
  }
}

function tool(name: string, kind: string, rate: number): Tool {
  const t = makeStuff(() => new Tool());
  t.setPrimaryKeyword(name);
  t.setKeywords([name]);
  t.setShortDescription(`a ${name}`);
  t.setCapabilities([{ kind, rate }]);
  return t;
}

/** What the binder hands over: the candidates in its order, held first. */
function bound(...stuff: Stuff[]): MqlManyResult {
  return { stuff, raw: '' } as unknown as MqlManyResult;
}

afterEach(() => StuffApi.clearAll());

describe('bestInstrument picks the best rung', () => {
  it('⚠⚠ a HELD cheap tool no longer beats a good one in the room', () => {
    /*
     * The regression itself. Held-first + first-match returned the
     * spindle; a player who happened to be carrying one got the worse
     * rate standing at the wheel, silently.
     */
    const probe = makeStuff(() => new Probe());
    const spindle = tool('spindle', 'spinning', 1); // held: binder emits it first
    const wheel = tool('wheel', 'spinning', 3); // in the room
    expect(probe.probe(bound(spindle, wheel), 'spinning')).toBe(wheel);
  });

  it('⭐ and a held GOOD tool still wins over a poor one in the room', () => {
    // The other direction, which the old code got right by accident and
    // the new code gets right on purpose.
    const probe = makeStuff(() => new Probe());
    const good = tool('good-shears', 'cutting', 3);
    const poor = tool('blunt-knife', 'cutting', 1);
    expect(probe.probe(bound(good, poor), 'cutting')).toBe(good);
  });

  it('ties keep BINDER ORDER (held-first), so no existing arrangement moves', () => {
    const probe = makeStuff(() => new Probe());
    const mine = tool('my-needle', 'mending', 1);
    const theirs = tool('their-needle', 'mending', 1);
    expect(probe.probe(bound(mine, theirs), 'mending')).toBe(mine);
  });

  it('ignores tools of a different kind entirely', () => {
    // The binder's default query already excludes these; a NAMED
    // instrument of the wrong kind arrives anyway, and is not it.
    const probe = makeStuff(() => new Probe());
    const loom = tool('loom', 'weaving', 9);
    expect(probe.probe(bound(loom), 'cutting')).toBeNull();
  });

  it('answers null when nothing was bound', () => {
    const probe = makeStuff(() => new Probe());
    expect(probe.probe(undefined, 'spinning')).toBeNull();
    expect(probe.probe(bound(), 'spinning')).toBeNull();
  });
});
