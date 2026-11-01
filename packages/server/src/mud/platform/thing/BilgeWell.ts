/**
 * BilgeWell — ⭐ **the well in a ship's bottom where her bilge water
 * gathers, and the pump set in it** (harbors P19, B4).
 *
 * A ship's hull weeps as its seams go (her shell's band, on the house's
 * clock), and what comes in lies in her bilge: `Ship.bilgeL`, reconciled
 * on read. This fixture is how a hand gets at it. It answers the kernel's
 * two pump shapes off its SHIP and holds nothing of its own:
 *
 *  - {@link PumpSource} — it holds its pump as content and refuses
 *    anything else (*"Only a pump goes in a bilge well."*), the `Well`
 *    rule: a row is born with one (`props: [/stuff/thing/bilge-pump]`).
 *  - {@link LiftSource} — the water stands her hull's depth less its own
 *    height below the deck; what stands is her bilge, reconciled now; a
 *    lift is `ship.pumpOut(litres)`; and it goes over the side, so the
 *    draw point never fills (`receivableL` is unbounded).
 *
 * So `pump well` aboard is the shipped verb, one stroke a spell, and the
 * level falls by what each stroke throws out while the seams keep letting
 * it back in between. Working it is seamanship (P24): the hand at the
 * brake is credited by the lift.
 *
 * Which ship: the room it stands in is one of her rooms, and her warren
 * names her (`structureOf`) — or, for an authored ship's room her warren
 * has not adopted yet, the structure attachments by the room's path. In
 * no ship (a well propped in a shed) there is nothing below it to pump.
 *
 * `Thing`, not `Good` — the `Well` reasoning: it is part of her, and
 * nobody's chattel.
 *
 * See [docs/subsystems/pump.md].
 */

import Thing from '../../lib/stuff/Thing';
import { ContainerMixin } from '../../lib/spatial/Container';
import { StagedMixin } from '../../lib/stuff/Staged';
import { MixinApi } from '../../api/mixin';
import { NavigationApi } from '../../api/navigation';
import { Mml } from '../../api/mml';
import Ship from '../idea/Ship';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { VetoResult } from '../../lib/errors';
import type { LiftSource, PumpSource } from '../../lib/pump/Pumpable';
import type { CommandContributions } from '../../api/command';

/** What lies in a bilge: the water she let in. */
const WATER_PATH = '/stuff/idea/material/bulk/water';

const BilgeWellBase = StagedMixin(ContainerMixin(Thing));

export default class BilgeWell extends BilgeWellBase implements LiftSource, PumpSource {
  /** Sideways: anyone at the well can try its brake. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/device/pump.yaml'],
  };

  constructor() {
    super();
    // Part of her. Nobody walks off with it.
    this.fixedInPlace = true;
  }

  /** ⭐ The ship this well is in, or `null` — her warren's, else her rooms' attachment. */
  public shipOf(): Ship | null {
    const room = this.getContainer();
    if (room === null) return null;
    if (MixinApi.isWarrenMember(room)) {
      const s = room.getWarren()?.structureOf() ?? null;
      if (s instanceof Ship) return s;
    }
    const path = room.getDurableHandle() ?? room.getTemplatePath() ?? '';
    const s = path === '' ? null : NavigationApi.structureAtNow(path);
    return s instanceof Ship ? s : null;
  }

  // ---------- the pump it holds ----------

  /** The pump set in this well, or `null`. */
  public pumpFitted(): Stuff | null {
    for (const c of this.getContents()) {
      if (MixinApi.isPumping(c)) return c;
    }
    return null;
  }

  /** ⭐ Only a pump goes in a bilge well, and only one. */
  public canAddContainable(thing: Stuff & Containable): VetoResult {
    if (!MixinApi.isPumping(thing)) {
      return { ok: false, reason: 'Only a pump goes in a bilge well.' };
    }
    if (this.pumpFitted() !== null) {
      return { ok: false, reason: 'There is a pump in it already.' };
    }
    return { ok: true };
  }

  // ---------- ⭐⭐ LiftSource, off her bilge ----------

  /** How far below the deck the water stands: her hull's depth less its height. */
  public standingDepthM(): number {
    const ship = this.shipOf();
    if (ship === null) return 0;
    return Math.max(0, ship.hullDepthM() - ship.bilgeHeightNowM());
  }

  public async standingMaterial(): Promise<string | null> {
    return this.shipOf() === null ? null : WATER_PATH;
  }

  /** Her bilge, reconciled to now — what a stroke could take. */
  public async standingAvailableL(): Promise<number> {
    const ship = this.shipOf();
    return ship === null ? 0 : ship.reconcileBilge();
  }

  /** ⭐ Over the side: the draw point never fills. */
  public receivableL(): number {
    return Infinity;
  }

  /**
   * ⭐ A stroke throws `litres` out of her bilge (`ship.pumpOut`). The hand
   * at the brake is credited with seamanship (P24).
   */
  public async liftInto(litres: number, by?: Stuff): Promise<number> {
    const ship = this.shipOf();
    if (ship === null) return 0;
    const moved = await ship.pumpOut(litres);
    if (moved > 0 && by !== undefined && MixinApi.isAdvancing(by)) {
      await by.creditDeed({ discipline: 'seamanship', difficulty: 'easy', outcome: 'success' });
    }
    return moved;
  }

  public liftScope(): (Stuff & Container) | null {
    const here = this.getContainer();
    return here && MixinApi.isContainer(here) ? here : null;
  }

  /** Where it goes: over her side, not into the well. */
  public liftedWords(what: string): Mml {
    return Mml.compose`${what} comes up in gouts and runs out over her side.`;
  }
}
