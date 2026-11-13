/**
 * CharcoalPit — the clamp: a covered heap of cordwood, burned WITHOUT
 * enough air to burn.
 *
 * ⭐⭐ **Airflow is the decision, and the failure mode is the point.**
 *
 * Charring is not lighting a fire — it is running a fire that is
 * deliberately starving. The volatiles cook out and leave, the carbon
 * stays, and the collier's whole job for three days is holding the
 * draught between two ways of losing everything:
 *
 *  - **too much air** and the charge CATCHES: at or above
 *    `fire.air.flamingCompleteness` a flame can burn in the heap, so the
 *    cordwood goes onto the bed and burns like any fuel (`catchContents`),
 *    and you open a clamp on **ash** in the grate;
 *  - **too little** and the heap runs too cool: the wood's `char`
 *    transition only reaches its first rung, and you draw **half-burnt
 *    brands**, heavy and worth a fraction.
 *
 * ⭐⭐ **None of that is in this file any more** (ceramics ruling A). The
 * three outcomes were a threshold table on the pit and three template rows
 * it minted from; they are now ONE rule: charcoal is the WOOD's heat
 * transition (`requiresStarvedAir`), the flame needs air
 * (`FireLogic.mediumBurns`), and a burn that took too much air is ordinary
 * combustion. The lengths themselves BECOME charcoal — the same lengths,
 * a quarter of their mass. What stays here is the trade's verb and the
 * heap's dials (`draught`, its ceiling heat), authored on the row.
 *
 * Nothing rolls: a collier who learns the number gets it right every time.
 * What competence is FOR here is knowing what to set, not being allowed to.
 */

import Firebox from '@saxonberg/server/mud/lib/fire/Firebox';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

/** The Discipline a burn credits. Fuel is its own trade. */
const COLLIERY = 'colliery';
/**
 * Three days, compressed. ⚠ It is long ON PURPOSE: a burn you can watch
 * to the end in one sitting is not a burn you can lose track of, and
 * losing track of it is the failure the craft is about.
 */
const BURN_MS = 3 * 24 * 60 * 60 * 1000;
const CHARCOAL = '/stuff/idea/material/organic/charcoal';
const BRANDS = '/stuff/idea/material/organic/half-burnt-wood';

/** ⭐ Every reason a burn will not start. */
export type CharRefusal =
  /** This collier is already watching this clamp's burn. */
  | ActRefusal<'watching'>
  /** A burn is WATCHED over three days; a body that holds no watch cannot run one. */
  | ActRefusal<'cannot-watch'>
  | ActRefusal<'empty-clamp'>
  /** The chimney is spent and the length that would relay it will not burn. */
  | ActRefusal<'no-fuel', { wet: boolean }>
  /** It would not catch — the ignition's own reason. */
  | ActRefusal<'not-lit', { cause: string }>;

/** The begin words' facts. */
export interface CharBegin {
  /** A spent chimney was relaid from the charge. */
  laid: boolean;
  draught: number;
}

/** What the clamp opened on — every length is what the heat made of it. */
export interface CharDone {
  lengths: number;
  charcoal: number;
  brands: number;
  /** It took too much air and caught. */
  ash: boolean;
}

/** A burn. */
export type CharPlan = ActPlan<CharBegin, CharDone, never>;

// ⭐ A firebox that encloses its own feedstock — the clamp burns the
// wood it contains, which is why `Container` and not `Placing`.
const CharcoalPitBase = ContainerMixin(Firebox);

/**
 * ⭐ The clamp affords its own act. A verb an object affords is a
 * property of what the object IS, declared exactly once on the class —
 * the `Anvil` shape. ⚠ A row's `commandContributions:` would be dead
 * silently, and the kernel's `BurnerMixin` cannot name a trade's view
 * (the pack boundary), which is why the list lives here.
 */
const CHARRING = ['trade/fuel/cmd/fuel/char.yaml'];

export default class CharcoalPit extends CharcoalPitBase {
  static commandContributions: CommandContributions = {
    environment: CHARRING,
    peers: CHARRING,
  };

  /**
   * ⭐⭐ Light the burn and hand the collier the watch: the plan, or why
   * not (controller-liquidity W9 — this was `CharController`'s).
   *
   * Lighting is instant and happens here: a spent chimney is relaid from
   * the charge (one length down the middle, which is how a clamp is lit)
   * and the fire is set. Every length is stamped with whose burn it is, so
   * a rung reached while nobody watched still knows. The three days are
   * the plan — held in `attention`, not `hands`, and hosted by this clamp —
   * and its completion breaks the clamp open.
   *
   * ⚠ Survey C11, both halves: "already burning" is asked of THIS clamp's
   * watch (a kiln watched elsewhere used to read as adjusting this clamp,
   * so it never lit), and a body that holds no watch is refused — it used
   * to complete the three-day burn instantly.
   */
  public lightPlan(actor: Stuff): CharPlan | CharRefusal {
    if (!MixinApi.isEngaged(actor)) return { ok: false, reason: 'cannot-watch' };
    if (actor.getEngagements().some((e) => e instanceof ManualBuildStep && e.getHost() === this)) {
      return { ok: false, reason: 'watching' };
    }
    const charge = (this.getContents() as Stuff[]).filter((c) => this.isCordwood(c));
    if (charge.length === 0) return { ok: false, reason: 'empty-clamp' };
    let laid = false;
    if (!this.isLit()) {
      if (this.fuelRemaining() <= 0) {
        const kindling = charge.pop()!;
        const stoked = this.stoke(kindling);
        if (!stoked.ok) return { ok: false, reason: 'no-fuel', facts: { wet: stoked.reason === 'too-wet' } };
        laid = true;
      }
      const lit = this.ignite();
      if (!lit.lit && lit.reason !== 'already-burning') {
        return { ok: false, reason: 'not-lit', facts: { cause: lit.reason ?? 'not-lit' } };
      }
    }
    const identity = actor.getIdentityPath() ?? '';
    for (const length of charge) {
      if (!MixinApi.isThermal(length)) continue;
      length.getTemperature();
      if (identity !== '') length.stampFiredBy(identity);
    }
    const lengths = charge.length;
    return {
      ok: true,
      durationMs: BURN_MS,
      // ⚠ No effort: a three-day burn is watched, not worked.
      effortW: 0,
      slots: ['attention'],
      host: this as unknown as Stuff,
      facts: { laid, draught: this.getDraught() },
      onComplete: async () => ({ ok: true, facts: await this.openClamp(actor, lengths) }),
    };
  }

  /**
   * Break the clamp open. ⭐ The heat already decided: the clamp settles
   * (each length reads its own heat history), and this counts what they
   * became. ⚠ The collier may be gone — the clamp still burns.
   *
   * The DEED is recorded either way: a lost burn is evidence of practice,
   * and one burn is one deed (the lengths' own rung credits are folded in
   * by the settle).
   */
  protected async openClamp(actor: Stuff, lengths: number): Promise<CharDone> {
    const ashBefore = this.getAshKg();
    const settled = await this.settleFiring(actor.isDestroyed() ? null : actor);
    let charcoal = 0;
    let brands = 0;
    for (const body of settled.contents) {
      if (!this.isCordwood(body) || !MixinApi.isTangible(body)) continue;
      const path = body.getMaterial()?.getTemplatePath() ?? '';
      if (path === CHARCOAL) charcoal += 1;
      else if (path === BRANDS) brands += 1;
    }
    const ash = settled.burnt > 0 || (charcoal === 0 && brands === 0 && this.getAshKg() > ashBefore);
    if (!actor.isDestroyed() && MixinApi.isAdvancing(actor)) {
      await actor.creditDeed({ discipline: COLLIERY, difficulty: 'standard', outcome: charcoal > 0 ? 'success' : 'failure' });
    }
    return { lengths, charcoal, brands, ash };
  }

  /** Cordwood — what a clamp is charged with, charred or not. */
  protected isCordwood(item: Stuff): boolean {
    return MixinApi.isPerceptible(item) && item.getKeywords().includes('cordwood');
  }
}
