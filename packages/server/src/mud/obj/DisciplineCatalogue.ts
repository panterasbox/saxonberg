/**
 * DisciplineCatalogue — singleton Idea owning the runtime Catalog: the
 * authored, typed field-of-study graph the advancement substrate measures
 * against.
 *
 * Lives at `/obj/DisciplineCatalogue`, per the singleton-in-`obj/`
 * convention. The cache is transient instance state; the source of truth
 * is the per-Discipline leaf templates under
 * `/obj/Discipline/` in the `domain` collection. Discipline
 * templates are pure data (`key` / `channel` / edges / `conferrals`), so
 * the catalogue loads descriptors directly from the template docs — no
 * need to clone them as live Stuff (the `TopicCatalogue` recipe).
 *
 * **Read-only canon.** Disciplines are authored as templates and warmed at
 * boot; there is no runtime mutation surface this increment. Edges are
 * stored and queryable; their consumption (prerequisite gating, evidence
 * propagation) is deferred — the catalogue just exposes the graph.
 *
 * Keyed on the durable Discipline `key` (not templatePath), so additive
 * Catalog evolution (re-pathing, new branches) never invalidates the
 * edges or the recorded Transcript evidence that reference it.
 *
 * Not a persisted record. The seed YAML is `{ class:
 * /obj/DisciplineCatalogue, data: {} }`.
 */

import { Idea } from "../lib/stuff/Idea";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { Template } from "../lib/stuff/Template";
import Discipline, {
  DISCIPLINE_CHANNELS,
  type DisciplineChannel,
  type DisciplineDescriptor,
  type ConferralRule,
} from "./Discipline";
import { CompetenceBand } from "../lib/advancement/CompetenceBand";
import type { VetoResult } from "../lib/errors";
import type { EvictionContext } from '../lib/stuff/Stuff';

const DisciplineCatalogueBase = PostRegistrationMixin(Idea);

export default class DisciplineCatalogue extends DisciplineCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /**
   * Transient runtime cache keyed by Discipline `key`. `null` means "not
   * built yet"; warmed in `postRegister` (or lazily on first access in a
   * unit test that skips the clone pipeline). HMR drops it back to `null`.
   *
   * TypeScript `private` per the domain-code default — the mixin proxy
   * receiver can't reach `#`-private slots.
   */
  private cache: Map<string, DisciplineDescriptor> | null = null;

  /**
   * The authored descriptor for `key`, or `null` if no such Discipline is
   * cataloged. (Unlike TopicCatalogue, there is no derived fallback — a
   * Discipline either exists in the canon or it does not.)
   */
  public getDiscipline(key: string): DisciplineDescriptor | null {
    this.ensureCache();
    return this.cache!.get(key) ?? null;
  }

  /** Whether `key` names a cataloged Discipline. */
  public has(key: string): boolean {
    this.ensureCache();
    return this.cache!.has(key);
  }

  /** Every authored descriptor (defensive copies). */
  public allDisciplines(): DisciplineDescriptor[] {
    this.ensureCache();
    return [...this.cache!.values()].map(cloneDescriptor);
  }

  /** The `requires` edge targets (Discipline keys) for `key`. */
  public getRequires(key: string): string[] {
    return [...(this.getDiscipline(key)?.requires ?? [])];
  }

  /** The `specializes` edge targets for `key`. */
  public getSpecializes(key: string): string[] {
    return [...(this.getDiscipline(key)?.specializes ?? [])];
  }

  /** The `synergizes` edge targets for `key`. */
  public getSynergizes(key: string): string[] {
    return [...(this.getDiscipline(key)?.synergizes ?? [])];
  }

  /** The band-gated conferral rules authored on `key`. */
  public getConferrals(key: string): ConferralRule[] {
    return (this.getDiscipline(key)?.conferrals ?? []).map((c) => ({
      band: c.band,
      verbs: [...c.verbs],
    }));
  }

  /**
   * Warm the cache from the `domain` collection. One mongo query at boot,
   * then the public surface is sync.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    await this.loadCacheFromTemplates();
  }

  /** Drop the cache; next access rebuilds. Fired by HMR on template churn. */
  public invalidateCache(): void {
    this.cache = null;
  }

  /** Singleton refusal — mirrors `TopicCatalogue.canDestruct`. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        "DisciplineCatalogue is a system singleton and cannot be destructed; " +
        "use forceDestruct (admin-gated) if you really mean it",
    };
  }

  private ensureCache(): void {
    if (this.cache !== null) return;
    // Never warmed (postRegister wasn't awaited, e.g. a unit test). An
    // empty cache is a valid cold state — every reader degrades to "no
    // such Discipline".
    this.cache = new Map();
  }

  /**
   * Read every Discipline template under
   * `Discipline.TEMPLATE_PATH_PREFIX` directly from the `domain`
   * collection and populate the cache, keyed by the authored `key`.
   * Skips the runtime Stuff layer entirely.
   */
  private async loadCacheFromTemplates(): Promise<void> {
    const templates = await Template.findDescendants(
      Discipline.TEMPLATE_PATH_PREFIX
    );
    const map = new Map<string, DisciplineDescriptor>();
    for (const tpl of templates) {
      const descriptor = buildDescriptor(tpl.data);
      if (descriptor) map.set(descriptor.key, descriptor);
    }
    this.cache = map;
  }
}

/** Coerce a string array from loosely-typed template data. */
function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Coerce the conferral rules from template data, dropping malformed entries. */
function conferralRules(value: unknown): ConferralRule[] {
  if (!Array.isArray(value)) return [];
  const rules: ConferralRule[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { band?: unknown; verbs?: unknown };
    if (!CompetenceBand.isBand(r.band)) continue;
    rules.push({ band: r.band, verbs: stringArray(r.verbs) });
  }
  return rules;
}

/**
 * Build a {@link DisciplineDescriptor} from a template's `data`, or `null`
 * if it lacks the minimum (a non-empty `key` and a valid `channel`).
 */
function buildDescriptor(data: unknown): DisciplineDescriptor | null {
  if (!data || typeof data !== "object") return null;
  const d = data as {
    key?: unknown;
    channel?: unknown;
    label?: unknown;
    description?: unknown;
    iscedf?: unknown;
    requires?: unknown;
    specializes?: unknown;
    synergizes?: unknown;
    conferrals?: unknown;
  };
  if (typeof d.key !== "string" || d.key.length === 0) return null;
  if (!DISCIPLINE_CHANNELS.includes(d.channel as DisciplineChannel)) {
    return null;
  }
  return {
    key: d.key,
    channel: d.channel as DisciplineChannel,
    label:
      typeof d.label === "string" && d.label.length > 0 ? d.label : d.key,
    description: typeof d.description === "string" ? d.description : "",
    iscedf: typeof d.iscedf === "string" ? d.iscedf : "",
    requires: stringArray(d.requires),
    specializes: stringArray(d.specializes),
    synergizes: stringArray(d.synergizes),
    conferrals: conferralRules(d.conferrals),
  };
}

/** Deep-ish copy so callers can't mutate the cached descriptor. */
function cloneDescriptor(d: DisciplineDescriptor): DisciplineDescriptor {
  return {
    ...d,
    requires: [...d.requires],
    specializes: [...d.specializes],
    synergizes: [...d.synergizes],
    conferrals: d.conferrals.map((c) => ({ band: c.band, verbs: [...c.verbs] })),
  };
}
