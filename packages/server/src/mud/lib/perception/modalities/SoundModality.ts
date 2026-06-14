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

import { Modality } from '../Modality';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import { Sound, type SoundSourceRef, SOUND_SOURCE_CAP } from '../Sound';
import { MAX_HOPS, EXIT_TAU } from '../Modality';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { PerceptionApi } from '../../../api/perception';
import { BiomeApi } from '../../../api/biome';
import { BoundaryAnchor } from '../../boundary/BoundaryAnchor';
import type { Boundary } from '../../boundary/Boundary';
import type { Conduit } from '../../boundary/Conduit';
import type { SoundConduit } from '../../boundary/SoundConduit';

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


function inlineAtmosphere(loc: Stuff & Container): string | null {
  if (!MixinApi.isAtmospheric(loc)) return null;
  const atmos = (loc as unknown as { _atmosphere?: string | null })._atmosphere;
  return typeof atmos === 'string' && atmos.length > 0 ? atmos : null;
}

function atmosphereBlocks(loc: Stuff & Container): boolean {
  return inlineAtmosphere(loc) === 'vacuum';
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

function walkAt(
  loc: Stuff & Container,
  depth: number,
  visited: Set<string>,
): LinearAccumulator {
  const acc = newAccumulator();
  if (depth > MAX_HOPS) return acc;
  const id = (loc as unknown as Stuff).stuffId;
  if (visited.has(id)) return acc;
  visited.add(id);
  if (atmosphereBlocks(loc)) return acc;

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

  if (MixinApi.isAdornable(loc)) {
    // (c) Fixture-side emitters.
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

    // (d) Cross-boundary propagation.
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
      const sub = walkAt(
        otherHost as unknown as Stuff & Container,
        depth + 1,
        visited,
      );
      mergeAttenuated(acc, sub, tau);
    }
  }

  // (e) Cross-exit propagation. Doored exits skip — boundary walk
  // handles those.
  if (MixinApi.isExitable(loc)) {
    for (const exit of loc.getObviousExits()) {
      if (exit.getDoor()) continue;
      const destPath = exit.getDestinationTemplatePath();
      if (destPath && !StuffApi.findByTemplatePath(destPath)) continue;
      let dest: Stuff & Container;
      try {
        dest = exit.getDestination();
      } catch {
        continue;
      }
      const sub = walkAt(dest, depth + 1, visited);
      mergeAttenuated(acc, sub, EXIT_TAU);
    }
  }

  return acc;
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

  /**
   * Read the sound signal at `loc` — convenience wrapper around
   * `PerceptionApi.modalityByName('sound').signalAt(loc)`. The
   * lookup goes through `PerceptionApi` so the template surface
   * stays the single source of truth.
   */
  public static soundAt(loc: Stuff & Container): Sound | null {
    return (
      PerceptionApi.modalityByName('sound') as SoundModality
    ).signalAt(loc);
  }
}
