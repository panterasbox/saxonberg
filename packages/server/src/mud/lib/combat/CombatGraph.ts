/**
 * CombatGraph — the directed who-attacks-whom graph of a melee
 * (value-object, pure/unit-tested; the `Poise` precedent).
 *
 * A 1v1 fight is a graph of two nodes and one edge; the same structure
 * scales to N combatants ganging up, focus-firing, or interposing. Each
 * {@link ThreatEdge} is one combatant pressing an attack on another under
 * a specific {@link CombatTerms} (so a duel and an interloper's unlawful
 * blow in the *same* session carry different terms — the per-edge blame
 * foundation). The graph owns no fight rules; it is a queryable structure
 * the session mutates and `CombatLogic` reads.
 *
 * Edges are **directed**: `edgeBetween(a, b)` is the edge where `a`
 * attacks `b`, distinct from `edgeBetween(b, a)`. A mutual 1v1 is two
 * edges. `edgeCount(target)` = how many attackers are pressing `target`
 * (the focus-fire signal). See docs/subsystems/combat.md.
 */

import type { Stuff } from "../stuff/Stuff";
import type { CombatTerms } from "./CombatTerms";
import type { RangeState } from "./RangeBand";

/**
 * The engagement **range** on a pair — the geometry-free band ladder,
 * `close` · `reach` · `near` · `far`. The two melee tiers are `close`
 * (inside, where a dagger/unarmed owns the clinch and a long weapon is a
 * liability) and `reach` (the end of a long weapon — a spear controls, a
 * dagger is out of range); `near` and `far` are the ranged pair.
 *
 * Physically symmetric per pair (both directed edges carry the same
 * value); stepped by the advance/withdraw gambits. The vocabulary and its
 * derivations live in {@link RangeBand} — re-exported here so the graph
 * stays the natural import site for edge-shaped code.
 */
export type { RangeState };

/** One directed engagement: `attacker` presses `defender` under `terms`. */
export interface ThreatEdge {
  readonly attacker: Stuff;
  readonly defender: Stuff;
  /** Optional instrument hint (channel/weapon key); flavor, not required. */
  instrument?: string;
  /** The terms in force on THIS edge (the per-edge blame foundation). */
  terms: CombatTerms;
  /** The engagement range on this pair (default `close`; kept in sync on
   * both directed edges via {@link CombatGraph.setRange}). */
  range: RangeState;
}

export class CombatGraph {
  private readonly nodes = new Set<Stuff>();
  private readonly edges: ThreatEdge[] = [];

  /* ───────────────── nodes ───────────────── */

  addNode(s: Stuff): void {
    this.nodes.add(s);
  }

  hasNode(s: Stuff): boolean {
    return this.nodes.has(s);
  }

  getNodes(): readonly Stuff[] {
    return [...this.nodes];
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  /** Drop a node and every edge touching it (a departed/dead combatant). */
  removeNode(s: Stuff): void {
    this.nodes.delete(s);
    for (let i = this.edges.length - 1; i >= 0; i--) {
      const e = this.edges[i]!;
      if (e.attacker === s || e.defender === s) this.edges.splice(i, 1);
    }
  }

  /* ───────────────── edges ───────────────── */

  /**
   * Add (or update the terms/instrument of) the directed edge
   * `attacker → defender`. Both endpoints become nodes. Returns the edge.
   */
  addEdge(
    attacker: Stuff,
    defender: Stuff,
    terms: CombatTerms,
    instrument?: string,
    range?: RangeState,
  ): ThreatEdge {
    this.nodes.add(attacker);
    this.nodes.add(defender);
    const existing = this.edgeBetween(attacker, defender);
    if (existing) {
      existing.terms = terms;
      if (instrument !== undefined) existing.instrument = instrument;
      if (range !== undefined) existing.range = range;
      return existing;
    }
    const edge: ThreatEdge = {
      attacker,
      defender,
      terms,
      instrument,
      range: range ?? "close",
    };
    this.edges.push(edge);
    return edge;
  }

  /** Set the engagement range on a pair (physically symmetric): writes it
   * onto BOTH directed edges that exist between `a` and `b`. */
  setRange(a: Stuff, b: Stuff, range: RangeState): void {
    const e1 = this.edgeBetween(a, b);
    const e2 = this.edgeBetween(b, a);
    if (e1) e1.range = range;
    if (e2) e2.range = range;
  }

  /** The engagement range on a pair (either direction), defaulting to
   * `close` when no edge exists yet. */
  rangeBetween(a: Stuff, b: Stuff): RangeState {
    return (
      this.edgeBetween(a, b)?.range ?? this.edgeBetween(b, a)?.range ?? "close"
    );
  }

  removeEdge(attacker: Stuff, defender: Stuff): void {
    for (let i = this.edges.length - 1; i >= 0; i--) {
      const e = this.edges[i]!;
      if (e.attacker === attacker && e.defender === defender) {
        this.edges.splice(i, 1);
        return;
      }
    }
  }

  /** The directed edge `attacker → defender`, or undefined. */
  edgeBetween(attacker: Stuff, defender: Stuff): ThreatEdge | undefined {
    return this.edges.find(
      (e) => e.attacker === attacker && e.defender === defender,
    );
  }

  /** Every edge pressing `defender` (who is attacking them). */
  incomingEdges(defender: Stuff): ThreatEdge[] {
    return this.edges.filter((e) => e.defender === defender);
  }

  /** Every edge `attacker` is pressing (their targets). */
  targetsOf(attacker: Stuff): ThreatEdge[] {
    return this.edges.filter((e) => e.attacker === attacker);
  }

  /** How many attackers are pressing `target` (the focus-fire count). */
  edgeCount(target: Stuff): number {
    let n = 0;
    for (const e of this.edges) if (e.defender === target) n++;
    return n;
  }

  allEdges(): readonly ThreatEdge[] {
    return this.edges;
  }

  /**
   * Interpose: move `attacker`'s edge off `fromDefender` onto
   * `toDefender` (the `defend <ally>` primitive — the ally's incoming
   * pressure drops, the interposer's rises). No-op if the source edge
   * is absent. Returns the redirected edge, or undefined.
   */
  redirect(
    attacker: Stuff,
    fromDefender: Stuff,
    toDefender: Stuff,
  ): ThreatEdge | undefined {
    const edge = this.edgeBetween(attacker, fromDefender);
    if (!edge) return undefined;
    this.removeEdge(attacker, fromDefender);
    this.nodes.add(toDefender);
    return this.addEdge(
      attacker,
      toDefender,
      edge.terms,
      edge.instrument,
      edge.range,
    );
  }
}
