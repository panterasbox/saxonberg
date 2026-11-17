/**
 * PerceiverMixin — owns the verbs of perception (`look`, `scry`).
 *
 * Sister of `Sensor` and `Visible`. The split is by responsibility:
 *
 *   - `Sensor` — receives scene output (`handleMessage`).
 *   - `Visible` — can be perceived (descriptions / keywords others
 *     bind against).
 *   - `Perceiver` — issues perception verbs against the world. The
 *     verbs render descriptions of what the perceiver finds, sending
 *     output back through the perceiver's own Sensor channel.
 *
 * Membership today (Avatar + future NPCs) overlaps Sensor's
 * membership entirely, but the conceptual split is real: a
 * passive recording device could be Sensor without Perceiver, and
 * an instrument-mediated perception surface could exist without
 * scene-receipt. Keep them separate so future divergence costs
 * nothing.
 *
 * Composition: requires `Sensor`. Composed on `Character` (so every
 * Avatar and NPC inherits the perception verbs). Verbs are
 * surfaced on the `self` bucket only — they're actor-side, not
 * target-side. `Visible` contributes no verbs at all; it's pure
 * target shape (description state, keywords). The actor's stack
 * gets `look` from being a Perceiver, then scope resolution picks
 * any reachable Visible as the target at execution time.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Sensor } from '../message/Sensor';
import type { Stuff } from '../stuff/Stuff';
import type {
  BuildingSection,
  LocalitiesSection,
  NavSectionName,
  NavSections,
  PlaceSection,
  WaysSection,
} from '@saxonberg/types';
import { NAV_SECTION_NAMES } from '@saxonberg/types';
import type { PublishedStop } from '../travel/TravelNode';
import type Exit from '../boundary/Exit';
import type Place from '../stuff/Place';
import type { Voyaging } from '../expanse/Voyaging';
import type { AnyConstructor } from '../../api/mixin';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';

/** Which sections have already warned that their read failed. */
const warnedSections = new Set<string>();

/**
 * Canonical physical-sense channel vocabulary. The Perceiver-side
 * declaration of "what channels does an actor perceive on?" — used
 * consistently across every surface that touches sense-channel
 * data:
 *
 *   - `BodyPlan.SensoryPort.modality` (anatomy: which ports a body
 *     plan instantiates).
 *   - `Detail`'s per-sense slot map keys (state authoring).
 *   - `<sense channel="X">…</sense>` MML wrapper attribute
 *     (state-multi-sense MML wrapper).
 *   - `senseStripAugmenter` filter (per-call options).
 *   - The four `requires*` verb-level validators
 *     (`requiresHearing` / `requiresSmell` / `requiresTouch` /
 *     `requiresTaste`).
 *
 * Perceiver is the actor-side surface that perceives across these
 * channels, so the vocabulary's home is here — BodyPlan declares
 * which ports a body has but uses this type to label them; Detail
 * stores the prose per channel but uses this type to key its
 * slots. ESP / alien channels (e.g. `echolocation`,
 * `electroreception`) are explicitly NOT in this v1 union; see the
 * senses subsystem doc for the rationale.
 */
export type SenseChannel =
  | 'vision'
  | 'hearing'
  | 'smell'
  | 'touch'
  | 'taste';

/**
 * Runtime equivalent of the `SenseChannel` union — used by code
 * that needs to walk all channels (`Detailed`'s `hasDetail` slot
 * scan, `applyDetails`' per-channel YAML extraction, the strip
 * augmenter's per-channel filtering). Adding a channel requires
 * touching both this constant AND the `SenseChannel` union above.
 *
 * Order matches the union: vision / hearing / smell / touch / taste.
 * Insertion order matters for `getModalities()` which dedups via
 * Set (preserves first-insertion order).
 */
export const SENSE_CHANNELS: readonly SenseChannel[] = [
  'vision',
  'hearing',
  'smell',
  'touch',
  'taste',
];

/**
 * Public shape provided by `PerceiverMixin`. v1 has no methods —
 * the mixin's value is the verb contributions and the
 * compositional marker. Methods may land later (e.g.,
 * `perceive(target)` for scripted NPCs to invoke programmatically
 * without going through the parser).
 *
 * Extends `Sensor` because Perceiver always co-composes with
 * `SensorMixin` on `Character` — the prereq is documented at the
 * type level so consumers narrowing via `MixinApi.isPerceiver`
 * also reach the Sensor surface.
 */
export interface Perceiver extends Sensor {
  /**
   * ⭐ What I perceive from here, now — the named sections of the
   * where-you-are source (navigation-server D7; all seven when `names` is
   * omitted). Each read in its own try: a read that fails leaves its
   * section ABSENT rather than a guess, and one broken subsystem never
   * blanks the rest. `{}` when I am nowhere. Without `v` — the source
   * stamps that when it sends. On the viewer because the viewer is its
   * subject (lint:object-verbs).
   */
  navigation(names?: readonly NavSectionName[]): Promise<NavSections>;

  /**
   * ⭐ I just took `craft`'s reckoning at her helm — the third `learn*`
   * beside `learnSurroundings` and `learnTimetable` (navigation-server
   * D2): what I was told, in the bracket I can state it to, goes on my
   * map. Never her true position.
   */
  learnReckoning(craft: Stuff & Voyaging, bracket: string): void;

  /**
   * ⭐⭐ **A place is being described to me — work out what I can
   * actually make out of it, and remember it.**
   *
   * Returns the exits this viewer may know about, because the
   * gate-filtered list is the same list the verb must render, and
   * computing it twice is how the two could ever disagree. A place
   * with no exits (or one that is not `Exitable`) returns `[]` and
   * still counts: a room with no way out is still somewhere you have
   * been. `occupants` is what the verb already resolved as visible
   * there — seeing a being tracks it.
   *
   * ⭐ Named `learn*` to sit beside `BeliefStore.learnIdentityOf`,
   * which is the same job for a person and predates this. **The
   * recorders are called directly**, narrowed by `MixinApi.isX` — one
   * shape for *record what you perceived*, not three.
   *
   * ⚠⚠ This was `perceivePlace`, paired with two optional `@hook`s
   * (`onPerceivedPlace`, `onReadTimetable`) that had exactly ONE
   * implementer between them. Deleting them removed a structural cast
   * from three controllers and a hook dispatcher from this file. ⭐ *A
   * hook earns its keep by having more than one implementer* —
   * `Mobile.onTraversed` does (the cartographer and
   * `RespirationMixin`), so it stays a hook; these did not.
   *
   * ⛔ And what gets recorded is **navigational**, not perceptual: *I
   * was here* and *this way leads there*. The claim's channels say so
   * (`walked` · `seen` · `searched` · `published`), and the two fields
   * that dressed it as sense data — a hardcoded `modality: 'vision'`
   * nothing read, and a `band` nothing wrote — are gone.
   *
   * ⭐⭐⭐ **`how` is the one place perception genuinely decides the
   * record, and it is why this lives on `Perceiver`.** *Non-obvious is
   * not permanently absent*: a concealed exit is filtered out of
   * `obviousExitsFor` until the viewer DISCOVERS it, and discovery is a
   * sticky per-viewer belief resolved against their `awareness`
   * competence. So **what you may write down is decided by perception,
   * even though what you write is navigation.**
   *
   * `search` passes `'searched'` — a deliberate going-over, and the
   * only observation whose ABSENCES are evidence. A glance that turns
   * up no east exit says nothing about whether one is there; a search
   * that turns up none says quite a lot. The map renders the two
   * differently because they mean different things.
   */
  learnSurroundings(
    location: Stuff,
    occupants?: readonly Stuff[],
    how?: 'seen' | 'searched',
  ): readonly Exit[];

  /**
   * ⭐ **A published timetable is being read to me** — the second way
   * to come to know a place, and the one that needs no eyes on it. An
   * empty list is a no-op, so the caller never checks.
   */
  learnTimetable(stops: readonly PublishedStop[]): void;
}

export function PerceiverMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PerceiverMixin extends Base {
    static _mixinName = 'PerceiverMixin';

    /**
     * No persistent fields. Perception is verb-shape only v1.
     */
    static fieldMeta: FieldMeta = {};

    /**
     * See {@link Perceiver.learnSurroundings}.
     *
     * The ordering is the whole evidence firewall:
     * `obviousExitsFor(viewer)` runs the perception gate FIRST, so a
     * hidden exit is **absent** from what the recorders are handed
     * rather than present-and-filtered-later. A map cannot learn about
     * an exit the viewer could not see — structural, not policed — and
     * that is guaranteed here rather than by three controllers each
     * remembering the order.
     */
    learnSurroundings(
      location: Stuff,
      occupants: readonly Stuff[] = [],
      how: 'seen' | 'searched' = 'seen',
    ): readonly Exit[] {
      const viewer = this as unknown as Stuff;
      const exits = MixinApi.isExitable(location)
        ? location.obviousExitsFor(viewer)
        : [];
      // Who you saw. First sight of an unknown opens a null-`knownAs`
      // stranger record; later sightings coalesce and advance
      // `lastSeen` rather than writing a row per sighting, and the
      // null-name write never overwrites a learned name.
      if (MixinApi.isBeliefStore(viewer)) {
        for (const occupant of occupants) {
          if (MixinApi.isOrganism(occupant)) {
            viewer.learnIdentityOf(occupant, null);
          }
        }
      }
      // Where you are and the ways out — if you keep a map at all.
      if (MixinApi.isCartographer(viewer)) {
        viewer.recordSurroundings(location, exits, how);
      }
      return exits;
    }

    /** See {@link Perceiver.navigation}. */
    async navigation(names?: readonly NavSectionName[]): Promise<NavSections> {
      const viewer = this as unknown as Stuff;
      if (!MixinApi.isContainable(viewer)) return {};
      const place = viewer.getContainer();
      if (!place) return {};
      const want = new Set<NavSectionName>(names ?? NAV_SECTION_NAMES);
      const out: NavSections = {};
      /*
       * ⚠ Each section is its own try: a read that fails leaves its
       * section ABSENT, and the screen says it does not know rather than
       * showing a guess. Warned once per section kind, never swallowed
       * silently (refuse/skip/throw).
       */
      const section = async <K extends NavSectionName>(
        name: K,
        read: () => Promise<NavSections[K] | undefined>,
      ): Promise<void> => {
        if (!want.has(name)) return;
        try {
          const value = await read();
          if (value !== undefined) out[name] = value;
        } catch (err) {
          if (!warnedSections.has(name)) {
            warnedSections.add(name);
            console.warn(`navigation: the ${name} section could not be read: ${(err as Error).message}`);
          }
        }
      };
      await section('localities', () => this.localitiesSection(place));
      await section('building', () => this.buildingSection(place));
      await section('ways', () => this.waysSection(place));
      await section('place', () => this.placeSection(place));
      return out;
    }

    /** Your Localities, outermost first, and whose ground this is. */
    private async localitiesSection(place: Stuff): Promise<LocalitiesSection> {
      const [{ AddressApi }, { GovernmentApi }] = await Promise.all([
        import('../../api/address'),
        import('../../api/government'),
      ]);
      const resolution = await AddressApi.resolveFor(place);
      const address = resolution?.address ?? null;
      // The sync chain read stands on the index the awaited `resolveFor`
      // built (`AddressApi.needs`, load-on-use W5).
      const chain = address
        ? AddressApi.coverageChainOf(address)
            .map((l) => ({ name: l.getName(), address: l.getAddress() }))
            .filter((l) => l.name.length > 0)
            .reverse()
        : [];
      // ⭐ Whose ground this is, by the one question `government` asks
      // (navigation-server S11): aboard a ship her port, then her flag.
      const jurisdiction = MixinApi.isContainer(place)
        ? (await GovernmentApi.subjectTo(place)).map((g) => ({ key: g.key, name: g.name }))
        : [];
      return { v: 0, chain, jurisdiction };
    }

    /** The building you are in — its name, for now (W5 grows it). */
    private async buildingSection(place: Stuff): Promise<BuildingSection | null> {
      // ⭐ The place is asked: a keyed room's structure is its warren's.
      const structure = place.isPlace() ? await (place as unknown as Place).structure() : null;
      return structure ? { v: 0, name: structure.getName() } : null;
    }

    /** The ways out you can perceive — a concealed exit is not here. */
    private async waysSection(place: Stuff): Promise<WaysSection> {
      const viewer = this as unknown as Stuff;
      const here = place.getZone();
      const ways = MixinApi.isExitable(place)
        ? place.obviousExitsFor(viewer).map((exit) => {
            // ⚠ A deferred way (a berth, a holding's front door) has no
            // destination until someone crosses it, and `getDestination`
            // THREW for it — `map` on the bank died with *destination not
            // materialized* (the boundary browser walk). Resolve as before,
            // and fall back to what is standing.
            let dest: Stuff | null;
            try {
              dest = exit.getDestination();
            } catch {
              dest = exit.peekDestination();
            }
            return {
              ...exit.wayRecord(),
              ...(dest ? { destination: dest.getPresentation() } : {}),
              crossesZone: !!dest && dest.getZone() !== here,
            };
          })
        : [];
      return { v: 0, ways };
    }

    /** The place you stand in: its name, your cell, the sky over it. */
    private async placeSection(place: Stuff): Promise<PlaceSection> {
      const [{ WeatherApi }, { CelestialApi }] = await Promise.all([
        import('../../api/weather'),
        import('../../api/celestial'),
      ]);
      // Lazily: a static import of Location from a mixin runs the chain
      // before it is ready (the SandboxLogic precedent).
      const { default: Location } = await import('../location/Location');
      const at = place instanceof Location ? place.getCoords() : null;
      const sample = MixinApi.isContainer(place)
        ? await WeatherApi.sampleFor(place).catch(() => undefined)
        : undefined;
      const day = await Promise.resolve(CelestialApi.isDayAt(place)).catch(() => undefined);
      return {
        v: 0,
        stuffId: place.stuffId,
        name: place.getPresentation(),
        ...(at ? { at } : {}),
        ...(sample ? { weather: sample.type, season: sample.season } : {}),
        ...(day !== undefined ? { daylight: day ? ('day' as const) : ('night' as const) } : {}),
      };
    }

    /** See {@link Perceiver.learnReckoning}. */
    learnReckoning(craft: Stuff & Voyaging, bracket: string): void {
      const viewer = this as unknown as Stuff;
      if (MixinApi.isCartographer(viewer)) viewer.recordReckoning(craft, bracket);
    }

    /** See {@link Perceiver.learnTimetable}. */
    learnTimetable(stops: readonly PublishedStop[]): void {
      if (stops.length === 0) return;
      const viewer = this as unknown as Stuff;
      if (MixinApi.isCartographer(viewer)) {
        viewer.recordTimetableRead(stops);
      }
    }

    /**
     * Verbs of perception. `self` only — the perceiver issues these.
     * No target-side contributions: `Visible` is pure target shape,
     * not a verb source. The looker has the verbs because they're
     * a Perceiver; the lookable thing supplies a description and
     * keywords.
     *
     * `find` rides here too: it's a snapshot-shaped sibling of
     * `look` (enumerate without binding focus). Discovery wiring
     * is `look`'s — perception, not focus management.
     *
     * The four single-sense verbs (`smell` / `listen` / `feel` /
     * `taste`) and the gestalt `sense` ride the same actor-side
     * bucket — they're perception verbs in the contact family,
     * gated per-verb by `requires*` sensorium validators (see
     * `lib/command/validators/`).
     */
    static commandContributions: CommandContributions = {
      self: [
        'platform/cmd/perception/look.yaml',
        // ⭐ `query`: listing a SET is its own verb — `look`
        // takes one thing (maritime revision 2′).
        'platform/cmd/perception/query.yaml',
        // ⭐ `watch`: keeping a watch on the horizon is a perceiver's act
        // (maritime R6), so a hired lookout — an NPC — can take it up;
        // the stream form refuses anybody without a client, in words.
        // It moved here from Avatar, which is a perceiver too.
        'platform/cmd/stream/watch.yaml',
        // The stream forms are two more shapes, AFTER `watch.yaml` so
        // `horizon` and `off` are tried first (controller-liquidity W7a).
        'platform/cmd/stream/watch-stream.yaml',
        'platform/cmd/stream/watch-on.yaml',
        'platform/cmd/perception/scry.yaml',
        'platform/cmd/shell/find.yaml',
        'platform/cmd/perception/smell.yaml',
        'platform/cmd/perception/listen.yaml',
        'platform/cmd/perception/feel.yaml',
        'platform/cmd/perception/sense.yaml',
        'platform/cmd/perception/assess.yaml',
        'platform/cmd/perception/search.yaml',
        'platform/cmd/perception/hide.yaml',
        'platform/cmd/perception/unhide.yaml',
        'platform/cmd/device/disarm.yaml',
        'platform/cmd/device/arm.yaml',
      ],
      peers: [],
      environment: [],
    };

    /**
     * Composition constraint: `Perceiver` requires `Sensor` to be
     * present on the same host. The perception verbs (`look` /
     * `scry`) render scenes to the perceiver's own
     * channel via `handleMessage`, which lives on `Sensor`. The
     * public-shape interface declares `Perceiver extends Sensor`
     * so the type narrowing in `MixinApi.isPerceiver` exposes the
     * Sensor surface; without runtime co-composition the narrowing
     * would lie. `MixinConstructor` doesn't carry an enforceable
     * bound here (loose by design — see `lib/mixin.ts`), so the
     * check rides on `__validateComposition__` and fires at first
     * registration.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      if (!MixinApi.hasMixin(ctor, Mixins.Sensor)) {
        throw new Error(
          `${(ctor as { name?: string }).name ?? 'class'} composes ` +
            `PerceiverMixin without SensorMixin; the perception verbs ` +
            `render scenes through the host's own Sensor channel, and ` +
            `MixinApi.isPerceiver narrows to Stuff & Perceiver (which ` +
            `extends Sensor) — runtime co-composition is required.`
        );
      }
    }
  }
  return PerceiverMixin;
}
