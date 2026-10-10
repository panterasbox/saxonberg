/**
 * JointCatalogue — the singleton Idea owning the joint vocabulary: the
 * authored `Joint` rows a bill names by key (assembly D4).
 *
 * Warmed by CLASS (`Template.findByClass(Joint.CLASS_PATH)`), so a row
 * shipped under ANY pack root (`/trade/coopering/idea/Joint/hooped`) is
 * found with no boot line of its own. ⭐ It warms LAZILY, on the first
 * read — `LocationGraphRegistry`'s half of the `ReadingCatalogue` pattern,
 * with no `onCreate` (the `lint:on-create` ratchet: a roster warm is not a
 * reason for the hook to grow). The boot line exists so the singleton
 * EXISTS for the sync read to find.
 *
 * ⚠ Two reads, on purpose. `warmed(key)` is async and warms on a miss — the
 * verbs use it, and the craft mint warms the roster before it records any
 * joint. `peek(key)` is SYNC and never warms — the wear route uses it,
 * because `wear()` is sync and runs inside a blow. A cold peek answers
 * `null` and kicks a warm, and the wear route reads `null` as "no joint
 * figures, use the defaults" — which is only possible before the first
 * fit, repair, salvage or assembled craft since boot.
 *
 * ⚠ A malformed row is skipped and NAMED, never thrown: one pack's bad row
 * must not take every assembly in the world down.
 */

import { Idea } from "../../lib/stuff/Idea";
import { Template } from "../../lib/stuff/Template";
import Joint, {
  JOINT_FAILURES,
  JOINT_PORTABILITIES,
  JOINT_REVERSIBILITIES,
  type JointDescriptor,
  type JointFailure,
  type JointPortability,
  type JointReversibility,
} from "./Joint";
import { CompetenceBand } from "../../lib/advancement/CompetenceBand";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from "../../lib/stuff/Stuff";

const JointCatalogueBase = Idea;

export default class JointCatalogue extends JointCatalogueBase {
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  private byKey: Map<string, JointDescriptor> = new Map();
  private warmedOnce = false;

  /** The authored joint for `key`, warming on a cold miss; `null` if none. */
  public async warmed(key: string): Promise<JointDescriptor | null> {
    if (!this.warmedOnce) await this.warm();
    const d = this.byKey.get(key);
    return d ? copy(d) : null;
  }

  /** Every authored joint, warming first. Alphabetical by key. */
  public async allWarmed(): Promise<JointDescriptor[]> {
    if (!this.warmedOnce) await this.warm();
    return [...this.byKey.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(copy);
  }

  /**
   * The index as it stands, with no wait. Cold reads `null`, honestly — and
   * starts the warm, so the next read is not cold.
   */
  public peek(key: string): JointDescriptor | null {
    if (!this.warmedOnce) {
      void this.warm().catch((err: unknown) => {
        console.warn('JointCatalogue: lazy warm failed:', err);
      });
    }
    const d = this.byKey.get(key);
    return d ? copy(d) : null;
  }

  /** Stand the roster up from every row naming the Joint class. */
  public async warm(): Promise<number> {
    const templates = await Template.findByClass(Joint.CLASS_PATH);
    const index = new Map<string, JointDescriptor>();
    for (const tpl of templates) {
      const d = describe(tpl.data);
      if (typeof d === "string") {
        console.warn(`JointCatalogue: skipping '${tpl.path}': ${d}`);
        continue;
      }
      const prior = index.get(d.key);
      if (prior) {
        console.warn(
          `JointCatalogue: joint '${d.key}' authored twice — the first ` +
            `warmed keeps it, '${tpl.path}' ignored`,
        );
        continue;
      }
      index.set(d.key, d);
    }
    this.byKey = index;
    this.warmedOnce = true;
    return index.size;
  }

  /** Drop the index so the next read re-warms (a pack install / go-live). */
  public invalidateCache(): void {
    this.byKey = new Map();
    this.warmedOnce = false;
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: "JointCatalogue is a system singleton and cannot be destructed",
    };
  }

  // (validation lives in the module-private `describe` below)
}

/**
 * Validate one row's data into a descriptor, or the reason it is
 * malformed. `lint:bills` checks the same competence rule at build time.
 */
function describe(data: unknown): JointDescriptor | string {
  if (!data || typeof data !== "object") return "no data";
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string" || d.key.length === 0) return "no key";
  const portability = d.portability ?? "hand";
  if (!JOINT_PORTABILITIES.includes(portability as JointPortability)) {
    return `portability '${String(portability)}' is not one of ${JOINT_PORTABILITIES.join("|")}`;
  }
  const reversible = d.reversible ?? "effort";
  if (!JOINT_REVERSIBILITIES.includes(reversible as JointReversibility)) {
    return `reversible '${String(reversible)}' is not one of ${JOINT_REVERSIBILITIES.join("|")}`;
  }
  const failure = d.failure ?? "parted";
  if (!JOINT_FAILURES.includes(failure as JointFailure)) {
    return `failure '${String(failure)}' is not one of ${JOINT_FAILURES.join("|")}`;
  }
  let competence: JointDescriptor["competence"] = null;
  if (d.competence !== null && d.competence !== undefined) {
    const c = d.competence as { discipline?: unknown; band?: unknown };
    if (typeof c.discipline !== "string" || c.discipline.length === 0) {
      return "competence names no discipline";
    }
    if (!CompetenceBand.isBand(c.band)) {
      return `competence band '${String(c.band)}' is not a band`;
    }
    competence = { discipline: c.discipline, band: c.band };
  } else if (portability !== "hand") {
    // ⭐ Only the hand rung may be ungated — anything needing an
    // instrument or a premises is somebody's trade.
    return "only a `hand` joint may carry no competence";
  }
  const frac = (v: unknown, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(0, Math.min(1, v))
      : fallback;
  return {
    key: d.key,
    label: typeof d.label === "string" && d.label.length > 0 ? d.label : d.key,
    portability: portability as JointPortability,
    instrument: typeof d.instrument === "string" ? d.instrument : "",
    competence,
    reversible: reversible as JointReversibility,
    strength: frac(d.strength, 0.5),
    structuralRecovery: frac(d.structuralRecovery, 0.8),
    fastenerRecovery: frac(d.fastenerRecovery, 0.5),
    tightenable: d.tightenable === true,
    failure: failure as JointFailure,
  };
}

function copy(d: JointDescriptor): JointDescriptor {
  return { ...d, competence: d.competence ? { ...d.competence } : null };
}
