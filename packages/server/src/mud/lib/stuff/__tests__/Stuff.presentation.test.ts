/**
 * `Stuff.presentationPhrase` — the identity ladder, and the two views of
 * it.
 *
 * ⭐⭐ This ladder used to exist **twice**: once here as
 * `presentationCore`, and once in `RecognitionLogic.strangerStem` as the
 * same rungs minus the name and the disguise, kept in step by hand. They
 * drifted the first time anybody touched one — moving the article into a
 * `register` field broke the stranger copy and nothing but a test like
 * this would have said so. One ladder, asked for a view.
 *
 * The rungs, in order: disguise → proper name → authored description →
 * species common name → `someone`/`something`. `'stranger'` skips the
 * first two.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { GlobbableMixin } from '../Globbable';
import { DisguisableMixin } from '../../disguise/Disguisable';
import { DisguiseBearingMixin } from '../../disguise/Disguise';
import { SlottedMixin } from '../../slot/Slotted';
import { SlottableMixin } from '../../slot/Slottable';
import Thing from '../Thing';
import { Idea } from '../Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Plain extends Idea {}
class Described extends VisibleMixin(Idea) {}
class NamedAndDescribed extends NamedMixin(VisibleMixin(Idea)) {}
class Stack extends GlobbableMixin(VisibleMixin(Idea)) {}
// A wearer and the thing it wears: `DisguisableMixin` RESOLVES a
// disguise from worn garments — it never holds one — so the only honest
// way to reach the top rung is to put a hood on somebody.
class Maskable extends DisguisableMixin(
  SlottedMixin(NamedMixin(VisibleMixin(Idea))),
) {}
class Hood extends DisguiseBearingMixin(SlottableMixin(VisibleMixin(Thing))) {}

function hood(appearsAs: string): Hood {
  const h = makeStuff(() => new Hood());
  h.setAppearsAs(appearsAs);
  h.setCovers(['face']);
  h.setMasksIdentity(true);
  return h;
}

function wearing(o: InstanceType<typeof Maskable>, h: Hood): void {
  o.setStaticSlots([{ name: 'head', accepts: 'SlottableMixin' }]);
  o.occupy(h, 'head');
}

afterEach(() => StuffApi.clearAll());

describe('the ladder — own view', () => {
  it('falls back to "something" with no identity at all', () => {
    const o = makeStuff(() => new Plain());
    expect(o.getPresentation()).toBe('something');
    expect(o.presentationPhrase().register).toBe('proper');
  });

  it('renders an authored description in its authored register', () => {
    const o = makeStuff(() => new Described());
    o.setShortDescription('heavy iron door');
    expect(o.getPresentation()).toBe('a heavy iron door');
    o.setRegister('definite');
    expect(o.getPresentation()).toBe('the heavy iron door');
    o.setRegister('proper');
    expect(o.getPresentation()).toBe('heavy iron door');
  });

  it('indefinite is the default — an unswept row reads as it always did', () => {
    const o = makeStuff(() => new Described());
    o.setShortDescription('sentry');
    expect(o.getRegister()).toBe('indefinite');
    expect(o.getPresentation()).toBe('a sentry');
  });

  it('⭐ a proper name outranks the description', () => {
    const o = makeStuff(() => new NamedAndDescribed());
    o.setShortDescription('brisk clerk');
    expect(o.getPresentation()).toBe('a brisk clerk');
    o.setName('Odile');
    expect(o.getPresentation()).toBe('Odile');
    expect(o.presentationPhrase().register).toBe('proper');
  });

  it('⭐ a disguise outranks the name', () => {
    const o = makeStuff(() => new Maskable());
    o.setName('Bob');
    expect(o.getPresentation()).toBe('Bob');
    wearing(o, hood('hooded figure'));
    expect(o.getPresentation()).toBe('a hooded figure');
  });

  it('a disguise is always indefinite — being one of many is the point', () => {
    const o = makeStuff(() => new Maskable());
    o.setName('Bob');
    wearing(o, hood('oaken mask'));
    expect(o.presentationPhrase().register).toBe('indefinite');
    expect(o.getPresentation()).toBe('an oaken mask');
  });
});

describe("the ladder — a stranger's view", () => {
  it('skips the proper name', () => {
    const o = makeStuff(() => new NamedAndDescribed());
    o.setName('Odile');
    o.setShortDescription('brisk clerk');
    expect(o.presentationPhrase('own').render()).toBe('Odile');
    expect(o.presentationPhrase('stranger').render()).toBe('a brisk clerk');
  });

  it('keeps the authored register', () => {
    const o = makeStuff(() => new NamedAndDescribed());
    o.setName('Odile');
    o.setShortDescription('city registrar');
    o.setRegister('definite');
    expect(o.presentationPhrase('stranger').render()).toBe('the city registrar');
  });

  it('⚠ skips the disguise too — and that is deliberate', () => {
    // A non-masking disguise shows `appearsAs` on the wire ref and the
    // shortDescription to a stranger. An inconsistency that predates
    // this build and is preserved by it byte-for-byte; the masking half
    // is enforced a layer up, in RecognitionLogic.
    const o = makeStuff(() => new Maskable());
    o.setName('Bob');
    o.setShortDescription('tall stranger');
    wearing(o, hood('hooded figure'));
    expect(o.presentationPhrase('own').render()).toBe('a hooded figure');
    expect(o.presentationPhrase('stranger').render()).toBe('a tall stranger');
  });

  it('falls back to "something" for a thing with no description', () => {
    const o = makeStuff(() => new Described());
    expect(o.presentationPhrase('stranger').render()).toBe('something');
  });
});

describe('⭐ a count drops the article', () => {
  it('renders a stack as a count and a plural', () => {
    const o = makeStuff(() => new Stack());
    o.setShortDescription('red apple');
    expect(o.getPresentation()).toBe('a red apple');
    o.setQuantity(4);
    expect(o.getPresentation()).toBe('4 red apples');
  });

  it('⚠ the old form rendered "4 a red apples"', () => {
    // The article lived inside the description, so a count was prefixed
    // to a string that already had one. Every counted host had to opt
    // out by hand via getPluralForm; now none has to.
    const o = makeStuff(() => new Stack());
    o.setShortDescription('red apple');
    o.setQuantity(4);
    expect(o.getPresentation()).not.toMatch(/\ba\b/);
  });

  it('a count wins over a definite register too', () => {
    const o = makeStuff(() => new Stack());
    o.setShortDescription('collier');
    o.setRegister('definite');
    o.setQuantity(3);
    expect(o.getPresentation()).toBe('3 colliers');
  });
});

describe('the register refuses anything outside the vocabulary', () => {
  it('throws rather than silently defaulting', () => {
    const o = makeStuff(() => new Described());
    expect(() =>
      (o as unknown as { setRegister(v: string): void }).setRegister('mass'),
    ).toThrow(RangeError);
    expect(o.getRegister()).toBe('indefinite');
  });
});
