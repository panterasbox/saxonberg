/**
 * The posture verbs' object surface (was PostureApi — the OO sweep):
 * the mutators are gated to the posture controllers (narrow-entry) and
 * the read is open. Behavior (the transfer walk itself) is covered by
 * the posture controller tests.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityError } from '../../security/errors';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../../stuff/Idea';
import { PosedMixin } from '../Posed';
import { SlottableMixin } from '../../slot/Slottable';
import { makeStuff } from '../../security/__tests__/test-setup';

class PosedIdea extends PosedMixin(SlottableMixin(Idea)) {}

describe('Posed mutator gates', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('denies vacatePostureBearingSlots from an unprivileged caller', () => {
    const actor = makeStuff(() => new PosedIdea());
    // The test module is not a posture controller and not the actor
    // itself, so the narrow-entry gate denies.
    expect(() => actor.vacatePostureBearingSlots()).toThrow(SecurityError);
  });

  it('the posture-bearing-slot read is open and null when unoccupied', () => {
    const actor = makeStuff(() => new PosedIdea());
    expect(actor.currentPostureBearingSlot()).toBeNull();
  });
});
