/**
 * Feeder — a distribution line as **authored topology over the streets**.
 *
 * A feeder is a data `Idea` in the grid catalogue, resolve-on-read: the
 * `Watercourse` shape one system over. It carries a source (a generator), an
 * ordered chain of nodes down the streets, and — for a spur — which node of
 * which other feeder it branches from. It is never cloned as live Stuff.
 *
 * ## A node is not an object
 *
 * A **node** is an identity on a feeder — `terminus-main:avenue` — the way a
 * reach is a node on a watercourse. Energization, cuts and the trace all key on
 * it. A node becomes a real object only where content puts a `LineAccess` (a
 * pole, a manhole) on it — most of a line runs where nobody stands.
 *
 * ## The line follows the streets, verified against the exit graph
 *
 * Each node names the `Street` it stands on (`at`). The catalogue refuses (as a
 * compile problem + a diagnostic, never a throw) any consecutive pair whose
 * streets no exit joins — *a line may not leave the road* — which honours the
 * slate's "service as an exit attribute" in substance without making service a
 * field on the transient, closed-schema `Exit`.
 *
 * ## Direction is the authored order
 *
 * A radial feeder IS directed from its substation, as a canal is directed by
 * how it was dug. Nodes are source-first; a cut at a node darkens it and
 * everything downstream. `overhead` vs `buried` is a per-node attribute
 * (`buried`) that changes only where a fault is reached and whether a storm can
 * fell it — nothing about how power flows.
 *
 * See [docs/subsystems/energy.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * Template-path prefix every authored feeder ROW lives under — the **commons**
 * (`/stuff`), not the pack's `/system/energy` root, exactly where `Watercourse`
 * rows live and for the same reason: a grid is a fact about somebody's realm,
 * and the realm's own pack must be able to author and edit it. A row under
 * `/system/energy` would be titled to the energy group.
 */
export const FEEDER_PATH_PREFIX = '/stuff/idea/Feeder';

/** One authored node on a feeder — a point on the line, cited by name. */
export interface FeederNode {
  /** Durable identity within the feeder (`avenue`). */
  name: string;
  /** The `Street` this node stands on — its template path. */
  at: string;
  /**
   * Overhead (the default) or buried. Buried changes only how the line is
   * reached (a manhole, not a pole) and that a storm cannot fell it.
   */
  buried?: boolean;
}

/** The authored shape of a feeder row's `data` block. */
export interface FeederDescriptor {
  /** Durable key (`terminus-main`), independent of the template path. */
  key: string;
  /** Display name ("the Terminus main"). */
  name: string;
  /**
   * The generator's template path — a thing answering `generationW(flow) +
   * getReachRef()` (a `ControlStructure`). A trunk names one; a spur names
   * `null` and takes its source from the feeder it branches from.
   */
  source: string | null;
  /** Source-first, down the line. */
  nodes: FeederNode[];
  /**
   * `"<feederKey>:<nodeName>"` — the node of another feeder this one spurs
   * off, or `null` for a trunk. A cut on the trunk above the branch darkens
   * the spur too (it is downstream of the branch point).
   */
  branchesFrom: string | null;
}

/**
 * ⭐ The feeder's **display name** ("the Terminus main") comes from
 * `NamedMixin` — the one general-purpose "something a person named" surface,
 * reused rather than reinvented. A feeder uses only `name`; the honorific /
 * surname / suffix / alternate-name fields ride along unused, which is the
 * mixin's intended opt-out posture (opt out of fields, don't fork the method).
 */
export default class Feeder extends NamedMixin(Idea) {
  /** See {@link FEEDER_PATH_PREFIX}. */
  static readonly TEMPLATE_PATH_PREFIX = FEEDER_PATH_PREFIX;

  // `name` + its fieldMeta come from NamedMixin; getAllFieldMeta merges this
  // block with the mixin's property-by-property.
  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    source: { persistent: true, authorable: true },
    nodes: { persistent: true, authorable: true },
    branchesFrom: { persistent: true, authorable: true },
  };

  protected key = '';
  protected source: string | null = null;
  protected nodes: FeederNode[] = [];
  protected branchesFrom: string | null = null;

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    this.key = value;
  }

  public getSource(): string | null {
    return this.source;
  }
  public setSource(value: string | null): void {
    this.source = value === '' ? null : value;
  }

  public getNodes(): FeederNode[] {
    return this.nodes.map((n) => ({ ...n }));
  }
  public setNodes(value: FeederNode[]): void {
    this.nodes = Array.isArray(value) ? value.map((n) => ({ ...n })) : [];
  }

  public getBranchesFrom(): string | null {
    return this.branchesFrom;
  }
  public setBranchesFrom(value: string | null): void {
    this.branchesFrom = value === '' ? null : value;
  }
}
