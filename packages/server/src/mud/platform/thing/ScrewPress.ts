/**
 * ScrewPress — ⭐ a press worked by a screw (ceramics S16, D25): a heavy
 * frame with a platen on a threaded spindle, and a bed things are set `on`.
 * Each turn of the bar drives the platen down harder — `newtonsPerTurn` more
 * — onto whatever mould stands on the bed, up to `maxTurns`, when the screw
 * will go no further. `turn back press` slackens it off.
 *
 * ⭐ It loads a mould exactly as a weight put ON the mould does: the mould
 * asks its placement host what it bears on it (`Placing.bearingLoadN`,
 * read by `MouldMixin.loadN`), so a
 * cheese hoop on the bed drains faster and drier than a stone could press
 * it, and a tile mould charged with tempered clay is pressed — and the tile
 * releases — the moment the screw beats the clay's stiffness.
 *
 * Instanceable (rows over it: the creamery's cheese press, the foundry's
 * tile press), so it lives in `platform/thing/`.
 */
import Good from '../../lib/stuff/Good';
import { PlacingMixin } from '../../lib/spatial/Placing';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import { TurnableMixin } from '../../lib/craft/Turnable';
import type { ActOutcome, ActRefusal } from '../../lib/craft/ActPlan';
import { PersistableApi } from '../../api/persistable';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

// ⭐ It is TURNED (`TurnableMixin`), which is also what affords `turn`.
export default class ScrewPress extends TurnableMixin(PlacingMixin(Good)) {
  static fieldMeta: FieldMeta = {
    newtonsPerTurn: { persistent: true, authorable: true },
    maxTurns: { persistent: true, authorable: true },
    turns: { persistent: true, runtimeState: true },
  };

  /** How much harder each turn of the bar drives the platen, N. */
  public newtonsPerTurn = 1500;
  /** The screw goes no further than this many turns down. */
  public maxTurns = 8;
  /** Turns taken down on the screw now. */
  public turns = 0;

  public getNewtonsPerTurn(): number {
    return this.newtonsPerTurn;
  }
  public setNewtonsPerTurn(value: number): void {
    this.newtonsPerTurn = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public getMaxTurns(): number {
    return this.maxTurns;
  }
  public setMaxTurns(value: number): void {
    this.maxTurns = Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
  }
  public getTurns(): number {
    return this.turns;
  }

  /** ⭐ The force the platen bears down with on what stands on the bed, N. */
  public pressForceN(): number {
    return this.turns * this.newtonsPerTurn;
  }

  /** ⭐ What the platen bears on a thing standing on the bed. */
  public override bearingLoadN(item: Stuff & Containable): number {
    return item.getPlacement()?.name === 'on' ? Math.max(0, this.pressForceN()) : 0;
  }

  /** The moulds standing on the bed. */
  private moulds(): Stuff[] {
    return this.getPlaced('on').filter((s) => MixinApi.isMould(s as Stuff)) as Stuff[];
  }

  public override async turnBy(actor: Stuff, back: boolean): Promise<ActOutcome | ActRefusal> {
    const self = this as unknown as Stuff;
    const moulds = this.moulds();
    // ⭐ Bank the set at the OLD load before the load changes — a drain set
    // integrates its progress by the load it was under.
    for (const m of moulds) if (MixinApi.isMould(m)) m.reconcileSetting();
    if (back) {
      if (this.turns === 0) {
        return { ok: false, reason: 'already-slack', line: Mml.compose`${Mml.thing(self)} is already slack.` };
      }
      this.turns = 0;
      await PersistableApi.captureHostOf(this as unknown as Stuff).catch(() => undefined);
      return {
        ok: true,
        line: Mml.compose`You spin the bar back and the platen lifts clear.`,
        peers: Mml.compose`${Mml.actor(actor)} slackens off ${Mml.thing(self)}.`,
      };
    }
    if (this.turns >= this.maxTurns) {
      return {
        ok: false,
        reason: 'screwed-down',
        line: Mml.compose`The screw will go no further — ${Mml.thing(self)} is bearing down as hard as it can.`,
      };
    }
    this.turns += 1;
    // ⭐ A screw left down is state the room must keep: save the host now
    // (the die's precedent) — a turn made since the room's last save came
    // back from a restart undone (the ceramics drive, 35).
    await PersistableApi.captureHostOf(this as unknown as Stuff).catch(() => undefined);
    const released: Stuff[] = [];
    for (const m of moulds) {
      if (!MixinApi.isMould(m)) continue;
      const out = await m.pressRelease();
      if (out !== null) released.push(out);
    }
    const tight =
      this.turns >= this.maxTurns
        ? 'as tight as it will go'
        : this.turns > this.maxTurns / 2
          ? 'hard down'
          : 'snug';
    if (released.length > 0) {
      return {
        ok: true,
        line: Mml.compose`You heave the bar round and the platen bears down, ${tight}. ${Mml.thing(released[0]!)} takes the shape and comes free of the mould.`,
        peers: Mml.compose`${Mml.actor(actor)} turns ${Mml.thing(self)} down.`,
      };
    }
    return {
      ok: true,
      line:
        moulds.length > 0
          ? Mml.compose`You heave the bar round and the platen bears down on ${Mml.thing(moulds[0]!)}, ${tight}.`
          : Mml.compose`You heave the bar round. The platen comes down on an empty bed.`,
      peers: Mml.compose`${Mml.actor(actor)} turns ${Mml.thing(self)} down.`,
    };
  }
}
