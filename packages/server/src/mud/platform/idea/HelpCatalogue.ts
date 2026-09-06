/**
 * HelpCatalogue — singleton Idea owning the boot-warmed help index.
 *
 * Lives at `/platform/idea/HelpCatalogue` (the singleton-in-`obj/` convention,
 * sibling to `TopicCatalogue` / `RecipeCatalogue` / `CorpoCatalogue`).
 * The index is *harvested*, never registered: `warm()` pulls two
 * projectors — commands (every loaded `CommandDefinition`) and the
 * engine API surface (the enriched `author-surface.json` artifact +
 * the complete `Mixins` registry) — into a single uniform
 * `Map<id, HelpTopic>` plus derived category indexes.
 *
 * Read-only reference surface (help is transparency-by-default), so the
 * read methods are ungated — the `TopicCatalogue`/`RecipeCatalogue`
 * precedent. The single read chokepoint + the capability filter live in
 * the {@link HelpApi} facade, not here.
 *
 * Not a persisted record — the seed YAML is `{ class: /platform/idea/HelpCatalogue,
 * data: {} }`; the index is rebuilt on demand by the projectors.
 */

import type {
  HelpTopic,
  HelpKind,
  HelpIndexEntry,
  HelpCategory,
  HelpRelation,
  HelpSearchGroup,
} from "@saxonberg/types";
import { Idea } from "../../lib/stuff/Idea";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { Mixins } from "../../lib/mixin";
import { CommandApi } from "../../api/command";
import { Mml } from "../../api/mml";
import type { CommandDefinition } from "../../lib/command/CommandDefinition";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from '../../lib/stuff/Stuff';
import { SourceTreeApi } from '../../api/source-tree';
import { StuffApi } from '../../api/stuff';
import { MixinApi, type AnyConstructor } from '../../api/mixin';
import { SchemaDoc } from '../../lib/persistence/SchemaDoc';
import type { FieldMeta } from '../../lib/mixin';

// ── The parsed shape of `author-surface.json` (the build artifact the
//    projection script emits). Declared locally because the script lives
//    outside `src/` (rootDir) — a type-only re-import would break the
//    tsc project boundary. This is the file/wire contract, not code. ──
export interface AuthorSurfaceMember {
  kind: "api-static" | "stuff-method";
  module: string;
  face: string;
  name: string;
  qualified: string;
  signature: string;
  summary: string;
  params?: { name: string; text: string }[];
  returns?: string;
  examples?: string[];
  signatureTypes: string[];
}

export interface AuthorSurfaceType {
  id: number;
  name: string;
  module: string;
  kind: number;
}

export interface AuthorSurface {
  consumer: AuthorSurfaceMember[];
  extension: { name: string; contract: string; faces: string[] }[];
  types: AuthorSurfaceType[];
}

/** Fixed display order for kinds (categories + search groups). */
const KIND_ORDER: HelpKind[] = [
  // ⭐ Concepts come SECOND, after the commands and ahead of the author
  // surface. A player looking for the rulebook should meet *what
  // nitrogen is* before they meet `Soil.fixNitrogen`'s signature, and
  // the ordering is the only place that preference is expressed.
  "command",
  "concept",
  "api",
  "mixin",
  "type",
  "collection",
];
const KIND_TITLE: Record<HelpKind, string> = {
  command: "Commands",
  concept: "Concepts",
  api: "Apis",
  mixin: "Mixins",
  type: "Types",
  collection: "Collections",
};

/** Strip the `Mixin` suffix from a registry value: `ContainerMixin` → `Container`. */
function stripMixinSuffix(value: string): string {
  return value.endsWith("Mixin") ? value.slice(0, -"Mixin".length) : value;
}

/**
 * Load every authored schema doc; `null` if the directory is absent or a
 * doc is malformed.
 *
 * The mudlib's only legal read: `SourceTreeApi` resolves both the listing
 * and each file against this module's own `import.meta.url`, which is a
 * language construct rather than an import (docs/architecture.md § The
 * import boundary).
 */
function loadSchemaDocsFromDisk(): SchemaDoc[] | null {
  try {
    const dir = "../../../schema";
    const files = SourceTreeApi.listResource(import.meta.url, dir).filter(
      (name) => name.endsWith(".yaml")
    );
    return files.map((file) =>
      SchemaDoc.parse(
        SourceTreeApi.readYamlResource<unknown>(
          import.meta.url,
          `${dir}/${file}`
        ),
        file
      )
    );
  } catch {
    return null;
  }
}

/** Load + parse the author-surface artifact; `null` if absent/unparseable. */
function loadAuthorSurfaceFromDisk(): AuthorSurface | null {
  try {
    return SourceTreeApi.readJsonResource<AuthorSurface>(
      import.meta.url,
      "../../../../docs/api/author-surface.json"
    );
  } catch {
    return null;
  }
}

const HelpCatalogueBase = PostRegistrationMixin(Idea);

export default class HelpCatalogue extends HelpCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /** id → topic. `null` = not yet warmed. */
  private topics: Map<string, HelpTopic> | null = null;
  /** kind → topic ids, sorted by title. */
  private byKind: Map<HelpKind, string[]> = new Map();
  /** One-shot guard so the degrade warning logs exactly once. */
  private warnedMissingSurface = false;
  /** Same, for the schema docs. */
  private warnedMissingSchema = false;

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * (Re)build the index from the two projectors. Injectable for tests:
   *   - `commandDefs` defaults to the full loaded roster (`CommandApi.allDefinitions()`).
   *   - `surface` `undefined` → load from disk; `null` → simulate absent (degrade); object → use it.
   *   - `schema` follows the same three-state convention.
   */
  public async warm(opts?: {
    commandDefs?: CommandDefinition[];
    surface?: AuthorSurface | null;
    schema?: SchemaDoc[] | null;
    concepts?: HelpTopic[] | null;
  }): Promise<void> {
    this.concepts =
      opts === undefined || opts.concepts === undefined
        ? await loadConceptTopics()
        : (opts.concepts ?? []);
    const commandDefs = opts?.commandDefs ?? CommandApi.allDefinitions();
    const surface =
      opts === undefined || opts.surface === undefined
        ? loadAuthorSurfaceFromDisk()
        : opts.surface;
    const schema =
      opts === undefined || opts.schema === undefined
        ? loadSchemaDocsFromDisk()
        : opts.schema;
    const fields = schema === null ? new Map() : await harvestFields(schema);
    this.rebuild(commandDefs, surface, schema, fields);
  }

  /**
   * The authored concept topics, loaded at `warm`. ⚠ Held rather than
   * re-read on every rebuild, because the rebuild is synchronous and
   * reading templates is not.
   */
  private concepts: HelpTopic[] = [];

  /** Drop the warmed index (HMR / admin invalidation). */
  public invalidate(): void {
    this.topics = null;
    this.byKind = new Map();
  }

  /** Re-run the projectors from disk + the live command roster. */
  public async reproject(): Promise<void> {
    await this.warm();
  }

  // ── Read surface (ungated; the chokepoint is HelpApi) ──────────────

  public getTopic(id: string): HelpTopic | null {
    this.ensureWarm();
    return this.topics!.get(id) ?? null;
  }

  public indexSlice(): HelpIndexEntry[] {
    this.ensureWarm();
    return [...this.topics!.values()].map(toIndexEntry);
  }

  public categories(): HelpCategory[] {
    this.ensureWarm();
    const out: HelpCategory[] = [];
    for (const kind of KIND_ORDER) {
      const ids = this.byKind.get(kind) ?? [];
      if (ids.length === 0) continue;
      out.push({ kind, title: KIND_TITLE[kind], count: ids.length });
    }
    return out;
  }

  public listByKind(kind: HelpKind): HelpIndexEntry[] {
    this.ensureWarm();
    const ids = this.byKind.get(kind) ?? [];
    return ids
      .map((id) => this.topics!.get(id))
      .filter((t): t is HelpTopic => t !== undefined)
      .map(toIndexEntry);
  }

  public search(q: string): HelpSearchGroup[] {
    this.ensureWarm();
    const needle = q.trim().toLowerCase();
    if (needle.length === 0) return [];
    const byKind = new Map<HelpKind, HelpIndexEntry[]>();
    for (const topic of this.topics!.values()) {
      const hay = `${topic.summary}\n${topic.body}`.toLowerCase();
      if (!hay.includes(needle)) continue;
      if (!byKind.has(topic.kind)) byKind.set(topic.kind, []);
      byKind.get(topic.kind)!.push(toIndexEntry(topic));
    }
    const out: HelpSearchGroup[] = [];
    for (const kind of KIND_ORDER) {
      const hits = byKind.get(kind);
      if (hits && hits.length > 0) out.push({ kind, hits });
    }
    return out;
  }

  public typeaheadMatch(q: string): HelpIndexEntry[] {
    this.ensureWarm();
    const needle = q.trim().toLowerCase();
    if (needle.length === 0) return [];
    const out: HelpIndexEntry[] = [];
    for (const topic of this.topics!.values()) {
      const hay = [topic.title, ...topic.keywords, topic.kind]
        .join(" ")
        .toLowerCase();
      if (hay.includes(needle)) out.push(toIndexEntry(topic));
    }
    return out;
  }

  public findCommandTopic(verb: string): HelpTopic | null {
    this.ensureWarm();
    const lower = verb.toLowerCase();
    const direct = this.topics!.get(`command.${lower}`);
    if (direct) return direct;
    // Alias scan: a command's keywords carry all its verbs.
    for (const id of this.byKind.get("command") ?? []) {
      const t = this.topics!.get(id);
      if (t && t.keywords.includes(lower)) return t;
    }
    return null;
  }

  /** Resolve a collection topic by name (`bank_ledger` or the full id). */
  public findCollectionTopic(name: string): HelpTopic | null {
    this.ensureWarm();
    const lower = name.trim().toLowerCase();
    return (
      this.topics!.get(lower) ??
      this.topics!.get(`collection.${lower}`) ??
      null
    );
  }

  public findApiTopic(target: string): HelpTopic | null {
    this.ensureWarm();
    // Already-prefixed id, then face.member / bare-name resolution.
    const candidates = [
      target,
      `api.${target}`,
      `mixin.${target}`,
      `type.${target}`,
    ];
    for (const id of candidates) {
      const hit = this.topics!.get(id);
      if (hit) return hit;
    }
    return null;
  }

  // ── Projectors ─────────────────────────────────────────────────────

  private rebuild(
    commandDefs: CommandDefinition[],
    surface: AuthorSurface | null,
    schema: SchemaDoc[] | null,
    fields: Map<string, FieldMeta>
  ): void {
    const topics = new Map<string, HelpTopic>();
    for (const t of this.projectCommands(commandDefs)) topics.set(t.id, t);
    // ⭐⭐ The concept projector. Every other kind is harvested from
    // something that exists for another reason; this one is authored,
    // because *what nitrogen IS* is not derivable from any signature.
    for (const t of this.concepts) topics.set(t.id, t);

    if (schema === null) {
      if (!this.warnedMissingSchema) {
        this.warnedMissingSchema = true;
        console.warn(
          "HelpCatalogue: src/schema/ unreadable — collection topics " +
            "unavailable. Command topics unaffected."
        );
      }
    } else {
      for (const t of projectCollections(schema, fields)) topics.set(t.id, t);
    }

    if (surface === null) {
      if (!this.warnedMissingSurface) {
        this.warnedMissingSurface = true;
        console.warn(
          "HelpCatalogue: author-surface.json absent — api/mixin/type " +
            "topics unavailable (run `pnpm docs`). Command topics unaffected."
        );
      }
    } else {
      for (const t of this.projectApiSurface(surface)) topics.set(t.id, t);
      this.deriveRelations(topics, surface);
    }

    // A collection topic points at the engine surface for its concept:
    // the owner class where that class is itself documented, and the Api
    // face of its owning subsystem. Derived, never authored — and outside
    // the surface guard above, because a collection topic is worth having
    // with or without `author-surface.json`.
    //
    // ⚠ The owner edge is usually dormant: a `Document` subclass is not
    // Stuff and not an Api, so it has no topic of its own. The SUBSYSTEM
    // edge is the one that fires — `banking.md` → `BankingApi` — because
    // a subsystem doc and its Api face are named for the same concept.
    for (const topic of topics.values()) {
      if (topic.kind !== "collection") continue;
      const doc = (schema ?? []).find((d) => d.collection === topic.source.ref);
      if (!doc) continue;
      const stem = doc.subsystem.replace(/\.md$/, "").replace(/-/g, "");
      const candidates = [
        ...(doc.owner ? [`api.${doc.owner}`, `mixin.${doc.owner}`] : []),
        `api.${stem.charAt(0).toUpperCase()}${stem.slice(1)}Api`,
      ];
      for (const id of candidates) {
        const target = topics.get(id);
        if (!target) continue;
        topic.relations.push({
          kind: "see-also",
          targetId: id,
          targetTitle: target.title,
        });
      }
    }

    // Bodies are assembled as plain text — signatures and syntax that
    // naturally carry `<`, `>`, `&` (`Promise<Parser>`, `help <verb>`,
    // `Stuff & Container`). Escape every body once here so `HelpTopic.body`
    // is genuinely valid MML, the contract both the verb renderer and the
    // REST `body` field rely on. (Handing raw `<…>` to `Mml.fromMarkup`
    // makes the client `parseMml` treat it as a tag and drop it.)
    for (const topic of topics.values()) {
      topic.body = Mml.compose`${topic.body}`.toString();
    }

    this.topics = topics;
    this.buildIndexes();
  }

  /** One `HelpTopic` per command, preserving `getHelpText()` verbatim. */
  private projectCommands(defs: CommandDefinition[]): HelpTopic[] {
    const out: HelpTopic[] = [];
    for (const def of defs) {
      const verb = def.getPrimaryVerb();
      if (!verb) continue;
      out.push({
        id: `command.${verb}`,
        kind: "command",
        title: verb,
        summary: def.description ?? "",
        keywords: [...def.verbs, "command"].map((k) => k.toLowerCase()),
        body: def.getHelpText(),
        relations: [],
        spoiler: false,
        source: { subdivision: "commands", ref: verb },
      });
    }
    return out;
  }

  /** The complete mixin/api/type roster — mixins drive completeness. */
  private projectApiSurface(surface: AuthorSurface): HelpTopic[] {
    const out: HelpTopic[] = [];
    const mixinConcepts = this.mixinConcepts();
    const byFace = new Map<string, AuthorSurfaceMember[]>();
    for (const m of surface.consumer) {
      if (!byFace.has(m.face)) byFace.set(m.face, []);
      byFace.get(m.face)!.push(m);
    }

    // 1. Mixins — the complete registry roster (the centerpiece).
    for (const concept of mixinConcepts) {
      const conferred = byFace.get(concept) ?? [];
      const summary =
        conferred.find((m) => m.summary.length > 0)?.summary ?? "";
      out.push({
        id: `mixin.${concept}`,
        kind: "mixin",
        title: concept,
        summary,
        keywords: [concept.toLowerCase(), "mixin"],
        body: renderMixinBody(concept, summary, conferred),
        relations: [],
        spoiler: false,
        source: { subdivision: "api", ref: concept },
      });
    }

    // 2. Api faces — grouped landing + one member topic per static.
    const apiFaces = new Map<string, AuthorSurfaceMember[]>();
    for (const m of surface.consumer) {
      if (m.kind !== "api-static") continue;
      if (!apiFaces.has(m.face)) apiFaces.set(m.face, []);
      apiFaces.get(m.face)!.push(m);
    }
    for (const [face, members] of apiFaces) {
      const ref = members[0]?.module
        ? `${members[0].module}#${face}`
        : face;
      out.push({
        id: `api.${face}`,
        kind: "api",
        title: face,
        summary: members.find((m) => m.summary.length > 0)?.summary ?? "",
        keywords: [face.toLowerCase(), "api"],
        body: renderApiLandingBody(face, members),
        relations: [],
        spoiler: false,
        source: { subdivision: "api", ref },
      });
      for (const m of members) {
        out.push({
          id: `api.${face}.${m.name}`,
          kind: "api",
          title: `${face}.${m.name}`,
          summary: m.summary,
          keywords: [m.name.toLowerCase(), face.toLowerCase(), "api"],
          body: renderMemberBody(m),
          relations: [],
          spoiler: false,
          source: { subdivision: "api", ref: m.qualified },
        });
      }
    }

    // 3. Types — value-objects / option / result shapes (lighter).
    const seen = new Set(out.map((t) => t.id));
    for (const t of surface.types) {
      const kind = classify(t.name, t.module, mixinConcepts);
      if (kind !== "type") continue; // api/mixin already handled
      const id = `type.${t.name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        kind: "type",
        title: t.name,
        summary: "",
        keywords: [t.name.toLowerCase(), "type"],
        body: `${t.name}\n\nDefined in ${t.module}.`,
        relations: [],
        spoiler: false,
        source: { subdivision: "api", ref: `${t.module}#${t.name}` },
      });
    }

    return out;
  }

  /** Derive the typed relation graph across all topics (never authored). */
  private deriveRelations(
    topics: Map<string, HelpTopic>,
    surface: AuthorSurface
  ): void {
    const mixinConcepts = this.mixinConcepts();
    const byFace = new Map<string, AuthorSurfaceMember[]>();
    for (const m of surface.consumer) {
      if (!byFace.has(m.face)) byFace.set(m.face, []);
      byFace.get(m.face)!.push(m);
    }

    // name → consuming api face ids (consumed-by index).
    const consumedBy = new Map<string, Set<string>>();
    for (const m of surface.consumer) {
      if (m.kind !== "api-static") continue;
      const faceId = `api.${m.face}`;
      for (const tname of m.signatureTypes) {
        if (!consumedBy.has(tname)) consumedBy.set(tname, new Set());
        consumedBy.get(tname)!.add(faceId);
      }
    }

    // Helper: a signatureType name → the topic id representing it (if any).
    const topicForType = (name: string): string | null => {
      if (mixinConcepts.has(name) && topics.has(`mixin.${name}`)) {
        return `mixin.${name}`;
      }
      if (topics.has(`type.${name}`)) return `type.${name}`;
      if (topics.has(`api.${name}`)) return `api.${name}`;
      return null;
    };
    const titleOf = (id: string): string => topics.get(id)?.title ?? id;
    const add = (id: string, rel: HelpRelation): void => {
      const t = topics.get(id);
      if (!t) return;
      if (
        t.relations.some(
          (r) =>
            r.kind === rel.kind &&
            r.targetId === rel.targetId &&
            r.targetTitle === rel.targetTitle
        )
      ) {
        return;
      }
      t.relations.push(rel);
    };

    // Api member topics: method-of (→ landing) + requires (→ types/mixins).
    for (const [id, topic] of topics) {
      if (topic.kind !== "api") continue;
      const parts = id.split(".");
      if (parts.length !== 3) continue; // member topic: api.Face.member
      const faceId = `api.${parts[1]}`;
      if (topics.has(faceId)) {
        add(id, {
          kind: "method-of",
          targetId: faceId,
          targetTitle: titleOf(faceId),
        });
      }
      const member = (byFace.get(parts[1]!) ?? []).find(
        (m) => m.name === parts[2]
      );
      for (const tname of member?.signatureTypes ?? []) {
        const target = topicForType(tname);
        if (target && target !== id) {
          add(id, { kind: "requires", targetId: target, targetTitle: titleOf(target) });
        }
      }
    }

    // Mixin topics: confers / composes / consumed-by.
    for (const concept of mixinConcepts) {
      const id = `mixin.${concept}`;
      const conferred = byFace.get(concept) ?? [];
      for (const m of conferred) {
        // Conferred methods are rendered inline in the mixin body this
        // wave (not standalone topics), so the edge resolves to the mixin
        // topic that documents them; the method name rides `targetTitle`.
        // Per-member drill-in topics are a later wave.
        add(id, {
          kind: "confers",
          targetId: id,
          targetTitle: m.name,
        });
        for (const tname of m.signatureTypes) {
          if (tname === concept) continue;
          if (mixinConcepts.has(tname) && topics.has(`mixin.${tname}`)) {
            add(id, {
              kind: "composes",
              targetId: `mixin.${tname}`,
              targetTitle: tname,
            });
          }
        }
      }
      for (const faceId of consumedBy.get(concept) ?? []) {
        add(id, {
          kind: "consumed-by",
          targetId: faceId,
          targetTitle: titleOf(faceId),
        });
      }
    }

    // Type topics: consumed-by.
    for (const [id, topic] of topics) {
      if (topic.kind !== "type") continue;
      const name = id.slice("type.".length);
      for (const faceId of consumedBy.get(name) ?? []) {
        add(id, {
          kind: "consumed-by",
          targetId: faceId,
          targetTitle: titleOf(faceId),
        });
      }
    }

    // see-also: same-module siblings among api faces / mixins / types.
    const moduleOf = new Map<string, string>();
    for (const t of surface.types) moduleOf.set(t.name, t.module);
    for (const m of surface.consumer) moduleOf.set(m.face, m.module);
    const byModule = new Map<string, string[]>(); // module → topic ids
    for (const [id, topic] of topics) {
      if (topic.kind === "command") continue;
      const parts = id.split(".");
      if (parts.length !== 2) continue; // landing / mixin / type topics only
      const mod = moduleOf.get(parts[1]!);
      if (!mod) continue;
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod)!.push(id);
    }
    for (const ids of byModule.values()) {
      if (ids.length < 2) continue;
      for (const a of ids) {
        for (const b of ids) {
          if (a === b) continue;
          add(a, { kind: "see-also", targetId: b, targetTitle: titleOf(b) });
        }
      }
    }
  }

  /** The set of mixin concept names (stripped registry values). */
  private mixinConcepts(): Set<string> {
    return new Set(Object.values(Mixins).map(stripMixinSuffix));
  }

  private buildIndexes(): void {
    const byKind = new Map<HelpKind, string[]>();
    for (const topic of this.topics!.values()) {
      if (!byKind.has(topic.kind)) byKind.set(topic.kind, []);
      byKind.get(topic.kind)!.push(topic.id);
    }
    for (const ids of byKind.values()) {
      ids.sort((a, b) => {
        const ta = this.topics!.get(a)!.title;
        const tb = this.topics!.get(b)!.title;
        return ta.localeCompare(tb);
      });
    }
    this.byKind = byKind;
  }

  private ensureWarm(): void {
    // A unit test (or a read before boot) may touch the surface before
    // warm — start empty so reads return empties rather than throwing.
    if (this.topics === null) {
      this.topics = new Map();
      this.byKind = new Map();
    }
  }

  /** Singleton refusal (mirrors RecipeCatalogue / TopicCatalogue). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        "HelpCatalogue is a system singleton and cannot be destructed; " +
        "use forceDestruct (admin-gated) if you really mean it",
    };
  }
}


// ── The collection projector — one topic per authored schema doc ──────

/**
 * Resolve each doc's owner class and harvest its `fieldMeta`.
 *
 * ⭐ D3, made real: the doc does NOT carry a field list. `fieldMeta` is
 * what the `Hydrator` actually reflects on, so a YAML restating it would
 * be two copies of one sentence and the copy that drifts is the one
 * nobody executes. Adding a persistent field to `LedgerEntry` changes
 * `help bank_ledger` with no edit to `bank_ledger.yaml`.
 *
 * `StuffApi.loadClassByPath` is the one place a class path becomes a
 * class — `ownerModule` is gated by `pnpm lint:schema` against the file
 * the class is really declared in, so it cannot dangle. A resolve that
 * fails anyway degrades to no field list rather than to no topic: the
 * purpose and the invariants are still worth reading.
 */
async function harvestFields(
  docs: SchemaDoc[]
): Promise<Map<string, FieldMeta>> {
  const out = new Map<string, FieldMeta>();
  for (const doc of docs) {
    if (doc.ownerModule === null) continue;
    try {
      const owner = await StuffApi.loadClassByPath(doc.ownerModule);
      if (typeof owner !== 'function') continue;
      out.set(doc.collection, MixinApi.getAllFieldMeta(owner as AnyConstructor));
    } catch {
      // Degrade to no field list; the rest of the topic still reads.
    }
  }
  return out;
}

/** The sandbox policy in plain words — never `{ verb: 'stamp' }`. */
function sandboxSentence(doc: SchemaDoc): string {
  const policy = doc.sandbox;
  switch (policy.verb) {
    case 'stamp':
      return (
        'Inside a sandbox circle, a write here is STAMPED with the ' +
        'circle: it happens for real while you are in there, field reads ' +
        'never see it, and leaving the circle discards it.'
      );
    case 'refuse':
      return (
        'Inside a sandbox circle, a write here is REFUSED. This holds ' +
        'state the world outside the circle depends on, and a circle may ' +
        'not change it.'
      );
    case 'pass':
      return policy.mark
        ? 'Inside a sandbox circle, a write here PASSES — it is real and ' +
            'it stays — and the row is marked with the circle it happened ' +
            'in. Nothing filters reads by that mark.'
        : 'Inside a sandbox circle, a write here PASSES: it is real and ' +
            'it stays. What governs it is title, not where you were standing.';
    case 'shadow':
      return (
        'Inside a sandbox circle, a write here is SKIPPED. This is a ' +
        'rebuildable cache, and a reader in a circle derives the answer ' +
        'live from the ledger underneath instead.'
      );
  }
}

/** The reset disposition in plain words. */
function resetSentence(doc: SchemaDoc): string {
  const reset = doc.reset;
  if (reset.verb === 'wipe') {
    return 'The nightly reset EMPTIES this collection.';
  }
  if (reset.verb === 'keep') {
    return `The nightly reset KEEPS this collection, because ${reset.because}.`;
  }
  return (
    'The nightly reset empties this collection EXCEPT the rows it is ' +
    `told to spare, because ${reset.because}.`
  );
}

/** `{ subject: 1, at: -1 }` → `subject ascending, at descending`. */
function keyPhrase(keys: Readonly<Record<string, 1 | -1 | 'text'>>): string {
  return Object.entries(keys)
    .map(([field, direction]) => {
      if (direction === 'text') return `${field} (full text)`;
      return `${field} ${direction === 1 ? 'ascending' : 'descending'}`;
    })
    .join(', ');
}

/** The field list, harvested from the owner class. */
function fieldLines(meta: FieldMeta | undefined): string[] {
  if (!meta) return [];
  const rows: string[] = [];
  for (const [field, entry] of Object.entries(meta)) {
    if (!entry) continue;
    const notes: string[] = [];
    if (entry.persistent) notes.push('stored');
    if (entry.instruction) notes.push('applied at hydrate');
    if (entry.marshaller) notes.push(`via ${entry.marshaller}`);
    if (entry.globIdentity) notes.push('part of glob identity');
    if (entry.ref) notes.push(`points at other stuff (${entry.ref})`);
    if (entry.lifetime) notes.push(`lifetime ${entry.lifetime}`);
    rows.push(
      notes.length > 0 ? `  ${field} — ${notes.join(', ')}` : `  ${field}`
    );
  }
  return rows;
}

/** Assemble the body of one collection topic. */
function renderCollectionBody(doc: SchemaDoc, meta: FieldMeta | undefined): string {
  const lines: string[] = [doc.collection, '', doc.purpose];

  if (doc.invariants.length > 0) {
    lines.push('', 'Always true here:');
    for (const invariant of doc.invariants) lines.push(`  - ${invariant}`);
  }

  const fields = fieldLines(meta);
  if (fields.length > 0) {
    lines.push('', `Fields (from ${doc.owner}):`, ...fields);
  } else if (doc.owner) {
    lines.push('', `Written by ${doc.owner}.`);
  } else {
    lines.push(
      '',
      'No record class owns this collection — everything that writes here ' +
        'goes straight through PersistApi.'
    );
  }

  if (doc.indexes.length > 0) {
    lines.push('', 'Indexes, and what each one is for:');
    for (const index of doc.indexes) {
      const flags: string[] = [];
      if (index.unique) flags.push('unique');
      if (index.text) flags.push('full-text');
      if (index.expireAfterSeconds !== undefined) flags.push('expiring');
      const head = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      lines.push(`  ${keyPhrase(index.keys)}${head}`);
      for (const line of index.why.split('\n')) {
        if (line.trim().length > 0) lines.push(`    ${line.trim()}`);
      }
    }
  } else {
    lines.push('', 'No indexes — nothing queries this by anything but its id.');
  }

  lines.push('', sandboxSentence(doc), '', resetSentence(doc));
  lines.push('', `The subsystem doc that owns this: docs/subsystems/${doc.subsystem}`);
  return lines.join('\n');
}

/**
 * One `HelpTopic` per schema doc — the third projector, harvesting
 * exactly as the other two do. Nothing is registered; the directory IS
 * the roster.
 */
function projectCollections(
  docs: SchemaDoc[],
  fields: Map<string, FieldMeta>
): HelpTopic[] {
  const out: HelpTopic[] = [];
  for (const doc of docs) {
    out.push({
      id: `collection.${doc.collection}`,
      kind: 'collection',
      title: doc.collection,
      summary: doc.summary,
      keywords: [
        doc.collection,
        ...doc.collection.split('_'),
        ...(doc.owner ? [doc.owner.toLowerCase()] : []),
        'collection',
        'persistence',
      ],
      body: renderCollectionBody(doc, fields.get(doc.collection)),
      relations: [],
      // ⚠ Never a spoiler: how the world remembers things is not a
      // secret, and the capability floor this cycle is anonymous.
      spoiler: false,
      source: { subdivision: 'persistence', ref: doc.collection },
    });
  }
  return out;
}

// ── Pure render helpers — assemble topic bodies as plain text; rebuild()
//    escapes each one to valid MML before the index is published. ───────

function toIndexEntry(t: HelpTopic): HelpIndexEntry {
  return {
    id: t.id,
    kind: t.kind,
    title: t.title,
    summary: t.summary,
    keywords: t.keywords,
  };
}

function classify(
  name: string,
  module: string,
  mixinConcepts: Set<string>
): HelpKind {
  if (mixinConcepts.has(name)) return "mixin";
  if (name.endsWith("Api") && module.startsWith("api/")) return "api";
  return "type";
}

function renderMixinBody(
  concept: string,
  summary: string,
  conferred: AuthorSurfaceMember[]
): string {
  const lines: string[] = [concept];
  if (summary) lines.push("", summary);
  if (conferred.length === 0) {
    lines.push("", "(no authored documentation)");
    return lines.join("\n");
  }
  lines.push("", "Confers:");
  for (const m of conferred) {
    lines.push(`  ${m.signature}`);
    if (m.summary) lines.push(`    ${m.summary}`);
  }
  return lines.join("\n");
}

function renderApiLandingBody(
  face: string,
  members: AuthorSurfaceMember[]
): string {
  const lines: string[] = [face, "", "Members:"];
  for (const m of members) {
    lines.push(`  ${m.signature}`);
    if (m.summary) lines.push(`    ${m.summary}`);
  }
  return lines.join("\n");
}

function renderMemberBody(m: AuthorSurfaceMember): string {
  const lines: string[] = [m.signature];
  if (m.summary) lines.push("", m.summary);
  if (m.params && m.params.length > 0) {
    lines.push("", "Parameters:");
    for (const p of m.params) lines.push(`  ${p.name} — ${p.text}`);
  }
  if (m.returns) lines.push("", `Returns: ${m.returns}`);
  if (m.examples && m.examples.length > 0) {
    lines.push("", "Examples:");
    for (const ex of m.examples) lines.push(`  ${ex}`);
  }
  return lines.join("\n");
}

/**
 * Load every authored concept as a help topic.
 *
 * ⭐ It reads **templates**, not residents: a concept has no runtime
 * existence and cloning one would be meaningless, so `HelpConcept` rows
 * are reference data the same way a `Discipline` row is.
 *
 * ⚠ A row missing its key or title is skipped LOUDLY rather than taking
 * the index down with it — the `ArchetypeCatalogue` rule, and the reason
 * a malformed pack row degrades one topic instead of the rulebook.
 */
async function loadConceptTopics(): Promise<HelpTopic[]> {
  let rows: Array<{ data?: Record<string, unknown> }> = [];
  try {
    const { Template } = await import("../../lib/stuff/Template");
    rows = (await Template.findByClass(
      "/platform/idea/HelpConcept",
    )) as unknown as Array<{ data?: Record<string, unknown> }>;
  } catch {
    // No store (pre-boot, a unit test): no concepts, and every other
    // projector is unaffected.
    return [];
  }
  const out: HelpTopic[] = [];
  for (const row of rows) {
    const d = row.data ?? {};
    const key = typeof d.key === "string" ? d.key : "";
    const title = typeof d.title === "string" ? d.title : "";
    if (key === "" || title === "") {
      console.warn("HelpCatalogue: skipping a HelpConcept with no key/title");
      continue;
    }
    const keywords = Array.isArray(d.keywords)
      ? (d.keywords as unknown[]).filter((k): k is string => typeof k === "string")
      : [];
    const seeAlso = Array.isArray(d.seeAlso)
      ? (d.seeAlso as unknown[]).filter((k): k is string => typeof k === "string")
      : [];
    out.push({
      id: `concept.${key}`,
      kind: "concept",
      title,
      summary: typeof d.summary === "string" ? d.summary : "",
      keywords: [key, ...keywords],
      body: typeof d.body === "string" ? d.body : "",
      relations: seeAlso.map((other) => ({
        kind: "see-also" as const,
        targetId: `concept.${other}`,
        targetTitle: other,
      })),
      spoiler: false,
      source: { subdivision: "commands", ref: `concept:${key}` },
    });
  }
  return out;
}
