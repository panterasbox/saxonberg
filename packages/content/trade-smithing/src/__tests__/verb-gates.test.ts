/**
 * ⭐⭐ **The arg gate is a REACHABILITY link, and nothing was checking it.**
 *
 * A command view's `args[].requires` names a mixin, and the binder
 * refuses the command before the controller runs if the target does not
 * compose it. That makes it a fifth way for a shipped verb to be dead —
 * beside verb, affordance, data and boot — and it fails exactly as
 * closed and exactly as silently as the other four.
 *
 * ⚠⚠ **It shipped broken.** `hammer.yaml` required `DurableMixin`, and
 * **none** of the three things a smith hammers composes it: `Ingot`,
 * `Bloom` and the cast-iron pig are all
 * `AlloyedMixin(ManualBuildMixin(MeltableMixin(ThermalMixin(Thing))))`
 * or a subset — raw stock has no wear axis, because stock does not wear
 * out, made things do. So every explicit `hammer <target>` in the game
 * answered *"{} doesn't wear out"*, including `hammer ingot`, which is
 * the worked example in that same file's help text. Only bare `hammer`
 * worked, because it resolves through `findBuildVessel` and never meets
 * this gate.
 *
 * ⚠ **34 green tests did not see it**, and could not: every one of them
 * calls `HammerController.execute(...)` directly, which is downstream of
 * the binder. It was found by hammering a pig in a browser. ⭐ So this
 * file deliberately tests the **YAML against the classes** and never
 * goes near a controller — that is the only place the two can disagree.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Ingot from '@saxonberg/server/mud/platform/thing/Ingot';
import Casting from '@saxonberg/server/mud/platform/thing/Casting';
import Bloom from '@saxonberg/content-trade-smelting/src/thing/Bloom';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(HERE, '..', '..', 'content', 'trade', 'smithing', 'cmd', 'crafting');

/** The `requires` on a view's named arg, or null when it gates nothing. */
function argRequires(verb: string, argName: string): string | null {
  const doc = YAML.parse(readFileSync(join(VIEWS, `${verb}.yaml`), 'utf8')) as {
    args?: { name: string; requires?: string }[];
  };
  const arg = (doc.args ?? []).find((a) => a.name === argName);
  return arg?.requires ?? null;
}

describe('⚠⚠ a verb’s arg gate must admit the things the verb is FOR', () => {
  /**
   * The three ferrous products of the metal chain, which is the whole
   * set `hammer` exists to act on: a bloom to consolidate, a bar to
   * forge, and a pig to be refused *by the controller, in words about
   * carbon* — which it can only do if the binder lets the pig through.
   */
  const HAMMERABLE: [string, new () => object][] = [
    ['Ingot (a wrought bar, and the cast-iron pig row)', Ingot],
    ['Bloom (consolidated by the first blow)', Bloom as unknown as new () => object],
    ['Casting (poured metal)', Casting],
  ];

  it('⭐ every ferrous product composes the mixin `hammer` gates its target on', () => {
    const required = argRequires('hammer', 'target');
    expect(required, 'hammer.yaml must gate its target on something').toBeTruthy();
    for (const [label, ctor] of HAMMERABLE) {
      expect(
        MixinApi.hasMixin(ctor as never, required as never),
        `${label} does not compose ${required}, so \`hammer <it>\` dies at the binder`,
      ).toBe(true);
    }
  });

  it('⚠ and specifically NOT DurableMixin — stock does not wear out', () => {
    // The regression, named. If this ever reads `DurableMixin` again the
    // verb is dead for every piece of metal in the game.
    expect(argRequires('hammer', 'target')).not.toBe('DurableMixin');
    for (const [label, ctor] of HAMMERABLE) {
      expect(
        MixinApi.hasMixin(ctor as never, 'DurableMixin' as never),
        `${label} composes DurableMixin after all — re-check this file's premise`,
      ).toBe(false);
    }
  });

  it('⭐ `quench` gates on the workpiece mixin, which its targets do compose', () => {
    // The sibling verb, as the control: it was always right, and it is
    // what made `hammer`'s gate look plausible.
    const required = argRequires('quench', 'target');
    expect(required).toBe('ManualBuildMixin');
    expect(MixinApi.hasMixin(Ingot as never, required as never)).toBe(true);
  });
});
