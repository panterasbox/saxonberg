/**
 * BlueprintCatalogue — singleton Idea owning the runtime blueprint index.
 *
 * Lives at `/platform/idea/BlueprintCatalogue` (the singleton-in-`obj/` convention,
 * sibling to `RecipeCatalogue` / `TopicCatalogue`). Two layers feed it
 * (content-packs wave 2, D10):
 *
 *   - the **derived skeleton** — one `concrete` {@link Blueprint} Document
 *     per distinct backing `class` across the templates collection, in
 *     `blueprints`. A CACHE: {@link rebuild} regenerates it at every boot
 *     (dedup on signature, drift-safe on id, orphans reaped);
 *   - the **curated overlay** — `documents {kind: 'blueprint'}` rows the
 *     `platform` pack ships (and `publishBlueprint` writes at
 *     `/blueprints/<id>`). {@link warm} blesses a derived row IN PLACE from
 *     its curated document by signature (a cache write, idempotent), or
 *     holds a pure-composition curated blueprint in memory — the document
 *     is its source of truth, never a `blueprints` row.
 *
 * Read-only reference surface (blueprints are public composition metadata,
 * like recipes/topics), so methods are ungated — the `RecipeCatalogue`
 * precedent. The gating lives one layer up on `StudioApi`/`StudioLogic`.
 *
 * `upsert` keeps the cache consistent after a live `publishBlueprint`;
 * `invalidateCache` (the installer's go-live) re-warms.
 *
 * Not a persisted record — the seed YAML is `{ class: /platform/idea/BlueprintCatalogue,
 * data: {} }`.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { Blueprint, type CuratedBlueprintData } from '../../lib/studio/Blueprint';
import { DocumentApi } from '../../api/document';
import { StuffApi } from '../../api/stuff';
import { TemplateApi } from '../../api/template';
import type { AnyConstructor } from '../../api/mixin';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const BlueprintCatalogueBase = PostRegistrationMixin(Idea);

export default class BlueprintCatalogue extends BlueprintCatalogueBase {
  /**
   * Residency veto — a load-bearing process-lifetime singleton is never
   * culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** blueprintId → Blueprint. `null` = not yet warmed. */
  private cache: Map<string, Blueprint> | null = null;

  /** signature → blueprintId (the dedup index). */
  private bySignature: Map<string, string> = new Map();

  /** Resolve a blueprint by its durable id, or null. */
  public getBlueprint(blueprintId: string): Blueprint | null {
    this.ensureCache();
    return this.cache!.get(blueprintId) ?? null;
  }

  /** Resolve a blueprint by its structural signature, or null. */
  public findBySignature(signature: string): Blueprint | null {
    this.ensureCache();
    const id = this.bySignature.get(signature);
    return id ? (this.cache!.get(id) ?? null) : null;
  }

  /** Every known blueprint. */
  public allBlueprints(): readonly Blueprint[] {
    this.ensureCache();
    return [...this.cache!.values()];
  }

  /** Whether `blueprintId` is known. */
  public knows(blueprintId: string): boolean {
    this.ensureCache();
    return this.cache!.has(blueprintId);
  }

  /**
   * Fold a just-persisted blueprint into the live cache + signature index
   * (a `publishBlueprint` maintenance hook, so a fresh publish is visible
   * without a full re-warm).
   */
  public upsert(blueprint: Blueprint): void {
    this.ensureCache();
    const id = blueprint.getBlueprintId();
    if (!id) return;
    this.cache!.set(id, blueprint);
    const sig = blueprint.getSignature();
    if (sig) this.bySignature.set(sig, id);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.rebuild();
    await this.warm();
  }

  /**
   * Regenerate the derived skeleton: one `concrete` blueprint per distinct
   * backing class (deduped on signature, never colliding on a drifted
   * id), and reap derived rows whose class no longer resolves. Runs at
   * every boot before `warm` — the `blueprints` collection is a cache.
   */
  public async rebuild(): Promise<{ inserted: number; reaped: number }> {
    const existing = await Blueprint.find<Blueprint>({});
    const bySignature = new Map<string, Blueprint>();
    const byId = new Set<string>();
    for (const bp of existing) {
      const sig = bp.getSignature();
      if (sig) bySignature.set(sig, bp);
      if (bp.blueprintId) byId.add(bp.blueprintId);
    }
    const unresolvable: string[] = [];
    const inserted = await deriveSkeleton(bySignature, byId, unresolvable);
    const reaped = await reapOrphans(existing, unresolvable);
    return { inserted, reaped };
  }

  /** The installer's go-live: a full re-warm from both layers. */
  public async invalidateCache(): Promise<void> {
    await this.warm();
  }

  /**
   * (Re)build the cache + signature index from the derived `blueprints`
   * rows AND the curated `documents {kind: 'blueprint'}` overlay.
   */
  public async warm(): Promise<void> {
    const derived = await Blueprint.find<Blueprint>({});
    const cache = new Map<string, Blueprint>();
    const bySignature = new Map<string, string>();
    const index = (bp: Blueprint): void => {
      const id = bp.getBlueprintId();
      if (!id) return;
      cache.set(id, bp);
      const sig = bp.getSignature();
      if (sig) bySignature.set(sig, id);
    };
    for (const bp of derived) index(bp);

    const docs = await DocumentApi.listOfKind('blueprint');
    for (const doc of docs) {
      let entry: CuratedBlueprintData;
      try {
        entry = Blueprint.curatedDataOf(doc);
      } catch (err) {
        console.warn(`BlueprintCatalogue: skipping ${doc.getPath()}: ${(err as Error).message}`);
        continue;
      }
      const { baseClass, mixinNames } = await curatedParts(entry);
      const signature = Blueprint.signatureFromParts(baseClass, mixinNames);
      const bySig = bySignature.get(signature);
      const derivedRow = bySig ? cache.get(bySig) : undefined;
      const drifted = cache.get(entry.blueprintId);
      const target = derivedRow ?? drifted;
      if (target && target !== derivedRow && drifted) {
        // A row holds this id under a DIFFERENT signature — the class's
        // mixin set drifted. Re-point the cache row's composition.
        drifted.signature = signature;
        drifted.baseClass = baseClass;
        drifted.mixinNames = mixinNames;
      }
      if (target) {
        // Bless the derived row in place, once (a cache write; fires only
        // on an un-blessed or drifted row).
        const before = JSON.stringify(curatedView(target));
        applyCurated(target, entry);
        if (JSON.stringify(curatedView(target)) !== before || target !== derivedRow) {
          await target.save();
        }
        index(target);
        continue;
      }
      // No class produced this composition: an in-memory curated
      // blueprint whose source of truth is the document (never saved
      // to `blueprints`).
      const bp = new Blueprint();
      bp.blueprintId = entry.blueprintId;
      bp.signature = signature;
      bp.baseClass = baseClass;
      bp.mixinNames = mixinNames;
      bp.kind = entry.kind ?? 'composition';
      applyCurated(bp, entry);
      index(bp);
    }
    this.cache = cache;
    this.bySignature = bySignature;
  }

  private ensureCache(): void {
    // A read before warm may start empty so the resolve surface returns null
    // rather than throwing. `== null` also covers an instance whose field
    // initializers didn't run (HMR / white-box construction).
    if (this.cache == null) this.cache = new Map();
    if (this.bySignature == null) this.bySignature = new Map();
  }

  /** Singleton refusal (mirrors RecipeCatalogue / TopicCatalogue). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'BlueprintCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}

/** The curated-facing fields of a row (what a bless compares/changes). */
function curatedView(bp: Blueprint): Record<string, unknown> {
  return {
    name: bp.name,
    kind: bp.kind,
    classPath: bp.classPath,
    parent: bp.parent,
    description: bp.description,
    blessed: bp.blessed,
  };
}

/** Attach a curated entry's identity to a blueprint (derived or in-memory). */
function applyCurated(bp: Blueprint, entry: CuratedBlueprintData): void {
  bp.name = entry.name ?? bp.getName() ?? entry.blueprintId;
  bp.kind = entry.kind ?? bp.getKind();
  if (entry.classPath) bp.classPath = entry.classPath;
  bp.parent = entry.parent ?? '';
  bp.description = entry.description ?? '';
  bp.blessed = entry.blessed ?? true;
}

/**
 * A curated entry's structural parts: a concrete kind naming a class (and
 * no explicit mixin list) is INTROSPECTED for the true base + mixin set,
 * so a curated name attaches to the derived skeleton rather than
 * duplicating it with a hand-enumerated, possibly-drifted list.
 */
async function curatedParts(
  entry: CuratedBlueprintData,
): Promise<{ baseClass: string; mixinNames: string[] }> {
  let baseClass = entry.baseClass;
  let mixinNames = [...new Set(entry.mixinNames ?? [])].sort();
  if (entry.classPath && mixinNames.length === 0) {
    try {
      const ctor = (await StuffApi.loadClassByPath(entry.classPath)) as AnyConstructor;
      baseClass = Blueprint.baseClassOf(ctor);
      mixinNames = Blueprint.mixinNamesOf(ctor);
    } catch (err) {
      console.warn(
        `BlueprintCatalogue: curated '${entry.blueprintId}' classPath ` +
          `${entry.classPath} unresolvable: ${(err as Error).message}`,
      );
    }
  }
  return { baseClass, mixinNames };
}

/**
 * The derived skeleton: one `concrete` blueprint per distinct backing
 * `class` path, deduped on the introspected signature. Class paths that
 * fail to resolve are collected (never fatal) and reported once.
 */
async function deriveSkeleton(
  bySignature: Map<string, Blueprint>,
  byId: Set<string>,
  unresolvable: string[],
): Promise<number> {
  let classPaths: string[];
  try {
    classPaths = await TemplateApi.distinctClasses();
  } catch (err) {
    console.warn(
      `BlueprintCatalogue: could not enumerate template classes: ${(err as Error).message}`,
    );
    return 0;
  }
  let inserted = 0;
  for (const classPath of classPaths) {
    let ctor: AnyConstructor;
    try {
      ctor = (await StuffApi.loadClassByPath(classPath)) as AnyConstructor;
    } catch {
      unresolvable.push(classPath);
      continue;
    }
    const signature = Blueprint.signatureOf(ctor);
    if (bySignature.has(signature)) continue; // dedup on signature
    const id = derivedId(classPath);
    // A blueprint already holds this id under a *different* signature
    // (the class's structure drifted). Skip rather than collide on the
    // unique `blueprintId` index — the curated overlay owns accuracy.
    if (byId.has(id)) continue;
    const bp = new Blueprint();
    bp.blueprintId = id;
    bp.signature = signature;
    bp.baseClass = Blueprint.baseClassOf(ctor);
    bp.mixinNames = Blueprint.mixinNamesOf(ctor);
    bp.kind = 'concrete';
    bp.classPath = classPath;
    bp.blessed = false;
    bp.name = classPath.split('/').filter(Boolean).pop() ?? classPath;
    await bp.save();
    bySignature.set(signature, bp);
    byId.add(id);
    inserted++;
  }
  return inserted;
}

/**
 * ⭐ **Drop derived blueprints whose backing class no longer resolves.**
 * Only DERIVED, un-blessed rows — regenerable by construction. A blessed
 * row is authored content and is never touched here. The orphan template
 * rows that CAUSED this are logged with the exact `deleteMany`, never
 * deleted (CMS-authored templates share that collection).
 */
async function reapOrphans(existing: Blueprint[], unresolvable: string[]): Promise<number> {
  const orphanClasses: string[] = [...unresolvable];
  let reaped = 0;
  for (const bp of existing) {
    if (bp.kind !== 'concrete' || !bp.classPath || bp.blessed) continue;
    try {
      await StuffApi.loadClassByPath(bp.classPath);
      continue;
    } catch {
      orphanClasses.push(bp.classPath);
    }
    try {
      await bp.delete();
      reaped++;
    } catch (err) {
      console.warn(
        `BlueprintCatalogue: could not drop orphan ${bp.classPath}: ${(err as Error).message}`,
      );
    }
  }
  if (orphanClasses.length > 0) {
    const list = [...new Set(orphanClasses)];
    console.info(
      `BlueprintCatalogue: ${list.length} domain row(s) name a class that ` +
        `no longer resolves. The blueprints are re-derivable and have ` +
        `been dropped; the domain rows are NOT touched (CMS-authored ` +
        `templates share this collection). To remove them:\n` +
        `  db.domain.deleteMany({ class: { $in: ${JSON.stringify(list)} } })`,
    );
  }
  return reaped;
}

/** Deterministic, unique id for a derived skeleton row (stable re-runs). */
function derivedId(classPath: string): string {
  return 'bp-' + classPath.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
