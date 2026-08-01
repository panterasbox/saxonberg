/**
 * Coming back.
 *
 * The engine's entire involvement in re-embodiment is
 * `ConditionApi.reembody`, which content calls on its own terms. `passage`
 * is the floor beneath that: always available, asks nothing, gives nothing
 * back, and exists so a player can never be stranded because the content
 * that would have brought them back does not exist yet.
 *
 * The invariant with teeth is **corpse-independence**. A body decays, can
 * be destroyed, and does not survive a restart. If any route back consulted
 * one, a player whose corpse rotted while they were offline would be stuck
 * — the bricking defect in a third costume. So `reembody` does not read the
 * corpse at all, and the last test here proves that structurally, the same
 * way the material-slice test proves its own absence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import PassageController from '../PassageController';
import { Creature } from '../../../../lib/creature/Creature';
import { ConditionApi } from '../../../../api/condition';
import { MessageApi } from '../../../../api/message';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../api/command';

let note: ReturnType<typeof vi.fn>;
function ctxFor(actor: unknown): CommandContext {
  note = vi.fn();
  return { commandGiver: actor, note } as unknown as CommandContext;
}

function stubScene(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

describe('passage — the floor beneath coming back', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    stubScene();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('refuses someone who already has a body', async () => {
    const living = makeStuff(() => new Creature());
    living.setLifecycleState('alive');
    const ctrl = makeStuff(() => new PassageController());

    await ctrl.execute({}, ctxFor(living));

    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-a-shade' }),
    );
  });

  it('reembody refuses anything that is not a shade', async () => {
    const living = makeStuff(() => new Creature());
    const room = makeStuff(() => new Creature());
    await expect(ConditionApi.reembody(living, room)).rejects.toThrow(
      /not a shade/,
    );
  });

  it('is afforded ONLY by being incorporeal', () => {
    // A player with no body must never be left without the one command
    // that gives them one — and nobody else should see it.
    const yaml = readFileSync(
      join(__dirname, '../../../../lib/mortality/Incorporeal.ts'),
      'utf8',
    );
    expect(yaml).toContain('charactergen/passage.yaml');
  });

  it('carries NO requiresEmbodied — the one verb for the disembodied', () => {
    const view = readFileSync(
      join(__dirname, '../../../../cmd/charactergen/passage.yaml'),
      'utf8',
    );
    expect(view).not.toContain('requiresEmbodied');
    expect(view).toContain('controller: /obj/command/charactergen/PassageController');
  });

  it('the way back NEVER consults the corpse', () => {
    // Structural, on purpose. A body decays and can be destroyed, so a
    // route back that reads one would strand whoever came back too late.
    // Proving the absence is the same move the material-slice test makes:
    // the guarantee is that there is nothing there to call.
    const source = readFileSync(
      join(__dirname, '../../../api/ConditionLogic.ts'),
      'utf8',
    );
    const start = source.indexOf('async function reembodyImpl');
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf('\n}\n', start);
    const body = source.slice(start, end);

    expect(body.toLowerCase()).not.toContain('corpse');
    expect(body).not.toContain('corpseStuffId');
  });

  it('the floor route restores nothing — the gear stays on the body you left', () => {
    // What you keep is the CALLER's business, and the floor's answer is
    // "nothing". Content that wants to hand your gear back moves the
    // items itself; the engine models no terms.
    const source = readFileSync(
      join(__dirname, '../PassageController.ts'),
      'utf8',
    );
    expect(source).not.toContain('restoresLoadout');
    expect(source).not.toContain('PassageRoute');
  });
});
