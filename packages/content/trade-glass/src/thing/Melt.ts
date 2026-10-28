/**
 * Melt — a pot of molten glass, the batch's fired output (glass build
 * D3). `AlloyedMixin(ThermalMixin(Good))`: it has a temperature (it cools
 * when the kiln goes out and is re-fired with the remelt recipe) and a
 * composition (the iron from the sand, plus the pot's own pickup). It is
 * ONE tangible — the pot and its glass together, consumed with the
 * campaign — and is deliberately **not** `Meltable` and **not**
 * `Bulkable`: the firing path is item-only and clones cold, so making the
 * melt a liquid pool would need a seam the firing path does not have.
 *
 * ⭐ It is a DIP BATH (`DipBathMixin`, ceramics review): `dip pipe in melt`
 * — or `gob`, the glassblower's word, an alias of `dip` — lowers the pipe
 * in and turns up a gather, drawn by mass (`takeGather`). A gather is
 * taken from the pot; a cullet lump or an old bottle goes back in the pot
 * to remelt. A melt that has stiffened below its working heat refuses the
 * pipe and is simply fired again.
 */

import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { ThermalMixin } from "@saxonberg/server/mud/lib/thermal/Thermal";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { AppApi } from "@saxonberg/server/mud/api/app";
import type { CompositionEntry } from "@saxonberg/server/mud/lib/material/Material";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import type { Engaged } from "@saxonberg/server/mud/lib/activity/Engaged";
import { DipBathMixin } from "@saxonberg/server/mud/lib/craft/DipBath";
import type { DipRequest } from "@saxonberg/server/mud/lib/craft/DipBath";
import type { ActPlan, ActRefusal } from "@saxonberg/server/mud/lib/craft/ActPlan";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { SchedulerApi } from "@saxonberg/server/mud/api/scheduler";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Gather, { GLASSWORK_TOPIC } from "./Gather";
import Blowpipe from "./Blowpipe";
import { HotWorkWatch } from "../lib/HotWork";

const GATHER_ROW = "/trade/glass/thing/gather";

/** Numeric pack-setting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

const MeltBase = DipBathMixin(AlloyedMixin(ThermalMixin(Good)));

export default class Melt extends MeltBase {
  /**
   * Fluid enough to gather from — at or above 0.9× the glass's own
   * melting point. A cooled melt is a solid pot of glass that refuses the
   * pipe until it is fired again.
   */
  /**
   * ⭐ A pipe dipped in the melt turns up a gather — the named pipe, else the
   * empty blowpipe in the glassblower's hands (a bare `gob`). From the
   * moment it is lifted it COOLS: the hot-work watch is the window.
   */
  public override async dipPlanFor(req: DipRequest): Promise<ActPlan | ActRefusal | null> {
    const actor = req.actor;
    const target = req.target;
    if (target !== null && !(target instanceof Blowpipe)) {
      return {
        ok: false,
        reason: "not-a-pipe",
        line: Mml.compose`You gather hot glass on a blowpipe, not on ${Mml.thing(target)}.`,
      };
    }
    const pipe = target ?? emptyPipeOf(actor);
    if (pipe === null || pipe.getContents().some((c) => c instanceof Gather)) {
      return {
        ok: false,
        reason: "no-pipe",
        line: Mml.compose`You need an empty blowpipe in hand — the one you have is already carrying a gather.`,
      };
    }
    if (!this.isFluid()) {
      return {
        ok: false,
        reason: "melt-cold",
        line: Mml.compose`${Mml.thing(this as unknown as Stuff)} has stiffened — there is no gathering from it cold. Work the bellows and fire it again.`,
      };
    }
    if (!MixinApi.isEngaged(actor)) {
      return { ok: false, reason: "cannot-engage", line: Mml.compose`You cannot give this your attention just now.` };
    }
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      beginSelf: Mml.compose`You lower the pipe into ${Mml.thing(this as unknown as Stuff)}.`,
      onComplete: async (): Promise<void> => {
        const gatherKg = dial("glass.hotwork.gatherKg", 0.4);
        const meltK = this.getTemperature().rawValue();
        const makeup = this.takeGather(gatherKg);
        const gather = await StuffApi.clone<Gather>(GATHER_ROW);
        gather.setMass(Quantity.of(gatherKg, "kg"));
        gather.setStampedTemperatureK(meltK);
        gather.setForm("gather");
        if (makeup.length > 0) gather.setMakeup(makeup);
        ContainmentApi.move(gather as unknown as Stuff & Containable, pipe);
        SchedulerApi.start(
          new HotWorkWatch({ actor: actor as unknown as Stuff & Engaged, pipe: pipe as unknown as Stuff, gather }),
        );
        MessageApi.scene(actor)
          .topic(GLASSWORK_TOPIC)
          .toSelf(Mml.compose`You lower the pipe into ${Mml.thing(this as unknown as Stuff)} and turn up a glowing gather. Work it while it is hot.`)
          .toPeers(Mml.compose`${Mml.actor(actor)} gathers a blob of hot glass on a blowpipe.`)
          .send();
      },
    };
  }

  public isFluid(): boolean {
    const mp = this.getMaterial()?.getMeltingPoint().rawValue() ?? 0;
    if (mp <= 0) return false;
    return this.getTemperature().rawValue() >= 0.9 * mp;
  }

  /**
   * Draw one gather's worth of mass off the melt, returning the alloying
   * the gather should carry (the melt's own composition — a gather is a
   * sample of the pot). Debits this melt's mass; when what is left is
   * under half a gather, the pot is spent and destructs itself.
   */
  public takeGather(kg: number): CompositionEntry[] {
    const alloying = this.getMakeup().map((e) => ({ ...e }));
    const have = this.getMass().rawValue();
    const drawn = Math.min(kg, have);
    const left = have - drawn;
    this.setMass(Quantity.of(left, "kg"));
    const gatherKg = dial("glass.hotwork.gatherKg", 0.4);
    if (left < gatherKg * 0.5) {
      void StuffApi.destruct(this);
    }
    return alloying;
  }
}

/** The empty blowpipe in `actor`'s hands, else `null`. */
function emptyPipeOf(actor: Stuff): Blowpipe | null {
  if (!MixinApi.isContainer(actor)) return null;
  for (const c of actor.getContents()) {
    if (c instanceof Blowpipe && !c.getContents().some((g) => g instanceof Gather)) return c;
  }
  return null;
}
