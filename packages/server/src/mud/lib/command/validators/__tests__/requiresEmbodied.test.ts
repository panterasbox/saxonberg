/**
 * `requiresEmbodied` — the mechanical half of function over form.
 *
 * The rule it enforces: losing a body costs you the verbs that touch
 * matter, and nothing else. Not your voice, not your vote, not your seat
 * in a channel. Death is real without being disenfranchising, and this
 * validator is where that stops being a sentence in a design doc.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import validator from '../requiresEmbodied';
import { Creature } from '../../../creature/Creature';
import { IncorporealMixin } from '../../../mortality/Incorporeal';
import Thing from '../../../stuff/Thing';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../api/command';

class Ghostly extends IncorporealMixin(Creature) {
  static _mixinName = 'Ghostly';
}

const ctx = (giver: unknown) => ({ commandGiver: giver }) as CommandContext;

describe('requiresEmbodied', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('passes an ordinary body — tagging a verb costs the living nothing', () => {
    const body = makeStuff(() => new Creature());
    expect(validator(ctx(body))).toBeUndefined();
  });

  it('refuses an incorporeal giver, in the host’s own words', () => {
    const ghost = makeStuff(() => new Ghostly());
    expect(validator(ctx(ghost))).toBe(ghost.getRevocationReason());
  });

  it('the refusal prose is the host’s, so the lever re-skins', () => {
    // The deferred prison work wants this exact shape — a present
    // participant with embodied verbs revoked — and should reuse the
    // mixin with different prose rather than growing a second one.
    const ghost = makeStuff(() => new Ghostly());
    ghost.setRevocationReason('The bars do not care what you want.');
    expect(validator(ctx(ghost))).toBe('The bars do not care what you want.');
  });

  it('passes a non-body giver — other validators own those cases', () => {
    const rock = makeStuff(() => new Thing());
    expect(validator(ctx(rock))).toBeUndefined();
  });
});
