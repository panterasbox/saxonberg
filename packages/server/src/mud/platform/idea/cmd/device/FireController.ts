/**
 * FireController — `fire [<kiln>] [--draught <word>] [for <hold>]` /
 * `burn …`: ⭐⭐ **hold a lit chamber at heat; decide nothing about the
 * charge.**
 *
 * ## Why this is the PLATFORM's, on the appliance
 *
 * Firing a loaded chamber is afforded by the chamber (`BurnerMixin`'s
 * contributions), and it holds from Rome to New York: a limekiln, a bread
 * oven, a bottle kiln and a crucible furnace are one mechanism on
 * different dials.
 *
 * ## ⭐⭐ Firing is ONE rule (ceramics M1), and it is not here
 *
 * Until the ceramics build this controller scanned the recipe catalogue
 * for a firing whose slots the charge satisfied, and ran it — a second
 * path beside the physics, so a pot fired in a house fire and a pot fired
 * in a kiln were different events. Now every body that has been hot
 * carries its own kinetic record (`ThermalMixin.kineticRecord`), and its
 * material says what that history makes of it (`Material.kinetics`).
 * This verb **lights nothing and decides nothing**: it sets the air, holds
 * the chamber at heat for as long as you tend it, and at the end asks the
 * chamber to settle (`Burner.settleFiring`) — each piece reads itself — and
 * says what came out by reading each piece's record.
 *
 * ## ⚠ `fire` is not `ignite`
 *
 * *"Fire the kiln"* ambiguously means *light it* — which `ignite` owns — so
 * the chamber must already be lit, and the refusal says so (the smelt's
 * own hard-won distinction: an unlit furnace is a *cold* one). **And a
 * lime-burner burns lime**, which is why `burn` is on the same view.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Burner } from '../../../../lib/fire/Burner';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';

const TOPIC = 'act.deed';

/** Game-ms a firing is tended when no hold is named. */
const FIRE_MS = 60_000;

/** Metabolic watts of tending a firing — stoking and watching, not swinging. */
const FIRE_EFFORT_W = 420;

/** The draught ladder's words — the `draught` verb's own (DraughtController). */
const DRAUGHTS: Readonly<Record<string, number>> = {
  wide: 1,
  open: 1,
  half: 0.5,
  low: 0.2,
  banked: 0.05,
};

export interface FireModel extends CommandModel {
  kiln?: MqlOneResult;
  /** `for 30 minutes` — how long to hold the chamber at heat. */
  hold?: string;
  /** `--draught low` — the air to fire at. */
  draught?: string;
}

export default class FireController extends CommandController<FireModel> {
  async execute(model: FireModel, context: CommandContext): Promise<void> {
    const bound = model.kiln?.stuff ?? null;
    if (bound === null || !MixinApi.isBurner(bound) || !MixinApi.isContainer(bound)) {
      this.decline(
        context,
        model.kiln?.raw
          ? Mml.compose`You don't see any '${model.kiln.raw}' here to fire.`
          : Mml.compose`Fire what? There is nothing here with a chamber in it.`,
        'no-kiln',
      );
      return;
    }
    const kiln = bound as Stuff & Container & Burner;

    let draught: number | null = null;
    if (typeof model.draught === 'string' && model.draught.trim() !== '') {
      draught = DRAUGHTS[model.draught.trim().toLowerCase()] ?? null;
      if (draught === null) {
        this.decline(
          context,
          Mml.compose`Fire it at what draught? Say wide, open, half, low or banked.`,
          'bad-draught',
        );
        return;
      }
    }

    let holdS = FIRE_MS / 1000;
    if (typeof model.hold === 'string' && model.hold.trim() !== '') {
      const parsed = FireController.parseHoldS(model.hold);
      if (parsed === null) {
        this.decline(
          context,
          Mml.compose`Fire it for how long? Say it the way a clock does — "for 30 minutes", "for 2 hours".`,
          'bad-duration',
        );
        return;
      }
      holdS = parsed;
    }

    // ⭐ The charge is whatever is IN the chamber — and in a mould standing
    // in it. Never an argument: the heat reaches what is there.
    const charge = kiln.getContents().filter((c) => MixinApi.isTangible(c));
    // ⭐ …or standing ON it: a pan on a brine hearth is that hearth's whole
    // load (it is in the room, resting on the fire — the heat reaches it
    // through its placement). "The brine hearth is empty" with a pan of
    // brine on it was the ceramics drive.
    const kilnRoom = MixinApi.isContainable(kiln) ? kiln.getContainer() : null;
    if (kilnRoom && MixinApi.isContainer(kilnRoom)) {
      for (const c of kilnRoom.getContents() as Stuff[]) {
        if (MixinApi.isContainable(c) && c.getPlacement()?.host === (kiln as unknown as Stuff) && MixinApi.isTangible(c)) {
          charge.push(c);
        }
      }
    }
    if (charge.length === 0) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(kiln)} is empty. Load it with something before you fire it.`,
        'no-charge',
      );
      return;
    }

    // ⚠⚠ **Unlit is COLD, not cool.** The smelt learned this in a browser:
    // telling somebody to work the bellows on a stone-cold shaft sends them
    // in a circle.
    if (!kiln.isLit()) {
      this.decline(
        context,
        Mml.compose`The charge is in and ${Mml.thing(kiln)} is stone cold. Light it first — nothing fires until something is burning.`,
        'not-lit',
      );
      return;
    }

    if (draught !== null) kiln.setDraught(draught);
    const giver = context.commandGiver;
    const identity = giver.getIdentityPath() ?? '';
    // ⭐ Whoever holds the firing is credited for what it makes — stamped
    // on every body now, so a rung reached while nobody watched still
    // knows whose firing it was.
    for (const body of chargeBodies(kiln)) {
      if (MixinApi.isThermal(body)) {
        body.getTemperature();
        if (identity !== '') body.stampFiredBy(identity);
      }
    }

    await kiln.onFireStart(giver);
    const heldK = kiln.getHeldTemperatureK();
    this.engage(context, holdS * 1000, heldK, () => {
      // ⚠⚠ A module function over captured locals, never `this.<method>`: a
      // controller is one ephemeral clone per execution and is destructed
      // the moment `execute` returns, while a firing holds the chamber at
      // heat over game time.
      void settle(context, kiln, heldK, holdS);
    });
  }

  /**
   * `"30 minutes"`, `"2 hours"`, `"1 day"` → game-seconds; `null` when it
   * is not a duration. The world clock's own grammar.
   */
  private static parseHoldS(text: string): number | null {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/i.exec(text);
    if (!m) return null;
    const n = Number(m[1]);
    const unit = (m[2] ?? '').toLowerCase();
    const per = unit === 'second' ? 1 : unit === 'minute' ? 60 : unit === 'hour' ? 3600 : 86_400;
    const s = n * per;
    return s > 0 ? s : null;
  }

  /**
   * Hold the chamber at heat over game time. ⭐ A long hold is SEALED DOWN
   * and watched, not worked: the tending is a minute's stoking spread over
   * the hold, so a two-hour firing does not exhaust anybody.
   */
  private engage(
    context: CommandContext,
    holdMs: number,
    heldK: number,
    onDone: () => void,
  ): void {
    const giver = context.commandGiver;
    const durationMs = Math.max(FIRE_MS, holdMs);
    const effortW = (FIRE_EFFORT_W * FIRE_MS) / durationMs;
    if (MixinApi.isExerting(giver) && !giver.canExert(effortW, durationMs / 1000)) {
      this.decline(context, Mml.fromMarkup(giver.exhaustionRefusal()), 'too-tired');
      return;
    }
    if (!MixinApi.isEngaged(giver)) {
      onDone();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['attention'],
      durationMs,
      effortW,
      onComplete: onDone,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && result.status !== 'completed-sync') context.note(result.note);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You seal the chamber down and settle in to hold it at about ${String(Math.round(heldK / 5) * 5)} K.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sets a firing going.`)
      .send();
  }

  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/** The chamber's bodies, and one level down what a mould standing in it holds. */
function chargeBodies(kiln: Stuff & Container): Stuff[] {
  const out: Stuff[] = [];
  for (const c of kiln.getContents()) {
    out.push(c);
    if (MixinApi.isMould(c) && MixinApi.isContainer(c)) {
      for (const inner of c.getContents()) out.push(inner);
    }
  }
  return out;
}

/** How a piece reads after a firing, from its own record — or `null`. */
function firedWord(body: Stuff): string | null {
  if (!MixinApi.isThermal(body)) return null;
  return body.isPartConverted() ? 'burnt to the skin and raw at the heart' : null;
}

/**
 * The firing's end: the chamber settles (each piece reads its own heat
 * history), the firer is soiled and credited, and what came out is said.
 *
 * ⚠⚠ A module function — the controller is long gone. And the actor may be
 * too: a player can log out inside a firing. ⭐ **The chamber still fires**,
 * because a kiln does not stop because somebody left; only the telling of
 * it needs a listener.
 */
async function settle(
  context: CommandContext,
  kiln: Stuff & Container & Burner,
  heldK: number,
  holdS: number,
): Promise<void> {
  const giver = context.commandGiver;
  const settled = await kiln.settleFiring(giver.isDestroyed() ? null : giver);
  // ⭐ The hold wore the chamber's lining (ceramics D19).
  kiln.wearLining(heldK, holdS);
  const disciplines = [...settled.disciplines];

  // ⭐ (cleanliness D14) The hold is a DRY HEAT on everything Soilable in
  // the chamber — the ACTUAL peak and hold off each body's own record, not
  // a recipe's figures.
  for (const body of chargeBodies(kiln)) {
    if (body.isDestroyed() || !MixinApi.isSoilable(body) || !MixinApi.isThermal(body)) continue;
    const rec = body.getKineticRecord();
    const peak = rec?.peakK ?? body.getTemperature().rawValue();
    body.recordHeat(peak, rec?.aboveS ?? 0);
  }

  if (giver.isDestroyed()) return;
  if (MixinApi.isAdvancing(giver)) {
    for (const discipline of new Set(disciplines)) {
      await giver.creditDeed({ discipline, difficulty: 'standard', outcome: 'success' });
    }
  }

  const bodies = chargeBodies(kiln).filter((b) => !b.isDestroyed() && MixinApi.isTangible(b));
  const first = bodies[0];
  const partial = bodies.map(firedWord).find((w) => w !== null) ?? null;
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      first === undefined
        ? settled.burnt > 0
          ? Mml.compose`The chamber cools on nothing but ash. It drew too much air, and what was in it burned.`
          : Mml.compose`The chamber cools and there is nothing in it.`
        : partial !== null
          ? Mml.compose`The chamber cools. ${Mml.thing(first)} is in it — ${partial}.`
          : bodies.length === 1
            ? Mml.compose`The chamber cools. ${Mml.thing(first)} is in it.`
            : Mml.compose`The chamber cools. ${String(bodies.length)} things are in it, ${Mml.thing(first)} among them.`,
    )
    .toPeers(Mml.compose`${Mml.actor(giver)} draws a firing.`)
    .send();
}
