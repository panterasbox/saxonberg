/**
 * JointCatalogue — the singleton that serves the `joint` documents (every
 * way two parts are joined, any pack's `content/joints/`), reached as
 * `CraftingApi.joints()`. What a joint IS: `lib/craft/Joint.ts`.
 *
 * ⭐ A joint is named by its path and loaded on reach (documents D7): a
 * bill's and a joints' setter return `ensure`, a rope ensures its knot in
 * the act that ties it, and `need` reads a resident one.
 */

import { CompetenceBand } from "../../lib/advancement/CompetenceBand";
import { DocumentCatalogue } from "../../lib/document/DocumentCatalogue";
import type { BoundaryRole } from "../../lib/security/BoundaryRole";
import {
  JOINT_FAILURES,
  JOINT_PORTABILITIES,
  JOINT_REVERSIBILITIES,
  type JointDescriptor,
  type JointFailure,
  type JointPortability,
  type JointReversibility,
} from "../../lib/craft/Joint";

export default class JointCatalogue extends DocumentCatalogue<JointDescriptor> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = "commons";

  protected readonly kind = "joint";

  /** Validate a joint document at `path` (the installer's validator too); throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): JointDescriptor {
    const word = path.slice(path.lastIndexOf("/") + 1);
    const d = describe({ key: word, ...data });
    if (typeof d === "string") throw new Error(`joint '${path}': ${d}`);
    return d;
  }
}

/**
 * Validate one joint's data into a descriptor, or the reason it is
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
  if (d.takes !== undefined && d.takes !== null && d.takes !== "" && d.takes !== "glue") {
    return `takes '${String(d.takes)}' is not glue`;
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
    needsFlat: d.needsFlat === true,
    failure: failure as JointFailure,
    ...(d.takes === "glue" ? { takes: "glue" as const } : {}),
  };
}

