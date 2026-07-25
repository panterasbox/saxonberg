/**
 * CorpoApi — the gated surface for the corpos substrate: the authored
 * megacorps, their product brands, and the per-product **mark**.
 *
 * A `Corpo` is a reference-identity (the `Material` / `Species` /
 * `Discipline` shape); a `Brand` resolves to one owning corpo, or to none
 * (the independent). A branded Stuff carries a brand `key`, the queryable
 * mark resolving to its brand and (transitively) its corpo — so every
 * product is truthfully owned. The mark is **diegetic brand-ownership**,
 * orthogonal to the `AuthoringEvent` provenance ledger.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link CorpoLogic} singleton at `/obj/api/corpo`, reached synchronously
 * via `StuffApi.singletonSync`; it reads the warmed `CorpoCatalogue`.
 * `dest /obj/api/corpo` reloads it.
 *
 * The player-facing approval vector / faction gameplay is deferred — this
 * surface is read-only canon + mark resolution.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { CorpoDescriptor } from "../lib/corpo/Corpo";
import type { BrandDescriptor } from "../lib/corpo/Brand";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { CorpoLogic } from "../obj/api/CorpoLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

export type { CorpoDescriptor, BrandDescriptor };

const LOGIC_PATH = "/obj/api/corpo";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/CorpoLogic", import.meta.url)
);

/** Resolve the HMR-able CorpoLogic singleton (sync). */
function logic(): CorpoLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "CorpoLogic"
      ) as typeof CorpoLogic | null) ?? CorpoLogic)()
  );
}

export class CorpoApi {
  /**
   * Resolve a brand `key` to its owning corpo. An independent brand
   * (`owner === ''`) and an unknown key both resolve to `null` — the
   * legible absence of a corpo mark.
   */
  public static corpoOfBrand(brandKey: string): CorpoDescriptor | null {
    return logic().corpoOfBrand(brandKey);
  }

  /**
   * The corpo a branded Stuff is marked with (reads the mark via the
   * method contract, then resolves brand → corpo). `null` when the Stuff
   * isn't branded or the brand is independent.
   */
  public static corpoOf(obj: Stuff): CorpoDescriptor | null {
    return logic().corpoOf(obj);
  }

  /** The brand a branded Stuff is marked with, or `null`. */
  public static brandOf(obj: Stuff): BrandDescriptor | null {
    return logic().brandOf(obj);
  }

  /** The authored descriptor for brand `key`, or `null`. */
  public static getBrand(brandKey: string): BrandDescriptor | null {
    return logic().getBrand(brandKey);
  }

  /** The authored descriptor for corpo `key`, or `null`. */
  public static getCorpo(corpoKey: string): CorpoDescriptor | null {
    return logic().getCorpo(corpoKey);
  }

  /**
   * A corpo's brand portfolio (the forward edge) — every brand the corpo
   * owns, resolved to descriptors. Empty for an unknown corpo or one whose
   * only brands are independent.
   */
  public static portfolioOf(corpoKey: string): BrandDescriptor[] {
    return logic().portfolioOf(corpoKey);
  }

  /**
   * A corpo's rivals (the fault-line map) — its `rivals` edge resolved to
   * corpo descriptors. Authored canon; no runtime consumer this build.
   */
  public static rivalsOf(corpoKey: string): CorpoDescriptor[] {
    return logic().rivalsOf(corpoKey);
  }

  /** Every authored corpo descriptor. */
  public static listCorpos(): CorpoDescriptor[] {
    return logic().listCorpos();
  }

  /** Every authored brand descriptor. */
  public static listBrands(): BrandDescriptor[] {
    return logic().listBrands();
  }
}

SecurityApi.decorateApiClass(CorpoApi);
