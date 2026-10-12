/**
 * Walking out of a fight IS fleeing it — `CombatantMixin.beforeTraverse`,
 * the mover's witness in `Mobile.traverse`'s one sequence. It used to be
 * code in the locomotion controller, so an NPC brain or a `Journey` leg
 * walked out of a fight for free; now every mover flees the same way.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { buildAllModes } from '../../locomotion/__tests__/test-helpers';
import { CombatantMixin } from '../Combatant';
import { MobileMixin } from '../../spatial/Mobile';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { Idea } from '../../stuff/Idea';
import Exit from '../../boundary/Exit';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';

class Room extends ContainerMixin(Idea) {}

/** A fighter whose break is scripted: the engine's odds are not the point. */
class Fighter extends CombatantMixin(MobileMixin(ContainableMixin(Idea))) {
  public breaks = true;
  public attempts = 0;
  public override disengage(): { ok: boolean; message?: string } {
    this.attempts += 1;
    return this.breaks
      ? { ok: true }
      : { ok: false, message: 'They have you pinned.' };
  }
}

function scene(): { here: Room; there: Room; fighter: Fighter; exit: Exit } {
  const here = makeStuff(() => new Room());
  const there = makeStuff(() => new Room());
  const fighter = makeStuff(() => new Fighter());
  ContainmentApi.move(fighter, here);
  const exit = StuffApi.createSync(
    () => new Exit({ direction: 'north', source: here, destination: there }),
  );
  return { here, there, fighter, exit };
}

describe('fleeing is part of the crossing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModes();
  });

  it('a pin that holds refuses the crossing with the break gate, in combat\'s words', async () => {
    const { here, fighter, exit } = scene();
    fighter.breaks = false;
    const guard = await fighter.traverse(exit, 'walk');
    expect(guard).toEqual({
      ok: false,
      gate: 'breakaway',
      mode: 'walk',
      reason: 'They have you pinned.',
    });
    expect(fighter.getContainer()).toBe(here);
  });

  it('a clean break lets the crossing go on', async () => {
    const { there, fighter, exit } = scene();
    expect(await fighter.traverse(exit, 'walk')).toEqual({ ok: true });
    expect(fighter.attempts).toBe(1);
    expect(fighter.getContainer()).toBe(there);
  });

  it('⭐ no parting shot for a wall — a refused gate never asks combat', async () => {
    const { here, fighter } = scene();
    const wall = StuffApi.createSync(
      () =>
        new Exit({
          direction: 'up',
          source: here,
          destination: makeStuff(() => new Room()),
          media: ['vertical'],
        }),
    );
    const guard = await fighter.traverse(wall, 'walk');
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe('exitMode');
    expect(fighter.attempts).toBe(0);
  });
});
