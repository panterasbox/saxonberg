/**
 * WatercourseCatalogue — the drainage of the realm, **compiled once and
 * compared as a lookup**.
 *
 * A singleton `Idea` over the authored `Watercourse` rows. It parses
 * them, interpolates the elevations the author left out, derives every
 * edge's direction from those elevations, and compiles the whole
 * drainage into a form where *"is this place upstream of that one?"* is
 * a single set membership test.
 *
 * ## Lazy, not warmed
 *
 * ⚠ Every public read is **async and self-loading**. This codebase has
 * been bitten three times by a reference roster that nothing warms
 * reading empty forever while hand-constructed tests stayed green, so
 * there is deliberately no "warmed vs cold" state to get wrong: the
 * first caller loads, everyone after that hits the cache, and HMR drops
 * it. A `boot:` entry in the pack manifest would be an optimisation,
 * never a correctness requirement.
 *
 * ## Why a compiled reachability SET rather than a graph walk
 *
 * The requirements ask for an ordinal comparison, realm-wide, with no
 * graph walk — because upstream/downstream is asked on hot paths
 * (allocation, contamination, navigability) and a per-question walk of
 * a river is absurd. So the load compiles, for each reach, the set of
 * reaches downstream of it. A basin has tens of reaches, so the whole
 * structure is a few thousand strings; the runtime cost is one
 * `Set.has`.
 *
 * A **set**, rather than the interval labels a tree would allow,
 * because a delta is not a tree: a distributary gives one reach two
 * downstream neighbours, and nested-set labels cannot express that.
 * The set is exact for any DAG and costs the same to read.
 *
 * ## Direction is derived, including at a junction
 *
 * A course names ONE `branchesFrom` node, and which END of it attaches
 * there is worked out from elevation: whichever of the branch's own
 * endpoints sits closest to the junction's height is the junction.
 * A branch attached by its **last** node is a tributary joining; one
 * attached by its **first** node is a distributary leaving. One authored
 * structure, both behaviours, and no arrow anywhere.
 *
 * See [docs/subsystems/watershed.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import {
  WATERCOURSE_PATH_PREFIX,
  type WatercourseDescriptor,
  type WatercourseNode,
} from './Watercourse';

/** A reach citation, `"<courseKey>:<nodeName>"`. */
export type ReachRef = string;

/** How two reaches sit relative to each other on the drainage. */
export type ReachRelation =
  | 'upstream'
  | 'downstream'
  | 'same'
  /**
   * ⚠ Distinct from `downstream`: two reaches in different basins, or
   * on branches that never meet, have NO relation. "Not upstream" and
   * "unrelated" are different answers, and an allocation query that
   * conflated them would let a diversion in one valley curtail a right
   * in another.
   */
  | 'unrelated';

/** A reach after the load has filled in everything the author left out. */
export interface CompiledReach {
  /** `"<courseKey>:<nodeName>"`. */
  ref: ReachRef;
  courseKey: string;
  nodeName: string;
  basin: string;
  /** Position on its own course, source-first. */
  index: number;
  /** Authored at a control point, or interpolated between two. */
  elevation: number;
  /** Authored channel width, or `null`. */
  channelWidthM: number | null;
  /** Minimum hops to a sea outlet — a monotone downstream distance. */
  depthToSea: number;
}

interface CompiledIndex {
  reaches: Map<ReachRef, CompiledReach>;
  /** For each reach, every reach downstream of it. */
  downstream: Map<ReachRef, Set<ReachRef>>;
  /** Immediate downstream neighbours (a delta has more than one). */
  successors: Map<ReachRef, ReachRef[]>;
  /** Course key → its reaches, source-first. */
  byCourse: Map<string, ReachRef[]>;
}

export default class WatercourseCatalogue extends Idea {
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<CompiledIndex> | null = null;

  /**
   * Residency veto — a load-bearing process-lifetime singleton is never
   * culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Singleton refusal — the `CorpoCatalogue` shape. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'WatercourseCatalogue is a system singleton and cannot be ' +
        'destructed; use forceDestruct (admin-gated) if you really mean it',
    };
  }

  /** Drop the compiled drainage; the next read rebuilds. Fired by HMR. */
  public invalidateCache(): void {
    this.loading = null;
  }

  // ---------- reads ----------

  /** The compiled reach for a citation, or `null` if it names none. */
  public async reachOf(ref: ReachRef): Promise<CompiledReach | null> {
    const index = await this.index();
    return index.reaches.get(ref) ?? null;
  }

  /** Every reach on a course, source-first. */
  public async reachesOf(courseKey: string): Promise<CompiledReach[]> {
    const index = await this.index();
    const refs = index.byCourse.get(courseKey) ?? [];
    return refs.map((r) => index.reaches.get(r)!);
  }

  /** Every compiled reach in the realm. */
  public async allReaches(): Promise<CompiledReach[]> {
    return [...(await this.index()).reaches.values()];
  }

  /**
   * How `a` sits relative to `b`. Two integer-cheap set lookups; the
   * work was done at load.
   *
   * `unrelated` covers three genuinely different worlds — different
   * basins, sibling tributaries that only meet further down, and a
   * citation naming no reach at all — and none of them is "downstream".
   */
  public async compare(a: ReachRef, b: ReachRef): Promise<ReachRelation> {
    const index = await this.index();
    if (!index.reaches.has(a) || !index.reaches.has(b)) return 'unrelated';
    if (a === b) return 'same';
    if (index.downstream.get(a)?.has(b) === true) return 'upstream';
    if (index.downstream.get(b)?.has(a) === true) return 'downstream';
    return 'unrelated';
  }

  /** Whether water at `a` reaches `b`. */
  public async isUpstreamOf(a: ReachRef, b: ReachRef): Promise<boolean> {
    return (await this.compare(a, b)) === 'upstream';
  }

  /** Every reach `ref` drains into, in no particular order. */
  public async downstreamOf(ref: ReachRef): Promise<ReachRef[]> {
    const index = await this.index();
    return [...(index.downstream.get(ref) ?? [])];
  }

  /** The immediate downstream neighbours (a delta has more than one). */
  public async successorsOf(ref: ReachRef): Promise<ReachRef[]> {
    const index = await this.index();
    return [...(index.successors.get(ref) ?? [])];
  }

  /**
   * Hops from `a` down to `b`, or `null` when `b` is not downstream of
   * `a`. The monotone distance contamination decay reads.
   */
  public async hopsDownstream(
    a: ReachRef,
    b: ReachRef,
  ): Promise<number | null> {
    if ((await this.compare(a, b)) !== 'upstream') return null;
    const index = await this.index();
    const from = index.reaches.get(a)!;
    const to = index.reaches.get(b)!;
    return from.depthToSea - to.depthToSea;
  }

  // ---------- the load ----------

  /** Load-once, cached. Concurrent callers coalesce onto one promise. */
  private index(): Promise<CompiledIndex> {
    const inFlight = this.loading;
    if (inFlight !== null) return inFlight;
    const started = loadIndex();
    this.loading = started;
    // A failed load must not stick: drop the promise so the next caller
    // retries (and sees the parse error) rather than inheriting a
    // rejected one forever.
    void started.catch(() => {
      if (this.loading === started) this.loading = null;
    });
    return started;
  }
}

/* ─────────────────────────── the compile ─────────────────────────── */

/** Read every authored row and compile the realm's drainage. */
async function loadIndex(): Promise<CompiledIndex> {
  const templates = await Template.findDescendants(WATERCOURSE_PATH_PREFIX);
  const problems: string[] = [];
  const courses = new Map<string, WatercourseDescriptor>();

  for (const tpl of templates) {
    const d = descriptorOf(tpl.data as Record<string, unknown>);
    if (d === null) continue;
    if (courses.has(d.key)) {
      problems.push(
        `two watercourses claim the key '${d.key}' — a key is an ` +
          `identity, and every reach citation on it would be ambiguous`,
      );
      continue;
    }
    if (d.basin === '') {
      problems.push(
        `watercourse '${d.key}' declares no basin — a course with no ` +
          `drainage cannot be compared with anything, and "unrelated to ` +
          `everything" is never what an author meant`,
      );
      continue;
    }
    courses.set(d.key, d);
  }

  const reaches = new Map<ReachRef, CompiledReach>();
  const byCourse = new Map<string, ReachRef[]>();

  for (const course of courses.values()) {
    const filled = interpolate(course, problems);
    const refs: ReachRef[] = [];
    const seen = new Set<string>();
    filled.forEach((node, i) => {
      if (seen.has(node.name)) {
        problems.push(
          `watercourse '${course.key}' has two nodes named ` +
            `'${node.name}' — a reach citation must name exactly one`,
        );
        return;
      }
      seen.add(node.name);
      const ref = `${course.key}:${node.name}`;
      refs.push(ref);
      reaches.set(ref, {
        ref,
        courseKey: course.key,
        nodeName: node.name,
        basin: course.basin,
        index: i,
        elevation: node.elevation ?? 0,
        channelWidthM: node.channelWidthM ?? null,
        depthToSea: 0, // filled below
      });
    });
    byCourse.set(course.key, refs);
  }

  const successors = buildSuccessors(courses, byCourse, reaches, problems);

  if (problems.length > 0) {
    throw new Error(
      `WatercourseCatalogue: the authored drainage does not describe a ` +
        `world water can run downhill in:\n  - ${problems.join('\n  - ')}`,
    );
  }

  const downstream = compileDownstream(reaches, successors);
  assignDepths(reaches, successors);
  return { reaches, downstream, successors, byCourse };
}

/**
 * Fill in the elevations the author left out, and complain about the
 * ones that cannot be filled in honestly.
 *
 * The source and the mouth are control points **by definition** — there
 * is nothing outside them to interpolate from — so both must be
 * authored. Everything between them is linear in the node index, which
 * is what makes an uphill reach unrepresentable rather than merely
 * illegal: there is no way to write one down.
 */
function interpolate(
  course: WatercourseDescriptor,
  problems: string[],
): WatercourseNode[] {
  const nodes = course.nodes.map((n) => ({ ...n }));
  if (nodes.length === 0) {
    problems.push(`watercourse '${course.key}' declares no nodes`);
    return nodes;
  }
  const first = nodes[0]!;
  const last = nodes[nodes.length - 1]!;
  if (typeof first.elevation !== 'number') {
    problems.push(
      `watercourse '${course.key}': its source '${first.name}' authors ` +
        `no elevation — a source is a control point by definition`,
    );
  }
  if (typeof last.elevation !== 'number') {
    problems.push(
      `watercourse '${course.key}': its mouth '${last.name}' authors ` +
        `no elevation — a mouth is a control point by definition`,
    );
  }
  if (
    typeof first.elevation !== 'number' ||
    typeof last.elevation !== 'number'
  ) {
    return nodes;
  }
  // A lake is one node: it is its own source and mouth, and there is
  // nothing to compare or interpolate.
  if (nodes.length === 1) return nodes;

  if (last.elevation > first.elevation) {
    problems.push(
      `watercourse '${course.key}': its mouth '${last.name}' ` +
        `(${last.elevation} m) is ABOVE its source '${first.name}' ` +
        `(${first.elevation} m) — water does not run uphill`,
    );
    return nodes;
  }

  // Every authored control point must sit at or below the one before
  // it. Report the offending PAIR, because a lone number means nothing.
  let lastControl = 0;
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (typeof node.elevation !== 'number') continue;
    const prev = nodes[lastControl]!;
    if (node.elevation > prev.elevation!) {
      problems.push(
        `watercourse '${course.key}': control point '${node.name}' ` +
          `(${node.elevation} m) is above '${prev.name}' ` +
          `(${prev.elevation} m), which is upstream of it`,
      );
    }
    // Linear fill between the two control points.
    const span = i - lastControl;
    const drop = prev.elevation! - node.elevation;
    for (let j = lastControl + 1; j < i; j++) {
      nodes[j]!.elevation = prev.elevation! - (drop * (j - lastControl)) / span;
    }
    lastControl = i;
  }
  return nodes;
}

/**
 * Immediate downstream neighbours. Within a course, node `i` runs to
 * node `i + 1`. Across courses, `branchesFrom` attaches one end of the
 * branch to a node of its parent — and **which end is derived from
 * elevation**, so a tributary and a distributary need no separate
 * authoring.
 */
function buildSuccessors(
  courses: Map<string, WatercourseDescriptor>,
  byCourse: Map<string, ReachRef[]>,
  reaches: Map<ReachRef, CompiledReach>,
  problems: string[],
): Map<ReachRef, ReachRef[]> {
  const successors = new Map<ReachRef, ReachRef[]>();
  const link = (from: ReachRef, to: ReachRef): void => {
    const bucket = successors.get(from) ?? [];
    if (!bucket.includes(to)) bucket.push(to);
    successors.set(from, bucket);
  };

  for (const refs of byCourse.values()) {
    for (let i = 0; i + 1 < refs.length; i++) link(refs[i]!, refs[i + 1]!);
  }

  for (const course of courses.values()) {
    const parentRef = course.branchesFrom;
    if (parentRef === null) continue;
    const junction = reaches.get(parentRef);
    if (junction === undefined) {
      problems.push(
        `watercourse '${course.key}' branches from '${parentRef}', ` +
          `which names no reach`,
      );
      continue;
    }
    if (junction.basin !== course.basin) {
      problems.push(
        `watercourse '${course.key}' (basin '${course.basin}') branches ` +
          `from '${parentRef}' in basin '${junction.basin}' — a branch ` +
          `and its parent are the same drainage by definition`,
      );
      continue;
    }
    const refs = byCourse.get(course.key) ?? [];
    if (refs.length === 0) continue;
    const head = reaches.get(refs[0]!)!;
    const tail = reaches.get(refs[refs.length - 1]!)!;

    // Which end meets the parent is a question about heights, not about
    // what the author called it. The endpoint nearest the junction's
    // elevation is the one that touches it.
    const headGap = Math.abs(head.elevation - junction.elevation);
    const tailGap = Math.abs(tail.elevation - junction.elevation);
    if (tailGap <= headGap) link(tail.ref, junction.ref); // tributary joins
    else link(junction.ref, head.ref); // distributary leaves
  }

  return successors;
}

/**
 * For every reach, the full set of reaches downstream of it — a
 * memoised DFS with a visiting guard, so an author who somehow wrote a
 * loop gets a named error instead of a hang.
 */
function compileDownstream(
  reaches: Map<ReachRef, CompiledReach>,
  successors: Map<ReachRef, ReachRef[]>,
): Map<ReachRef, Set<ReachRef>> {
  const out = new Map<ReachRef, Set<ReachRef>>();
  const visiting = new Set<ReachRef>();

  const resolve = (ref: ReachRef): Set<ReachRef> => {
    const done = out.get(ref);
    if (done !== undefined) return done;
    if (visiting.has(ref)) {
      throw new Error(
        `WatercourseCatalogue: '${ref}' is downstream of itself — the ` +
          `authored drainage contains a loop`,
      );
    }
    visiting.add(ref);
    const set = new Set<ReachRef>();
    for (const next of successors.get(ref) ?? []) {
      set.add(next);
      for (const further of resolve(next)) set.add(further);
    }
    visiting.delete(ref);
    out.set(ref, set);
    return set;
  };

  for (const ref of reaches.keys()) resolve(ref);
  return out;
}

/** Minimum hops to a sea outlet — the monotone downstream distance. */
function assignDepths(
  reaches: Map<ReachRef, CompiledReach>,
  successors: Map<ReachRef, ReachRef[]>,
): void {
  const memo = new Map<ReachRef, number>();
  const depth = (ref: ReachRef, guard: Set<ReachRef>): number => {
    const done = memo.get(ref);
    if (done !== undefined) return done;
    if (guard.has(ref)) return 0;
    guard.add(ref);
    const next = successors.get(ref) ?? [];
    const d =
      next.length === 0
        ? 0
        : 1 + Math.min(...next.map((n) => depth(n, guard)));
    guard.delete(ref);
    memo.set(ref, d);
    return d;
  };
  for (const [ref, reach] of reaches) reach.depthToSea = depth(ref, new Set());
}

/* ─────────────────────────── parsing ─────────────────────────── */

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nodesOf(value: unknown): WatercourseNode[] {
  if (!Array.isArray(value)) return [];
  const out: WatercourseNode[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = str(r.name);
    if (name === '') continue;
    const node: WatercourseNode = { name };
    if (typeof r.elevation === 'number' && Number.isFinite(r.elevation)) {
      node.elevation = r.elevation;
    }
    if (
      typeof r.channelWidthM === 'number' &&
      Number.isFinite(r.channelWidthM)
    ) {
      node.channelWidthM = r.channelWidthM;
    }
    out.push(node);
  }
  return out;
}

/** Build a descriptor from a template's `data`, or `null` if it is not one. */
function descriptorOf(
  data: Record<string, unknown>,
): WatercourseDescriptor | null {
  const key = str(data.key) || str(data.name);
  if (key === '') return null;
  return {
    key,
    name: str(data.name) || key,
    basin: str(data.basin),
    nodes: nodesOf(data.nodes),
    branchesFrom: str(data.branchesFrom) === '' ? null : str(data.branchesFrom),
  };
}

/** The authored shapes this catalogue speaks, re-exported for callers. */
export type { WatercourseDescriptor, WatercourseNode };
