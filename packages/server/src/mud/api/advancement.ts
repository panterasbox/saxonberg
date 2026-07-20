/**
 * AdvancementApi — the gated surface for the advancement measurement
 * substrate: a character's append-only Transcript (the evidence ledger)
 * and the derive-on-read Competence estimate over it.
 *
 * **Derive-don't-track** (the renown / chronicle precedent). The substrate
 * stores raw {@link TranscriptEntry} evidence and fetches it owner-scoped;
 * Competence is *computed on read* over (Discipline × Transcript) and
 * **never stored** — re-legislating the estimator re-scores history
 * without rewriting a row. The honesty firewall is "no quantity without a
 * referent": the internal scalar exists, but the surface here returns
 * **bands**, never a number.
 *
 * **The act-signature is the unit of credit.** One messy in-world act
 * decomposes into per-Discipline sub-checks (an authored Q-matrix); the
 * Transcript records each as its own row. The same {@link ActSignature}
 * carries a lane-1 disposition channel (traits are "competence for
 * dispositions"), read-but-ignored here.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link AdvancementLogic} singleton at `/obj/api/advancement`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /obj/api/advancement`
 * reloads it.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type TranscriptEntry from "../lib/advancement/TranscriptEntry";
import type { TranscriptEntryFields } from "../lib/advancement/TranscriptEntry";
import type {
  ActSignature,
  Subcheck,
} from "../lib/advancement/ActSignature";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { AdvancementLogic } from "../obj/api/AdvancementLogic";
import type { CompetenceBandName } from "../lib/advancement/CompetenceBand";
import { fileURLToPath } from "url";

/** Act-level context shared by every sub-check row of one act. */
export interface RecordOptions {
  kind?: "deed" | "claim";
  /** Game-time seconds; defaults to the witness clock when omitted. */
  when?: number | null;
  tags?: string[];
}

/** A Discipline the owner has evidence in, with its current band. */
export interface DisciplineBand {
  discipline: string;
  band: CompetenceBandName;
}

export type { TranscriptEntryFields };

const LOGIC_PATH = "/obj/api/advancement";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/AdvancementLogic", import.meta.url)
);

/** Resolve the HMR-able AdvancementLogic singleton (sync). */
function logic(): AdvancementLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "AdvancementLogic"
      ) as typeof AdvancementLogic | null) ?? AdvancementLogic)()
  );
}

export class AdvancementApi {
  /**
   * The append primitive: explode one authored act into its Transcript
   * rows (one per Discipline sub-check), sharing the act-level `kind` /
   * `when` / `tags`. The signature's disposition channel is ignored (the
   * lane-1 trait seam). No-op without a durable owner key or connection.
   */
  public static async recordSignature(
    owner: Stuff,
    signature: ActSignature,
    opts: RecordOptions = {}
  ): Promise<void> {
    return logic().recordSignature(owner, signature, opts);
  }

  /**
   * Convenience over {@link recordSignature} for a single-Discipline
   * world demonstration: forces `kind: 'deed'`. The shape the `practice`
   * harness and most one-shot consumer loops use.
   */
  public static async recordDeed(
    owner: Stuff,
    subcheck: Subcheck,
    opts: RecordOptions = {}
  ): Promise<void> {
    return logic().recordDeed(owner, subcheck, opts);
  }

  /**
   * The owner-scoped reader. With `discipline`, returns only that
   * Discipline's rows (the slice the estimator folds). Returns `[]`
   * without a durable owner key or when disconnected.
   */
  public static async entriesFor(
    owner: Stuff,
    discipline?: string
  ): Promise<TranscriptEntry[]> {
    return logic().entriesFor(owner, discipline);
  }

  /**
   * The owner's current competence **band** in one Discipline — derived on
   * read over (Discipline × Transcript), never stored. **Bands only**: the
   * internal scalar never crosses this surface (the honesty firewall).
   * Returns the floor band without a durable owner key or when
   * disconnected.
   */
  public static async bandFor(
    owner: Stuff,
    discipline: string
  ): Promise<CompetenceBandName> {
    return logic().bandFor(owner, discipline);
  }

  /**
   * Every Discipline the owner has evidence in, with its current band —
   * the read the self-view renders. Disciplines with no evidence are
   * absent (the floor is implicit).
   */
  public static async bandsFor(owner: Stuff): Promise<DisciplineBand[]> {
    return logic().bandsFor(owner);
  }

  /**
   * The verb yaml-paths the owner's current competence confers (band ×
   * Catalog conferral rules) — the decision behind the knowing→doing seam.
   * `CompetenceMixin` resolves these to `CommandDefinition`s and pushes
   * them onto the giver's affordance stack.
   */
  public static async conferredVerbs(owner: Stuff): Promise<string[]> {
    return logic().conferredVerbs(owner);
  }
}
