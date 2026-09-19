/**
 * ShootController — ⭐⭐ **the verb that ends the medieval.**
 *
 * `shoot` is `throw`'s sibling and deliberately not its subcommand,
 * because what it reads is different in kind. A throw's energy comes out
 * of an arm and a dial; a shot's comes out of a **launcher** — the
 * muzzle speed, the energy source, and the ammunition's mass and
 * calibre. The consequence is the whole tech curve in one line: the
 * energy stops being a fact about the wielder, so a body can fight past
 * its own strength and armour has to answer pressure rather than effort.
 *
 * Three things this controller owns and nothing else does:
 *
 * 1. ⭐ **The arena decides the range.** The envelope is
 *    `arenaMaxBandFor`, the room's real extent — so the same bow reaches
 *    further in the long meadow than in a corridor because the meadow is
 *    longer. Where you choose to fight becomes a decision, which is the
 *    demonstrator arena finally having a purpose.
 * 2. ⭐ **It spends ammunition.** One projectile out of a stack, per
 *    shot. Running out is an ordinary, legible thing.
 * 3. ⭐⭐ **Readiness is the family's identity in one number.** A bow is
 *    three seconds, a crossbow nine, a musket twelve, and that ratio is
 *    the entire reason anybody kept using bows for two centuries after
 *    firearms arrived. The full model — dry-fire, the hold window,
 *    reliability, pattern keys — is the ranged slate's W3/W4; this ships
 *    the one number that makes the choice real.
 *
 * ⚠ Shooting a person starts a fight through the same door `attack` and
 * `throw` use. It is not a way to hurt somebody without the world
 * noticing.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ConditionApi } from '../../../../api/condition';
import { ContainmentApi } from '../../../../api/containment';
import { StuffApi } from '../../../../api/stuff';
import { WorldClockApi } from '../../../../api/worldclock';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Combatant } from '../../../../lib/combat/Combatant';
import type { Launcher } from '../../../../lib/combat/Launcher';
import type Material from '../../../../lib/material/Material';

const TOPIC = 'act.combat';

interface ShootModel extends CommandModel {
  target?: MqlOneResult;
  launcher?: MqlOneResult;
}

export default class ShootController extends CommandController<ShootModel> {
  async execute(model: ShootModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;

    const target = model.target?.stuff as Stuff | undefined;
    if (!target) {
      return this.fail(context, 'Shoot at what?', 'empty-result');
    }
    if (target === giver) {
      return this.fail(context, "You can't shoot yourself.", 'self-target');
    }

    const launcher = this.resolveLauncher(model, giver);
    if (launcher === null) {
      return this.fail(
        context,
        'You have nothing to shoot with.',
        'no-launcher',
      );
    }
    if (!this.isHeld(launcher, giver)) {
      return this.fail(
        context,
        `You are not holding ${launcher.getPresentation()}.`,
        'not-held',
      );
    }

    // ⭐⭐ **Not ready yet.** Refused BEFORE the fight opens and before
    // any ammunition is spent — a reload is not a failed shot.
    const waiting = launcher.secondsUntilReady(this.nowS());
    if (waiting > 0) {
      return this.fail(
        context,
        `${launcher.getPresentation()} is not ready — another ` +
          `${Math.ceil(waiting)} second(s).`,
        'not-ready',
      );
    }

    // ── The ammunition. Running out is ordinary and legible. ──
    const ammo = this.findAmmo(giver, launcher.getProjectileTemplate());
    if (ammo === null) {
      return this.fail(
        context,
        `You have nothing to load ${launcher.getPresentation()} with.`,
        'no-ammunition',
      );
    }

    // ── Shooting a person is starting a fight. Same door as `attack`. ──
    if (MixinApi.isVitals(target) && MixinApi.isEngaged(target)) {
      const opened = await (
        giver as unknown as Stuff & Combatant
      ).initiateCombat(target, {}, async () => null);
      if (!opened.ok) {
        if (opened.reason === 'cancelled') {
          return this.fail(context, 'The moment passes.', 'cancelled');
        }
        return this.fail(
          context,
          "You can't start that fight.",
          opened.reason ?? 'failed',
        );
      }
    }

    const material = this.materialOf(ammo);
    const shot = (giver as unknown as Stuff & Combatant).resolveShot(target, {
      energySource: launcher.getEnergySource(),
      speedMs: launcher.getMuzzleSpeed().rawValue(),
      massKg: this.massOf(ammo),
      // ⚠ The channel is the AMMUNITION's, not the launcher's — an arrow
      // and a ball are both `point` today, but a sling stone would not
      // be, and the launcher has no business deciding what its load does.
      channel: 'point',
      calibreM: this.calibreOf(ammo),
      toughness: material?.getToughness().rawValue(),
      hardness: material?.getHardness().rawValue(),
    });

    this.spendOne(ammo);

    const scene = MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You loose ${Mml.thing(ammo)} at ${Mml.actor(target)}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} looses ${Mml.thing(ammo)} at ${Mml.actor(target)}.`,
      );
    if (MixinApi.isSensor(target)) {
      scene.toTarget(
        target,
        Mml.compose`${Mml.actor(giver)} looses ${Mml.thing(ammo)} at you!`,
      );
    }
    scene.send();

    if (shot.placement === 'miss') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`It goes wide.`)
        .send();
    } else {
      const spec = shot.profile.toInflictSpec('body.torso');
      if (spec !== null) ConditionApi.inflict(target, spec);
    }

    // ⭐ And now you are not ready. This is what makes the family choice
    // real — a musket's twelve seconds is an eternity in a fight, and
    // that is the honest reason to carry a bow as well.
    launcher.markFired(this.nowS());
  }

  /** Game-time now, or `0` when no clock is running (a unit fixture). */
  private nowS(): number {
    try {
      return WorldClockApi.getNow().rawValue();
    } catch {
      return 0;
    }
  }

  /** The named launcher, else the first one the shooter is carrying. */
  private resolveLauncher(
    model: ShootModel,
    giver: Stuff,
  ): (Stuff & Launcher) | null {
    const named = model.launcher?.stuff as Stuff | undefined;
    if (named) return MixinApi.isLauncher(named) ? named : null;
    if (!MixinApi.isContainer(giver)) return null;
    for (const held of giver.getContents()) {
      const stuff = held as unknown as Stuff;
      if (MixinApi.isLauncher(stuff)) return stuff;
    }
    return null;
  }

  /** Is this launcher actually in a hand? */
  private isHeld(launcher: Stuff, giver: Stuff): boolean {
    if (!MixinApi.isSlotted(giver)) return true; // nothing to check against
    for (const [, occupants] of giver.getAllOccupants()) {
      for (const occ of occupants) {
        if ((occ as unknown as Stuff) === launcher) return true;
      }
    }
    return false;
  }

  /** A stack of the launcher's ammunition, somewhere on the shooter. */
  private findAmmo(giver: Stuff, templatePath: string): Stuff | null {
    if (!templatePath || !MixinApi.isContainer(giver)) return null;
    for (const item of giver.getContents()) {
      const stuff = item as unknown as Stuff;
      if (stuff.getTemplatePath() === templatePath) return stuff;
    }
    return null;
  }

  /**
   * Spend one. ⭐ A stack of one is DESTROYED rather than left at zero —
   * an empty quiver in your pack is a thing that should not exist.
   */
  private spendOne(ammo: Stuff): void {
    if (!MixinApi.isStackable(ammo)) {
      StuffApi.destruct(ammo);
      return;
    }
    const left = ammo.getQuantity() - 1;
    if (left <= 0) {
      StuffApi.destruct(ammo);
      return;
    }
    ammo.setQuantity(left);
  }

  private massOf(item: Stuff): number {
    return MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
  }

  private calibreOf(item: Stuff): number | undefined {
    const withCalibre = item as unknown as {
      getCalibre?: () => { rawValue(): number };
    };
    return typeof withCalibre.getCalibre === 'function'
      ? withCalibre.getCalibre().rawValue()
      : undefined;
  }

  private materialOf(item: Stuff): Material | null {
    return MixinApi.isTangible(item) ? item.getMaterial() : null;
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
