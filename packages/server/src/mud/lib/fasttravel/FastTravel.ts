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
 * Capability-named in `lib/` ("fast travel"); content calls it the Teleport
 * Authority. The mixin supplies state/behaviour; the `teleport` / `register`
 * verbs are global commands gated per-fork — it does not "grant a verb".
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import type { Sensor } from "../message/Sensor";
import type { CommandContributions } from "../../api/command";
import type { CronPattern, ClockHandle } from "../../api/worldclock";
import { WorldClockApi } from "../../api/worldclock";
import { StuffApi } from "../../api/stuff";
import { DescribeApi } from "../../api/describe";
import { findActiveCredential } from "./TravelCredential";

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
}

/** Raw seed shape for a route, normalised by {@link applyRoutes}. */
interface RawRoute {
  to?: string;
  warren?: string;
  departures?: Array<string | CronPattern>;
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
  renderDepartures(viewer: Stuff & Sensor): Promise<string>;

  armNetwork(): Promise<void>;
  armTimetable(): void;
  disarmTimetable(): void;

  getStatus(): string;
  setStatus(value: string): void;
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
    static _mixinName = "FastTravelMixin";

    static persistentFields = [
      "directionality",
      "selectedDestinationRef",
      "status",
      "advanceMode",
      "cycleInterval",
    ];

    /** `routes` is authored content applied once at hydrate (Phase 2). */
    static instructionFields = ["routes"];

    /** The `register` verb surfaces only for actors at a node. */
    static commandContributions: CommandContributions = {
      environment: ["movement/register.yaml"],
    };

    private _directionality: Directionality = "both";
    private _selectedDestinationRef: string | null = null;
    private _status = "operational";
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

    applyRoutes(raw: RawRoute[]): void {
      this._routes.clear();
      for (const r of raw ?? []) {
        const ref = r.to ?? r.warren;
        if (!ref) throw new TypeError("route needs a `to` or `warren` path");
        const departures = (r.departures ?? []).map(parseCron);
        this._routes.set(ref, { ref, departures });
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
      const room = (this as unknown as Containable).getContainer();
      if (!room) {
        const id = (this as unknown as Stuff).stuffId;
        throw new Error(`fast-travel node ${id} has no container to arrive in`);
      }
      return room;
    }

    /* ── the local departures board (live, viewer-aware) ────────── */

    async renderDepartures(viewer: Stuff & Sensor): Promise<string> {
      const cred = findActiveCredential(viewer);
      const selected = this.selectedDestinationRef;
      const lines: string[] = [
        `Departures — ${DescribeApi.getDisplayName(this as unknown as Stuff, viewer)}:`,
      ];
      if (this._routes.size === 0) {
        lines.push("  (no destinations)");
        return lines.join("\n");
      }
      for (const route of this._routes.values()) {
        const node = await StuffApi.singleton<Stuff & Sensor>(route.ref);
        const name = DescribeApi.getDisplayName(node, viewer);
        const active = route.ref === selected ? " «now boarding»" : "";
        const reg =
          cred && !cred.isRegistered(route.ref) ? " — not yet registered" : "";
        const times =
          route.departures.length > 0
            ? `  [${route.departures.map(formatCron).join(", ")}]`
            : "";
        lines.push(`  ${name}${active}${reg}${times}`);
      }
      lines.push("Travel with `teleport <destination>`.");
      return lines.join("\n");
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
  const p = node as unknown as { getKeywords?: () => string[] };
  return typeof p.getKeywords === "function"
    ? p.getKeywords().includes(kw)
    : false;
}
