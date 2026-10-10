/**
 * Joint — one way two or more parts are JOINED, as a leaf Idea row
 * (assembly D4).
 *
 * The `Operation` shape exactly: pure data authored under any pack root
 * (`<root>/idea/Joint/<key>.yaml`), read by `JointCatalogue` straight
 * from `template.data`, never cloned as live Stuff. What a joint IS —
 * how portable the means of making it are, what instrument and what
 * competence it wants, how it comes apart, how much shock it takes
 * before it slackens — is data; what wear and repair DO to an assembly
 * is the kernel's (`AssembledMixin`, `CraftingLogic`).
 *
 * ⭐ So a new way of joining things is a row: a pack ships `pegged` or
 * `hooped` under its own root, and nothing in the engine changes.
 *
 * `key`, not templatePath, is the durable join — a bill names a joint by
 * its key (`method: wedged`).
 */

import { Idea } from "../../lib/stuff/Idea";
import type { CompetenceBandName } from "../../lib/advancement/CompetenceBand";
import type { FieldMeta } from "../../lib/mixin";

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
export const JOINT_FAILURES = ["slack", "sprung", "parted", "split"] as const;
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
  failure: JointFailure;
}

export default class Joint extends Idea {
  /** The class every Joint row names — what the catalogue warms by. */
  static readonly CLASS_PATH = "/platform/idea/Joint";

  public key: string = "";
  public label: string = "";
  public portability: JointPortability = "hand";
  public instrument: string = "";
  public competence: { discipline: string; band: CompetenceBandName } | null =
    null;
  public reversible: JointReversibility = "effort";
  public strength: number = 0.5;
  public structuralRecovery: number = 0.8;
  public fastenerRecovery: number = 0.5;
  public tightenable: boolean = false;
  public failure: JointFailure = "parted";

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    label: { persistent: true },
    portability: { persistent: true },
    instrument: { persistent: true },
    competence: { persistent: true },
    reversible: { persistent: true },
    strength: { persistent: true },
    structuralRecovery: { persistent: true },
    fastenerRecovery: { persistent: true },
    tightenable: { persistent: true },
    failure: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
  public getLabel(): string {
    return this.label;
  }
}
