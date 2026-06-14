/**
 * project-author-surface — the three-tier author-surface projection
 * over TypeDoc's `api-model.json`.
 *
 * The surface-architecture refactor makes the author-facing doc surface
 * a *computed projection*, not a hand-curated index. This script reads
 * the TypeDoc model and emits `author-surface.json` (the model the
 * in-game `help api` browser / web view will read) partitioned into:
 *
 *   - **consumer** — what an author *calls*: public `static` methods of
 *     `*Api` classes, plus public instance *methods* of author-facing
 *     `Stuff`/mixin classes (fields and accessor pairs are excluded —
 *     the inter-stuff "methods are the contract" rule as a doc filter).
 *   - **extension** — what an author *implements* and the framework
 *     *invokes*: members whose comment carries the `@hook` tag, plus
 *     every member that overrides a known framework hook by name (the
 *     `@hook` contract lives once on the canonical declaration; the
 *     ~190 `onDestruct` overrides etc. are recognized by name rather
 *     than re-tagged at every site, since TypeDoc's `overwrites` link
 *     carries no resolvable id). Grouped one entry per hook.
 *   - **types** — the transitive closure of input/output types named in
 *     the signatures of the consumer + extension members, wherever they
 *     physically live.
 *
 * `@internal` reflections are already dropped by TypeDoc
 * (`excludeInternal: true`); the projection drops any stragglers.
 *
 * It also emits the **re-export report** (lint #2): faces (Api/mixin
 * modules) that speak a named type in a signature but do not re-export
 * it from the face. Advisory (WARN): the residual gaps are
 * capability/mixin interfaces that legitimately ride their own
 * concept's face, so this report stays informational rather than
 * CI-gating (only lint #1, the gate-string resolver, gates CI).
 *
 * Pure logic (`projectAuthorSurface`) is exported for unit testing on a
 * small fixture model; the CLI tail reads/writes the real files.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

// ── TypeDoc ReflectionKind values we discriminate on ────────────────
const Kind = {
  Module: 2,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  Accessor: 262144,
  TypeAlias: 2097152,
  Enum: 8,
  Function: 64,
  Reference: 4194304,
} as const;

// ── Loose structural views of the TypeDoc JSON (a build script reading
//    an external schema; full typings aren't worth vendoring). ───────
export interface Refl {
  id?: number;
  name: string;
  kind: number;
  variant?: string;
  flags?: {
    isStatic?: boolean;
    isPrivate?: boolean;
    isProtected?: boolean;
    isPublic?: boolean;
  };
  comment?: { blockTags?: Array<{ tag: string; content?: TextPart[] }> };
  signatures?: Refl[];
  parameters?: Refl[];
  type?: TdType;
  children?: Refl[];
  target?: number | unknown;
  // Set by TypeDoc on members copied from / overriding an ancestor.
  inheritedFrom?: unknown;
  overwrites?: unknown;
}

interface TextPart {
  kind: string;
  text: string;
}

type TdType = {
  type?: string;
  name?: string;
  target?: number | unknown;
  elementType?: TdType;
  types?: TdType[];
  elements?: TdType[];
  typeArguments?: TdType[];
  [k: string]: unknown;
};

export interface ConsumerMember {
  kind: "api-static" | "stuff-method";
  module: string;
  face: string; // the class the method lives on
  name: string;
  qualified: string; // module#Face.name
}

/**
 * Framework-invoked override hooks recognized by name. The `@hook`
 * contract is authored once on each hook's canonical declaration; these
 * names let the projection route the (many) overrides into the
 * extension tier without re-tagging every site. `save` / `onLinkdead`
 * etc. that are too generic to match by name are instead tagged
 * `@hook` directly on their canonical reflection and caught by the
 * comment branch.
 */
export const HOOK_NAMES: ReadonlySet<string> = new Set([
  "onDestruct",
  "canDestruct",
  "postRegister",
  "aroundSave",
  "aroundDelete",
  "onLinkdead",
  "applyExits",
  "applyDetails",
  "applyContainer",
  "applyPopulates",
  "applyRoutes",
]);

/** One distinct extension hook + the faces that implement it. */
export interface ExtensionHook {
  name: string;
  contract: string; // the @hook contract (from the canonical declaration)
  faces: string[]; // qualified names of declaring/overriding members
}

export interface TypeEntry {
  id: number;
  name: string;
  module: string;
  kind: number;
}

export interface ReexportIssue {
  face: string; // module that speaks the type
  member: string; // qualified member naming it
  type: string; // type name not re-exported from the face
  definedIn: string; // module that defines the type
}

export interface AuthorSurface {
  consumer: ConsumerMember[];
  extension: ExtensionHook[];
  types: TypeEntry[];
}

export interface ProjectionResult {
  surface: AuthorSurface;
  reexportReport: ReexportIssue[];
}

function hookContract(refl: Refl): string | null {
  const bags = [refl.comment, ...(refl.signatures ?? []).map((s) => s.comment)];
  for (const c of bags) {
    const tag = c?.blockTags?.find((t) => t.tag === "@hook");
    if (tag) {
      return (tag.content ?? []).map((p) => p.text).join("").trim();
    }
  }
  return null;
}

function isApiClass(cls: Refl, module: string): boolean {
  return (
    cls.kind === Kind.Class &&
    cls.name.endsWith("Api") &&
    module.startsWith("mud/api/")
  );
}

/** Collect every project-internal named-type id referenced by a type. */
function collectTypeRefs(t: TdType | undefined, into: Set<number>): void {
  if (!t || typeof t !== "object") return;
  if (t.type === "reference" && typeof t.target === "number" && t.target > 0) {
    into.add(t.target);
  }
  if (t.elementType) collectTypeRefs(t.elementType, into);
  for (const sub of t.types ?? []) collectTypeRefs(sub, into);
  for (const sub of t.elements ?? []) collectTypeRefs(sub, into);
  for (const sub of t.typeArguments ?? []) collectTypeRefs(sub, into);
  // typeOperator / named-tuple-member / optional / rest wrap a `target`
  // or `element` type object.
  const targetObj = t.target;
  if (targetObj && typeof targetObj === "object") {
    collectTypeRefs(targetObj as TdType, into);
  }
  if (t.element && typeof t.element === "object") {
    collectTypeRefs(t.element as TdType, into);
  }
}

function signatureTypeRefs(member: Refl, into: Set<number>): void {
  for (const sig of member.signatures ?? []) {
    for (const p of sig.parameters ?? []) collectTypeRefs(p.type, into);
    collectTypeRefs(sig.type, into);
  }
}

/**
 * Build the three-tier author surface + the re-export report from a
 * TypeDoc project model. Pure — no IO.
 */
export function projectAuthorSurface(project: Refl): ProjectionResult {
  const consumer: ConsumerMember[] = [];
  // hook name → { contract, faces } accumulated across the codebase.
  const extensionByName = new Map<string, { contract: string; faces: string[] }>();
  const referencedTypeIds = new Set<number>();

  // id → { refl, module } for every reflection, so type refs resolve.
  const byId = new Map<number, { refl: Refl; module: string }>();
  // type name → modules that DEFINE it (a named type declaration).
  const typeDefModules = new Map<string, Set<string>>();
  // module name → set of child names it declares/re-exports (the face's
  // exported surface, used by the re-export check).
  const moduleExports = new Map<string, Set<string>>();
  // Per (face member) referenced type names, for the re-export report.
  const memberTypeRefs: Array<{
    module: string;
    member: string;
    typeIds: Set<number>;
  }> = [];

  const modules: Refl[] = [];
  (function indexModules(n: Refl): void {
    if (n.kind === Kind.Module) modules.push(n);
    for (const c of n.children ?? []) indexModules(c);
  })(project);

  // First pass: index every reflection by id + record module exports +
  // type definitions.
  for (const mod of modules) {
    const exportNames = new Set<string>();
    for (const child of mod.children ?? []) {
      exportNames.add(child.name);
      if (typeof child.id === "number") {
        byId.set(child.id, { refl: child, module: mod.name });
      }
      // A named-type *definition* (alias / interface / enum). Classes
      // can also be used as types, but their home is their declaration.
      if (
        child.kind === Kind.TypeAlias ||
        child.kind === Kind.Interface ||
        child.kind === Kind.Enum ||
        child.kind === Kind.Class
      ) {
        if (!typeDefModules.has(child.name)) {
          typeDefModules.set(child.name, new Set());
        }
        // A `Reference` child (kind 4194304) is a re-export, not a
        // definition — don't count it as the type's home.
        if (child.variant !== "reference") {
          typeDefModules.get(child.name)!.add(mod.name);
        }
      }
      // Index nested members (methods) by id too.
      for (const m of child.children ?? []) {
        if (typeof m.id === "number") {
          byId.set(m.id, { refl: m, module: mod.name });
        }
      }
    }
    moduleExports.set(mod.name, exportNames);
  }

  // Helper: record an extension hook occurrence (deduped by name; the
  // first non-empty contract wins — that's the canonical @hook decl).
  function addExtension(name: string, contract: string, qualified: string): void {
    let entry = extensionByName.get(name);
    if (!entry) {
      entry = { contract: "", faces: [] };
      extensionByName.set(name, entry);
    }
    if (!entry.contract && contract) entry.contract = contract;
    entry.faces.push(qualified);
  }

  // Second pass: classify members into tiers.
  for (const mod of modules) {
    for (const cls of mod.children ?? []) {
      if (cls.kind !== Kind.Class && cls.kind !== Kind.Interface) continue;
      const apiClass = isApiClass(cls, mod.name);
      for (const member of cls.children ?? []) {
        if (member.kind === Kind.Constructor) continue;
        if (member.flags?.isPrivate) continue;
        // Inherited copies aren't new surface — the declaring face
        // documents them. Skip to avoid ~11.7k duplicate entries.
        if (member.inheritedFrom) continue;

        const ownContract = hookContract(member);
        const isHookName = HOOK_NAMES.has(member.name);
        const qualified = `${mod.name}#${cls.name}.${member.name}`;

        // Extension tier: explicit @hook OR a known framework-hook name.
        if (ownContract !== null || isHookName) {
          addExtension(member.name, ownContract ?? "", qualified);
          const ids = new Set<number>();
          signatureTypeRefs(member, ids);
          for (const id of ids) referencedTypeIds.add(id);
          memberTypeRefs.push({ module: mod.name, member: qualified, typeIds: ids });
          continue;
        }

        // Consumer tier is methods-only: skip fields + accessor pairs.
        if (member.kind !== Kind.Method) continue;
        // Protected non-hook methods aren't consumer surface.
        if (member.flags?.isProtected) continue;

        const isStaticApi = apiClass && member.flags?.isStatic === true;
        const isStuffMethod = !apiClass && member.flags?.isStatic !== true;
        if (!isStaticApi && !isStuffMethod) continue;

        consumer.push({
          kind: isStaticApi ? "api-static" : "stuff-method",
          module: mod.name,
          face: cls.name,
          name: member.name,
          qualified,
        });
        const ids = new Set<number>();
        signatureTypeRefs(member, ids);
        for (const id of ids) referencedTypeIds.add(id);
        memberTypeRefs.push({ module: mod.name, member: qualified, typeIds: ids });
      }
    }
  }

  const extension: ExtensionHook[] = [...extensionByName.entries()]
    .map(([name, e]) => ({ name, contract: e.contract, faces: e.faces.sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Resolve referenced type ids to their reflections (the type closure).
  const types: TypeEntry[] = [];
  const seenTypeIds = new Set<number>();
  for (const id of referencedTypeIds) {
    if (seenTypeIds.has(id)) continue;
    seenTypeIds.add(id);
    const hit = byId.get(id);
    if (!hit) continue;
    // Only named types belong in the types tier (not methods/etc.).
    if (
      hit.refl.kind === Kind.TypeAlias ||
      hit.refl.kind === Kind.Interface ||
      hit.refl.kind === Kind.Enum ||
      hit.refl.kind === Kind.Class
    ) {
      types.push({
        id,
        name: hit.refl.name,
        module: hit.module,
        kind: hit.refl.kind,
      });
    }
  }
  types.sort((a, b) => a.name.localeCompare(b.name));

  // Re-export report: an author-facing Api face that speaks a named
  // *domain* type defined in a DIFFERENT module should re-export it (so
  // authors import it from the face). Flag faces that don't.
  //
  // Scope is the **author surface** (`mud/api/` faces only) — backend/
  // and internal lib-to-lib faces follow the plain upstream-owner rule,
  // not fan-out re-export. Foundational base types (defined under
  // `mud/lib/stuff/` — Stuff/Idea/Thing/Template) and anonymous default
  // exports are excluded: "types ride their face" is for domain types,
  // not the ubiquitous bases every signature mentions. Advisory (WARN)
  // — see the script footer.
  const reexportReport: ReexportIssue[] = [];
  const seenIssue = new Set<string>();
  for (const ref of memberTypeRefs) {
    if (!ref.module.startsWith("mud/api/")) continue; // author surface only
    const faceExports = moduleExports.get(ref.module) ?? new Set<string>();
    for (const id of ref.typeIds) {
      const hit = byId.get(id);
      if (!hit) continue;
      const tname = hit.refl.name;
      const definedIn = hit.module;
      if (tname === "default") continue; // anonymous default export
      if (definedIn.startsWith("mud/lib/stuff/")) continue; // foundational base
      if (definedIn === ref.module) continue; // local — nothing to re-export
      if (faceExports.has(tname)) continue; // already re-exported
      const key = `${ref.module}|${tname}`;
      if (seenIssue.has(key)) continue;
      seenIssue.add(key);
      reexportReport.push({
        face: ref.module,
        member: ref.member,
        type: tname,
        definedIn,
      });
    }
  }

  consumer.sort((a, b) => a.qualified.localeCompare(b.qualified));
  reexportReport.sort((a, b) => a.face.localeCompare(b.face));

  return { surface: { consumer, extension, types }, reexportReport };
}

// ── CLI ─────────────────────────────────────────────────────────────

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const modelPath =
    process.argv[2] ?? resolve(here, "..", "docs", "api", "api-model.json");
  const outPath =
    process.argv[3] ?? join(dirname(modelPath), "author-surface.json");

  const project = JSON.parse(readFileSync(modelPath, "utf8")) as Refl;
  const { surface, reexportReport } = projectAuthorSurface(project);

  writeFileSync(outPath, JSON.stringify(surface, null, 2));

  console.log(
    `author-surface: ${surface.consumer.length} consumer, ` +
      `${surface.extension.length} extension, ${surface.types.length} types ` +
      `→ ${outPath}`
  );

  if (reexportReport.length > 0) {
    console.warn(
      `\n[lint #2 — WARN] ${reexportReport.length} face(s) speak a type ` +
        `they do not re-export (every-face-re-exports-its-signature-types):`
    );
    for (const r of reexportReport.slice(0, 50)) {
      console.warn(
        `  ${r.face} speaks ${r.type} (defined in ${r.definedIn}) ` +
          `via ${r.member}`
      );
    }
    if (reexportReport.length > 50) {
      console.warn(`  … and ${reexportReport.length - 50} more`);
    }
    console.warn(
      `[lint #2] ADVISORY (WARN, never CI-failing). The remaining gaps ` +
        `are foundational capability/mixin interfaces (Container, Sensor, ` +
        `Mobile, …) that an Api mentions as a *parameter* type — those ` +
        `ride their OWN mixin/concept face, not every consumer's. The ` +
        `enforced convention is narrower: a face re-exports its OWN ` +
        `domain types (its result/option/handle shapes), checked per-Api ` +
        `at conversion. A face speaking a foreign domain type it owns the ` +
        `surface for is the real signal to act on.`
    );
  }
  // Advisory: always exit 0 (see the lint #2 note above).
}

// Run only when invoked directly (not when imported by the test).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
