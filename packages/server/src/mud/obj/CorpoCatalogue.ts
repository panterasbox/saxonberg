/**
 * CorpoCatalogue — singleton Idea owning the runtime corpos Catalog: the
 * authored megacorps and their product brands.
 *
 * Lives at `/obj/CorpoCatalogue`, per the singleton-in-`obj/` convention
 * (the `DisciplineCatalogue` / `TopicCatalogue` recipe). The caches are
 * transient instance state; the source of truth is the per-`Corpo` and
 * per-`Brand` leaf templates under `/obj/corpo/Corpo/` and
 * `/obj/corpo/Brand/` in the `content` collection. Both leaves are pure data
 * (`key` / edges / `owner`), so the catalogue loads descriptors directly
 * from the template docs — never cloning them as live Stuff.
 *
 * **Read-only canon.** Corpos and brands are authored as templates and
 * warmed at boot; there is no runtime mutation surface. The `rivals` edges
 * are stored and queryable; their consumption (the faction gameplay) is
 * deferred — the catalogue just exposes the graph.
 *
 * **Three caches.** A corpo map and a brand map (keyed by durable `key`),
 * plus a derived **portfolio index** (corpo key → owned brand keys) built
 * once from the brand map at warm time — the "portfolio is the forward
 * edge" projection as a cheap precomputed inverted index. A brand with an
 * empty `owner` is an independent and contributes to no corpo's portfolio.
 *
 * Keyed on the durable `key` (not templatePath), so additive Catalog
 * evolution (re-pathing, new corpos / brands) never invalidates the edges
 * or the stamped products that reference them.
 *
 * Not a persisted record. The seed YAML is `{ class: /obj/CorpoCatalogue,
 * data: {} }`.
 */

import { Idea } from "../lib/stuff/Idea";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { Template } from "../lib/stuff/Template";
import Corpo, { type CorpoDescriptor } from "./corpo/Corpo";
import Brand, { type BrandDescriptor } from "./corpo/Brand";
import type { VetoResult } from "../lib/errors";
import type { EvictionContext } from '../lib/stuff/Stuff';

const CorpoCatalogueBase = PostRegistrationMixin(Idea);

export default class CorpoCatalogue extends CorpoCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /**
   * Transient runtime caches keyed by durable `key`. `null` means "not
   * built yet"; warmed in `postRegister` (or lazily as an empty cold state
   * in a unit test that skips the clone pipeline). HMR drops them to `null`.
   */
  private corpoCache: Map<string, CorpoDescriptor> | null = null;
  private brandCache: Map<string, BrandDescriptor> | null = null;
  /** Derived forward edge: corpo key → owned brand keys. */
  private portfolioIndex: Map<string, string[]> | null = null;

  /** The authored descriptor for corpo `key`, or `null`. */
  public getCorpo(key: string): CorpoDescriptor | null {
    this.ensureCache();
    return this.corpoCache!.get(key) ?? null;
  }

  /** The authored descriptor for brand `key`, or `null`. */
  public getBrand(key: string): BrandDescriptor | null {
    this.ensureCache();
    return this.brandCache!.get(key) ?? null;
  }

  /** Whether `key` names a cataloged corpo. */
  public hasCorpo(key: string): boolean {
    this.ensureCache();
    return this.corpoCache!.has(key);
  }

  /** Whether `key` names a cataloged brand. */
  public hasBrand(key: string): boolean {
    this.ensureCache();
    return this.brandCache!.has(key);
  }

  /** Every authored corpo descriptor (defensive copies). */
  public allCorpos(): CorpoDescriptor[] {
    this.ensureCache();
    return [...this.corpoCache!.values()].map(cloneCorpo);
  }

  /** Every authored brand descriptor (defensive copies). */
  public allBrands(): BrandDescriptor[] {
    this.ensureCache();
    return [...this.brandCache!.values()].map(cloneBrand);
  }

  /**
   * The brand `key`s owned by corpo `key` (the forward edge). Empty for an
   * unknown corpo or one whose only brands are independent.
   */
  public portfolioOf(key: string): string[] {
    this.ensureCache();
    return [...(this.portfolioIndex!.get(key) ?? [])];
  }

  /** The `rivals` edge targets (corpo keys) for `key`. */
  public rivalsOf(key: string): string[] {
    return [...(this.getCorpo(key)?.rivals ?? [])];
  }

  /**
   * Warm the caches from the `content` collection. Two mongo queries at
   * boot, then the public surface is sync.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    await this.loadCacheFromTemplates();
  }

  /** Drop the caches; next access rebuilds. Fired by HMR on template churn. */
  public invalidateCache(): void {
    this.corpoCache = null;
    this.brandCache = null;
    this.portfolioIndex = null;
  }

  /** Singleton refusal — mirrors `DisciplineCatalogue.canDestruct`. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        "CorpoCatalogue is a system singleton and cannot be destructed; " +
        "use forceDestruct (admin-gated) if you really mean it",
    };
  }

  private ensureCache(): void {
    if (this.corpoCache !== null) return;
    // Never warmed (postRegister wasn't awaited, e.g. a unit test). Empty
    // caches are a valid cold state — every reader degrades to "no such".
    this.corpoCache = new Map();
    this.brandCache = new Map();
    this.portfolioIndex = new Map();
  }

  /**
   * Read every Corpo and Brand template directly from the `domain`
   * collection, populate both caches keyed by the authored `key`, then
   * build the portfolio index from the brand cache. Skips the runtime
   * Stuff layer entirely.
   */
  private async loadCacheFromTemplates(): Promise<void> {
    const corpoTemplates = await Template.findDescendants(
      Corpo.TEMPLATE_PATH_PREFIX
    );
    const corpos = new Map<string, CorpoDescriptor>();
    for (const tpl of corpoTemplates) {
      const descriptor = buildCorpoDescriptor(tpl.data);
      if (descriptor) corpos.set(descriptor.key, descriptor);
    }

    const brandTemplates = await Template.findDescendants(
      Brand.TEMPLATE_PATH_PREFIX
    );
    const brands = new Map<string, BrandDescriptor>();
    const portfolio = new Map<string, string[]>();
    for (const tpl of brandTemplates) {
      const descriptor = buildBrandDescriptor(tpl.data);
      if (!descriptor) continue;
      brands.set(descriptor.key, descriptor);
      if (descriptor.owner.length > 0) {
        const bucket = portfolio.get(descriptor.owner) ?? [];
        bucket.push(descriptor.key);
        portfolio.set(descriptor.owner, bucket);
      }
    }

    this.corpoCache = corpos;
    this.brandCache = brands;
    this.portfolioIndex = portfolio;
  }
}

/** Coerce a string array from loosely-typed template data. */
function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Read a string field, defaulting to `''`. */
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Build a {@link CorpoDescriptor} from a template's `data`, or `null` if it
 * lacks a non-empty `key`.
 */
function buildCorpoDescriptor(data: unknown): CorpoDescriptor | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string" || d.key.length === 0) return null;
  return {
    key: d.key,
    label:
      typeof d.label === "string" && d.label.length > 0 ? d.label : d.key,
    sector: str(d.sector),
    ethos: str(d.ethos),
    aesthetic: str(d.aesthetic),
    temperament: str(d.temperament),
    description: str(d.description),
    rivals: stringArray(d.rivals),
  };
}

/**
 * Build a {@link BrandDescriptor} from a template's `data`, or `null` if it
 * lacks a non-empty `key`. `owner` defaults to `''` (independent).
 */
function buildBrandDescriptor(data: unknown): BrandDescriptor | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string" || d.key.length === 0) return null;
  return {
    key: d.key,
    name: typeof d.name === "string" && d.name.length > 0 ? d.name : d.key,
    owner: str(d.owner),
    category: str(d.category),
    positioning: str(d.positioning),
    descriptor: str(d.descriptor),
  };
}

/** Defensive copy so callers can't mutate the cached corpo descriptor. */
function cloneCorpo(d: CorpoDescriptor): CorpoDescriptor {
  return { ...d, rivals: [...d.rivals] };
}

/** Defensive copy of a brand descriptor (flat — a shallow spread suffices). */
function cloneBrand(d: BrandDescriptor): BrandDescriptor {
  return { ...d };
}
