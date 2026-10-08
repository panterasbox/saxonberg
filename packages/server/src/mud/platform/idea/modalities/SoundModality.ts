/**
 * SoundModality — the auditory singleton. Field modality.
 *
 * `signalAt(loc)` walks containment + Boundary conduits + exits to
 * accumulate dB sound at the given scope. Walk shape mirrors
 * `SmellModality`'s but does dB arithmetic — accumulation happens
 * in linear amplitude (`pow(10, dB/10)`) and converts back to dB at
 * the wrap step, which is the physically-correct merge for
 * incoherent sources.
 *
 * Ambient floor: when no per-room override is authored, the
 * universe-root biome's `_defaultAmbientSoundLevel` (a
 * `Quantity<'dB'>`) seeds a sync ambient baseline. A future
 * follow-up may extend this to the full async biome chain via
 * `BiomeApi.resolveAmbientSoundLevelFor`; v1 reads only the root
 * biome's default plus the room's inline `_atmosphere` (vacuum
 * blocks at the recipient).
 *
 * Note: the modality NAME is `'sound'`, but the BodyPlan organ key
 * is `'hearing'`. `PerceptionApi.modalityByOrganKey('hearing')`
 * resolves to this singleton.
 */

import { Modality } from '../../../lib/perception/Modality';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { Sound, type SoundSourceRef, SOUND_SOURCE_CAP } from '../../../lib/perception/Sound';
import { MAX_HOPS, EXIT_TAU } from '../../../lib/perception/Modality';
import { MixinApi } from '../../../api/mixin';
import { Traversal } from '../../../lib/location/Traversal';
import type { Leg } from '../../../lib/location/Traversal';
import { StuffApi } from '../../../api/stuff';
import { PerceptionApi } from '../../../api/perception';
import { BiomeApi } from '../../../api/biome';
import { BoundaryAnchor } from '../../../lib/boundary/BoundaryAnchor';
import type { Boundary } from '../../../lib/boundary/Boundary';
import type { Conduit } from '../../../lib/boundary/Conduit';
import type { SoundConduit } from '../../../lib/boundary/SoundConduit';

interface LinearAccumulator {
  /** Sum of linear amplitudes (10^(dB/10)) across all contributing sources. */
  linearAmplitude: number;
  /** Source-level attributions, dB-typed, pre-cap. */
  sources: SoundSourceRef[];
}

function newAccumulator(): LinearAccumulator {
  return { linearAmplitude: 0, sources: [] };
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 10);
}

function linearToDb(linear: number): number {
  if (linear <= 0) return 0;
  return 10 * Math.log10(linear);
}

function addContribution(acc: LinearAccumulator, source: SoundSourceRef | null): void {
  if (!source) return;
  acc.linearAmplitude += dbToLinear(source.amplitude);
  acc.sources.push(source);
}

function mergeAttenuated(
  parent: LinearAccumulator,
  sub: LinearAccumulator,
  tau: number,
): void {
  if (tau <= 0) return;
  parent.linearAmplitude += sub.linearAmplitude * tau;
  for (const s of sub.sources) {
    parent.sources.push({
      stuffId: s.stuffId,
      amplitude: s.amplitude + 10 * Math.log10(tau),
      character: s.character,
    });
  }
}

function isSoundConduit(c: Conduit): c is SoundConduit {
  return c.conduitKind === 'sound';
}

function findSoundConduit(boundary: Boundary): SoundConduit | null {
  for (const c of boundary.getConduits()) {
    if (isSoundConduit(c)) return c;
  }
  return null;
}


/**
 * ⭐ One copy, on the host that owns the field:
 * `AtmosphericMixin.atmosphereBlocks()`. This was a private helper
 * here, in `SmellModality` character-for-character, and in
 * `AudienceGather` — where the v1 limitation was annotated "shared
 * verbatim with `SoundModality.walkAt`", a comment admitting the
 * duplication while making another copy of it. The limitation itself
 * (a biome-default vacuum does not block; only an authored one does)
 * is documented at the method.
 */
function atmosphereBlocks(loc: Stuff & Container): boolean {
  return MixinApi.isAtmospheric(loc) ? loc.atmosphereBlocks() : false;
}

/**
 * Sync ambient floor from the universe-root biome. Returns null when
 * the root biome isn't loaded or declares no default.
 */
function rootAmbientLinear(): number {
  try {
    const root = BiomeApi.getRootBiome();
    const level = root.getDefaultAmbientSoundLevel();
    if (level === null) return 0;
    return dbToLinear(level.rawValue());
  } catch {
    return 0;
  }
}

/**
 * ⭐ The legs out of `loc`, in the order this walk has always taken
 * them: boundary conduits (d) first, then doorless obvious exits (e).
 * Each carries its own transmissivity, which `fold` applies per child
 * — ⚠ unlike light, which collects them and caps them as one.
 */
function soundLegs(loc: Stuff & Container): Array<Leg<Stuff & Container>> {
  const out: Array<Leg<Stuff & Container>> = [];

  // (d) Cross-boundary propagation.
  if (MixinApi.isAdornable(loc)) {
    for (const fx of loc.getFixtures()) {
      if (!BoundaryAnchor.is(fx)) continue;
      const anchor = fx;
      const boundary = anchor.getBoundary();
      if (!boundary) continue;
      const otherHost = anchor.getOtherHost();
      if (!otherHost) continue;
      const conduit = findSoundConduit(boundary);
      if (!conduit) continue;
      const otherSide = boundary.getOtherSide(anchor);
      const tau = conduit.transmissivity(otherSide, anchor.getSide());
      if (!(tau > 0)) continue;
      out.push({ node: otherHost as unknown as Stuff & Container, tau });
    }
  }

  // (e) Cross-exit propagation. Doored exits skip — the boundary walk
  // handles those. The hazard guards are
  // `ExitableMixin.getObviousNeighbours`' now, in one copy.
  if (MixinApi.isExitable(loc)) {
    for (const { dest } of loc.getObviousNeighbours()) {
      out.push({ node: dest, tau: EXIT_TAU });
    }
  }

  return out;
}

/** Everything `loc` emits itself — legs (a) ambient, (b) contents, (c) fixtures. */
function ownSound(loc: Stuff & Container, depth: number): LinearAccumulator {
  const acc = newAccumulator();
  const id = (loc as unknown as Stuff).stuffId;

  // (a) Ambient floor — only on the root walk (depth 0).
  if (depth === 0) {
    const ambient = rootAmbientLinear();
    if (ambient > 0) {
      acc.linearAmplitude += ambient;
      acc.sources.push({
        stuffId: id,
        amplitude: linearToDb(ambient),
        character: 'ambient',
      });
    }
  }

  // (b) Contents-side emitters.
  for (const item of loc.getContents()) {
    if (!MixinApi.isSoundSource(item)) continue;
    const db = item.getEmittedAmplitude().rawValue();
    if (!Number.isFinite(db)) continue;
    addContribution(acc, {
      stuffId: (item as unknown as Stuff).stuffId,
      amplitude: db,
      character: item.getCharacter(),
    });
  }

  // (c) Fixture-side emitters.
  if (MixinApi.isAdornable(loc)) {
    for (const fx of loc.getFixtureSoundSources()) {
      if (!MixinApi.isSoundSource(fx)) continue;
      const db = fx.getEmittedAmplitude().rawValue();
      if (!Number.isFinite(db)) continue;
      addContribution(acc, {
        stuffId: (fx as unknown as Stuff).stuffId,
        amplitude: db,
        character: fx.getCharacter(),
      });
    }
  }

  return acc;
}

/**
 * The acoustic walk, on the shared skeleton
 * (`lib/location/Traversal.ts` — *one traversal, or none*).
 *
 * ⭐ What is this walk's own, and therefore stayed: the ambient floor
 * that only applies at depth 0, the vacuum refusal, and
 * `mergeAttenuated` **per child** — sound dims through each doorway
 * independently, where light shares one cap across all of them.
 *
 * ⚠ `enter` returns the EMPTY accumulator for a vacuum rather than
 * refusing the leg, which is the same thing the old `if
 * (atmosphereBlocks(loc)) return acc;` did and is not the same as
 * `descend` returning null: the node is still entered and still
 * MARKED, so a second path to it does not try again.
 */
function walkAt(
  loc: Stuff & Container,
  depth: number,
  visited: Set<string>,
): LinearAccumulator {
  const walk = new Traversal<Stuff & Container, LinearAccumulator, void>({
    order: 'depth-first',
    keyOf: (node) => (node as unknown as Stuff).stuffId,
    neighbours: soundLegs,
    bound: { hops: MAX_HOPS },
    visited,
    enter: (node) => (atmosphereBlocks(node) ? newAccumulator() : undefined),
    fold: (node, d, _carry, children) => {
      const acc = ownSound(node, d);
      for (const { leg, result } of children) {
        mergeAttenuated(acc, result, leg.tau ?? EXIT_TAU);
      }
      return acc;
    },
  });
  return walk.walk(loc, { carry: undefined, depth }).result;
}

function finalize(acc: LinearAccumulator): Sound {
  if (acc.linearAmplitude <= 0 && acc.sources.length === 0) {
    return Sound.SILENT;
  }
  // Merge duplicate sourceIds, sort descending by dB, cap.
  const merged = new Map<string, SoundSourceRef>();
  for (const s of acc.sources) {
    const existing = merged.get(s.stuffId);
    if (!existing) {
      merged.set(s.stuffId, { ...s });
    } else {
      const summed =
        10 *
        Math.log10(
          dbToLinear(s.amplitude) + dbToLinear(existing.amplitude),
        );
      merged.set(s.stuffId, {
        stuffId: s.stuffId,
        character:
          s.amplitude > existing.amplitude ? s.character : existing.character,
        amplitude: summed,
      });
    }
  }
  const sources = Array.from(merged.values())
    .sort((a, b) => b.amplitude - a.amplitude)
    .slice(0, SOUND_SOURCE_CAP);
  const totalDb = linearToDb(acc.linearAmplitude);
  const character = sources[0]?.character ?? '';
  return Sound.from({
    amplitude: totalDb,
    character,
    sources,
  });
}

export class SoundModality extends Modality {
  public override signalAt(loc: Stuff & Container): Sound | null {
    const acc = walkAt(loc, 0, new Set<string>());
    const result = finalize(acc);
    if (result.amplitude.rawValue() <= 0 && result.sources.length === 0) {
      return null;
    }
    return result;
  }

}
