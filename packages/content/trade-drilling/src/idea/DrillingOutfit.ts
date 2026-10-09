/**
 * DrillingOutfit — ⭐⭐⭐ **drilling is not collaborative; it is
 * EMPLOYING, and the payroll IS the cost of depth.**
 *
 * This is the design claim the whole trade turns on, and it is worth
 * stating sharply because it reads like the opposite at first glance.
 *
 * A bore needs several pairs of hands on a beam for weeks. That looks
 * like a cooperation mechanic — *find three friends* — and designing it
 * that way would have made the trade unplayable for anybody who logs on
 * alone, and tedious for anybody who does not. But what the design
 * actually wants from the crew is not conversation, coordination or
 * presence-as-company: **it is a wage bill that accrues while the hole
 * gets deeper.** The crew is the mechanism by which *depth costs money
 * over time* rather than *depth costs a click*.
 *
 * ⭐ So NPCs satisfy it completely, and that is not a concession — it is
 * the correct answer. Two roustabouts standing at a derrick and drawing
 * four a day are exactly the thing being modelled. A player who wants to
 * be on the crew `apply`s and `clock on` like any other job, gets the
 * same wage, and counts for the same swings, because the engine measures
 * presence and never asks who is behind the eyes.
 *
 * ## What this class adds to `Business`, and why so little
 *
 * Almost nothing, deliberately. The whole employment spine already
 * ships: positions, the roster, shifts, wage settlement, arrears, the
 * call, the derived help-wanted sign, `apply`, `clock on`. ⭐ The seats
 * are authored **on the seed row**, which is what the
 * no-runtime-setter constraint on `positions` actually permits — you do
 * not need a runtime setter if the shape is a fact about the kind of
 * business rather than about this one.
 *
 * What is genuinely this trade's is three questions nothing else asks:
 * *is this hand working at THIS hole right now* (the rig's presence
 * read), *has a day passed* (the payroll clock), and *stop paying* (the
 * owner's decision, which is `dismiss`).
 *
 * ⚠ An unpayable wage follows the **shipped** rule — an arrear on the
 * book and a line to a resident proprietor, and the crew keeps working
 * on credit. This build does not add *the crew downs tools*: the owner
 * finds out at the bank, which is where a person actually finds out.
 */

import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Employed } from '@saxonberg/server/mud/lib/employment/Employed';

/** The one seat a bore crew has. Authored on the seed row; named here for the acts. */
export const ROUSTABOUT = 'roustabout';

/** Game-seconds in a day — when the outfit settles up. */
const PAY_PERIOD_S = 86_400;

export default class DrillingOutfit extends BusinessEntity {
  /** Game-seconds of the last payday; `0` = never paid. */
  protected lastPaidS = 0;

  static fieldMeta: FieldMeta = {
    lastPaidS: { persistent: true },
  };

  /**
   * ⭐ Sign a hand on, send them to the rig, and start the clock — in one
   * act.
   *
   * `appoint` is the public org face and the roster invariants live in
   * the logic; what this adds is the shift and **the walk to work.**
   *
   * ⚠⚠ The walk is not decoration, and it is the thing the drive found.
   * This method's first version said *"no move — the hand is standing at
   * the derrick already, which is how you came to be hiring them."* That
   * is true of a player and **false of every NPC in the realm**: a
   * roustabout has no brain on purpose, so he does not walk anywhere,
   * which made hiring at the rig unreachable by construction — the hands
   * wait in the dry and cannot be brought out to a hillside.
   *
   * ⭐ So the hand goes to work the way every other shipped hand does:
   * `station ?? operatingLocations[0]`, which for an outfit is the claim
   * the hole is sunk on. That is `moveForShift`'s own rule, re-stated
   * here because the facade does not expose it and a hire is not a shift
   * flip.
   */
  public async startCrew(actor: Stuff): Promise<boolean> {
    const employment = await this.appoint(actor, ROUSTABOUT);
    if (!employment) return false;
    if (!MixinApi.isEmployed(actor)) return false;
    const now = WorldClockApi.getNow().rawValue();
    // SelfOnly: the organization driving its own roster primitives.
    this.ensureRostered(actor as Stuff & Employed, ROUSTABOUT, now);
    this.beginShift(actor as Stuff & Employed, now);
    await this.sendToWork(actor);
    return true;
  }

  /**
   * Put a hand where the work is. ⚠ `teleport`, the same primitive the
   * roster tick uses — a hand reporting for a shift is not traversing
   * exits, and making him walk would need a brain this build deliberately
   * did not give him.
   */
  private async sendToWork(actor: Stuff): Promise<void> {
    if (!MixinApi.isMobile(actor) || !MixinApi.isContainable(actor)) return;
    const target = this.getOperatingLocations()[0] ?? '';
    if (target === '') return;
    try {
      const dest = await StuffApi.singletonOrClone(target);
      if (!MixinApi.isContainer(dest)) return;
      const current = actor.getContainer();
      if (current && current.stuffId === dest.stuffId) return;
      actor.teleport(dest as Stuff & Container);
    } catch (err) {
      console.error(`DrillingOutfit: could not send a hand to '${target}'`, err);
    }
  }

  /**
   * ⭐ Pay a hand what they are owed and let them go — the owner's
   * decision to stop paying, which is the only thing that stops the
   * meter.
   *
   * Settle first, then end the shift, then dismiss: a hand dismissed
   * before settlement would lose the hours they had already stood there
   * for, which is the sort of quiet theft a wage ledger exists to
   * prevent.
   */
  public async payOff(actor: Stuff): Promise<void> {
    if (MixinApi.isEmployed(actor)) {
      const employment = actor.getEmployment(this.getOrganizationPath());
      if (employment) {
        await EmploymentApi.settleShiftWage(
          this as unknown as Parameters<typeof EmploymentApi.settleShiftWage>[0],
          actor.getIdentityPath() ?? '',
          employment,
        );
      }
      this.endShift(actor as Stuff & Employed);
    }
    await this.dismiss(actor);
  }

  /**
   * ⭐⭐ Settle a game-day's wages, if one has passed.
   *
   * *Paid off at the end of the day and signed on again* — which is what
   * `endShift` immediately followed by `beginShift` is: the shift clock
   * has to be reset or the next settlement pays for the same hours
   * twice. ⚠ Driven from the RIG's hourly reconcile rather than from a
   * clock of its own, because the thing that should cost money is a hole
   * being sunk, and an outfit with no hole is not a going concern.
   */
  public async payDay(): Promise<void> {
    const now = WorldClockApi.getNow().rawValue();
    if (this.lastPaidS === 0) {
      this.lastPaidS = now;
      return;
    }
    if (now - this.lastPaidS < PAY_PERIOD_S) return;
    this.lastPaidS = now;
    for (const hand of await this.crew()) {
      if (!MixinApi.isEmployed(hand)) continue;
      const employment = hand.getEmployment(this.getOrganizationPath());
      if (!employment) continue;
      await EmploymentApi.settleShiftWage(
        this as unknown as Parameters<typeof EmploymentApi.settleShiftWage>[0],
        hand.getIdentityPath() ?? '',
        employment,
      );
      this.endShift(hand as Stuff & Employed);
      this.beginShift(hand as Stuff & Employed, now);
    }
  }

  /**
   * ⭐ Is this body working for this outfit, on shift, right now?
   *
   * ⚠ The rig's presence read calls this and then checks the ROOM
   * itself: being on shift is a fact about the books, and being at the
   * beam is a fact about where you are standing. The engine measures
   * presence, not virtue, and this is only the first half of it.
   */
  public isWorkingHere(who: Stuff): boolean {
    if (!MixinApi.isEmployed(who)) return false;
    const employment = who.getEmployment(this.getOrganizationPath());
    return employment?.status === 'on-shift';
  }

  /**
   * Every body on the books here, resolved live.
   *
   * ⚠ `employeesOf` answers IDENTITY PATHS, not bodies — the roster memo
   * is keyed on people and a person keys on `getIdentityPath()`. The
   * resolve is the same two lines `EmploymentLogic` writes privately; a
   * hand whose body is not resident is simply not paid this tick, which
   * is the honest answer for somebody the world has evicted.
   */
  private async crew(): Promise<Stuff[]> {
    const out: Stuff[] = [];
    for (const key of EmploymentApi.employeesOf(this.getOrganizationPath())) {
      const body = StuffApi.findByTemplatePath<Stuff>(key);
      if (body && MixinApi.isEmployed(body)) out.push(body);
    }
    return out;
  }
}

export type { DrillingOutfit };
