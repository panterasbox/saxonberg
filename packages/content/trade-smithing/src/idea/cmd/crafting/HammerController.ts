/**
 * HammerController — `hammer [<workpiece>]` (the smithing forming step).
 *
 * An engaged step that does the forming work: requires a reachable
 * `striking` tool AND a reachable `anvil` capability (held kit + room
 * fixtures — the emergent-reachability model; no venue flag), and a
 * workpiece that has taken some heat (you strike while it's hot). At
 * completion it **banks the workpiece's own item-contribution** into the
 * buffer — the forming work is what turns matter into a build — once per
 * build (hammering more shapes, it doesn't multiply the metal).
 *
 * ⭐⭐ **And it is where a bloom becomes a bar.** A bloomery's product is
 * a spongy mass with a quarter of its weight in trapped slag; beating it
 * hot is what squeezes the glass out and welds the iron to itself, and
 * that is not a metaphor for the forming work — it is a different act
 * that happens to use the same tool. The first blow on a bloom does the
 * whole consolidation: the slag lands on the floor, the bar is in your
 * hands, and it weighs visibly less than what you put down.
 *
 * ⚠⚠ **Cast iron refuses here, diegetically.** It has no plastic range
 * at all — hit it hot and it shatters — and the refusal names what it is
 * rather than saying no. The material's missing `forgeable` tag is what
 * actually keeps a pig out of every recipe; this is the verb saying so
 * out loud when somebody points a hammer at one, which is the
 * *afford statically, decline diegetically* rule.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';
const HAMMER_MS = 5000;

const CARBON = '/stuff/idea/material/element/carbon';
/**
 * Above austenite's limit, iron cannot hold its carbon in solution and
 * what comes out is cast — brittle, and unforgeable by anybody.
 */
const C_CAST_FLOOR = 0.021;

interface HammerModel extends CommandModel {
  target?: MqlOneResult;
}

export default class HammerController extends ManualBuildController<HammerModel> {
  execute(model: HammerModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const target: Stuff | null =
      model.target?.stuff ?? this.findBuildVessel(giver);

    if (!target) {
      this.declineStep(
        context,
        Mml.compose`Hammer what? You need a workpiece on the anvil.`,
        'no-vessel',
      );
      return;
    }

    const striker = this.findCapability(giver, 'striking');
    if (!striker) {
      this.declineStep(
        context,
        Mml.compose`You need a hammer in reach to work metal.`,
        'missing-tool',
      );
      return;
    }
    const anvil = this.findCapability(giver, 'anvil');
    if (!anvil) {
      this.declineStep(
        context,
        Mml.compose`You need an anvil to work against.`,
        'missing-tool',
      );
      return;
    }

    // ⚠⚠ **Cast iron is judged BEFORE the heat check, because telling
    // somebody to heat a pig is advice that cannot work.** This used to
    // sit after it, so a cold pig was answered *"stone cold — heat it
    // first"* — sending a player off to do the one thing that changes
    // nothing, since carbon is why it shatters and no temperature fixes
    // that. ⭐ Cast iron is a fact about the METAL, not about the
    // workpiece's state, so it is answered first.
    //
    // ⚠ It sits AFTER the hammer and anvil checks, deliberately: the
    // prose says *"you bring the hammer down"*, so you must have one.
    //
    // ⚠⚠ None of this was reachable at all until the view's arg gate was
    // fixed — it required `DurableMixin`, which no metal stock composes,
    // so every explicit `hammer <target>` died at the binder. A
    // controller test cannot see that: it calls `execute` directly.
    if (isUnforgeable(target)) {
      this.declineStep(
        context,
        Mml.compose`You bring the hammer down and a corner of ${Mml.thing(target)} simply breaks off, grey and glittering. This is cast iron: it has taken up so much carbon that it has no give in it at all. It shatters where iron would spread. Whatever this is going to be, it will be cast in a mould — never forged.`,
        'unforgeable',
      );
      return;
    }

    if (
      !MixinApi.isBuildVessel(target) ||
      !MixinApi.isTangible(target) ||
      !target.getMaterial()
    ) {
      this.declineStep(
        context,
        Mml.compose`Hammer what? You need a workpiece on the anvil.`,
        'no-vessel',
      );
      return;
    }
    if (target.getHeatedToK() <= 0) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(target)} is stone cold — heat it first.`,
        'insufficient-heat',
      );
      return;
    }
    const build = target;
    const commandText = context.commandText;
    this.engageStep(context, {
      // The anvil paces the forming work (the conferring kind's rate);
      // the striking hammer is a requirement, never a pacer.
      durationMs: this.paceMs(HAMMER_MS, anvil, ['anvil']),
      beginSelf: Mml.compose`You set ${Mml.thing(target)} on the anvil and begin to hammer.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} hammers at ${Mml.thing(target)}, ringing the anvil.`,
      onComplete: () => {
        // Bank the workpiece's matter — the forming work. The once-rule
        // is the substrate's (`bankWorkpiece` is idempotent per build).
        const first = build.bankWorkpiece();
        build.recordCommand(commandText);
        // The hammer wears with the work (Law 2).
        if (MixinApi.isDurable(striker)) striker.wear();
        // ⭐⭐ A bloom is CONSOLIDATED by the first blow, and only the
        // first: `bankWorkpiece` returns true exactly once per build, so
        // hammering twice cannot double the metal and cannot halve it
        // either. ⚠ Duck-typed rather than narrowed on the class — the
        // shape-not-mixin rule `analyze water` already uses — so this
        // pack gains no dependency on the smelting trade.
        if (first && isBloom(build)) {
          void consolidate(giver, build);
          return;
        }
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`The metal moves under your hammer — ${Mml.thing(target)} is taking shape.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} draws a shape out of ${Mml.thing(target)} blow by blow.`)
          .send();
      },
    });
  }
}

/**
 * ⚠ Cast iron, by the number on the piece OR the tag on the material.
 * Both, because they answer different questions: the tag is what the
 * kernel's recipe gather reads (silently and correctly — a pig is never
 * picked up), and the number is what a piece that was carburized past
 * the band carries even before anybody gave it a new material row.
 */
function isUnforgeable(target: Stuff): boolean {
  if (MixinApi.isTangible(target) && target.hasMaterialTag('brittle')) return true;
  return MixinApi.isAlloyed(target) && target.fractionOf(CARBON) >= C_CAST_FLOOR;
}

/** A bloom: the one thing that can say how much slag is trapped in it. */
function isBloom(target: Stuff): boolean {
  return typeof (target as unknown as { consolidate?: unknown }).consolidate === 'function';
}

/**
 * Squeeze the slag out, and narrate what it cost. ⭐ The mass loss is
 * the whole lesson — a player who has done this once knows why a bar is
 * worth what a bar is worth — so the scene says the numbers.
 */
async function consolidate(giver: Stuff, target: Stuff): Promise<void> {
  const bloom = target as unknown as {
    consolidate(): Promise<{ bar: Stuff; steel: boolean; slagKg: number; barKg: number } | null>;
  };
  const done = await bloom.consolidate();
  if (!done || giver.isDestroyed()) return;
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      done.steel
        // ⭐ A bloom off a rich charge comes out carrying enough carbon
        // to be steel the moment the glass is out of it — natural steel,
        // which is how most pre-modern steel was actually made. Nobody
        // authored this rung; the smelt's arithmetic produced it.
        ? Mml.compose`The mass spits glass with every blow — gouts of it, hissing onto the floor — and closes up under the hammer until it rings instead of thudding. ${String(done.slagKg)} kg of slag gone, ${String(done.barKg)} kg of metal left, and this is no ordinary bar: it came out of that furnace carrying enough carbon to be steel.`
        : Mml.compose`The mass spits glass with every blow — gouts of it, hissing onto the floor — and closes up under the hammer until it rings instead of thudding. ${String(done.slagKg)} kg of slag gone, and ${String(done.barKg)} kg of wrought iron left in your tongs. That is what a bar costs.`,
    )
    .toPeers(Mml.compose`${Mml.actor(giver)} beats the slag out of a bloom, and the floor hisses.`)
    .send();
}
