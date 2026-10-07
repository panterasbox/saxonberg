/**
 * `Corpse` is MATTER — the branch, and what the branch decides.
 *
 * ⭐⭐⭐ **Agent vs non-Agent is the first question the taxonomy asks**: an
 * `Agent` is something capable of acting *on its own behalf*. A corpse
 * cannot, and never can again — `adoptMaterialState` has no
 * `mergeSlice_` counterpart, so it is un-reanimatable by protocol. For a
 * non-Agent the second question is Space vs Matter vs Information, and a
 * body is matter. So `Thing`.
 *
 * ⚠⚠ It was on the `Agent` branch until 2026-10-05 and **three shipped
 * behaviours were wrong for it**, all three consumers of `isAgent()`.
 * This file pins each, because each failed silently and one of them broke
 * a promise the carcass chain had written into its own mint.
 *
 * ⭐ The sub-rungs were never the question: `Corpse extends Creature`
 * stopped below `Actor`, which is where agency-of-ACTION was cut — but
 * `Creature`/`Actor`/`Character` are categorization by mixin
 * composition and carry no taxonomic weight.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Corpse from '../Corpse';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

describe('Corpse — the branch', () => {
  it('⭐⭐⭐ is a Thing and not an Agent', () => {
    const c = makeStuff(() => new Corpse());
    expect(c.isThing()).toBe(true);
    expect(c.isAgent()).toBe(false);
  });

  it('⭐⭐ is therefore an OPEN container — the loadout can be taken', () => {
    // ⚠⚠ The defect this fixes: agents are excluded from
    // `isOpenContainer` because *you cannot reach into another actor's
    // pockets*, and `mql/scope-walk` plus `PerceptionApi.canReach` both
    // gate on that one rule. So while a corpse was an Agent, NOTHING
    // INSIDE IT WAS REACHABLE — breaking the mint's own promise that
    // "the corpse is where somebody has to go to get it".
    const c = makeStuff(() => new Corpse());
    expect(MixinApi.isContainer(c)).toBe(true);
    expect(MixinApi.isOpenContainer(c)).toBe(true);
  });

  it('⭐ keeps everything a dead body still does', () => {
    const c = makeStuff(() => new Corpse());
    // Each of these has a reader: the wound map and the material-fork
    // adopt side, the species and lifecycle, the decay clock, the silent
    // population, and the mass the butcher dresses out against.
    expect(MixinApi.isVitals(c)).toBe(true);
    expect(MixinApi.isOrganism(c)).toBe(true);
    expect(MixinApi.isPostmortem(c)).toBe(true);
    expect(MixinApi.isContaminable(c)).toBe(true);
    expect(MixinApi.isTangible(c)).toBe(true);
    expect(MixinApi.isThermal(c)).toBe(true);
    expect(MixinApi.isPerceptible(c)).toBe(true);
  });

  it('⚠⚠ and no longer breathes, digests, tires or wears a disguise', () => {
    // The carcass chain retired "a dead ewe that cannot be milked" and
    // then shipped a corpse that did all of this, because it still
    // `extends Creature`. Same defect one level in.
    const c = makeStuff(() => new Corpse());
    expect(MixinApi.isMetabolic(c)).toBe(false);
    expect(MixinApi.isRespiration(c)).toBe(false);
    expect(MixinApi.isExerting(c)).toBe(false);
    expect(MixinApi.isDisguisable(c)).toBe(false);
    expect(MixinApi.isLoadBearing(c)).toBe(false);
    expect(MixinApi.isHygiene(c)).toBe(false);
  });

  it('⭐ composes neither of the Agent branch\'s operative mixins', () => {
    // `CommandGiver` and `Persona` are what the Agent branch is FOR —
    // typing commands and being a person. A corpse is neither, which is
    // the same conclusion the branch reaches, reached a second way.
    const c = makeStuff(() => new Corpse());
    expect(MixinApi.isCommandGiver(c)).toBe(false);
    expect(MixinApi.isPersona(c)).toBe(false);
  });
});
