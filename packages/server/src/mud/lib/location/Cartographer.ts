/**
 * CartographerMixin — ⭐⭐ **I keep a map of the places I perceive.**
 *
 * What is encapsulated here, and it is one concern with three parts:
 *
 *   1. **the policy** — do I keep a map, and under whose key;
 *   2. **the conversion** — live `Stuff` into plain claims: a place's
 *      durable HANDLE, the locality address it files under, the
 *      grouping address the content declares;
 *   3. **the routing** — the three perception seams
 *      (`onPerceivedPlace`, `onReadTimetable`, `onTraversed`) turned
 *      into `NavigationApi.recordPlace` calls.
 *
 * ⚠⚠ **What is NOT here: the `map` VERB.** Reading a map is a PLAYER's
 * affordance — the document lives under `/home/<key>`, and NPCs do not
 * type — so `map.yaml` stays on `Avatar.commandContributions` beside
 * `help`/`wiki`/`press`. Writing is a capability; reading is a
 * person's. Keeping them apart is what lets an NPC guide keep a map
 * without being handed a verb it can never use.
 *
 * ⭐ **Why a mixin rather than methods on `Avatar`.** It lived on
 * `Avatar` first, and the tell that it did not belong there was a
 * private `writesMaps()` predicate re-narrowing the host set from
 * inside the class — which is this repo's own signal that the host is
 * wrong (CLAUDE.md § Host placement). The deeper sign was in the
 * documentation: *"an NPC that wants a map implements the two
 * `Perceiver` hooks"* — true, and under the old shape it would have had
 * to **reimplement the whole conversion**, because all of it was
 * private to `Avatar`. Now it composes one line.
 *
 * ⭐ And the eligibility question moved to where it is answerable:
 * `keepsMaps()` defaults to `true` and the HOST overrides it. A
 * predicate here that went looking at `shouldPersist()` or at
 * guest-ness would be this capability deciding who may have it, which
 * is the thing the extraction was for.
 *
 * ⚠ Every writer is fire-and-forget and swallows its own errors. A map
 * is a convenience: failing somebody's `look` because a document would
 * not save is the wrong trade, and these run inside a FORCED frame on
 * arrival where there is nobody to report an error to.
 *
 * Composes on anything that perceives. See
 * [docs/subsystems/location-graph.md].
 */

import { StuffApi } from '../../api/stuff';
import { NavigationApi } from '../../api/navigation';
import { AddressApi } from '../../api/address';
import { MixinApi } from '../../api/mixin';
import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { MapClaim, MapChannel } from './MapClaim';
import type { PublishedStop } from '../travel/TravelNode';
import type Exit from '../boundary/Exit';

/** The public surface of {@link CartographerMixin}. */
export interface Cartographer {
  /** Does this host keep a map at all? See the mixin's `keepsMaps`. */
  keepsMaps(): boolean;
  /** The key a claim is filed under — the person, not the body. */
  mapOwnerKey(): string;
  /** Write down what was just made out of a place. */
  recordSurroundings(
    location: Stuff,
    perceived: readonly Stuff[],
    how?: MapChannel,
  ): void;
  /** Write down the stops a public board just gave up. */
  recordTimetableRead(stops: readonly PublishedStop[]): void;
}

export function CartographerMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class CartographerMixin extends Base implements Cartographer {
    // ⚠ Widened to `string`: a pinned literal collapses the chain
    // hundreds of files away (the `_mixinName` rule).
    static _mixinName: string = 'CartographerMixin';

    /** No persistent fields. A map is a DOCUMENT, not host state. */
    static fieldMeta: FieldMeta = {};

    /**
     * ⭐ **Write down what I just made out of a place** — called by
     * {@link Perceiver.learnSurroundings}, directly, through
     * `MixinApi.isCartographer`.
     *
     * ⚠⚠ **This was an optional `@hook` on `Perceiver` and should not
     * have been.** `onPerceivedPlace` had exactly ONE implementer —
     * this class — and the generality claimed for it was a hypothetical
     * second map-keeper, which is the same use case. Worse, an optional
     * hook cannot be invoked without a structural cast, so three
     * command controllers each carried one.
     *
     * ⭐ The project already had a settled shape for *record what you
     * perceived*, used twice before this build: **the perceiver calls
     * the recorder directly** (`BeliefStore.learnIdentityOf`,
     * `PerceptionApi.recordDiscovery`). A hook was a third shape for
     * the same job. Now there is one.
     *
     * ⚠ Contrast `onTraversed` below, which STAYS a hook and deserves
     * to: `Mobile.traverse` fires it on the mover, and it has real
     * multiple implementers (`RespirationMixin` reassesses breathing on
     * it). *A hook earns its keep by having more than one implementer.*
     */
    public recordSurroundings(
      location: Stuff,
      perceived: readonly Stuff[],
      how: MapChannel = 'seen',
    ): void {
      void this.recordPerceived(location, perceived, how);
    }

    /**
     * ⭐ **Write down the stops a public board just told me about** —
     * called by {@link Perceiver.learnTimetable}. Same story as
     * `recordSurroundings`: this was `onReadTimetable`, a one-implementer
     * hook.
     */
    public recordTimetableRead(stops: readonly PublishedStop[]): void {
      void this.recordTimetable(stops);
    }

    /**
     * @hook See {@link Mobile.onTraversed} — the edge you actually
     * used. ⭐ Stays a hook, unlike the two recorders above: the mover
     * fires it from inside the move and it has other implementers.
     */
    public onTraversed(via: Exit): void {
      void this.recordTraversal(via);
    }

      /**
       * Does this host keep a map at all?
       *
       * ⭐⭐ **A map-keeper needs a durable handle for the same reason
       * the places it records do.** A map is filed under a name and
       * read back later; a host with no name that outlives it has
       * nowhere to file one, and the claims it wrote would be found by
       * whoever happens to be the next instance of its row.
       *
       * So the default is the handle as a PREDICATE — not as the key.
       * {@link mapOwnerKey} stays `getIdentityPath()`, deliberately: an
       * `Avatar` that has saved once reads a compound
       * `` `<row>#<key>` `` handle, so keying on it would silently move
       * a player's map the first time they persisted.
       *
       * What it decides, with nothing enumerated:
       *
       * - an **`Extra`** — a role, not a person, no `SingletonMixin`,
       *   no mint — answers `null` and declines. ⚠ This is the hazard
       *   it exists for: `mapOwnerKey()` falls back to the template
       *   path for an unminted host, so every sentry cloned from one
       *   row was filing into **one shared map**. Two instances of
       *   `/test/probe/sentry` probed identical owner keys.
       * - a **`Cast`** — one person per path — gets its row through the
       *   singleton rung and keeps a map.
       * - an **`Avatar`** has a minted identity, so it keeps one, and
       *   the override below still declines guests and wire bodies.
       *
       * ⭐ Still OVERRIDABLE, and still not the mixin going looking: it
       * reads one fact the host already answers about itself rather
       * than narrowing its own composers by shape.
       *
       * @hook Override to decline map-keeping, or to keep one anyway.
       */
      keepsMaps(): boolean {
        return (this as unknown as Stuff).getDurableHandle() !== null;
      }

      /**
       * The key a claim is filed under — the PERSON, not the body.
       *
       * ⭐ `getIdentityPath()`, so a body that PROJECTS somebody else
       * (a shade, and formerly the wire body) files under the person it
       * is worn by rather than under itself. `''` means *nowhere to file*
       * and is a clean decline.
       *
       * @hook Override to file somewhere other than your own identity.
       */
      mapOwnerKey(): string {
        const self = this as unknown as Stuff;
        return self.getIdentityPath() ?? '';
      }

    private async recordPerceived(
      location: Stuff,
      perceived: readonly Stuff[],
      how: MapChannel,
    ): Promise<void> {
      try {
        if (!this.keepsMaps()) return;
        const viewerKey = this.mapOwnerKey();
        if (!viewerKey) return;
        // ⭐ The HANDLE, not the template path. A place with no durable
        // handle writes NO CLAIM — a lounge satellite is a fresh clone
        // per landing, so an honest map of it is nothing rather than a
        // stale entry for a room that no longer exists.
        const place = location.getDurableHandle();
        if (!place) return;
        const locality = await this.localityAddressOf(location);
        if (!locality) return;
        const now = NavigationApi.mapNow();
        const claims: MapClaim[] = [
          {
            kind: 'place',
            place,
            label: location.getTemplatePath() ?? undefined,
            name: location.getPresentation(),
            // ⭐ What it answered to. See `MapClaim.keywords`: the
            // address names a COLLECTION and the keyword picks within
            // it, because naming every room uniquely does not work.
            keywords: this.keywordsOf(location),
            group: this.groupingAddressOf(location),
            channel: how,
            firstSeen: now,
            lastSeen: now,
            recordedBy: viewerKey,
          },
        ];
        for (const exit of perceived) {
          const dir = (exit as unknown as { getDirection?(): string })
            .getDirection?.();
          if (!dir) continue;
          const far = (
            exit as unknown as { getDestinationTemplatePath?(): string | null }
          ).getDestinationTemplatePath?.();
          claims.push({
            kind: 'edge',
            place,
            dir,
            // ⚠ The far side's handle only when it is RESIDENT. Otherwise
            // the path's leaf as a label: a map may know *there is a way
            // east* without knowing where east goes, and claiming
            // otherwise would be the map telling the player something
            // they did not learn.
            to: null,
            toLabel: far ?? null,
            channel: how,
            firstSeen: now,
            lastSeen: now,
            recordedBy: viewerKey,
          });
        }
        await NavigationApi.recordPlace(viewerKey, locality, claims);
      } catch {
        // A map is a convenience; never fail a `look` for it.
      }
    }

    private async recordTimetable(
      stops: readonly PublishedStop[],
    ): Promise<void> {
      try {
        if (!this.keepsMaps() || stops.length === 0) return;
        const viewerKey = this.mapOwnerKey();
        if (!viewerKey) return;
        const now = NavigationApi.mapNow();
        for (const stop of stops) {
          const room = StuffApi.findByIdentityPath<Stuff>(
            stop.arrivalRoomPath,
          )[0];
          // ⭐ A published stop is knowledge of a place you have NOT been,
          // so the handle may have to come from the row: an unloaded
          // arrival room still answers for its own path, which is what a
          // singleton place's handle is.
          const place = room?.getDurableHandle() ?? stop.arrivalRoomPath;
          const locality = room
            ? await this.localityAddressOf(room)
            : await this.localityAddressOfPath(stop.arrivalRoomPath);
          if (!locality) continue;
          await NavigationApi.recordPlace(viewerKey, locality, [
            {
              kind: 'place',
              place,
              label: stop.arrivalRoomPath,
              name: stop.label,
              channel: 'published',
              firstSeen: now,
              lastSeen: now,
              recordedBy: viewerKey,
            },
          ]);
        }
      } catch {
        // Reading a board must not fail because a map would not save.
      }
    }

    private async recordTraversal(via: Exit): Promise<void> {
      try {
        if (!this.keepsMaps()) return;
        const viewerKey = this.mapOwnerKey();
        if (!viewerKey) return;
        const source = via.getSource() as unknown as Stuff;
        const from = source?.getDurableHandle();
        if (!from) return;
        const locality = await this.localityAddressOf(source);
        if (!locality) return;
        let to: string | null = null;
        try {
          to =
            (via.getDestination() as unknown as Stuff)?.getDurableHandle() ??
            null;
        } catch {
          to = null; // not loaded; the edge is still knowledge
        }
        const now = NavigationApi.mapNow();
        await NavigationApi.recordPlace(viewerKey, locality, [
          {
            kind: 'edge',
            place: from,
            dir: via.getDirection(),
            to,
            toLabel: via.getDestinationTemplatePath(),
            // ⭐⭐ `walked`, and this line used to read `perception` with
            // a comment arguing that *"you walked it, which is the
            // strongest form of having seen it."* You learn the hall is
            // north by GOING north; the knowledge is navigational and
            // the channel says so now.
            channel: 'walked',
            // ⭐⭐ **You SAW that it was a ford.** You were standing at
            // the exit, so anything the exit says about ITSELF is
            // earned — the Cartographer's standing rule — and a plan
            // over your own map can then carry *this way is not always
            // passable* as a stated assumption rather than quietly
            // routing you over a crossing that disappears.
            //
            // ⚠⚠ **And deliberately NO `minutes` beside it.** An
            // earlier draft recorded the duration on the same
            // argument — you were at the exit, you could see how far
            // it was — and the lens pass killed it: ordinary movement
            // is **instantaneous and free** by design, so a walker who
            // crossed in zero game time **did not learn how long the
            // way takes**. Recording `edgeMinutes` from a free walk
            // would write a number the world never charged, and a
            // later plan would quote it back as a cost. A map plan
            // costs in LEGS, which is what a pedestrian is answered in
            // anyway.
            ...(via.isConditional() ? { conditional: true } : {}),
            firstSeen: now,
            lastSeen: now,
            recordedBy: viewerKey,
          },
        ]);
      } catch {
        // Never fail a traverse for a map.
      }
    }

    /** The finest locality address covering a live place, or `''`. */
    private async localityAddressOf(place: Stuff): Promise<string> {
      try {
        const locality = await AddressApi.resolveLocalityFor(
          place as unknown as Stuff & Container,
        );
        return locality?.getAddress() ?? '';
      } catch {
        return '';
      }
    }

    /** The same, for a place that is not loaded — by its path's address. */
    private async localityAddressOfPath(path: string): Promise<string> {
      try {
        const live = StuffApi.findByIdentityPath<Stuff>(path)[0];
        return live ? await this.localityAddressOf(live) : '';
      } catch {
        return '';
      }
    }

    /**
     * ⭐ The GROUPING key — the `_address` the content declares, when it
     * declares one. Never display chrome and never an identity: it is
     * what lets a map read Duncan Hall's four rooms as *Duncan Hall*
     * rather than as four unrelated places, and it groups by what the
     * content already says rather than by anything new.
     */
    /**
     * The targeting tokens a place answers to, banked at perception.
     *
     * ⚠ Read through `Perceptible`, which is the same surface MQL's
     * scope walk pools — so what the map remembers you could call it
     * is what you could actually have called it, standing there.
     */
    private keywordsOf(place: Stuff): string[] | undefined {
      if (!MixinApi.isPerceptible(place)) return undefined;
      const kws = place.getKeywords();
      return kws.length > 0 ? [...kws] : undefined;
    }

    private groupingAddressOf(place: Stuff): string | undefined {
      const declared = (
        place as unknown as { getDeclaredAddress?(): string | null }
      ).getDeclaredAddress?.();
      return declared && declared.length > 0 ? declared : undefined;
    }
  };
}
