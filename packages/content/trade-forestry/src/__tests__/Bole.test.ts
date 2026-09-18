/**
 * The bole (forestry D4) — a felled trunk that knows how many lengths
 * are left in it, and affords its own cross-cut wherever it lies.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Bole, { BOLE_LENGTHS, TIMBER_MASS_KG } from '../thing/Bole';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

describe('the bole', () => {
  afterEach(() => StuffApi.clearAll());

  it('is a Thing — Tangible, Containable, Chattel — and nothing else', () => {
    for (const m of [Mixins.Tangible, Mixins.Containable, Mixins.Chattel, Mixins.Detailed]) {
      expect(MixinApi.hasMixin(Bole, m), String(m)).toBe(true);
    }
    expect(MixinApi.hasMixin(Bole, Mixins.Container)).toBe(false);
  });

  it('⭐ affords its own cross-cut, so a bole in the yard is still a bole', () => {
    const verbs = CommandApi.collectContributions(Bole, 'self').map((d) => d.verbs).flat();
    expect(verbs).toContain('fell');
  });

  it('takes a length at a time, and the mass goes with it', () => {
    const b = makeStuff(() => new Bole());
    b.setMass(Quantity.of(675, 'kg'));
    expect(b.getLengthsLeft()).toBe(BOLE_LENGTHS);
    expect(b.takeLength()).toBe(BOLE_LENGTHS - 1);
    expect(b.getMass().rawValue()).toBe(675 - TIMBER_MASS_KG);
    for (let i = 0; i < BOLE_LENGTHS - 1; i += 1) b.takeLength();
    expect(b.getLengthsLeft()).toBe(0);
    expect(b.takeLength()).toBe(0);
    expect(b.getMass().rawValue()).toBe(675 - BOLE_LENGTHS * TIMBER_MASS_KG);
  });

  it('says how many lengths are in it yet, in words', () => {
    const b = makeStuff(() => new Bole());
    b.setLongDescription('The whole length of a tree.');
    const viewer = makeStuff(() => new Idea()) as unknown as Stuff;
    expect(Mml.augment(b.getLongDescription() ?? '', b, viewer)).toMatch(/Six lengths in it yet\./);
    for (let i = 0; i < 5; i += 1) b.takeLength();
    expect(Mml.augment('A trunk.', b, viewer)).toMatch(/One length left in it\./);
    b.takeLength();
    expect(Mml.augment('A trunk.', b, viewer)).toMatch(/nothing left in it but the butt/);
  });
});
