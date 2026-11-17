/**
 * FluedMixin — ⭐ **a built-in fire that burns indoors has a flue**, and the
 * flue soots (cleanliness D18).
 *
 * Every kilogram a hearth or an oven burns badly puts its incomplete share
 * up the chimney as SOOT, and the soot stays there: `flueSoot`, kg, the
 * one field. A winter of smoky fires lays down a few hundred grams. When
 * enough has built up and the fire is roaring — drawing the flue hot — the
 * soot CATCHES: a roar in the chimney, sparks, smoke into the room and a
 * blast of heat on what is in it. Sweeping the flue with a brush is what
 * stops it, and why sweeps existed.
 *
 * ⭐ Composed on `Hearth` and `Oven`, never on `Firebox`: a campfire is a
 * Firebox and has no flue, a forge and a kiln have stacks of their own
 * (deferred). A brazier — a flueless hearth you can carry — is its own
 * class and breathes straight into the room.
 *
 * The soot is the ACT's deposit (`consumeFuel`), never a clock.
 */

import type { NestingConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Burner } from './Burner';
import { SweepableMixin, type SweepPlan, type SweepRefusal, type SweepRequest } from '../cleanliness/Sweepable';

/** Brushing a flue, real ms — rod by rod. */
const FLUE_SWEEP_MS = 24000;
/** What brushing a flue costs, W. */
const FLUE_SWEEP_W = 400;
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { PersistableApi } from '../../api/persistable';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { DirtKinds } from '../cleanliness/DirtKind';

/** Soot a swept flue drops, as a load on the floor per kg (D18). */
const SOOT_LOAD_PER_KG = 0.8;

export interface Flued {
  /** Soot in the flue, kg. */
  getFlueSoot(): number;
  /** Sweep the flue clean: the soot comes down, kg returned. */
  sweepFlue(): number;
  /**
   * ⭐ The whole chimney sweep (cleanliness D18): the soot comes down onto
   * the room's floor and the sweeper's hands, the room kept.
   */
  sweepChimney(sweeper: Stuff): Promise<{ sootKg: number; taken: Stuff[] }>;
  /** Is the flue sooted enough to catch? */
  isFlueFoul(): boolean;
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** *The chimney is thick with soot.* — when it is, and only in words. */
function flueAugmenter(text: string, host: Stuff): string {
  const flued = host as unknown as Partial<Flued>;
  if (typeof flued.getFlueSoot !== 'function') return text;
  const soot = flued.getFlueSoot();
  const at = dial(AppSettingKeys.fireFlueIgnitesAtKg, 0.5);
  if (soot < at * 0.2) return text;
  const line =
    soot >= at
      ? 'The flue is caked with soot — it wants sweeping before it catches.'
      : 'Soot is building up in the flue.';
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function FluedMixin<TBase extends NestingConstructor<Stuff & Burner>>(
  Base: TBase,
) {
  // ⭐ A chimney is swept (`SweepableMixin`): with a flue brush, the soot
  // comes down. A grate is raked, not swept — `rake`, the Burner's own
  // (controller-liquidity W18).
  return class FluedMixin extends SweepableMixin(Base) implements Flued {
    static _mixinName: string = 'FluedMixin';

    /**
     * @hook `sweep` sweeps the CHIMNEY (soot onto the hearthstone and the
     * sweeper's hands) — with a flue brush; a broom does not go up a flue.
     */
    public override sweepPlanFor(req: SweepRequest): SweepPlan | SweepRefusal | null {
      if (!req.brush) return { ok: false, reason: 'no-brush' };
      return {
        ok: true,
        durationMs: FLUE_SWEEP_MS,
        effortW: FLUE_SWEEP_W,
        facts: { tool: 'brush' },
        onComplete: async () => {
          const { sootKg, taken } = await this.sweepChimney(req.actor);
          return {
            ok: true,
            facts: { kg: sootKg, kinds: Object.fromEntries(sootKg > 0 ? [[DirtKinds.SOOT, sootKg]] : []), taken },
          };
        },
      };
    }

    static fieldMeta: FieldMeta = {
      flueSoot: { persistent: true, runtimeState: true },
    };

    static markupAugmenters: MarkupAugmenter[] = [flueAugmenter];

    /** Soot in the flue, kg. */
    public flueSoot = 0;

    public getFlueSoot(): number {
      return this.flueSoot;
    }

    public isFlueFoul(): boolean {
      return this.flueSoot >= dial(AppSettingKeys.fireFlueIgnitesAtKg, 0.5);
    }

    public async sweepChimney(sweeper: Stuff): Promise<{ sootKg: number; taken: Stuff[] }> {
      const self = this as unknown as Stuff;
      const soot = this.sweepFlue();
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      const floor =
        room && MixinApi.isAdornable(room) ? (room.getFloor() as unknown as Stuff | null) : null;
      if (floor && MixinApi.isSoilable(floor) && soot > 0) {
        floor.soil(DirtKinds.SOOT, soot * SOOT_LOAD_PER_KG);
      }
      if (MixinApi.isHygienic(sweeper)) sweeper.soilFrom([{ kind: DirtKinds.SOOT, amount: 0.3, where: 'hands' }]);
      const taken = await this.takeSoot(sweeper, soot);
      await PersistableApi.captureHostOf(self).catch(() => {});
      return { sootKg: soot, taken };
    }

    /**
     * ⭐ The soot brought down is a THING when the realm names one (paint
     * D18): `cleanliness.sootTemplate` — the painting trade sets it to its
     * lampblack, the oldest black there is. One per `cleanliness.sootPerUnitKg`
     * of soot, into the sweeper's hands. Unset (the default), nothing is
     * minted and the soot is only the floor's dirt, as it always was.
     */
    private async takeSoot(sweeper: Stuff, kg: number): Promise<Stuff[]> {
      const template = (() => {
        try {
          return AppApi.setting(AppSettingKeys.cleanlinessSootTemplate) ?? '';
        } catch {
          return '';
        }
      })();
      const perUnit = dial(AppSettingKeys.cleanlinessSootPerUnitKg, 0.1);
      const units = Math.floor(kg / perUnit);
      if (template === '' || units < 1) return [];
      const lump = await StuffApi.clone<Stuff>(template);
      if (MixinApi.isStackable(lump)) lump.setQuantity(units);
      const into = MixinApi.isContainer(sweeper) ? sweeper : MixinApi.isContainable(sweeper) ? sweeper.getContainer() : null;
      if (into !== null && MixinApi.isContainer(into) && MixinApi.isContainable(lump)) {
        ContainmentApi.move(lump, into);
      }
      return [lump];
    }

    public sweepFlue(): number {
      const kg = this.flueSoot;
      this.flueSoot = 0;
      return kg;
    }

    /**
     * ⭐ What burns badly goes up the flue as soot — and a foul flue under
     * a roaring fire catches.
     */
    public consumeFuel(kg: number): void {
      const fire = this as unknown as Burner & { maxBurnPowerW: number };
      const burning = fire.burnPowerW();
      super.consumeFuel(kg);
      if (!(kg > 0)) return;
      const incomplete = Math.max(0, 1 - fire.completeness());
      this.flueSoot += kg * incomplete * dial(AppSettingKeys.fireFlueSootFraction, 0.02);
      if (this.isFlueFoul() && burning >= 0.7 * fire.maxBurnPowerW) this.catchFlue();
    }

    /** The chimney fire: the soot burns out at once, into the room. */
    private catchFlue(): void {
      const soot = this.flueSoot;
      this.flueSoot = 0;
      const self = this as unknown as Stuff;
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (room === null || !MixinApi.isContainer(room)) return;
      // ⭐ Soot burns hot: its heat of combustion, the third of it that
      // comes back down into the room rather than up the stack.
      const joules = soot * 30e6 * 0.3;
      const contents = room.getContents();
      const thermal = contents.filter((c) => c !== self && MixinApi.isThermal(c));
      for (const c of thermal) {
        if (MixinApi.isThermal(c)) c.depositHeat(joules / Math.max(1, thermal.length));
      }
      if (MixinApi.isAtmospheric(room)) {
        room.addAtmosphereContent('/stuff/idea/material/gas/smoke', soot * 300);
      }
      const line = Mml.compose`A roar goes up the chimney like a train, and sparks and burning soot come rolling down into the room.`;
      for (const c of contents) {
        if (MixinApi.isSensor(c)) {
          MessageApi.scene(c).topic('sense.surroundings').toSelf(line).toPeers(line).send();
          break;
        }
      }
    }
  };
}
