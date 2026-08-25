/**
 * GovernmentCatalogue — singleton Idea owning the runtime roster of
 * diegetic governments.
 *
 * Lives at `/obj/GovernmentCatalogue`, per the singleton-in-`obj/`
 * convention (the `CorpoCatalogue` / `DisciplineCatalogue` recipe). The
 * cache is transient instance state; the source of truth is the
 * per-`Government` leaf templates under `/obj/Government/` in the
 * `content` collection. The leaves are pure data, so the catalogue loads
 * descriptors directly from the template docs — never cloning them as
 * live Stuff.
 *
 * **Read-only canon.** Governments are authored as templates (by their
 * committees) and warmed at boot; there is no runtime mutation surface.
 * Jurisdiction lives on the `Locality` side (`_governmentKey`), so the
 * catalogue holds no territory index — the chain is derived per read by
 * `GovernmentLogic` from the address coverage walk.
 *
 * Keyed on the durable `key` (not templatePath), so additive evolution
 * (re-pathing, new governments) never invalidates a Locality's declared
 * key.
 *
 * Not a persisted record. The seed YAML is
 * `{ class: /obj/GovernmentCatalogue, data: {} }`.
 */

import { Idea } from "../lib/stuff/Idea";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { Template } from "../lib/stuff/Template";
import Government, {
  type GovernmentDescriptor,
  type GovernmentSeat,
} from "./Government";
import type { VetoResult } from "../lib/errors";
import type { EvictionContext } from "../lib/stuff/Stuff";

const GovernmentCatalogueBase = PostRegistrationMixin(Idea);

export default class GovernmentCatalogue extends GovernmentCatalogueBase {
  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  /**
   * Transient runtime cache keyed by durable `key`. `null` means "not
   * built yet"; warmed in `postRegister` (or lazily as an empty cold
   * state in a unit test that skips the clone pipeline). HMR drops it
   * to `null`.
   */
  private governmentCache: Map<string, GovernmentDescriptor> | null = null;

  /** The authored descriptor for government `key`, or `null`. */
  public getGovernment(key: string): GovernmentDescriptor | null {
    this.ensureCache();
    const found = this.governmentCache!.get(key);
    return found ? cloneGovernment(found) : null;
  }

  /** Whether `key` names a cataloged government. */
  public hasGovernment(key: string): boolean {
    this.ensureCache();
    return this.governmentCache!.has(key);
  }

  /** Every authored government descriptor (defensive copies). */
  public allGovernments(): GovernmentDescriptor[] {
    this.ensureCache();
    return [...this.governmentCache!.values()].map(cloneGovernment);
  }

  /**
   * Warm the cache from the `content` collection. One mongo query at
   * boot, then the public surface is sync.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    await this.loadCacheFromTemplates();
  }

  /** Drop the cache; next access rebuilds. Fired by HMR on template churn. */
  public invalidateCache(): void {
    this.governmentCache = null;
  }

  /** Singleton refusal — mirrors `CorpoCatalogue.canDestruct`. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        "GovernmentCatalogue is a system singleton and cannot be destructed; " +
        "use forceDestruct (admin-gated) if you really mean it",
    };
  }

  private ensureCache(): void {
    if (this.governmentCache !== null) return;
    // Never warmed (postRegister wasn't awaited, e.g. a unit test). An
    // empty cache is a valid cold state — every reader degrades to
    // "no such government".
    this.governmentCache = new Map();
  }

  /**
   * Read every Government template directly from the `domain`
   * collection and populate the cache keyed by the authored `key`.
   * Skips the runtime Stuff layer entirely.
   */
  private async loadCacheFromTemplates(): Promise<void> {
    const templates = await Template.findDescendants(
      Government.TEMPLATE_PATH_PREFIX
    );
    const governments = new Map<string, GovernmentDescriptor>();
    for (const tpl of templates) {
      const descriptor = buildGovernmentDescriptor(tpl.data);
      if (descriptor) governments.set(descriptor.key, descriptor);
    }
    this.governmentCache = governments;
  }
}

/** Read a string field, defaulting to `''`. */
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Coerce a string array from loosely-typed template data. */
function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Build a {@link GovernmentSeat} from loosely-typed template data, or
 * `null` when any of the four reference fields is missing/empty — a
 * malformed seat is dropped, never half-built.
 */
function buildSeat(value: unknown): GovernmentSeat | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (typeof s.key !== "string" || s.key.length === 0) return null;
  if (typeof s.department !== "string" || s.department.length === 0) {
    return null;
  }
  if (typeof s.positionKey !== "string" || s.positionKey.length === 0) {
    return null;
  }
  return {
    key: s.key,
    label:
      typeof s.label === "string" && s.label.length > 0 ? s.label : s.key,
    department: s.department,
    positionKey: s.positionKey,
  };
}

/**
 * Build a {@link GovernmentDescriptor} from a template's `data`, or
 * `null` if it lacks a non-empty `key`. Malformed seats are dropped.
 */
function buildGovernmentDescriptor(
  data: unknown
): GovernmentDescriptor | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string" || d.key.length === 0) return null;
  const seats: GovernmentSeat[] = [];
  if (Array.isArray(d.seats)) {
    for (const raw of d.seats) {
      const seat = buildSeat(raw);
      if (seat) seats.push(seat);
    }
  }
  return {
    key: d.key,
    displayName:
      typeof d.displayName === "string" && d.displayName.length > 0
        ? d.displayName
        : d.key,
    description: str(d.description),
    charter: str(d.charter),
    treasury: str(d.treasury),
    departments: stringArray(d.departments),
    seats,
  };
}

/** Defensive copy so callers can't mutate the cached descriptor. */
function cloneGovernment(d: GovernmentDescriptor): GovernmentDescriptor {
  return {
    ...d,
    departments: [...d.departments],
    seats: d.seats.map((s) => ({ ...s })),
  };
}
