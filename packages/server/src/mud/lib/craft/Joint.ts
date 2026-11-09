/**
 * Joint — one way two or more parts are JOINED, as a `joint` document
 * (assembly D4; a document since the path-identity build).
 *
 * Pure authored data under any pack's `content/joints/`, named by its
 * path (`/platform/joints/wedged`). What a joint IS — how portable the
 * means of making it are, what instrument and competence it wants, how it
 * comes apart, how much shock it takes before it slackens — is data; what
 * wear and repair DO to an assembly is the kernel's (`AssembledMixin`,
 * `CraftingLogic`). ⭐ So a new way of joining things is a file: a pack
 * ships `pegged` or `hooped` under its own root, and nothing changes.
 *
 * A bill names a joint by PATH (`method: /platform/joints/wedged`), and a
 * made assembly records the path on each joint it carries. Resident by
 * construction (D7): the bill's and the joints' setters await
 * {@link Joint.ensure}, a rope stands its knots up in `onCreate`, and a
 * synchronous read ({@link Joint.need}) of a joint nothing loaded throws.
 *
 * @internal the assembly substrate's; an author names a path on a row.
 */

import { CompetenceBand } from "../advancement/CompetenceBand";
import type { CompetenceBandName } from "../advancement/CompetenceBand";
import { DocumentCache } from "../document/DocumentCache";

/**
 * Where the means of making the joint live — the ladder a trade climbs.
 * `hand`: anybody, anywhere (a wedge, a friction fit). `tool`: a portable
 * instrument (the cooper's driver). `premises`: a fixed working (a forge
 * for soldering).
 */
export const JOINT_PORTABILITIES = ["hand", "tool", "premises"] as const;
export type JointPortability = (typeof JOINT_PORTABILITIES)[number];

/**
 * How the joint comes apart. `freely`: lift it off. `effort`: it can be
 * knocked apart, losing some of what it held. `never`: it can only be
 * broken — glue, solder, a rivet.
 */
export const JOINT_REVERSIBILITIES = ["freely", "effort", "never"] as const;
export type JointReversibility = (typeof JOINT_REVERSIBILITIES)[number];

/** The word a failed joint is described by. */
export const JOINT_FAILURES = ["slack", "sprung", "parted", "split", "spilled"] as const;
export type JointFailure = (typeof JOINT_FAILURES)[number];

/** The runtime descriptor the catalogue caches. */
export interface JointDescriptor {
  key: string;
  label: string;
  portability: JointPortability;
  /** The instrument capability kind making it needs; `''` by hand. */
  instrument: string;
  /**
   * The band in a Discipline needed to MAKE it, or `null` — legal only on
   * a `hand` joint, and the bootstrap root stated as data: anybody can
   * wedge a haft, which is what lets the hand rung make the tool rung's
   * tools.
   */
  competence: { discipline: string; band: CompetenceBandName } | null;
  reversible: JointReversibility;
  /** 0..1 — the share of a blow the joint absorbs before it slackens. */
  strength: number;
  /** 0..1 — what share of the structural members a competent hand gets back. */
  structuralRecovery: number;
  /** 0..1 — what share of the fasteners survive being taken apart. */
  fastenerRecovery: number;
  /** Whether `repair`'s cheapest rung (tighten) applies. */
  tightenable: boolean;
  /**
   * Whether it holds only between FLAT faces (a glue line): a cupped
   * member seats it short, and nothing tightens that.
   */
  needsFlat: boolean;
  failure: JointFailure;
  /**
   * ⭐ What the joint TAKES to make (paint D11): `glue` — a glue line costs
   * glue from an open vessel in reach, and the GLUE decides its strength,
   * how it sets, how it stands the damp and whether it comes apart. The
   * row's own `strength`/`reversible` are the defaults a glue overrides.
   */
  takes?: 'glue';
}

/**
 * The joint documents, by path — see the module header.
 *
 * @internal the assembly substrate's; an author names a path on a row.
 */
export class Joint {
  /** The memory of what has been read — built on first use (a static built at
   *  module load would race an import cycle through the document store). */
  private static memo: DocumentCache<JointDescriptor> | null = null;
  private static get cache(): DocumentCache<JointDescriptor> {
    return (Joint.memo ??= new DocumentCache<JointDescriptor>('joint', (doc) => Joint.fromData(doc.getData(), doc.getPath())));
  }

  /** Validate a joint document at `path` (the installer's validator too); throws naming what is wrong. */
  public static fromData(data: Record<string, unknown>, path: string): JointDescriptor {
    const word = path.slice(path.lastIndexOf("/") + 1);
    const d = describe({ key: word, ...data });
    if (typeof d === "string") throw new Error(`joint '${path}': ${d}`);
    return d;
  }

  /** The joint at `path`, read if it is not resident; throws naming a path with none. */
  public static ensure(path: string): Promise<JointDescriptor> {
    return Joint.cache.ensure(path);
  }

  /** The resident joint at `path`; `DocumentNotResidentError` if whatever cites it never loaded it. */
  public static need(path: string): JointDescriptor {
    return Joint.cache.need(path);
  }

  /** Keep a joint (a unit fixture with no store behind it). */
  public static remember(path: string, d: JointDescriptor): JointDescriptor {
    return Joint.cache.remember(path, d);
  }

  /** Every joint any pack ships — the lazy roster a listing reads (one indexed read, first use). */
  public static all(): Promise<JointDescriptor[]> {
    return Joint.cache.all();
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

