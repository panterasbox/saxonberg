/**
 * The donor card and the consent ladder on PersonaMixin (blood build
 * D4/D5). The card is in-memory state; `transfusionConsent` is a pure
 * function of (is this me · the card · the body's state · is it a player).
 * No Mongo needed.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { Character } from '../Character';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

let seq = 0;

/** A bare Character — Vitals + Persona, not a player. */
class TestCharacter extends Character {}
/** A player-driven body — composes HasInteractive, so the ladder ASKS. */
class InteractiveCharacter extends HasInteractiveMixin(Character) {}

function character(interactive = false): Character {
  const c = makeStuff(() =>
    interactive ? new InteractiveCharacter() : new TestCharacter(),
  );
  stampTemplatePathForTest(c, `/platform/agent/Avatar/donor-${seq++}`);
  return c;
}

const asStuff = (c: Character): Stuff => c as unknown as Stuff;

describe('PersonaMixin — the donor card', () => {
  let patient: Character;
  beforeEach(() => {
    seq = 0;
    patient = character();
  });

  it('defaults to no directive, not on the roll', () => {
    const card = patient.getDonorCard();
    expect(card.receive).toBe('');
    expect(card.donor).toBe(false);
  });

  it('register/withdraw and accept/refuse/clear round-trip', () => {
    patient.setDonorCard({ receive: '', donor: true });
    expect(patient.getDonorCard().donor).toBe(true);
    patient.setDonorCard({ receive: 'wont', donor: true });
    expect(patient.getDonorCard().receive).toBe('wont');
    expect(patient.getDonorCard().donor).toBe(true);
  });
});

describe('PersonaMixin — the consent ladder (D5)', () => {
  beforeEach(() => {
    seq = 0;
  });

  it('1. transfusing yourself is `self`', () => {
    const me = character();
    const v = me.transfusionConsent(asStuff(me));
    expect(v.verdict).toBe('self');
    expect(v.consented).toBe(true);
  });

  it('2. a `wont` card is `directive-no` and NOT consented — even dying', () => {
    const patient = character();
    const giver = character();
    patient.setDonorCard({ receive: 'wont', donor: false });
    // The directive short-circuits before the body's state — it holds
    // when the patient is dying (the "even to death" rule).
    patient.beginDying('test');
    expect(patient.isDying()).toBe(true);
    const v = patient.transfusionConsent(asStuff(giver));
    expect(v.verdict).toBe('directive-no');
    expect(v.consented).toBe(false);
  });

  it('3. a `will` card is `directive-yes`', () => {
    const patient = character();
    const giver = character();
    patient.setDonorCard({ receive: 'will', donor: false });
    const v = patient.transfusionConsent(asStuff(giver));
    expect(v.verdict).toBe('directive-yes');
    expect(v.consented).toBe(true);
  });

  it('4. no card + dying → `implied` consent', () => {
    const patient = character();
    const giver = character();
    patient.beginDying('test');
    expect(patient.isDying()).toBe(true);
    const v = patient.transfusionConsent(asStuff(giver));
    expect(v.verdict).toBe('implied');
    expect(v.consented).toBe(true);
  });

  it('5a. no card, conscious, player-driven → `asked` (not yet consented)', () => {
    const patient = character(true);
    expect(MixinApi.isHasInteractive(asStuff(patient))).toBe(true);
    const giver = character();
    const v = patient.transfusionConsent(asStuff(giver));
    expect(v.verdict).toBe('asked');
    expect(v.consented).toBe(false);
  });

  it('5b. no card, conscious, NOT a player (an NPC) → `consented`', () => {
    const patient = character();
    expect(MixinApi.isHasInteractive(asStuff(patient))).toBe(false);
    const giver = character();
    const v = patient.transfusionConsent(asStuff(giver));
    expect(v.verdict).toBe('consented');
    expect(v.consented).toBe(true);
  });
});
