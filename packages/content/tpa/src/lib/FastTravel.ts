/**
 * FastTravelMixin — a node in the fast-travel network (a TPA terminal).
 *
 * A node is a public-room fixture (a Thing) that other nodes route to. It
 * owns: a **directionality** (arrival / departure / both), a directed set of
 * **routes** to other nodes (each a destination node's singleton path plus an
 * optional per-route world-clock **timetable**), a **currently-selected
 * destination** (state), the advance policy (manual / scheduled / cycle), a
 * future-`status` seam, and `getArrivalRoom()` (where travellers land).
 *
 * Every read of a destination is off the **live destination node**
 * (`StuffApi.singleton(route.ref)`), never off template data — the node is its
 * own source of truth. The network cascade-loads from a single boot-manifest
 * root: `armNetwork()` resolves each route's destination to a live singleton,
 * which cascades. A node's network identity is simply its own singleton path.
 *
 * ## Where it lives, and why the name did not change
 *
 * The pack's own substrate (`/system/tpa/lib/`), never the kernel's:
 * teleportation as a *utility* is this pack's, and the kernel that
 * hosts it must be able to boot with no teleport verb at all. A pack
 * cannot add to the kernel `Mixins` registry, so narrowing goes through
 * the exported {@link FAST_TRAVEL_MIXIN} name and
 * `MixinApi.isActive(x, FAST_TRAVEL_MIXIN)` — the `WORKING_MIXIN`
 * precedent.
 *
 * ⭐ The NAME stays `FastTravel` (TPA reform P5a). `SurveyedMixin` and
 * `TeleportNodeMixin` were considered and declined: everyone knows what
 * fast travel is, and the house convention for a mixin name is
 * **mechanical, not diegetic** — `ContainerMixin`, `SlottedMixin`,
 * `PostureMixin` are none of them words in the fiction. Renaming for
 * diegetic honesty would push *against* the convention while appearing
 * to tidy it. (`TravelNetwork` is the more honest alternative if this
 * is ever revisited.) Content calls it the Teleport Authority.
 *
 * The mixin supplies state/behaviour; the `teleport` / `register` verbs
 * are commands gated per-fork — it does not "grant a verb".
 */

import type { MixinConstructor, FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Sensor } from "@saxonberg/server/mud/lib/message/Sensor";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";
import type { CronPattern, ClockHandle } from "@saxonberg/server/mud/api/worldclock";
import { WorldClockApi } from "@saxonberg/server/mud/api/worldclock";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { AddressApi } from "@saxonberg/server/mud/api/address";
import { MqlApi } from "@saxonberg/server/mud/api/mql";
import { MagicApi } from "@saxonberg/server/mud/api/magic";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { EmploymentApi } from "@saxonberg/server/mud/api/employment";
import { Currency, BankingApi, Money } from "@saxonberg/server/mud/api/banking";
import type { Charge } from "@saxonberg/server/mud/api/banking";
import { AppSettingKeys } from "@saxonberg/server/mud/lib/config/AppSettings";
import {
  SUPPLY_STATE_GLOSS,
  type SupplyState,
} from "@saxonberg/server/mud/lib/supply/SupplyState";
import type {
  TravelRideOutcome,
  TravelRideSpec,
} from "@saxonberg/server/mud/lib/travel/TravelNode";
import type { CommandGiver } from "@saxonberg/server/mud/lib/command/CommandGiver";
import type { Charged } from "@saxonberg/server/mud/lib/magic/Charged";
import {
  MANA_POWERED_MIXIN,
  type ManaPowered,
} from "@saxonberg/content-arcana/src/lib/ManaPowered";
import type { AetherHosted } from "@saxonberg/server/mud/lib/augmentation/AetherHosted";
import type { CredentialWallet } from "@saxonberg/server/mud/lib/credential/CredentialWallet";

/**
 * The mixin marker, for `MixinApi.isActive` narrowing. A pack cannot add
 * to the kernel's `Mixins` registry, so it exports the name instead.
 */
export const FAST_TRAVEL_MIXIN = "FastTravelMixin";

/**
 * A node that also RUNS ON SOMETHING — the shape the mana leg needs.
 *
 * ⚠ Narrowed structurally rather than assumed: a `FastTravelMixin`
 * composer that is not mana-powered is a perfectly good node (a
 * hand-authored gate, a fixture in a suite) and simply skips the mana
 * leg. The mechanism is the pack's; running on mana is a choice a row
 * makes.
 */
type PoweredGate = Stuff &
  FastTravel &
  ManaPowered &
  Charged & {
    noteRideCost(tau: number): SupplyState | null;
    manaRatePerTau(): number;
  };

/** A refusal, as the `TravelNode` shape returns them. */
function nil(refusal: string, reason: string): TravelRideOutcome {
  return { ok: false, refusal, reason };
}

export type Directionality = "arrival" | "departure" | "both";
export type AdvanceMode = "manual" | "scheduled" | "cycle";

/**
 * One directed edge: a destination **node** (by singleton path) plus its
 * per-route timetable (game time-of-day departures; empty for manual/cycle).
 * Not a module — the mixin's own data shape.
 */
export interface TravelRoute {
  ref: string;
  departures: CronPattern[];
  /** The author-set fare in minor units (0 = free). */
  fee: number;
}

/** Raw seed shape for a route, normalised by {@link applyRoutes}. */
interface RawRoute {
  to?: string;
  warren?: string;
  departures?: Array<string | CronPattern>;
  fee?: number;
}

/** Public shape provided by FastTravelMixin. */
export interface FastTravel {
  getDirectionality(): Directionality;
  setDirectionality(value: Directionality): void;
  isDeparture(): boolean;
  isArrival(): boolean;

  getRoutes(): ReadonlyMap<string, TravelRoute>;
  hasRoute(ref: string): boolean;

  getSelectedDestination(): string | null;
  setSelectedDestination(ref: string): void;
  selectDeparture(ref: string): void;
  advanceSelection(): void;

  resolveRouteByKeyword(
    keyword: string,
  ): Promise<{ route?: TravelRoute; ambiguous?: boolean }>;

  getArrivalRoom(): Promise<Stuff & Container>;
  getDestinationLabel(): Promise<string>;
  renderDepartures(viewer: Stuff & Sensor): Promise<string>;

  /**
   * **The whole ride from this node** — the `TravelNode` shape the
   * kernel's `teleport` verb calls.
   *
   * ⭐⭐ Everything the NETWORK decides lives here, with the pack: the
   * instrument gate, identity-bound clearance, direction, the gate's
   * own condition, the mana leg and the fare. The kernel's verb knows
   * none of it — it finds something answering this shape and asks.
   * That is what lets a privileged person teleport with no network
   * installed at all, and a network ship its own rules without a
   * kernel MR.
   */
  ride(traveller: Stuff, spec: TravelRideSpec): Promise<TravelRideOutcome>;

  armNetwork(): Promise<void>;
  armTimetable(): void;
  disarmTimetable(): void;

  getStatus(): string;
  setStatus(value: string): void;

  getBoardLabel(): string | null;
  setBoardLabel(value: string | null): void;

  getSurcharge(): number;
  setSurcharge(value: number): void;
}

/** "11:00" → { hour: 11, minute: 0 }; pass-through for an object pattern. */
function parseCron(entry: string | CronPattern): CronPattern {
  if (typeof entry !== "string") return entry;
  const m = /^(\d{1,2}):(\d{2})$/.exec(entry.trim());
  if (!m) throw new TypeError(`bad departure time '${entry}' (want HH:MM)`);
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/** A CronPattern as a short clock label, e.g. "11:00" or "Mon 09:00". */
function formatCron(p: CronPattern): string {
  const hh = String(p.hour ?? 0).padStart(2, "0");
  const mm = String(p.minute ?? 0).padStart(2, "0");
  const day = p.weekday != null ? `${p.weekday} ` : "";
  return `${day}${hh}:${mm}`;
}

export function FastTravelMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class FastTravelMixin extends Base implements FastTravel {
    static _mixinName = FAST_TRAVEL_MIXIN;

    /** `routes` is authored content applied once at hydrate (Phase 2). */
    static fieldMeta: FieldMeta = {
      directionality: { persistent: true, authorable: true },
      selectedDestinationRef: { persistent: true, runtimeState: true },
      status: { persistent: true, runtimeState: true },
      boardLabel: { persistent: true, authorable: true },
      advanceMode: { persistent: true, authorable: true },
      cycleInterval: { persistent: true, authorable: true },
      surcharge: { persistent: true, authorable: true },
      routes: { instruction: true, authorable: true },
    };

    /**
     * The node's own verbs — they surface only for actors at one.
     *
     * ⚠ `register` only. `teleport` is the KERNEL's verb and is
     * afforded by `MobileMixin` — a node adds the ride and the board to
     * a verb everyone already has; it does not GRANT the verb. That is
     * the whole correction: you must not need a travel network
     * installed in order to teleport.
     */
    static commandContributions: CommandContributions = {
      peers: ["system/tpa/cmd/movement/register.yaml"],
      environment: ["system/tpa/cmd/movement/register.yaml"],
    };

    /** Which travel direction this terminal permits. */
    private _directionality: Directionality = "both";
    private _selectedDestinationRef: string | null = null;
    private _status = "operational";
    /**
     * The name other terminals' boards show for this node, when the
     * covering-Locality walk cannot produce it. Authored; `null` falls
     * back to the walk. ⭐ This is what retired the one-string
     * `LoungeTerminal` subclass (TPA reform P6): the lounge's arrival
     * room is a Warren host, a runtime role with no stable address, so
     * the walk lands nowhere — and a subclass per bespoke label is the
     * wrong shape for a piece of authored prose.
     */
    private _boardLabel: string | null = null;
    /**
     * The node's **arrival surcharge** (minor units; 0 = none): a charge this
     * terminal imposes just for *using it as a destination*, added on top of
     * the route's own `fee`. Collected by the Business operating THIS node's
     * arrival room (the destination operator), the mirror of the route fee's
     * departure attribution. Optional, like the fee.
     */
    private _surcharge = 0;
    private _advanceMode: AdvanceMode = "manual";
    private _cycleInterval: string | null = null;
    private _routes = new Map<string, TravelRoute>();
    private _clockHandles: ClockHandle[] = [];

    /* ── directionality ─────────────────────────────────────────── */

    getDirectionality(): Directionality {
      return this._directionality;
    }
    setDirectionality(value: Directionality): void {
      if (value !== "arrival" && value !== "departure" && value !== "both") {
        throw new TypeError(`bad directionality '${value}'`);
      }
      this._directionality = value;
    }
    isDeparture(): boolean {
      return (
        this._directionality === "departure" || this._directionality === "both"
      );
    }
    isArrival(): boolean {
      return (
        this._directionality === "arrival" || this._directionality === "both"
      );
    }

    /* ── status seam (inert in v1) ──────────────────────────────── */

    getStatus(): string {
      return this._status;
    }
    setStatus(value: string): void {
      this._status = value;
    }

    /* ── board label (authored override for the Locality walk) ──── */

    getBoardLabel(): string | null {
      return this._boardLabel;
    }
    setBoardLabel(value: string | null): void {
      this._boardLabel = value === null || value === undefined ? null : String(value);
    }

    get boardLabel(): string | null {
      return this._boardLabel;
    }
    set boardLabel(value: string | null) {
      this.setBoardLabel(value);
    }

    /* ── arrival surcharge (destination-imposed, on top of the fee) ── */

    getSurcharge(): number {
      return this._surcharge;
    }
    setSurcharge(value: number): void {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        throw new TypeError(`bad surcharge '${value}' (want a non-negative number)`);
      }
      this._surcharge = Math.floor(n);
    }

    /* ── advance policy ─────────────────────────────────────────── */

    get advanceMode(): AdvanceMode {
      return this._advanceMode;
    }
    set advanceMode(value: AdvanceMode) {
      this._advanceMode = value;
    }
    get cycleInterval(): string | null {
      return this._cycleInterval;
    }
    set cycleInterval(value: string | null) {
      this._cycleInterval = value;
    }

    /* ── routes (instruction field) ─────────────────────────────── */

    /**
     * @hook Invoked by the `Hydrator`'s Phase-2 instruction dispatch
     *   from a template's `routes` field. **Instruction applier** —
     *   consumes the declaration to (re)build the runtime route table;
     *   no paired getter (not a property); idempotent across re-clone.
     */
    applyRoutes(raw: RawRoute[]): void {
      this._routes.clear();
      for (const r of raw ?? []) {
        const ref = r.to ?? r.warren;
        if (!ref) throw new TypeError("route needs a `to` or `warren` path");
        const departures = (r.departures ?? []).map(parseCron);
        this._routes.set(ref, { ref, departures, fee: r.fee ?? 0 });
      }
    }
    getRoutes(): ReadonlyMap<string, TravelRoute> {
      return this._routes;
    }
    hasRoute(ref: string): boolean {
      return this._routes.has(ref);
    }

    /* ── selection ──────────────────────────────────────────────── */

    get selectedDestinationRef(): string | null {
      if (this._selectedDestinationRef) return this._selectedDestinationRef;
      const it = this._routes.keys().next();
      return it.done ? null : it.value;
    }
    set selectedDestinationRef(ref: string | null) {
      this._selectedDestinationRef = ref;
    }
    getSelectedDestination(): string | null {
      return this.selectedDestinationRef;
    }
    setSelectedDestination(ref: string): void {
      this._selectedDestinationRef = ref;
    }
    /** Flip the selection (e.g. a fired cron departure). */
    selectDeparture(ref: string): void {
      this._selectedDestinationRef = ref;
    }
    /** Cycle to the next route (cycle mode). No-op with no routes. */
    advanceSelection(): void {
      const refs = [...this._routes.keys()];
      if (refs.length === 0) return;
      const cur = this.selectedDestinationRef;
      const i = cur ? refs.indexOf(cur) : -1;
      this._selectedDestinationRef = refs[(i + 1) % refs.length] ?? null;
    }

    /* ── keyword targeting (live destination reads) ─────────────── */

    async resolveRouteByKeyword(
      keyword: string,
    ): Promise<{ route?: TravelRoute; ambiguous?: boolean }> {
      const kw = keyword.trim().toLowerCase();
      const hits: TravelRoute[] = [];
      for (const route of this._routes.values()) {
        const node = await StuffApi.singleton<Stuff>(route.ref);
        if (hasKeyword(node, kw)) hits.push(route);
      }
      if (hits.length === 0) return {};
      if (hits.length > 1) return { ambiguous: true };
      return { route: hits[0] };
    }

    /* ── arrival room (live read; lounge node overrides) ────────── */

    async getArrivalRoom(): Promise<Stuff & Container> {
      const self = this as unknown as Stuff;
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (!room) {
        throw new Error(
          `fast-travel node ${self.stuffId} has no container to arrive in`,
        );
      }
      return room;
    }

    /* ── destination naming (covering Locality, D13) ─────────────── */

    /**
     * The name a departures board shows for *this* node as a destination.
     * In order: the authored {@link FastTravel.getBoardLabel} when set,
     * then its **covering Locality**'s name (the general place it
     * represents), then the node's own presentation (the single-room /
     * unlocalized case). Display-only — keyword targeting stays on the
     * terminal's authored `keywords`.
     */
    async getDestinationLabel(): Promise<string> {
      if (this._boardLabel) return this._boardLabel;
      const self = this as unknown as Stuff;
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (room && MixinApi.isContainer(room)) {
        const locality = await AddressApi.resolveLocalityFor(room);
        if (locality) return locality.getName();
      }
      return MixinApi.isPerceptible(self) ? self.getPresentation() : "a stop";
    }

    /* ── the local departures board (live, viewer-aware) ────────── */

    async renderDepartures(viewer: Stuff & Sensor): Promise<string> {
      // "— not yet registered" reflects IDENTITY clearance (the viewer's own
      // aether-hosted wallet — a single-object read on the viewer's own
      // hosted updates), not whatever card they happen to carry.
      const holder = MixinApi.isAether(viewer)
        ? (viewer
            .getHostedUpdates()
            .find(
              (s): s is Stuff & AetherHosted & CredentialWallet =>
                MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
            ) ?? null)
        : null;
      const cred = holder?.getCredential("travel");
      const selected = this.selectedDestinationRef;
      const lines: string[] = [
        `Departures — ${(this as unknown as Stuff).getPresentation()}:`,
      ];
      if (this._routes.size === 0) {
        lines.push("  (no destinations)");
        return lines.join("\n");
      }
      for (const route of this._routes.values()) {
        const node = await StuffApi.singleton<Stuff & FastTravel & Sensor>(
          route.ref,
        );
        const name = await node.getDestinationLabel();
        const active = route.ref === selected ? " «now boarding»" : "";
        const reg =
          cred && !cred.isRegistered(route.ref) ? " — not yet registered" : "";
        // The board shows the TOTAL the traveller pays: the route fee plus the
        // destination's own arrival surcharge (⊙total; broken out when both).
        const surcharge = node.getSurcharge();
        const total = route.fee + surcharge;
        const fare =
          total > 0
            ? surcharge > 0 && route.fee > 0
              ? ` ⊙${total} (${route.fee}+${surcharge})`
              : ` ⊙${total}`
            : "";
        const times =
          route.departures.length > 0
            ? `  [${route.departures.map(formatCron).join(", ")}]`
            : "";
        lines.push(`  ${name}${fare}${active}${reg}${times}`);
      }
      // ⚠ **Which way THIS viewer's ride goes** (D8c). A sticky
      // preference that is invisible at the moment it applies is the
      // footgun; the board is already viewer-aware — it annotates each
      // route against your own credential — so the power line rides the
      // same per-viewer payload with no new plumbing, and the
      // convenience stops being a trap.
      const self =
        MixinApi.isEnvironment(viewer) &&
        viewer.getOwnSetting<string>("tpa.power") === "self";
      lines.push(
        self
          ? "You are set to channel your own reserve (`--meter` for this ride only)."
          : "Mana is on the gate's meter (`--channel` to bring your own).",
      );
      lines.push("Travel with `teleport <destination>`.");
      return lines.join("\n");
    }

    /* ── the ride (the `TravelNode` shape) ──────────────────────── */

    /**
     * ⭐⭐ **Everything the NETWORK decides lives here**, with the pack:
     * the instrument gate, identity-bound clearance, direction, the
     * gate's own condition, the mana leg, the fare. The kernel's
     * `teleport` verb knows none of it — it finds something answering
     * the `TravelNode` shape and asks.
     *
     * That split is what lets a privileged person teleport with no
     * network installed at all (the verb's other two forks are kernel),
     * and lets a network ship its own rules with no kernel MR.
     *
     * ⚠ The ONE reason the caller falls through on is
     * `route-not-found`: the network not going somewhere is not a
     * refusal of the traveller, and a caster standing at a gate is not
     * worse off than one standing in a field.
     */
    async ride(
      traveller: Stuff,
      spec: TravelRideSpec,
    ): Promise<TravelRideOutcome> {
      // Everything below is a RIDE, and a ride is gated.

      // Instrument gate: "do you have the means to use the TPA at all?" — any
      // reachable travel holder satisfies it (a carried card OR the born-with
      // implant), so onboarding and the un-implanted are never stranded.
      const instrument =
        MqlApi.resolveMany("reachable", {
          commandGiver: traveller as Stuff & CommandGiver,
          scope: "reachable",
        }).stuff.find(
          (s): s is Stuff & CredentialWallet =>
            MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
        ) ?? null;
      if (!instrument) {
        return nil("you have no Teleport Authority credential",
          "no-credential",
        );
      }
      // Clearance is read off IDENTITY, never the carried instrument: the
      // actor's own aether-hosted wallet (a single-object read on the traveller's
      // own hosted updates). A loaded card handed to another player confers no
      // clearance. When the actor hosts no wallet (un-attuned, card-only) the
      // clearance store is the born-with floor only.
      const identity = MixinApi.isAether(traveller)
        ? (traveller
            .getHostedUpdates()
            .find(
              (s): s is Stuff & AetherHosted & CredentialWallet =>
                MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
            ) ?? null)
        : null;
      const cred = identity?.getCredential("travel") ?? null;

      if (!this.isDeparture()) {
        return nil("this terminal is for arrivals only",
          "not-departure",
        );
      }

      const gate = MixinApi.isActive(this as unknown as Stuff, MANA_POWERED_MIXIN)
        ? (this as unknown as PoweredGate)
        : null;

      if (this.getStatus() !== "operational") {
        // ⭐ Name the CAUSE when there is one. `getStatus()` derives from
        // `supplyState()`, so a gate that is out of service is out of
        // service for a reason expressible in the shipped six words — and
        // the six words name the shape of the fix. A generic "no
        // departures board here today" was the old inert-`status` era's
        // wording, and it told a traveller nothing.
        const supply = gate?.supplyState() ?? null;
        return nil(supply
            ? `this gate is out of service — ${SUPPLY_STATE_GLOSS[supply]}`
            : "this gate is out of service — no departures board here today",
          supply === "dry" ? "gate-dry" : "out-of-service",
        );
      }

      // The keyword picks the route (a raw token, matched locally against
      // this node's routes — NOT the MQL world resolution).
      const res = await this.resolveRouteByKeyword(spec.keyword);
      if (res.ambiguous) {
        return nil(`several routes match '${spec.keyword}' — be more specific`,
          "ambiguous",
        );
      }
      if (!res.route) {
        // ⭐ The network does not go there — but you might. `route-not-found`
        // is the ONE reason the kernel's verb falls THROUGH to the spell
        // on: the node is a convenience, not a permission, and a caster
        // standing at a gate is not worse off than one in a field.
        return nil(
          `no route here goes to '${spec.keyword}'`,
          "route-not-found",
        );
      }
      this.setSelectedDestination(res.route.ref);
      const ref = res.route.ref;

      // A null clearance store (un-attuned actor with no identity wallet) is
      // empty clearance → not-registered, exactly as an unregistered this.
      if (!cred || !cred.isRegistered(ref)) {
        return nil("you haven't registered that destination — reach it another way and `register` first",
          "not-registered",
        );
      }

      const destNode = await StuffApi.singleton<Stuff & FastTravel>(ref);
      const arrivalRoom = await destNode.getArrivalRoom();

      if (!MixinApi.isMobile(traveller) || !MixinApi.isContainable(traveller)) {
        return nil("you can't travel", "immobile");
      }

    /* ── the mana leg (D8) ────────────────────────────────────────
       *
       * ⭐⭐ **The ride is not a cast.** It issues no `prepareCast` and no
       * `resolveCast`: it QUOTES `MagicApi.relocationCost`, draws that
       * many τ off the terminal, settles the money, and moves the
       * traveller with `Mobile.teleport`. That is D10's *"the TPA is a
       * utility selling a capability its customers do not have"*
       * expressed structurally — a ride through the cast pipeline would
       * inherit the band gate, and the network's entire customer base
       * would be locked out of the network.
       *
       * The two paths share the COST FUNCTION, not the pipeline.
       */
      const powered = await this.resolvePower(spec, traveller);
      let costTau = 0;

      if (gate) {
        costTau = await MagicApi.relocationCost({
          traveller: traveller,
          to: arrivalRoom,
        });

        // ⚠ The arming floor first, and it refuses a BYO ride TOO
        // (AC13a). Below its floor the gate is not a gate any more: there
        // is nothing for the mana to arrive INTO, so offering to bring
        // your own is not the fix. `dry` is the honest word.
        if (!gate.isArmed()) {
          return nil("this gate is dark — there is not enough left in it to hold the " +
              "working open at all",
            "gate-dry",
          );
        }

        const state = gate.noteRideCost(costTau);
        if (state && !powered) {
          // ⭐ `overdrawn` here is a RELATIONSHIP, not a property: the
          // same gate will happily run a cheaper hop, which is what
          // AC13b asserts. So the refusal names the RIDE, never the gate.
          return nil(`this gate cannot cover that hop — ${SUPPLY_STATE_GLOSS[state]}. ` +
              `A shorter one, a cell in its bay, or channel your own.`,
            state === "overdrawn" ? "overdrawn" : "out-of-service",
          );
        }

        if (powered) {
          // BYO. ⭐ NO spell-knowledge gate: fuel is not casting (D8), so
          // this calls `chargeFrom` directly rather than going through
          // `recharge`, which additionally requires knowing `transfer`.
          // `chargeFrom` already refuses a non-caster (AC12's negative
          // half, with nothing written here) and already runs through a
          // real coupling with real losses — and it finds its conduit in
          // the TERMINAL, because a brass pillar composes `ConduitMixin`.
          const deficit = Math.max(0, costTau - gate.getStoredTau());
          if (deficit > 0) {
            const transfer = await gate.chargeFrom(traveller, deficit);
            if (transfer.refusal) {
              return nil(transfer.refusal, "cannot-channel");
            }
            if (gate.getStoredTau() < costTau) {
              return nil("you pour what you have into it, and it is not enough",
                "insufficient-mana",
              );
            }
          }
        }

        if (!(await gate.draw(costTau))) {
          const why = gate.stateForDraw(costTau);
          return nil(why
              ? `the gate will not run — ${SUPPLY_STATE_GLOSS[why]}`
              : "the gate will not run",
            "gate-cannot-draw",
          );
        }
      }

      // Paid routes settle the fare BEFORE travelling (insufficient funds
      // refuses without moving). The total is the route's `fee` (the departure
      // charge), the destination node's own arrival `surcharge`, and — new
      // with the reform — the MANA CHARGE the departure operator resells
      // its own supply at. A fully free trip skips settlement.
      const fee = this.getRoutes().get(ref)?.fee ?? 0;
      const surcharge = destNode.getSurcharge();
      // ⭐ Zero when the traveller brought their own: you cannot be
      // charged for mana the operator did not buy. That is the whole of
      // AC11 — the same ride, two prices, and the difference is a
      // physical fact about who supplied the energy.
      const manaCharge =
        gate && !powered ? Math.ceil(costTau * gate.manaRatePerTau()) : 0;
      if (fee > 0 || surcharge > 0 || manaCharge > 0) {
        const declined = await this.settleFare(
          fee,
          surcharge,
          manaCharge,
          destNode,
        );
        if (declined) return declined;
      }

      traveller.teleport(arrivalRoom);
      return { ok: true };
    }

    /**
     * **Whose mana pays** — the shipped three-tier chain, not a
     * hand-rolled `resolveSetting(...) ?? 'terminal'` (the exact
     * antipattern CLAUDE.md names against `LocomotionApi.defaultModeFor`):
     *
     * ```
     * flag (--channel | --meter)  →  actor setting `tpa.power`  →  terminal
     * ```
     *
     * Returns `true` when the TRAVELLER powers the hop.
     */
      private async resolvePower(
      spec: TravelRideSpec,
      traveller: Stuff,
    ): Promise<boolean> {
      if (spec.channel) return true;
      if (spec.meter) return false;
      const setting = MixinApi.isEnvironment(traveller)
        ? traveller.getOwnSetting<string>("tpa.power")
        : undefined;
      return setting === "self";
      }

    /**
     * Settle a paid trip — `total = fee + surcharge`, both optional — split
     * across up to three operating budgets, all resolved **un-spoofably** (never
     * a caller parameter), and conserved:
     *
     *  - **`fee`** (the route's departure charge) → the Business operating the
     *    **departure terminal** (`ensureOperatorAt(node)` — keyed on the fixture,
     *    not the room, so two venues sharing a room each resolve their own
     *    operator; stands the Business up lazily if it isn't live), which keeps
     *    `fee − networkFee`;
     *  - the TPA **network fee** (`min(fee, base + floor(fee × rate))`) → the
     *    global TPA operating budget (levied on the ride, i.e. the `fee` only);
     *  - **`surcharge`** (the destination node's own arrival charge) → the
     *    Business operating the **destination terminal**, the mirror of the fee's
     *    departure attribution — again fixture-keyed.
     *
     * All un-spoofable (resolved from the fixtures, never a caller token). A
     * `fee > 0` with no departure operator, or a `surcharge > 0` with no
     * destination operator, is an authoring error → refuse. Tries
     * credential, then cash — both split identically (cash via the cash bridge,
     * D12). Returns false (and refuses, without moving the traveller) on
     * no-operator / insufficient funds.
     */
    private async settleFare(
      fee: number,
      surcharge: number,
      manaCharge: number,
      destNode: Stuff & FastTravel,
    ): Promise<TravelRideOutcome | null> {
      // Departure operator (collects the base fare) — required only when fee>0.
      // Keyed on the departure TERMINAL (the fixture), stood up lazily if needed.
      let cityBudgetAccount: string | null = null;
      if (fee > 0) {
        const here = (this as unknown as Stuff).getTemplatePath();
        const operator = here ? await EmploymentApi.ensureOperatorAt(here) : null;
        if (!operator) {
          return nil("this gate has no operator to collect the fare", "no-operator");
        }
        try {
          // Custody is the operator Business's authored banksAt.
          cityBudgetAccount = await EmploymentApi.operatingAccountOf(operator);
        } catch {
          return nil("the fare can't be collected here", "no-operator");
        }
      }

      // Destination operator (collects the surcharge) — required only when
      // surcharge>0. Keyed on the destination TERMINAL (the fixture), never a token.
      let destOperatorAccount: string | null = null;
      if (surcharge > 0) {
        const destHere = (destNode as unknown as Stuff).getTemplatePath();
        const destOperator = destHere
          ? await EmploymentApi.ensureOperatorAt(destHere)
          : null;
        if (!destOperator) {
          return nil("this destination has no operator to collect its surcharge",
            "no-operator",
          );
        }
        try {
          destOperatorAccount =
            await EmploymentApi.operatingAccountOf(destOperator);
        } catch {
          return nil("the surcharge can't be collected there", "no-operator");
        }
      }

      const rate =
        Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeRate)) || 0;
      const base =
        Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeBase)) || 0;
      let networkFee = fee > 0 ? Math.min(fee, base + Math.floor(fee * rate)) : 0;
      // The network fee accrues to the Teleport Authority — a Business (its
      // operating account, custodied at its authored banksAt), never a bare
      // well-known account id. An unresolvable TPA (unseeded world) forfeits
      // the levy to the departure operator rather than blocking the ride.
      let tpaAccount: string | null = null;
      if (networkFee > 0) {
        tpaAccount = await this.resolveTpaAccount();
        if (!tpaAccount) {
          console.warn(
            "TeleportController: no Teleport Authority Business resolvable — network fee waived",
          );
          networkFee = 0;
        }
      }
      const total = fee + surcharge + manaCharge;

      // Build the split. When there's a base fare, the departure city budget is
      // the main payee (nets `fee − networkFee = total − networkFee − surcharge`)
      // and the TPA + destination legs are splits. A surcharge-only trip
      // (fee 0) pays the whole surcharge to the destination operator directly.
      const splits: Charge["splits"] = [];
      let payeeAccountId: string;
      if (cityBudgetAccount) {
        payeeAccountId = cityBudgetAccount;
        if (networkFee > 0 && tpaAccount) {
          splits.push({ accountId: tpaAccount, amount: Money.of(networkFee, Currency.compact()), category: "networkFee" });
        }
        if (destOperatorAccount && surcharge > 0) {
          splits.push({ accountId: destOperatorAccount, amount: Money.of(surcharge, Currency.compact()), category: "fare" });
        }
      } else {
        // Surcharge-only (free route into a surcharged destination). Reached only
        // when fee===0, so settleFare's guard implies surcharge>0, so the
        // destination-operator resolution above set destOperatorAccount.
        payeeAccountId = destOperatorAccount!;
      }

      const charge: Charge = {
        amount: Money.of(total, Currency.compact()),
        reason: "TPA fare",
        presented: true,
        payeeAccountId,
        category: "fare",
        splits,
      };
      // Credential first, then cash — a coin-holder rides too, and the split
      // holds either way (cash crosses the bridge). The credential attempt
      // swallows every error (no wallet, insufficient credential balance, …) and
      // falls through to cash; the terminal cash failure is what surfaces to the
      // player. A genuine banking fault (bad account, conservation) therefore
      // reads as "you can't cover the fare" — acceptable at demo scale, matching
      // the OrderController settle precedent.
      try {
        await BankingApi.settle(charge, { kind: "credential" });
        return null;
      } catch {
        /* fall through to cash */
      }
      try {
        await BankingApi.settle(charge, { kind: "cash" });
        return null;
      } catch {
        return nil("you can't cover the fare", "fare-declined");
      }
      }

    /* ── helpers ────────────────────────────────────────────────────── */

    /**
     * The Teleport Authority's operating account: resolve the TPA Business
     * (`fasttravel.tpaBusinessPath`, stood up on demand) and open/find its
     * account at its authored `banksAt`. Null when unseeded/unresolvable —
     * the caller waives the levy rather than blocking the ride.
     */
      private async resolveTpaAccount(): Promise<string | null> {
      let path = "";
      try {
        path = AppApi.setting(AppSettingKeys.fasttravelTpaBusinessPath) || "";
      } catch {
        return null; // settings unwarmed (tests) — no TPA to levy for
      }
      if (!path) return null;
      try {
        const tpa =
          StuffApi.findByTemplatePath(path) ??
          (await StuffApi.singletonOrClone<Stuff>(path));
        if (!tpa || !MixinApi.isBusiness(tpa)) return null;
        return await EmploymentApi.operatingAccountOf(tpa);
      } catch {
        return null;
      }
      }


    /* ── cascade load ───────────────────────────────────────────── */

    /** Resolve every route's destination to a live singleton (cascades). */
    async armNetwork(): Promise<void> {
      for (const route of this._routes.values()) {
        try {
          await StuffApi.singleton(route.ref);
        } catch (err) {
          console.warn(
            `fast-travel cascade: route ${route.ref} failed to load:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    }

    /* ── timetable (world-clock-bound) ──────────────────────────── */

    armTimetable(): void {
      this.disarmTimetable();
      const host = this as unknown as Stuff;
      if (this._advanceMode === "scheduled") {
        for (const route of this._routes.values()) {
          for (const pattern of route.departures) {
            this._clockHandles.push(
              WorldClockApi.cron(
                pattern,
                () => this.selectDeparture(route.ref),
                {
                  host,
                },
              ),
            );
          }
        }
      } else if (this._advanceMode === "cycle" && this._cycleInterval) {
        this._clockHandles.push(
          WorldClockApi.every(
            this._cycleInterval,
            () => this.advanceSelection(),
            {
              host,
            },
          ),
        );
      }
    }

    disarmTimetable(): void {
      for (const h of this._clockHandles) h.cancel();
      this._clockHandles = [];
    }
  };
}

/** True if the live node carries `kw` among its keywords (Perceptible). */
function hasKeyword(node: Stuff, kw: string): boolean {
  return MixinApi.isPerceptible(node) && node.getKeywords().includes(kw);
}
