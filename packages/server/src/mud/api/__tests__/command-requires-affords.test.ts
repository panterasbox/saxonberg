/**
 * ⭐ `requires: affords` (controllers-are-io D8d): a slot predicate — the
 * candidate itself contributes THIS view, by its class or an ACTIVE mixin.
 * Opted into per slot, an AND-term beside the protocol mixin and never an
 * alternate of one.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeAll } from 'vitest';
import { CommandApi } from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import Good from '../../lib/stuff/Good';
import { TurnableMixin } from '../../lib/craft/Turnable';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { MixinConstructor } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';

const TURN = 'platform/cmd/device/turn.yaml';

/** An inline view over `turn`'s own file, its one slot requiring `requires`. */
async function slotCheck(requires: string): Promise<(s: Stuff) => unknown> {
  const real = CommandApi.getCommand(TURN)!;
  const view = CommandDefinition.fromYaml(
    [
      'verbs: [turn]',
      'category: device',
      'controller: /platform/idea/cmd/device/TurnController',
      'description: "a probe"',
      'args:',
      '  - name: target',
      '    type: object',
      '    required: true',
      `    requires: ${requires}`,
    ].join('\n'),
    real.filePath,
  );
  await CommandApi.resolveValidators(view);
  const fn = view.args[0]!._resolvedValidators![0]!;
  return (s) => (fn as (v: unknown, f: string) => unknown)({ stuff: s, raw: 'it' }, 'target');
}

class Turner extends TurnableMixin(Good) {}
class Plain extends Good {}

/** A mixin that offers `turn`, gated: nothing confers it. */
function GatedTurnMixin<T extends MixinConstructor<Stuff>>(Base: T) {
  return class GatedTurnMixin extends Base {
    static _mixinName = 'GatedTurnTestMixin';
    static _augmentGated = true;
    static commandContributions = { environment: [TURN] };
  };
}
class GatedTurner extends GatedTurnMixin(Good) {}
/** The same mixin, conferred: a thing that answers while it is buffed counts. */
class ConferredTurner extends GatedTurnMixin(Good) {
  public getConferredMixinNames(): readonly string[] {
    return ['GatedTurnTestMixin'];
  }
}

beforeAll(async () => {
  await CommandApi.preloadAll();
});

describe('requires: affords', () => {
  it('⭐ the thing that contributes this view binds', async () => {
    const check = await slotCheck('[affords]');
    expect(check(makeStuff(() => new Turner()))).toBeUndefined();
  });

  it('a thing that does not is refused, in the verb’s words', async () => {
    const check = await slotCheck('[affords]');
    expect(String(check(makeStuff(() => new Plain())))).toMatch(/^You can't turn /);
  });

  it('⚠ a gated mixin nothing confers offers nothing', async () => {
    const check = await slotCheck('[affords]');
    expect(check(makeStuff(() => new GatedTurner()))).toBeDefined();
  });

  it('⭐ conferred, it offers it', async () => {
    const check = await slotCheck('[affords]');
    expect(check(makeStuff(() => new ConferredTurner()))).toBeUndefined();
  });

  it('it stands BESIDE a mixin (an AND-term)', async () => {
    const check = await slotCheck('[affords, TurnableMixin]');
    expect(check(makeStuff(() => new Turner()))).toBeUndefined();
    expect(check(makeStuff(() => new GatedTurner()))).toBeDefined();
  });

  it('⛔ never an alternate of one — a load-time throw', async () => {
    await expect(slotCheck('"affords|TurnableMixin"')).rejects.toThrow(/cannot be an alternate/);
  });
});
