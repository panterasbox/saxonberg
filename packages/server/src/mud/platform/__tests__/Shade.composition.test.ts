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

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Shade from '../agent/Shade';
import Avatar from '../agent/Avatar';
import Species from '../idea/species/Species';
import Clade from '../idea/species/Clade';
import BodyPlan from '../idea/species/BodyPlan';
import { MixinApi } from '../../api/mixin';
import { SpeciesApi } from '../../api/species';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { ConditionApi } from '../../api/condition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

/**
 * A species under the Animalia kingdom — `isAnimate` resolves the kingdom
 * by walking the species template path, so the clade has to exist for
 * "animate" to mean anything.
 */
function species(): Species {
  seq += 1;
  if (!StuffApi.findByTemplatePath('/stuff/idea/species/animalia')) {
    const animalia = makeStuff(() => new Clade());
    stampTemplatePathForTest(animalia, '/stuff/idea/species/animalia');
    animalia.setName('Animalia');
    animalia.setRank('kingdom');
  }
  const plan = makeStuff(() => new BodyPlan());
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/shade-${seq}`);
  plan.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const s = makeStuff(() => new Species());
  stampTemplatePathForTest(s, `/stuff/idea/species/animalia/shade-${seq}`);
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

  /**
   * Logging out as a shade, and coming back.
   *
   * The rule: a shade behaves like a body, because from the player's side
   * it IS their body. Logging out logs you out; reconnecting reconnects
   * you — to the SAME shade, in the same room. And the identity's arc is
   * what makes a fresh login still a ghost, so quitting is never an escape
   * from death.
   */
  describe('logout and reconnect', () => {
    it('linkdead does NOT reap it — the shade lingers like a body', async () => {
      const sh = await shadeFor('ghost-9');
      sh.onLinkdead();
      // A guest is reaped on drop; a body lingers so the next enter() is a
      // reconnect. A shade is the second kind.
      expect(sh.isDestroyed()).toBe(false);
    });

    it('keeps the PlayerApi slot while linkdead, so reconnect finds IT', async () => {
      const sh = await shadeFor('ghost-10');
      PlayerApi.registerAvatar(sh);
      sh.onLinkdead();

      // This is the lookup `loadAvatarsForUser` does first ("reuse if
      // already in-world"). Finding the shade here is what puts the player
      // back into the same ghost rather than into their old body.
      expect(PlayerApi.findAvatarByPlayerId('ghost-10')).toBe(sh);
    });

    it('a reconnecting shade passes through embodyForSession untouched', async () => {
      // The login seam swaps a DECEASED identity for a shade. A shade that
      // is already a shade carries no arc, so it is returned as-is — the
      // reconnect does not mint a second one.
      const sh = await shadeFor('ghost-11');
      expect(sh.getMortalArc()).toBeNull();
      const resolved = await ConditionApi.embodyForSession(sh);
      expect(resolved).toBe(sh);
    });

    it('the ORIGINAL body is gone, so nothing can reconnect into it', async () => {
      // Death destructs the drained avatar rather than parking it. There
      // is deliberately no living body kept in reserve: logging out as a
      // shade cannot drop you back into the person you used to be, because
      // that object does not exist.
      const sh = await shadeFor('ghost-12');
      PlayerApi.registerAvatar(sh);
      const held = PlayerApi.findAvatarByPlayerId('ghost-12');
      expect(held).toBe(sh);
      expect(MixinApi.isIncorporeal(held!)).toBe(true);
    });
  });
});
