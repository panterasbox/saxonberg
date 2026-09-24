/**
 * Location — root for spatial containers in the world.
 *
 * Pure structural role: a Location is any Stuff that can hold other
 * Stuff but doesn't itself live inside something. Concrete kinds of
 * Location (`CartesianLocation`, `SphericalLocation`, …) extend this
 * class and layer on Visible (for descriptions), Exitable (for
 * navigation), coordinate mixins, NamedMixin (for places with proper
 * names like "Town Square"), and whatever else they need.
 *
 * Composition: `AmbientLitMixin(AdornableMixin(ContainerMixin(Stuff)))`
 *
 * Provides:
 * - contents: Set<Stuff & Containable> (host-internal storage)
 * - fixtures: Set<Stuff & Adornment> (host-internal, non-portable
 *   attached Stuff: wall sconces, ceiling lamps, BoundaryAnchors)
 * - addContainable(), removeContainable(), hasContainable()
 * - getContents()
 * - addFixture(), removeFixture(), hasFixture(), getFixtures(),
 *   getFixtureBoundaries(), getFixtureLightSources() (from AdornableMixin)
 */

import { Stuff } from './Stuff';
import { ContainerMixin } from '../spatial/Container';
import { AdornableMixin } from '../boundary/Adornable';
import { AtmosphericMixin } from '../biome/Atmospheric';
import { AddressableMixin } from '../address/Addressable';
import { AmbientLitMixin } from '../perception/AmbientLit';
import { PostRegistrationMixin } from './PostRegistration';
import { Suppressions, type MagicSuppression } from '../magic/Suppression';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { AppApi } from '../../api/app';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import type { Floor } from '../ground/Floor';
import type { FieldMeta } from '../mixin';

/**
 * ⭐ The Location's own say in what its floor is, without authoring a floor
 * row. `{ material, worked, onGrade }` decorate the default floor at mint;
 * `template` names a different row to clone instead.
 *
 * Two rungs, and the split matters: a room that just wants *cobbles, laid*
 * writes three words here (rung 2), and a room that wants **details** on
 * its floor — a worn diagonal track, a gutter you can look into — authors a
 * `Floor` row and attaches it through `adornments:` (rung 1). Neither
 * requires the other.
 */
export interface FloorSpec {
  /** A `Floor` row to clone instead of the default one. */
  template?: string;
  /** A Material template path — rung 2 of the floor's ladder. */
  material?: string;
  /** Override the derived on-grade answer. */
  onGrade?: boolean;
  /** Dressed, laid or rammed. */
  worked?: boolean;
}

/**
 * Read a dial, falling back to a literal. Module-private on purpose: a
 * `private static` here would be counted by `lint:lib-statics`, whose
 * ceiling is a ratchet, and the `WeatherLogic` shape this copies is a
 * module function too.
 */
function dialStr(key: string, fallback: string): string {
  try {
    const raw = AppApi.setting(key);
    return raw == null || raw === '' ? fallback : raw;
  } catch {
    return fallback;
  }
}

/** The numeric twin of {@link dialStr}. Same reason for being module-private. */
function dialNum(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Causes `ensureFloor` has already warned about. Runtime-only, process-wide,
 * and deliberately unbounded-but-tiny: the set of distinct failure MESSAGES
 * is a handful even in the worst case, because they name a missing template
 * rather than a room.
 */
const warnedFloorFailures = new Set<string>();

/** What {@link Location.floorDefaults} answers. */
export interface FloorDefaults {
  worked: boolean;
  materialPath: string;
}

// A Location represents *space*, not *matter* — so it is NOT `Tangible`
// (rooms have no material or mass; nothing ever read them). "Made of matter"
// is the Tangible seam (Thing / Vessel / Agent), which is also exactly the
// "can get wet" set — see lib/wetness/Wet.ts.
//
// `AmbientLitMixin` composes here because an ambient light level is a
// property of SPACE generally — "underground rooms keep 0 lumen (the
// default); outdoor rooms author a stored value", as its own docstring puts
// it. Until the husbandry build it was composed by test fixtures only, so
// `ambientIntensity` was authorable on no shipped room at all and every
// room read pitch-black. Composing it at the base is inert by default: the
// perception walk skips a zero-flux ambient, so an unauthored room reads
// exactly as it did before.
//
// ⭐⭐ `PostRegistrationMixin` composes HERE, at the base, since the ground
// build — and it had to move down rather than be added to a seventh class.
// The mixin's default `postRegister` is a **non-chaining no-op**, so a
// second composition anywhere above the base SWALLOWS the base's hook: the
// ten Location classes that used to compose it individually
// (`CartesianLocation`, `SphericalLocation`, `FurnishableRoom`, `Offstage`,
// `CircleFloor`, `Lounge`, `Bar`, `GlassAlley`, and the university's
// `Corridor` + `DormRoom`) each dropped it, and every `postRegister`
// override in the family now chains `super`. Inert by default, exactly as
// `AmbientLitMixin` above it is: a Location with nothing to do at
// post-register does `ensureFloor()` and returns.
//
// ⚠ Consequence worth knowing before touching the hook: after this, the
// ENTIRE Location tree depends on base-level `postRegister`. A hydration
// build that changes how the hook is composed or invoked has one more
// consumer, at the root of the biggest class family in the game.
const LocationBase = AddressableMixin(
  AmbientLitMixin(
    AtmosphericMixin(
      AdornableMixin(ContainerMixin(PostRegistrationMixin(Stuff))),
    ),
  ),
);

export default class Location extends LocationBase {
  static fieldMeta: FieldMeta = {
    suppressesMagic: { persistent: true },
    floor: { persistent: true, authorable: true },
    noDefaultFloor: { persistent: true, authorable: true },
  };

  /**
   * The anti-magic field this place carries, or `null` (the overwhelming
   * default). Authored in room seeds (`suppressesMagic: { all: true }` /
   * a `verbs`/`nouns` grid filter); resolved at a position by the sync
   * outward containment walk (`Suppressions.fieldAt` — the biome-chain
   * precedent), so a field on a building covers its rooms. Read at
   * cast time (veto) and by the sustained-effect reconcile (a modifier
   * goes dormant inside it). See docs/subsystems/magic.md.
   */
  protected suppressesMagic: MagicSuppression | null = null;

  public getSuppressesMagic(): MagicSuppression | null {
    return this.suppressesMagic;
  }
  public setSuppressesMagic(value: MagicSuppression | null): void {
    // Per-field invariant: Suppressions.validate throws on bad filters.
    this.suppressesMagic = Suppressions.validate(value);
  }

  // `getVolume` / `getCeilingHeight` live on AtmosphericMixin (composed
  // above) so Vessels — which also have meaningful interior volume —
  // pick them up too. Concrete Location subclasses (`CartesianLocation`,
  // `SphericalLocation`) override per their topology.

  /**
   * Effective light-receiving floor area in m², used by
   * `VisionModality.lightAt` to convert accumulated lumens to lux.
   * The base is topology-agnostic and returns 1.0 (m²); concrete
   * Location subclasses (`CartesianLocation`, `SphericalLocation`)
   * override per their cell geometry. Larger rooms read dimmer for
   * the same total flux.
   */
  public getSizeScale(): number {
    return 1.0;
  }

  /**
   * The room's **linear extent in metres** — the one honest number the
   * physical systems derive from. Light already divides by an area
   * derived from it and the atmosphere already fills a volume derived
   * from it; combat's engagement bands read it too, so a 3 m cell
   * affords only the melee tiers while an authored 20 m outdoor cell
   * affords `far` (see {@link RangeBand.maxForExtent}).
   *
   * Topology-agnostic base: `null` — "this room does not report a
   * size." Concrete subclasses override per their geometry
   * (`CartesianLocation` from its cell, `SphericalLocation` from its
   * diameter). Consumers must treat `null` conservatively rather than
   * assuming a default, because an unmeasured room cannot promise the
   * distance a ranged weapon needs.
   */
  public getLinearExtent(): number | null {
    return null;
  }

  // ───────────────────────────── the floor ──────────────────────────────

  /**
   * What this room says about its floor without authoring one. See
   * {@link FloorSpec}.
   */
  protected floor: FloorSpec | null = null;

  /**
   * ⚠ *There is no floor here* — this place is not standable.
   *
   * ⭐ **A different question from `onGrade`, and conflating the two is the
   * bug this field prevents.** `onGrade` asks *does the ground continue
   * beneath this floor*, and is derived from sky-exposure and depth. A
   * flying-only room **is sky-exposed**, so that derivation would hand it an
   * *earth* floor and let you sit down on the sky; a mid-column water band
   * **sits below datum**, so it would floor the open water when only the bed
   * has ground under it. So existence is its own field, it defaults to
   * **yes**, and the three cases that opt out are the void (shipped here),
   * mid-air and mid-water (neither exists in the game yet — the seam and its
   * test ship so the builder who arrives finds it).
   *
   * ⚠ It was documented in `default-floor.yaml`, `posture.md` and
   * `spatial.md` for two builds while **no code read it**. It does now.
   */
  protected noDefaultFloor: boolean = false;

  public getFloorSpec(): FloorSpec | null {
    return this.floor;
  }
  public setFloorSpec(value: FloorSpec | null): void {
    this.floor = value;
  }

  // ⭐ **The fabric is `AtmosphericMixin`'s**, which `Location` composes
  // — `fabric:`, `getFabricSpec()` and the `fabricDefaults()` hook all
  // arrive from there, and a subclass that knows its own construction
  // overrides the hook exactly as before. It lived here until review
  // (2026-09-24); the tell was that the mixin which READS it composes
  // inside this class, so it could only reach these three members
  // through a cast.

  public isNoDefaultFloor(): boolean {
    return this.noDefaultFloor;
  }
  public setNoDefaultFloor(value: boolean): void {
    this.noDefaultFloor = value;
  }

  /**
   * ⭐⭐ **Every Location gets a floor here**, at the one lifecycle point
   * every clone AND every `create` passes through — which is why the hook
   * moved to the base rather than being added to a seventh subclass. A
   * warren-minted Lounge room gets its floor from the same line an authored
   * room does, because `LoungeWarren.createMember` goes through
   * `StuffApi.clone` like everything else.
   *
   * @hook Chained from `PostRegistrationMixin`. A Location subclass that
   *   overrides this **must** call `await super.postRegister(context)` —
   *   the mixin's default is a non-chaining no-op, so forgetting it means
   *   the room silently has no floor. The W2 roster test is the guard.
   */
  public async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    await this.ensureFloor();
  }

  /**
   * Mint the room's floor if it has none. Idempotent, and
   * **authored-wins**: a floor already attached through `adornments:` is
   * left exactly as authored and only has its material ladder resolved.
   *
   * ⚠⚠ **This loads nothing, deliberately.** The hydration framework slate
   * is running a census-and-ratchet over `postRegister` bodies that load
   * state — its census greps for `.find(` / `findByScope` / `hydrate` /
   * `rebuildIndex` / `warm(` / `restore` / `load` — and this body must match
   * none of them. It does not: it constructs a companion object the world
   * requires, which is *structural completion*, the same act as
   * `Lounge.postRegister`'s `verifyOutboundExits()`. The material ladder,
   * which does resolve citations, is the FLOOR's method and runs lazily
   * behind `resolveUnderfoot`. If a later edit pulls a lookup into this
   * body, that ratchet's number moves and this decision is void.
   *
   * ⚠ A failure to mint is **warned, not thrown**. `postRegister` throwing
   * unregisters the half-built object, so a missing `default-floor` row —
   * a realm that does not ship the generic-objects pack — would take every
   * room in the world down with it. A room with no floor is a degradation;
   * a world that will not boot is not.
   */
  public async ensureFloor(): Promise<void> {
    if (this.noDefaultFloor) return;

    const existing = this.getFloor();
    if (existing) {
      // Authored wins. Resolve its ladder and leave everything else alone.
      if (MixinApi.isFloor(existing as unknown as Stuff)) {
        await (existing as unknown as Floor).resolveUnderfoot();
      }
      return;
    }

    const spec = this.floor;
    const path = spec?.template ?? TemplatePaths.defaultFloor;
    try {
      const minted = await StuffApi.clone<Stuff>(path);
      if (!MixinApi.isFloor(minted) || !MixinApi.isAdornment(minted)) {
        await StuffApi.destruct(minted);
        throw new Error(
          `'${path}' is not a Floor (it must compose FloorMixin and ` +
            `AdornmentMixin to be a room's ground)`,
        );
      }
      this.addFixture(minted, 'floor');
      const floor = minted as unknown as Floor;
      if (spec?.onGrade !== undefined) floor.setOnGrade(spec.onGrade);
      if (spec?.worked !== undefined) {
        floor.setWorked(spec.worked);
      } else {
        floor.setWorked(this.floorDefaults(floor.isOnGrade()).worked);
      }
      await floor.resolveUnderfoot();
    } catch (err) {
      // One warning per distinct cause, not per room: a world whose store
      // lacks the default-floor row produces the same failure for every
      // Location in it, and twenty identical lines hide the next real
      // warning rather than adding information. The first line names a
      // room so the cause is diagnosable.
      const cause = err instanceof Error ? err.message : String(err);
      if (warnedFloorFailures.has(cause)) return;
      warnedFloorFailures.add(cause);
      // ⚠⚠ `console.warn`, NOT `MudlogApi.warn` — measured, not chosen.
      // Mudlog resolves a recipient from the ambient command frame and
      // THROWS *"no recipient"* when there is none, and `postRegister`
      // runs inside the clone pipeline where there is no giver. So the
      // warning path would itself have thrown, unregistered the room, and
      // turned a floorless room into a failed clone — the exact failure
      // this catch exists to prevent. The `Avatar.reconcileMortalState`
      // and `MaturationProfile` precedent: an engine-level condition with
      // no audience goes to stderr.
      console.warn(
        `Location.ensureFloor: no floor for ` +
          `${this.getTemplatePath() ?? this.stuffId} — ${cause} ` +
          `(further rooms failing the same way are silent)`,
      );
    }
  }

  /**
   * Rung 4 of the floor's ladder — *what is a room of this kind floored
   * with, when nobody said?*
   *
   * Two dials and one rule: on grade it is the outdoor material and nobody
   * dressed it; indoors it is the indoor material and somebody laid it.
   * ⭐ Seeded literals at the call site (`wood/oak` — *boards* is the
   * census's most-claimed material by a wide margin — and `earth/loam`) so
   * the kernel works with no settings row present, the
   * `stormPuddleFreshWaterMaterialPath` precedent.
   *
   * ⚠ Takes `onGrade` rather than deriving it: the FLOOR owns that answer
   * (`FloorMixin.isOnGrade`, authored-or-derived), and a second derivation
   * here would be a second thing to keep in step. The plan's signature was
   * `floorDefaults()` returning `onGrade` too; this is the same decision
   * with the duplication removed.
   *
   * @hook Override on a Location subclass that knows its own kind — a
   *   ship's deck, a glasshouse, a cellar. None in this build needs to:
   *   the mine, the field, the wood and the cellar all reach rung 3 through
   *   their on-grade derivation, and the holodeck, the dorm and the Lounge
   *   take the indoor default.
   */
  public floorDefaults(onGrade: boolean): FloorDefaults {
    return {
      worked: !onGrade,
      materialPath: onGrade
        ? dialStr(
            AppSettingKeys.groundFloorOutdoorMaterialPath,
            '/stuff/idea/material/earth/loam',
          )
        : dialStr(
            AppSettingKeys.groundFloorIndoorMaterialPath,
            '/stuff/idea/material/wood/oak',
          ),
    };
  }

  /**
   * Detach from the owning Zone on destruct. Clears `locations`
   * membership and any coordinate-keyed indexes the zone maintains
   * (CartesianZone grid, SphericalZone focus index).
   *
   * `ExitableMixin.onDestruct` super-chains here after handling the
   * exit-side teardown. We chain to super in turn so
   * `AdornableMixin.onDestruct` (fixture teardown — wall sconces,
   * BoundaryAnchors) runs before the chain bottoms out at `Stuff`
   * (which has no `onDestruct` of its own).
   */
  public override onDestruct(): void {
    const zone = this.getZone();
    if (zone) {
      zone.removeLocation(this);
    }
    super.onDestruct();
  }
}


// Self-register as a top-level branch (the one sanctioned module-scope
// self-registration — see `Stuff._registerTopLevelBranch` for why the
// hierarchy's root invariant must populate at branch-module load, and
// `scripts/check-module-scope.ts`'s allowlist).
Stuff._registerTopLevelBranch(Location);
