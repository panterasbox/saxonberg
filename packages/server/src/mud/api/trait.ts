/**
 * TraitApi — the gated surface for the personality layer: a character's
 * append-only disposition ledger (the evidence) and the derive-on-read
 * trait-position over it, plus trait-compatibility and the regard
 * baseline.
 *
 * **Derive-don't-track** (the competence / renown precedent). The
 * substrate stores raw {@link DispositionEntry} evidence owner-scoped;
 * trait-position is *computed on read* over (axis × ledger) and **never
 * stored** — re-tuning the estimator re-derives character without
 * rewriting a row. There is no stored trait field and no Character mixin:
 * a character's traits are a function of its ledger, exactly as competence
 * is a function of its Transcript.
 *
 * **One signature, two outputs.** A single authored {@link ActSignature}
 * carries both the skill-Discipline sub-checks (advancement) and the
 * disposition-valence channel (here): "instrument once," two ledgers.
 * This Api populates and consumes only `dispositionValence`; advancement
 * gains no dependency on the trait layer, and the regard baseline reads
 * belief one-way (belief gains no trait import).
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link TraitLogic} singleton at `/obj/api/trait`, reached synchronously
 * via `StuffApi.singletonSync`. `dest /obj/api/trait` reloads it.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type DispositionEntry from "../lib/trait/DispositionEntry";
import type { DispositionEntryFields } from "../lib/trait/DispositionEntry";
import type {
  ActSignature,
  DispositionSubcheck,
} from "../lib/advancement/ActSignature";
import type { AxisEstimate } from "../lib/trait/TraitPosition";
import type { TraitBandName } from "../lib/trait/TraitBand";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { TraitLogic } from "../obj/api/TraitLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

/** Act-level context shared by every disposition row of one act. */
export interface RecordOptions {
  kind?: "deed" | "claim";
  /** Game-time seconds; defaults to the witness clock when omitted. */
  when?: number | null;
  tags?: string[];
}

/** One seeded disposition claim — an authored/established axis position. */
export interface ClaimSeed {
  disposition: string;
  valence: number;
}

export type { DispositionEntryFields, AxisEstimate, TraitBandName };

const LOGIC_PATH = "/obj/api/trait";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/TraitLogic", import.meta.url)
);

/** Resolve the HMR-able TraitLogic singleton (sync). */
function logic(): TraitLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "TraitLogic"
      ) as typeof TraitLogic | null) ?? TraitLogic)()
  );
}

export class TraitApi {
  /**
   * The append primitive: explode one authored act's disposition channel
   * into ledger rows (one per axis sub-check), sharing the act-level
   * `kind` / `when` / `tags`. The signature's `discipline` channel is
   * ignored (advancement's). No-op without a durable owner key, an active
   * connection, or any disposition-valence on the act.
   */
  public static async recordSignature(
    owner: Stuff,
    signature: ActSignature,
    opts: RecordOptions = {}
  ): Promise<void> {
    return logic().recordSignature(owner, signature, opts);
  }

  /**
   * Convenience over {@link recordSignature} for a single-axis world
   * demonstration: forces `kind: 'deed'`.
   */
  public static async recordDeed(
    owner: Stuff,
    subcheck: DispositionSubcheck,
    opts: RecordOptions = {}
  ): Promise<void> {
    return logic().recordDeed(owner, subcheck, opts);
  }

  /**
   * The owner-scoped reader. With `disposition`, returns only that axis's
   * rows. Returns `[]` without a durable owner key or when disconnected.
   */
  public static async entriesFor(
    owner: Stuff,
    disposition?: string
  ): Promise<DispositionEntry[]> {
    return logic().entriesFor(owner, disposition);
  }

  /**
   * Every axis the owner has evidence in, with its derived signed position
   * + band — derived on read, never stored. Axes with no evidence are
   * absent (the neutral floor is implicit).
   */
  public static async positionsFor(owner: Stuff): Promise<AxisEstimate[]> {
    return logic().positionsFor(owner);
  }

  /**
   * The owner's current position on one axis — derived on read. Returns
   * the neutral floor estimate without evidence, a durable owner key, or a
   * connection.
   */
  public static async positionFor(
    owner: Stuff,
    disposition: string
  ): Promise<AxisEstimate> {
    return logic().positionFor(owner, disposition);
  }

  /**
   * The owner's **defining** axes — those pronounced enough to name (the
   * read the self-view and brains consume), most-pronounced first.
   */
  public static async pronouncedFor(owner: Stuff): Promise<AxisEstimate[]> {
    return logic().pronouncedFor(owner);
  }

  /**
   * The trait-compatibility between two characters — a signed scalar in
   * the regard range (compatible dispositions → positive, opposed →
   * negative). The innate input to regard.
   */
  public static async compatibility(a: Stuff, b: Stuff): Promise<number> {
    return logic().compatibility(a, b);
  }

  /**
   * The viewer's **baseline** regard for a subject: a stored
   * interaction-driven regard governs once it exists; absent one, the
   * innate trait-compatibility is the starting value. Derive-on-read —
   * writes nothing to belief.
   */
  public static async regardBaseline(
    viewer: Stuff,
    subject: Stuff
  ): Promise<number> {
    return logic().regardBaseline(viewer, subject);
  }

  /**
   * Seed an owner's established character as `claim`-kind evidence — an
   * authored NPC's defining dispositions or a char-gen seed. The
   * form-then-entrench model's starting evidence; honors derive-don't-track
   * (personality comes from a seeded history, not an assigned stat).
   */
  public static async seedClaims(
    owner: Stuff,
    seeds: ClaimSeed[]
  ): Promise<void> {
    return logic().seedClaims(owner, seeds);
  }

}

SecurityApi.decorateApiClass(TraitApi);
