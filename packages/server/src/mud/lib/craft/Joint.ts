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
 * made assembly records the path on each joint it carries.
 *
 * ⭐ The joints are SERVED by `JointCatalogue`, reached as
 * `CraftingApi.joints()` — `ensure(path)` loads one, `need(path)` reads a
 * resident one (a miss throws: whatever cites a joint loaded it, D7). This
 * file holds only what a joint IS.
 */

import type { CompetenceBandName } from "../advancement/CompetenceBand";

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
