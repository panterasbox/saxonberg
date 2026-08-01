/**
 * What a shade IS.
 *
 * Composition is `Avatar`'s — the whole verb surface has to survive losing
 * a body, and re-deriving it as a parallel stack would start missing verbs
 * immediately (the sandbox already wrote this reasoning down about its own
 * vessel). What differs is **activations**, and each one is load-bearing:
 *
 *  - persists nothing — the durable death fact lives on the IDENTITY, and
 *    a shade that captured would put the bricking defect straight back;
 *  - HOLDS the PlayerApi slot, unlike the wire body, because in death
 *    there is no parked field avatar to hold it and an unregistered shade
 *    would fall out of `who` / `tell` / presence — severing the platform
 *    half is the one thing the design will not do;
 *  - `undead` — animate without being alive, so it walks and speaks but
 *    does not starve, suffocate, freeze, or die a second time;
 *  - attuned with no hardware, because a ghost wearing a cranial implant
 *    would be silly, and because being dead does not log you off.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Shade from '../Shade';
import Avatar from '../../../obj/Avatar';
import Species from '../../species/Species';
import Clade from '../../species/Clade';
import BodyPlan from '../../species/BodyPlan';
import { MixinApi } from '../../../api/mixin';
import { SpeciesApi } from '../../../api/species';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

/**
 * A species under the Animalia kingdom — `isAnimate` resolves the kingdom
 * by walking the species template path, so the clade has to exist for
 * "animate" to mean anything.
 */
function species(): Species {
  seq += 1;
  if (!StuffApi.findByTemplatePath('/lib/species/animalia')) {
    const animalia = makeStuff(() => new Clade());
    stampTemplatePathForTest(animalia, '/lib/species/animalia');
    animalia.setName('Animalia');
    animalia.setRank('kingdom');
  }
  const plan = makeStuff(() => new BodyPlan());
  stampTemplatePathForTest(plan, `/lib/body-plans/shade-${seq}`);
  plan.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const s = makeStuff(() => new Species());
  stampTemplatePathForTest(s, `/lib/species/animalia/shade-${seq}`);
  s.setBodyPlan(plan);
  return s;
}

async function shadeFor(playerId: string): Promise<Shade> {
  const sh = makeStuff(() => new Shade(playerId, species()));
  await sh.postRegister();
  return sh;
}

describe('Shade — activations differ, composition does not', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('is an Avatar — the whole verb surface survives', async () => {
    const sh = await shadeFor('ghost-1');
    expect(sh).toBeInstanceOf(Avatar);
  });

  it('persists nothing', async () => {
    const sh = await shadeFor('ghost-2');
    expect(sh.shouldPersist()).toBe(false);
  });

  it('threads the real identity, so the ledgers keep attributing to the player', async () => {
    const sh = await shadeFor('ghost-3');
    expect(sh.getIdentityPath()).toBe(Avatar.getTemplatePath('ghost-3'));
    expect(sh.getPlayerId()).toBe('ghost-3');
  });

  it('is undead: animate, but not a living body', async () => {
    const sh = await shadeFor('ghost-4');
    expect(sh.getLifecycleState()).toBe('undead');
    // Walks and speaks…
    expect(SpeciesApi.isAnimate(sh)).toBe(true);
    // …but the survival drivers leave it alone.
    expect(sh.isLivingBody()).toBe(false);
    expect(sh.isAlive()).toBe(false);
    expect(sh.isDead()).toBe(false);
  });

  it('is attuned with NO implant occupying a slot', async () => {
    const sh = await shadeFor('ghost-5');
    expect(sh.getConferredMixinNames()).toContain('AetherMixin');
    // The point: attunement without hardware. A ghost does not wear a
    // cranial implant; it is simply still on the network.
    expect(sh.getOccupants('cranial').size).toBe(0);
  });

  it('is incorporeal, and says so when refused', async () => {
    const sh = await shadeFor('ghost-6');
    expect(MixinApi.isIncorporeal(sh)).toBe(true);
    expect(sh.getRevocationReason()).toBeTruthy();
  });

  it('KEEPS Container and Slotted — and holds nothing anyway', async () => {
    const sh = await shadeFor('ghost-7');
    // The capability stays so ghost-side carriage is possible later; only
    // the verb is revoked. Removing the mixins would foreclose that.
    expect(MixinApi.isContainer(sh)).toBe(true);
    expect(MixinApi.isSlotted(sh)).toBe(true);
    expect(sh.getContents()).toHaveLength(0);
  });

  it('carries no credential wallet — which is what confines it to the commons', async () => {
    const sh = await shadeFor('ghost-8');
    const updates = MixinApi.isAether(sh) ? sh.getHostedUpdates() : [];
    const hasWallet = updates.some((u) => MixinApi.isCredentialWallet(u));
    expect(hasWallet).toBe(false);
  });
});
