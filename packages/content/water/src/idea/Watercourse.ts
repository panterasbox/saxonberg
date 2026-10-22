/**
 * Watercourse — a river as **authored topology plus derived direction**.
 *
 * A watercourse is a data `Idea` in a catalogue, resolve-on-read: the
 * `Biome` / `Government` / `Corpo` / `Material` shape. It carries its
 * nodes, their control-point elevations, and which node of which other
 * watercourse it branches from. It is never cloned as live Stuff.
 *
 * ## A reach is not an object
 *
 * A **reach** is a node identity on a course — `kestrel:confluence` — the
 * way a room already cites `_biomePath` and `_address`. Rights,
 * contamination and flow all key on it, and upstream/downstream between
 * any two places is answered by comparing two integers.
 *
 * A reach becomes a real object only where **content puts a structure on
 * it** — a dam, an intake, a weir. Most of a watercourse runs through
 * country nobody will ever stand in, and Hinkley Lane already settled the
 * principle: *the unbuilt lots are prose, not nine empty rooms.* It is
 * also the wrong containment — a mill **beside** the river is not **in**
 * it, and a diversion right attaches to a position that may never have a
 * room at all.
 *
 * ## Direction is DERIVED; an author never writes an arrow
 *
 * Nodes are declared source-first. Elevation is authored at **control
 * points** (source, falls, confluence, mouth) and **interpolated**
 * between them, so an uphill reach is *unrepresentable* rather than
 * caught by a lint. The one assertion left is `source above mouth`, at
 * parse, naming the offending control points.
 *
 * Where elevation ties — a flat reach — the ordering falls back to the
 * authored node order, which is honest: a canal across a flat *is*
 * directed by how it was dug.
 *
 * ## Distributaries come free
 *
 * One `branchesFrom` field covers both a tributary joining and a delta
 * splitting, because direction is derived rather than declared. A course
 * that names no parent is a **trunk**, and its last node is the sea.
 *
 * See [docs/subsystems/watershed.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import {
  LineFrameMixin,
  type LineClimateSite,
  type LinePositionRecord,
} from '@saxonberg/server/mud/lib/expanse/LineFrame';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type WatercourseCatalogue from './WatercourseCatalogue';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

import type { BoundaryRole } from '@saxonberg/server/mud/lib/security/BoundaryRole';
/**
 * Template-path prefix every authored watercourse ROW lives under.
 *
 * ⚠ In the **commons** (`/stuff`), not under the pack's own `/water`
 * root — exactly where `Locality` and `Government` reference rows live,
 * and for the same reason. The pack ships the CLASS
 * (`/system/water/idea/Watercourse`); a river is a fact about somebody's realm,
 * and the realm's own pack has to be able to author and edit it. A row
 * under `/water` would be titled to the water group, so world-seed could
 * not touch the Kestrel it authored.
 */
export const WATERCOURSE_PATH_PREFIX = '/stuff/idea/Watercourse';

/**
 * One authored node on a watercourse — a **reach**, named so that
 * citations survive somebody inserting a node upstream of them.
 *
 * ⚠ Cited by NAME (`kestrel:falls`), ordered by INDEX. The requirements
 * sketch a reach as `kestrel:4`; a positional citation would silently
 * re-point every right, intake and outfall the moment an author added a
 * node above it, so the durable half of the identity is the name and the
 * index stays an internal ordinal.
 */
export interface WatercourseNode {
  /** Durable identity within the course. */
  name: string;
  /**
   * Metres above sea level. Authored at **control points** only;
   * omitted nodes interpolate linearly between the control points that
   * bracket them, which is what makes an uphill reach unrepresentable.
   */
  elevation?: number;
  /**
   * A hint about the channel's size, used to derive navigability
   * alongside flow. Purely descriptive — flow is the other half, and it
   * is computed.
   */
  channelWidthM?: number;
  /**
   * Square kilometres of **unclaimed** ground draining to this reach —
   * the mountainside nobody's locality covers.
   *
   * ⭐ Most of a catchment is not anybody's town. A locality declares
   * the ground it sits on (D21); this declares the fell above it. They
   * add, and without the second one a realm with three villages would
   * have a river the size of a gutter — which would make the whole
   * seasonal hydrograph, and therefore the whole rights layer,
   * unobservable.
   *
   * It is a *declaration* for exactly the reason a locality's is:
   * deriving an area over a world made of rooms, most of them indoors,
   * is not a thing that can be done honestly.
   */
  catchmentKm2?: number;
  /**
   * Mean depth of the channel in metres, for the current read
   * (`flow / (width × depth)`). Authored where an author cares; derived
   * from the flow by hydraulic geometry otherwise, as an unauthored
   * width is.
   */
  meanDepthM?: number;
  /**
   * ⭐ **The aquaculture seam** (fishing D3): a stocked species' capacity
   * is the authored number regardless of fit, and the fishery read says
   * so. No shipped row authors one; a population that never exists as
   * objects until drawn, so this is NOT the zone's spawn `stocks:`.
   */
  stocks?: WatercourseStock[];
  /**
   * ⭐ **The works on this reach** (the scan sweep, 2026-10-14) — the
   * template paths of the intakes, outfalls and control structures that
   * draw from or discharge into it. The river reads each one live when it
   * is standing and from its ROW when it is not, so an outfall nobody has
   * visited still fouls the water below it. Before this the catalogue
   * found its works by a class scan of the template table.
   */
  works?: string[];
  /**
   * ⭐ **Kilometres from the mouth** (river D1) — the river mile. Required
   * on every node of a course of two or more nodes, strictly decreasing
   * source-first; the mouth is the end that does not move, so lengthening
   * the headwaters shifts nothing below.
   */
  km?: number;
  /** A falls' step at this node, m — the drop is taken out as a 50 m stretch. */
  drop?: number;
}

/** How a river starts. Required on a course of two or more nodes. */
export type WatercourseSource =
  | { kind: 'rills' }
  | { kind: 'spring'; yieldM3S?: number }
  | { kind: 'outlet'; of: string }
  | { kind: 'melt' };

/**
 * Where a river ends. Required on a course of two or more nodes: another
 * river (a node of it), a still water, the sea at a named node, or a sink
 * where it runs out (whose end moves with the season).
 */
export type WatercourseMouth =
  | { into: 'river'; course: string; node: string }
  | { into: 'still'; water: string }
  | { into: 'sea'; node: string }
  | { into: 'sink' };

/** A stretch override (river D1): only what differs from the derivation. */
export interface WatercourseStretchOverride {
  /** `node±km` — the upstream end of the span overridden. */
  from?: string;
  /** `node±km` — the downstream end. */
  to?: string;
  kind?: 'pool' | 'run' | 'riffle' | 'rapid' | 'falls' | 'gorge';
  bed?: 'ground' | 'gravel' | 'rock' | 'sand' | 'mud';
  /** `walls` (both sides), or a bank kind per side. */
  banks?: 'walls' | { left?: string; right?: string };
  /** A point bank override: `node±km` with `side` and `bank` (a quay). */
  at?: string;
  side?: 'left' | 'right';
  bank?: string;
}

/** An authored hazard at a position (`at: falls+0.05`). */
export interface WatercourseHazard {
  at: string;
  side?: 'left' | 'right';
  kind: 'strainer' | 'hydraulic' | 'undercut';
  /** The hazard's own row, when not the kind's default. */
  row?: string;
}

/**
 * One species a reach HOLDS — a species template path, and optionally a
 * count. ⭐ A reach holds the species it names and no other (the scan
 * sweep): with no `capacity` the number derives from the species' habitat
 * fit in this water, exactly as before; with one, the authored number
 * stands regardless of fit (the aquaculture seam, fishing D3).
 */
export interface WatercourseStock {
  species: string;
  capacity?: number;
}

/**
 * ⭐ What a course's water is LIKE where nothing derives it (fishing
 * D22): the chemistry a catchment's ground gives its river. Seeded on
 * the course row; every node inherits it; flow-weighted where a
 * tributary joins. The join to the catchment's `GroundCharacter` (the
 * moor's peat is soft and acid, the ore country's limestone hard) is the
 * RGO unification pass's — this is the authored stance until then.
 */
export interface WatercourseWater {
  pH?: number;
  hardnessDgh?: number;
  nitrateMgL?: number;
}

/**
 * ⭐ **Where on the world a river runs** (the climate build, D-L): the
 * three climate levers a reach cannot get from a zone, because a reach
 * is a position on a river rather than a place you stand. Elevation is
 * the node's own; these are the course's. Every field is optional and
 * falls back to the realm default (`DEFAULT_CLIMATE_SITE`).
 *
 * ⚠ Authored, not derived: a river's latitude can disagree with the
 * zones it runs past, and that is an authoring error the climate drive
 * catches for the shipped basins. The seam that retires it is a
 * Locality that knows its zone (biome-normalization slate).
 */
export interface WatercourseSite {
  latitudeDeg?: number;
  continentality?: number;
  offsetK?: number;
}

/** The authored shape of a watercourse row's `data` block. */
export interface WatercourseDescriptor {
  /** Durable key (`kestrel`), independent of the template path. */
  key: string;
  /** Display name ("the Kestrel"). */
  name: string;
  /**
   * The drainage basin this course belongs to. Two courses sharing a
   * basin can resolve an upstream/downstream relation; two in different
   * basins resolve **none**, which is a different answer from "no".
   */
  basin: string;
  /** Source-first. The last node of a trunk is the sea. */
  nodes: WatercourseNode[];
  /**
   * `"<courseKey>:<nodeName>"` — the node of another course this one
   * joins (a tributary) or leaves (a distributary), or `null` for a
   * trunk. ONE field for both, because direction is derived.
   */
  branchesFrom: string | null;
  /** See {@link WatercourseWater}; absent = the dials' defaults. */
  water?: WatercourseWater;
  /**
   * ⭐ How deep light reaches in this water, m — the depth at which 1 %
   * of the surface light is left (underwater D6). A silty river 3, a
   * clear lake 8. Absent = a river's 3.
   */
  clarityM?: number;
  /** See {@link WatercourseSite}; absent = the realm's default site. */
  site?: WatercourseSite;
  /** How the river starts (river D1). Required with two or more nodes. */
  source?: WatercourseSource;
  /** Where the river ends (river D1). Required with two or more nodes. */
  mouth?: WatercourseMouth;
  /** What the bed is (default `ground` — gravel in a river). */
  bed?: 'ground' | 'gravel' | 'rock' | 'sand' | 'mud';
  /** The banks' default character (default wooded). */
  banks?: { wooded?: boolean };
  /** Overrides of the derived stretches and banks — never the whole river. */
  stretches?: WatercourseStretchOverride[];
  /** Authored hazards; the derived ones need no row. */
  hazards?: WatercourseHazard[];
  /** Named bends — a landmark on a bend the meander derives (`Hob's Bend`). */
  bends?: Array<{ at: string; name: string }>;
  /** The meander's seed (default: a hash of the course key). */
  meander?: { seed?: number };
  /**
   * ⭐ The authored places on this river's line (river D7, D8) — the rows
   * of a quay, a towpath, the stream below a quay, a gorge pool. The river
   * says what stands on it; nothing is searched for.
   */
  places?: string[];
}

/**
 * ⭐ The course's **display name** ("the Kestrel") comes from `NamedMixin` —
 * the one general-purpose "something a person named" surface, reused rather
 * than reinvented. A course uses only `name`; honorific/surname/suffix ride
 * along unused (the mixin's opt-out posture). `getAllFieldMeta` merges the
 * mixin's `name` meta with the block below property-by-property.
 */
export default class Watercourse extends LineFrameMixin(NamedMixin(Idea)) {
  /**
   * ⭐ Shared vocabulary: a watercourse row is **authored topology** —
   * key, basin, the source-first node list, the branch point, and the
   * baseline water chemistry. Nobody holds title to *the Kestrel* as a
   * thing; parcels only CITE a reach (`parcels.reach`), and the
   * riparian right derives from that citation.
   *
   * ⭐⭐ It qualifies because **the water pack already split the record
   * from the state.** Flow and direction are derived, storage lives on
   * `StorageNode` — a `Thing` in a place, which is `place` and takes
   * its jurisdiction from the room it sits in. So this class has no
   * runtime state to protect: its five setters have no caller but the
   * `TemplateApplier`.
   *
   * ⚠ It was left undeclared for one round on the reasoning that *"a
   * river's flow and storage are genuine runtime state"* — which
   * attributed to this class state that lives on other objects. The
   * denial that prompted it was `setKey()`, read as a write; it is the
   * applier hydrating an authored field, which is what every `commons`
   * member does (`Material` does it 32 times).
   *
   * See `@saxonberg/server/mud/lib/security/BoundaryRole`.
   */
  static boundaryRole: BoundaryRole = 'commons';

  /** See {@link WATERCOURSE_PATH_PREFIX}. */
  static readonly TEMPLATE_PATH_PREFIX = WATERCOURSE_PATH_PREFIX;

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    basin: { persistent: true, authorable: true },
    nodes: { persistent: true, authorable: true },
    branchesFrom: { persistent: true, authorable: true },
    water: { persistent: true, authorable: true },
    site: { persistent: true, authorable: true },
    clarityM: { persistent: true, authorable: true },
    source: { persistent: true, authorable: true },
    mouth: { persistent: true, authorable: true },
    bed: { persistent: true, authorable: true },
    banks: { persistent: true, authorable: true },
    stretches: { persistent: true, authorable: true },
    hazards: { persistent: true, authorable: true },
    bends: { persistent: true, authorable: true },
    meander: { persistent: true, authorable: true },
    places: { persistent: true, authorable: true },
  };

  protected key = '';
  protected basin = '';
  protected nodes: WatercourseNode[] = [];
  protected branchesFrom: string | null = null;
  protected water: WatercourseWater | null = null;
  protected site: WatercourseSite | null = null;
  /** How deep light reaches in this water, m (underwater D6). */
  protected clarityM: number | null = null;
  protected source: WatercourseSource | null = null;
  protected mouth: WatercourseMouth | null = null;
  protected bed: WatercourseDescriptor['bed'] | null = null;
  protected banks: { wooded?: boolean } | null = null;
  protected stretches: WatercourseStretchOverride[] = [];
  protected hazards: WatercourseHazard[] = [];
  protected bends: Array<{ at: string; name: string }> = [];
  protected meander: { seed?: number } | null = null;
  protected places: string[] = [];

  public getKey(): string {
    return this.key;
  }

  /** How deep light reaches in this water, m, or null for a river's default. */
  public getClarityM(): number | null {
    return this.clarityM;
  }
  public setKey(value: string): void {
    this.key = value;
  }

  public getBasin(): string {
    return this.basin;
  }
  public setBasin(value: string): void {
    this.basin = value;
  }

  public getNodes(): WatercourseNode[] {
    return this.nodes.map((n) => ({ ...n }));
  }
  public setNodes(value: WatercourseNode[]): void {
    this.nodes = Array.isArray(value) ? value.map((n) => ({ ...n })) : [];
  }

  public getBranchesFrom(): string | null {
    return this.branchesFrom;
  }
  public setBranchesFrom(value: string | null): void {
    this.branchesFrom = value === '' ? null : value;
  }

  public getWater(): WatercourseWater | null {
    return this.water === null ? null : { ...this.water };
  }
  public setWater(value: WatercourseWater | null): void {
    this.water = value && typeof value === 'object' ? { ...value } : null;
  }

  public getSite(): WatercourseSite | null {
    return this.site === null ? null : { ...this.site };
  }
  public setSite(value: WatercourseSite | null): void {
    this.site = value && typeof value === 'object' ? { ...value } : null;
  }

  public getSource(): WatercourseSource | null {
    return this.source === null ? null : { ...this.source };
  }
  public setSource(value: WatercourseSource | null): void {
    this.source = value && typeof value === 'object' ? { ...value } : null;
  }

  public getMouth(): WatercourseMouth | null {
    return this.mouth === null ? null : { ...this.mouth };
  }
  public setMouth(value: WatercourseMouth | null): void {
    this.mouth = value && typeof value === 'object' ? { ...value } : null;
  }

  public setBed(value: WatercourseDescriptor['bed'] | null): void {
    this.bed = value ?? null;
  }
  public setBanks(value: { wooded?: boolean } | null): void {
    this.banks = value && typeof value === 'object' ? { ...value } : null;
  }
  public setStretches(value: WatercourseStretchOverride[]): void {
    this.stretches = Array.isArray(value) ? value.map((v) => ({ ...v })) : [];
  }
  public setHazards(value: WatercourseHazard[]): void {
    this.hazards = Array.isArray(value) ? value.map((v) => ({ ...v })) : [];
  }
  public setBends(value: Array<{ at: string; name: string }>): void {
    this.bends = Array.isArray(value) ? value.map((v) => ({ ...v })) : [];
  }
  public setMeander(value: { seed?: number } | null): void {
    this.meander = value && typeof value === 'object' ? { ...value } : null;
  }

  public setPlaces(value: string[]): void {
    this.places = Array.isArray(value) ? value.filter((p) => typeof p === 'string') : [];
  }

  /* ───────────── the line as a frame (river D2) ───────────── */
  //
  // ⭐ A river stood up as a Stuff is the FRAME a moving place on it reads
  // (the kernel's `LineFrame` protocol): every answer is the catalogue's
  // compiled line, read synchronously. Before the drainage has compiled
  // once there is nothing to answer, and the protocol's refusals stand.

  private catalogue(): WatercourseCatalogue | null {
    return StuffApi.findByTemplatePath<WatercourseCatalogue>('/system/water/idea/WatercourseCatalogue') ?? null;
  }

  public override lengthKm(): number {
    return this.catalogue()?.lineOfSync(this.key)?.lengthKm() ?? 0;
  }

  public override elevationAtKm(km: number): number | null {
    return this.catalogue()?.lineOfSync(this.key)?.elevationAtKm(km) ?? null;
  }

  /**
   * The address of the ground that drains to `km` — the locality whose
   * weather stands in for the reach's catchment (the climate proxy), so a
   * patch at the headwaters is under Rejection's sky.
   */
  public override localityAddressAt(km: number): string | null {
    const reach = this.catalogue()?.reachNearSync(this.key, km) ?? null;
    const path = reach?.climateLocalityPath ?? null;
    if (!path) return null;
    const locality = StuffApi.findByTemplatePath<Idea & { getAddress?(): string | null }>(path);
    return locality?.getAddress?.() ?? null;
  }

  public override climateSiteAt(km: number): LineClimateSite | null {
    const site = this.catalogue()?.reachNearSync(this.key, km)?.site ?? null;
    if (!site) return null;
    return {
      latitude: site.latitudeDeg,
      continentality: site.continentality,
      climateOffsetK: site.offsetK,
    };
  }

  /** ⭐ Whoever is in the water within sight of `place` (D26) — the warren knows. */
  public override sightablesNear(place: unknown, eyeHeightM: number): unknown[] {
    const warren = StuffApi.findByTemplatePath<Idea & { sightablesNear(course: string, place: unknown, eye: number): unknown[] }>(
      '/system/water/idea/ReachWarren',
    );
    return warren?.sightablesNear(this.key, place, eyeHeightM) ?? [];
  }

  public override describeAt(pos: LinePositionRecord): string[] {
    const stretch = this.catalogue()?.lineOfSync(this.key)?.stretchAt(pos.km) ?? null;
    return stretch === null ? [] : [stretch.kind];
  }
}
