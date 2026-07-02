/**
 * HelpCatalogue — singleton Idea owning the boot-warmed help index.
 *
 * Lives at `/obj/HelpCatalogue` (the singleton-in-`obj/` convention,
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
 * Not a persisted record — the seed YAML is `{ class: /obj/HelpCatalogue,
 * data: {} }`; the index is rebuilt on demand by the projectors.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import type {
  HelpTopic,
  HelpKind,
  HelpIndexEntry,
  HelpCategory,
  HelpRelation,
  HelpSearchGroup,
} from "@saxonberg/types";
import { Idea } from "../lib/stuff/Idea";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { Mixins } from "../lib/mixin";
import { CommandApi } from "../api/command";
import { Mml } from "../api/mml";
import type { CommandDefinition } from "../lib/command/CommandDefinition";
import type { VetoResult } from "../lib/errors";
import type { EvictionContext } from '../lib/stuff/Stuff';

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
const KIND_ORDER: HelpKind[] = ["command", "api", "mixin", "type"];
const KIND_TITLE: Record<HelpKind, string> = {
  command: "Commands",
  api: "Apis",
  mixin: "Mixins",
  type: "Types",
};

/** Strip the `Mixin` suffix from a registry value: `ContainerMixin` → `Container`. */
function stripMixinSuffix(value: string): string {
  return value.endsWith("Mixin") ? value.slice(0, -"Mixin".length) : value;
}

/** Load + parse the author-surface artifact; `null` if absent/unparseable. */
function loadAuthorSurfaceFromDisk(): AuthorSurface | null {
  try {
    const path = fileURLToPath(
      new URL("../../../docs/api/author-surface.json", import.meta.url)
    );
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as AuthorSurface;
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

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * (Re)build the index from the two projectors. Injectable for tests:
   *   - `commandDefs` defaults to the full loaded roster (`CommandApi.allDefinitions()`).
   *   - `surface` `undefined` → load from disk; `null` → simulate absent (degrade); object → use it.
   */
  public async warm(opts?: {
    commandDefs?: CommandDefinition[];
    surface?: AuthorSurface | null;
  }): Promise<void> {
    const commandDefs = opts?.commandDefs ?? CommandApi.allDefinitions();
    const surface =
      opts === undefined || opts.surface === undefined
        ? loadAuthorSurfaceFromDisk()
        : opts.surface;
    this.rebuild(commandDefs, surface);
  }

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
    surface: AuthorSurface | null
  ): void {
    const topics = new Map<string, HelpTopic>();
    for (const t of this.projectCommands(commandDefs)) topics.set(t.id, t);

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
