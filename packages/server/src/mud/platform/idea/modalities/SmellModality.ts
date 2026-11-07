/**
 * SmellModality — the olfactory singleton: the source and the air.
 *
 * `emissionOf(thing)` answers what a thing gives off, derived over the mixins
 * it already composes: its material, what it holds, its rot, its dirt, its
 * decay, its species, its fire, and what is inside it unless it is closed.
 * Nothing carries a stored emission and no thing composes a smell mixin, so a
 * plain thing answers "nothing" by having none of those.
 *
 * `signalAt(loc)` walks containment, Boundary conduits and exits to gather
 * those emissions at a scope, one band fainter per hop. Depth-capped via
 * `MAX_HOPS`, cycle-guarded via `visited`. A nose reads the result; this file
 * never decides who detects what.
 *
 * The factors: amount is compressive (`sqrt(kg)`, so a spoonful and a barrel
 * are two bands apart), heat is vapor pressure's rule of thumb (it doubles
 * per 10 K, for anything with a temperature), and a closed container holds in
 * whatever is inside it. No vapor model and no physics beyond that.
 *
 * Vacuum check: a scope whose `_atmosphere` reads `'vacuum'` blocks all smell.
 */

import { Modality } from '../../../lib/perception/Modality';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { Smell, type SmellNote, type SmellSourceRef } from '../../../lib/perception/Smell';
import { MAX_HOPS } from '../../../lib/perception/Modality';
import { DissolvedAromatics } from '../../../lib/metabolism/DissolvedAromatics';
import { Freshness } from '../../../lib/material/Freshness';
import type Material from '../../../lib/material/Material';
import { MixinApi } from '../../../api/mixin';
import { Traversal } from '../../../lib/location/Traversal';
import type { Leg } from '../../../lib/location/Traversal';
import { StuffApi } from '../../../api/stuff';
import Aroma from '../Aroma';
import { CraftingApi } from '../../../api/crafting';
import type { Sensor } from '../../../lib/message/Sensor';
import type { Percept } from '../../../lib/perception/Modality';
import { BoundaryAnchor } from '../../../lib/boundary/BoundaryAnchor';
import type { Boundary } from '../../../lib/boundary/Boundary';
import type { Conduit } from '../../../lib/boundary/Conduit';
import type { SmellConduit } from '../../../lib/boundary/SmellConduit';
import type { Bulkable, BulkPayload } from '../../../lib/bulk/Bulkable';

/** One band fainter per hop: a doorless exit, and on top of a boundary's own. */
const HOP_TAU = 1 / 30;
/** A dissolved aroma scents a room one band under the glass. */
const OPEN_VESSEL_TAU = 1 / 30;
/** What the ground under you counts as, in kilograms of its material. */
const GROUND_KG = 100;
/** Vapor pressure's range: nothing a body stands near leaves this. */
const MAX_HEAT_FACTOR = 64;
/** The temperature a source's authored strength is stated at. */
const REFERENCE_K = 293;

/** The compressive amount rule, off a kilogram. */
function amountFactor(kg: number): number {
  return kg > 0 ? Math.sqrt(kg) : 0;
}

/** Heat drives a smell, for anything that has a temperature. */
function heatFactor(thing: Stuff): number {
  if (!MixinApi.isThermal(thing)) return 1;
  const f = 2 ** ((thing.getTemperature().rawValue() - REFERENCE_K) / 10);
  return Math.min(MAX_HEAT_FACTOR, Math.max(1 / MAX_HEAT_FACTOR, f));
}

function isClosed(thing: Stuff): boolean {
  return MixinApi.isSealable(thing) && !thing.isOpen();
}

/** A running total per word, and whose making it came from. */
type Notes = Map<string, { ou: number; maker?: string }>;

function addNote(into: Notes, word: string, ou: number, maker?: string): void {
  if (!(ou > 0)) return;
  const had = into.get(word);
  into.set(word, { ou: (had?.ou ?? 0) + ou, maker: had?.maker ?? maker });
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
      out.push({ node: otherHost as unknown as Stuff & Container, tau: tau * HOP_TAU });
    }
  }

  if (MixinApi.isExitable(loc)) {
    for (const { dest } of loc.getObviousNeighbours()) {
      out.push({ node: dest, tau: HOP_TAU });
    }
  }

  return out;
}

export class SmellModality extends Modality {
  /** What a viewer's nose makes of the air here; nothing without a nose. */
  public override perceiveFor(
    viewer: Stuff & Sensor,
    _loc: Stuff & Container,
    signal: Smell,
  ): Percept | null {
    return MixinApi.isOlfactory(viewer) ? viewer.nose(signal) : null;
  }

  /** How much of a smell reaches one place further on. */
  public hopTau(): number {
    return HOP_TAU;
  }

  /**
   * What `thing` gives off where it stands, as hop-0 sources attributed to it.
   * `close` reads with your nose to it, where a dissolved aroma is at full
   * strength; carried and held things count unless something closed holds
   * them in.
   */
  public emissionOf(thing: Stuff, opts: { close?: boolean } = {}): Smell {
    const own: Notes = new Map();
    const carried: Notes = new Map();
    this.gather(thing, own, carried, opts.close === true, new Set());
    const sources: SmellSourceRef[] = [];
    for (const [word, n] of own) {
      sources.push({ stuffId: thing.stuffId, word, ou: n.ou, hops: 0, maker: n.maker });
    }
    for (const [word, n] of carried) {
      sources.push({ stuffId: thing.stuffId, word, ou: n.ou, hops: 0, maker: n.maker, carried: true });
    }
    return Smell.of(sources);
  }

  /**
   * What one blend gives a nose held to it, attributed to its vessel. Reads the
   * payload it is handed, so a still can be read at the point in its run.
   */
  public emissionOfBlend(host: Stuff, payload: BulkPayload | null, maker: string): Smell {
    const notes: SmellSourceRef[] = [];
    for (const tag of payload?.dissolvedAromatics ?? []) {
      const threshold = DissolvedAromatics.thresholdFor(tag.type);
      if (threshold === null || !(threshold > 0)) continue;
      notes.push({
        stuffId: host.stuffId,
        word: tag.type,
        ou: tag.amount / threshold,
        hops: 0,
        maker: maker || undefined,
      });
    }
    return Smell.of(notes);
  }

  /**
   * Total smell at `loc`: what its contents and fixtures give off, plus what
   * reaches it through boundaries and exits. `null` when nothing does, the
   * modality default-null contract.
   */
  public override signalAt(loc: Stuff & Container): Smell | null {
    const result = this.walkAt(loc);
    return result.isEmpty() ? null : result;
  }

  private walkAt(loc: Stuff & Container): Smell {
    const walk = new Traversal<Stuff & Container, Smell, void>({
      order: 'depth-first',
      keyOf: (node) => (node as unknown as Stuff).stuffId,
      neighbours: smellLegs,
      bound: { hops: MAX_HOPS },
      visited: new Set<string>(),
      // A vacuum holds nothing, and the node is still entered and marked.
      enter: (node) => (atmosphereBlocks(node) ? Smell.ZERO : undefined),
      fold: (node, _d, _carry, children) => {
        let acc = this.ownSmell(node);
        for (const { leg, result } of children) {
          acc = acc.add(result.attenuate(leg.tau ?? HOP_TAU, 1));
        }
        return acc;
      },
    });
    return walk.walk(loc, { carry: undefined, depth: 0 }).result;
  }

  /** Everything `loc` holds: its contents and its fixtures, ground included. */
  private ownSmell(loc: Stuff & Container): Smell {
    let acc = Smell.ZERO;
    for (const item of loc.getContents()) {
      acc = acc.add(this.emissionOf(item as unknown as Stuff));
    }
    if (MixinApi.isAdornable(loc)) {
      for (const fx of loc.getFixtures()) {
        if (BoundaryAnchor.is(fx)) continue;
        acc = acc.add(this.emissionOf(fx as unknown as Stuff));
      }
    }
    return acc;
  }

  /**
   * ⚠ A body's clothes are its own smell and what it carries is not: you can't
   * tell how much you reek, but you can smell the tar pot in your hand.
   */
  private gather(
    thing: Stuff,
    into: Notes,
    carried: Notes,
    close: boolean,
    seen: Set<string>,
  ): void {
    if (seen.has(thing.stuffId)) return;
    seen.add(thing.stuffId);
    const heat = heatFactor(thing);
    const kg = MixinApi.isFloor(thing)
      ? GROUND_KG
      : MixinApi.isTangible(thing)
        ? thing.getMass().rawValue()
        : 0;
    const amount = amountFactor(kg);

    if (MixinApi.isOrganism(thing)) {
      // A decaying body smells of its decay; only a fresh one still smells of
      // what it was.
      const decay = MixinApi.isPostmortem(thing) ? thing.decayNote() : null;
      if (decay) {
        addNote(into, decay.word, decay.ou * amount * heat);
      } else {
        for (const tag of thing.getSpecies()?.getSmells() ?? []) {
          addNote(into, tag.word, tag.strength * amount * heat);
        }
      }
    } else if (MixinApi.isTangible(thing)) {
      this.addMaterial(thing.getMaterial(), kg, heat, into);
    }

    if (MixinApi.isFresh(thing)) {
      const rot = thing.rotNote();
      if (rot) addNote(into, rot.word, rot.ou * amount * heat);
    }
    if (MixinApi.isSoilable(thing)) {
      for (const note of thing.soilOdor()) addNote(into, note.word, note.ou);
    }
    if (MixinApi.isBurner(thing)) {
      for (const note of thing.burningNotes()) addNote(into, note.word, note.ou);
    }
    if (isClosed(thing)) return;
    if (MixinApi.isBulkable(thing)) this.addInterior(thing, heat, close, into);
    if (MixinApi.isContainer(thing)) {
      const worn = new Set<unknown>();
      if (MixinApi.isSlotted(thing)) {
        for (const layer of thing.getAllOccupants().values()) {
          for (const occupant of layer) worn.add(occupant);
        }
      }
      for (const inner of thing.getContents()) {
        const dest = MixinApi.isOrganism(thing) && !worn.has(inner) ? carried : into;
        this.gather(inner as unknown as Stuff, dest, carried, close, seen);
      }
    }
  }

  private addMaterial(material: Material | null, kg: number, heat: number, into: Notes): void {
    if (!material || !MixinApi.isOdorous(material)) return;
    for (const tag of material.getSmells()) {
      addNote(into, tag.word, tag.strength * amountFactor(kg) * heat);
    }
  }

  /** What an open vessel holds: its matter, what is dissolved in it, its rot. */
  private addInterior(
    vessel: Stuff & Bulkable,
    heat: number,
    close: boolean,
    into: Notes,
  ): void {
    if (!vessel.hasInteriorBulk() || vessel.isBulkEmpty('interior')) return;
    const litres = vessel.getBulkAmount('interior').rawValue();
    const payload = vessel.getBulkPayload('interior');
    const makeup = payload?.makeup ?? [];
    if (makeup.length > 0) {
      for (const part of makeup) {
        const m = StuffApi.findByTemplatePath<Material>(part.materialPath);
        if (!m) Aroma.loadOnUse(part.materialPath);
        this.addMaterial(m ?? null, litres * part.fraction, heat, into);
      }
    } else {
      this.addMaterial(vessel.getBulkMaterial('interior'), litres, heat, into);
    }
    const reach = close ? 1 : OPEN_VESSEL_TAU * amountFactor(litres) * heat;
    const maker = CraftingApi.blendDiscipline(payload) || undefined;
    for (const tag of payload?.dissolvedAromatics ?? []) {
      const threshold = DissolvedAromatics.thresholdFor(tag.type);
      if (threshold !== null && threshold > 0) {
        addNote(into, tag.type, (tag.amount / threshold) * reach, maker);
      }
    }
    const rot: SmellNote | null = new Freshness(vessel.getBulk('interior')).rotNote();
    if (rot) addNote(into, rot.word, rot.ou * amountFactor(litres) * heat);
  }
}
