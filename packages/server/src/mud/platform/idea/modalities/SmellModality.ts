/**
 * SmellModality — the olfactory singleton. Field modality.
 *
 * `signalAt(loc)` walks containment + Boundary conduits + exits to
 * accumulate odor concentration at the given scope, returning a
 * `Smell` value (ppm concentration + dominant identity + capped
 * source attribution list). Walk shape mirrors `VisionModality`'s:
 * contents-side emitters + fixture-side emitters + cross-boundary
 * via SmellConduit + cross-exit at base transmissivity. Depth-capped
 * via `MAX_HOPS` (from `Modality.ts`); cycle-guarded via the
 * `visited` set.
 *
 * Vacuum check: a scope whose `_atmosphere` field reads `'vacuum'`
 * blocks all smell at the recipient. Per the requirements doc; the
 * biome-chain ancestor walk is async, so v1 reads the scope's own
 * inline atmosphere field (the universal default is air-equivalent).
 */

import { Modality } from '../../../lib/perception/Modality';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { Smell, type SmellSourceRef, SMELL_SOURCE_CAP } from '../../../lib/perception/Smell';
import { MAX_HOPS, EXIT_TAU } from '../../../lib/perception/Modality';
import { MixinApi } from '../../../api/mixin';
import { Traversal } from '../../../lib/location/Traversal';
import type { Leg } from '../../../lib/location/Traversal';
import { StuffApi } from '../../../api/stuff';
import { PerceptionApi } from '../../../api/perception';
import { BoundaryAnchor } from '../../../lib/boundary/BoundaryAnchor';
import type { Boundary } from '../../../lib/boundary/Boundary';
import type { Conduit } from '../../../lib/boundary/Conduit';
import type { SmellConduit } from '../../../lib/boundary/SmellConduit';

/** Internal accumulator the walk passes around. */
interface ConcentrationAccumulator {
  /** identity → total ppm contribution from non-merged sources. */
  perIdentity: Map<string, number>;
  /** Source-level attributions, pre-cap. */
  sources: SmellSourceRef[];
}

function newAccumulator(): ConcentrationAccumulator {
  return { perIdentity: new Map(), sources: [] };
}

function addContribution(
  acc: ConcentrationAccumulator,
  source: SmellSourceRef | null,
): void {
  if (!source || source.concentration <= 0) return;
  acc.perIdentity.set(
    source.identity,
    (acc.perIdentity.get(source.identity) ?? 0) + source.concentration,
  );
  acc.sources.push(source);
}

function mergeAttenuated(
  parent: ConcentrationAccumulator,
  sub: ConcentrationAccumulator,
  tau: number,
): void {
  if (tau <= 0) return;
  for (const [identity, conc] of sub.perIdentity.entries()) {
    parent.perIdentity.set(
      identity,
      (parent.perIdentity.get(identity) ?? 0) + conc * tau,
    );
  }
  for (const s of sub.sources) {
    parent.sources.push({
      stuffId: s.stuffId,
      concentration: s.concentration * tau,
      identity: s.identity,
    });
  }
}

function isSmellConduit(c: Conduit): c is SmellConduit {
  return c.conduitKind === 'smell';
}

function findSmellConduit(boundary: Boundary): SmellConduit | null {
  for (const c of boundary.getConduits()) {
    if (isSmellConduit(c)) return c;
  }
  return null;
}


/**
 * Read the scope's inline `_atmosphere` field if it composes
 * AtmosphericMixin. Returns null when the field isn't set or the
 * mixin isn't composed — the biome-chain default (air) applies.
 * Phase 3 deliberately doesn't await the async biome chain; a
 * room explicitly tagged `_atmosphere = 'vacuum'` (the only v1
 * blocker) is the test surface.
 */
/**
 * ⭐ One copy, on `AtmosphericMixin`. This helper was
 * character-for-character identical in `SoundModality` and
 * `AudienceGather`; see the method for the v1 limitation it carries
 * (an inherited vacuum does not block — only an authored one does).
 */
function atmosphereBlocks(loc: Stuff & Container): boolean {
  return MixinApi.isAtmospheric(loc) ? loc.atmosphereBlocks() : false;
}

/**
 * ⭐ The legs out of `loc`, in the order this walk has always taken
 * them: boundary conduits (d), then doorless obvious exits (e).
 *
 * ⚠⚠ This leg list was **character-for-character identical** to
 * `SoundModality`'s, and the two walks STILL differ — smell's
 * `finalize` picks a dominant identity by argmax with a strict `>`,
 * so ties go to **walk order**. That is exactly why the skeleton is
 * shared and the accumulators are not: the duplication was in the
 * machinery, and the difference that matters is three functions down.
 */
function smellLegs(loc: Stuff & Container): Array<Leg<Stuff & Container>> {
  const out: Array<Leg<Stuff & Container>> = [];

  if (MixinApi.isAdornable(loc)) {
    for (const fx of loc.getFixtures()) {
      if (!BoundaryAnchor.is(fx)) continue;
      const anchor = fx;
      const boundary = anchor.getBoundary();
      if (!boundary) continue;
      const otherHost = anchor.getOtherHost();
      if (!otherHost) continue;
      const conduit = findSmellConduit(boundary);
      if (!conduit) continue;
      const otherSide = boundary.getOtherSide(anchor);
      const tau = conduit.transmissivity(otherSide, anchor.getSide());
      if (!(tau > 0)) continue;
      out.push({ node: otherHost as unknown as Stuff & Container, tau });
    }
  }

  if (MixinApi.isExitable(loc)) {
    for (const { dest } of loc.getObviousNeighbours()) {
      out.push({ node: dest, tau: EXIT_TAU });
    }
  }

  return out;
}

/** Everything `loc` emits itself — legs (b) contents, (c) fixtures. */
function ownSmell(loc: Stuff & Container): ConcentrationAccumulator {
  const acc = newAccumulator();

  // (b) Contents-side emitters.
  for (const item of loc.getContents()) {
    if (!MixinApi.isSmellSource(item)) continue;
    const conc = item.getEmittedConcentration().rawValue();
    if (conc <= 0) continue;
    addContribution(acc, {
      stuffId: (item as unknown as Stuff).stuffId,
      concentration: conc,
      identity: item.getOdorIdentity(),
    });
  }

  // (c) Fixture-side emitters.
  if (MixinApi.isAdornable(loc)) {
    for (const fx of loc.getFixtureSmellSources()) {
      if (!MixinApi.isSmellSource(fx)) continue;
      const conc = fx.getEmittedConcentration().rawValue();
      if (conc <= 0) continue;
      addContribution(acc, {
        stuffId: (fx as unknown as Stuff).stuffId,
        concentration: conc,
        identity: fx.getOdorIdentity(),
      });
    }
  }

  return acc;
}

/**
 * The olfactory walk, on the shared skeleton
 * (`lib/location/Traversal.ts` — *one traversal, or none*).
 *
 * `enter` returns the empty accumulator in a vacuum — leg (a), *no
 * signal at all in a vacuum scope* — and the node is still entered and
 * marked, exactly as before.
 */
function walkAt(
  loc: Stuff & Container,
  depth: number,
  visited: Set<string>,
): ConcentrationAccumulator {
  const walk = new Traversal<Stuff & Container, ConcentrationAccumulator, void>({
    order: 'depth-first',
    keyOf: (node) => (node as unknown as Stuff).stuffId,
    neighbours: smellLegs,
    bound: { hops: MAX_HOPS },
    visited,
    enter: (node) => (atmosphereBlocks(node) ? newAccumulator() : undefined),
    fold: (node, _d, _carry, children) => {
      const acc = ownSmell(node);
      for (const { leg, result } of children) {
        mergeAttenuated(acc, result, leg.tau ?? EXIT_TAU);
      }
      return acc;
    },
  });
  return walk.walk(loc, { carry: undefined, depth }).result;
}

function finalize(acc: ConcentrationAccumulator): Smell {
  if (acc.sources.length === 0 && acc.perIdentity.size === 0) {
    return Smell.ZERO;
  }
  let dominantIdentity = '';
  let dominantConc = 0;
  for (const [identity, conc] of acc.perIdentity.entries()) {
    if (conc > dominantConc) {
      dominantConc = conc;
      dominantIdentity = identity;
    }
  }
  const totalConc = [...acc.perIdentity.values()].reduce((a, b) => a + b, 0);
  // Merge same-source contributions, sort descending by concentration,
  // cap at SMELL_SOURCE_CAP. This mirrors Smell.from's invariant.
  const merged = new Map<string, SmellSourceRef>();
  for (const s of acc.sources) {
    const existing = merged.get(s.stuffId);
    if (!existing) {
      merged.set(s.stuffId, { ...s });
    } else {
      merged.set(s.stuffId, {
        stuffId: s.stuffId,
        identity:
          s.concentration > existing.concentration ? s.identity : existing.identity,
        concentration: s.concentration + existing.concentration,
      });
    }
  }
  const sources = Array.from(merged.values())
    .sort((a, b) => b.concentration - a.concentration)
    .slice(0, SMELL_SOURCE_CAP);
  return Smell.from({
    concentration: totalConc,
    identity: dominantIdentity,
    sources,
  });
}

export class SmellModality extends Modality {
  /**
   * Total smell at `loc`. Walks contents-side emitters (b),
   * fixture-side emitters (c), cross-boundary propagation via
   * `SmellConduit` (d), and cross-exit propagation (e).
   * Bounded by `MAX_HOPS` (substrate-shared); cycle-guarded via the
   * `visited` set. Returns `null` when the walk surfaces no
   * contribution — matches the modality default-null contract for
   * consumers that branch on presence.
   */
  public override signalAt(loc: Stuff & Container): Smell | null {
    const acc = walkAt(loc, 0, new Set<string>());
    const result = finalize(acc);
    if (result.concentration.rawValue() === 0 && result.sources.length === 0) {
      return null;
    }
    return result;
  }

}
