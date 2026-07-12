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
    isOptional?: boolean;
    isRest?: boolean;
  };
  comment?: {
    summary?: TextPart[];
    blockTags?: Array<{ tag: string; content?: TextPart[] }>;
  };
  signatures?: Refl[];
  parameters?: Refl[];
  type?: TdType;
  children?: Refl[];
  target?: number | unknown;
  /** TypeDoc serializes a parameter's default value as a string. */
  defaultValue?: string;
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
  /** Rendered readable signature: `name(p: T, ...): Ret`. */
  signature: string;
  /** First-paragraph TSDoc summary; `''` when absent. */
  summary: string;
  /** `@param` entries, in declaration order. Omitted when none. */
  params?: { name: string; text: string }[];
  /** `@returns` text. Omitted when none. */
  returns?: string;
  /** `@example` blocks, verbatim. Omitted when none. */
  examples?: string[];
  /** Named project-types in params+return (the relation join key). */
  signatureTypes: string[];
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

// ── @authorable projector (Studio / composition surface) ────────────
//
// A second pass over the same TypeDoc model, emitting the
// `authorable-fields.json` artifact the composer form generator reads.
// A mixin's author-facing fields carry the `@authorable` block tag; its
// runtime-state fields carry `@runtimeState`. The pass classifies every
// declared persistent/instruction field as exactly one of the two (the
// coverage audit) and projects a widget-selection descriptor for the
// authorable ones.
//
// These interfaces mirror `AuthorableFieldDescriptor` /
// `AuthorableFieldsArtifact` in `@saxonberg/types` — kept local here for
// the same reason `AuthorSurface` is (a build script reading an external
// schema shouldn't drag the types package into its resolution).

export interface AuthorableFieldDescriptor {
  mixin: string;
  field: string;
  kind: "property" | "instruction";
  typeShape: string;
  description: string;
  enumValues?: string[];
  refShape?: "path";
  refType?: string;
}

export interface AuthorableFieldsArtifact {
  fields: Record<string, AuthorableFieldDescriptor[]>;
  coverage: {
    unclassified: string[];
    doubleClassified: string[];
  };
}

/**
 * Return the `@authorable` tag's content (possibly `''`) when a member
 * carries it, else `null`. Shaped like {@link hookContract}. The tag
 * body may name a ref target: `@authorable ref:Material`.
 */
function authorableTag(refl: Refl): string | null {
  const bags = [refl.comment, ...(refl.signatures ?? []).map((s) => s.comment)];
  for (const c of bags) {
    const tag = c?.blockTags?.find((t) => t.tag === "@authorable");
    if (tag) return (tag.content ?? []).map((p) => p.text).join("").trim();
  }
  return null;
}

/** Whether a member carries the `@runtimeState` marker. */
function hasRuntimeStateTag(refl: Refl): boolean {
  const bags = [refl.comment, ...(refl.signatures ?? []).map((s) => s.comment)];
  return bags.some((c) =>
    (c?.blockTags ?? []).some((t) => t.tag === "@runtimeState"),
  );
}

/**
 * Read a static string-array member (`persistentFields` /
 * `instructionFields`) off a class reflection. TypeDoc serializes the
 * literal either as a `tuple` type of `literal` elements or — when it
 * collapses the initializer — a parseable `defaultValue` array string.
 * Returns `[]` when neither is readable (the field set is unknown).
 */
function readStaticStringArray(cls: Refl, fieldName: string): string[] {
  const child = (cls.children ?? []).find((c) => c.name === fieldName);
  if (!child) return [];
  const t = child.type as TdType | undefined;
  if (t && t.type === "tuple" && Array.isArray(t.elements)) {
    const out: string[] = [];
    for (const el of t.elements) {
      const v = (el as { value?: unknown }).value;
      if (typeof v === "string") out.push(v);
    }
    if (out.length > 0) return out;
  }
  const dv = child.defaultValue;
  if (typeof dv === "string" && dv.includes("[")) {
    return [...dv.matchAll(/['"]([\w.-]+)['"]/g)].map((m) => m[1]!);
  }
  return [];
}

/**
 * Read a static string-literal member's value (e.g. `_mixinName`).
 * TypeDoc stores it as a quoted `defaultValue` (`"'NamedMixin'"`) or a
 * `literal` type. Returns `null` when absent.
 */
function readStaticStringLiteral(cls: Refl, fieldName: string): string | null {
  const child = (cls.children ?? []).find((c) => c.name === fieldName);
  if (!child) return null;
  const t = child.type as TdType | undefined;
  if (t && t.type === "literal") {
    const v = (t as { value?: unknown }).value;
    if (typeof v === "string") return v;
  }
  const dv = child.defaultValue;
  if (typeof dv === "string") {
    const m = dv.match(/^['"](.*)['"]$/);
    if (m) return m[1]!;
  }
  return null;
}

/** Lower the first character (`Name` → `name`). */
function decapitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toLowerCase() + s.slice(1);
}

/**
 * Derive the field name a member describes. Property/Accessor members
 * name the field directly; an interface accessor `get<Field>` /
 * `set<Field>` (the TypeDoc-reflectable home for a mixin field, since
 * mixin instance-field declarations aren't emitted) maps to its field.
 */
function fieldNameOf(member: Refl): string {
  const m = member.name.match(/^(?:get|set)([A-Z]\w*)$/);
  if (m && member.kind === Kind.Method) return decapitalize(m[1]!);
  return member.name;
}

/** The union-of-string-literals values, or `undefined` if not one. */
function unionStringLiterals(t: TdType | undefined): string[] | undefined {
  if (!t || t.type !== "union" || !Array.isArray(t.types)) return undefined;
  const out: string[] = [];
  for (const sub of t.types) {
    if (sub.type !== "literal") return undefined;
    const v = (sub as { value?: unknown }).value;
    if (typeof v !== "string") return undefined;
    out.push(v);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Project the `@authorable` field schema from a TypeDoc project model.
 * Pure — no IO. Walks every class/interface reflection, keys it by its
 * static `_mixinName` (falling back to the reflection name), classifies
 * each declared persistent/instruction field as `@authorable` vs
 * `@runtimeState`, and emits a widget-selection descriptor per
 * authorable field plus the coverage audit.
 */
export function projectAuthorableFields(project: Refl): AuthorableFieldsArtifact {
  const fields: Record<string, AuthorableFieldDescriptor[]> = {};
  const unclassified: string[] = [];
  const doubleClassified: string[] = [];

  const modules: Refl[] = [];
  (function indexModules(n: Refl): void {
    if (n.kind === Kind.Module) modules.push(n);
    for (const c of n.children ?? []) indexModules(c);
  })(project);

  for (const mod of modules) {
    for (const cls of mod.children ?? []) {
      if (cls.kind !== Kind.Class && cls.kind !== Kind.Interface) continue;

      const persistent = new Set(readStaticStringArray(cls, "persistentFields"));
      const instruction = new Set(
        readStaticStringArray(cls, "instructionFields"),
      );
      const fieldSet = new Set([...persistent, ...instruction]);

      // Find members carrying either classification tag.
      const authorableFields = new Map<string, Refl>(); // field → member
      const runtimeFields = new Set<string>();
      const members = cls.children ?? [];
      for (const member of members) {
        if (member.flags?.isPrivate) continue;
        const isAuthorable = authorableTag(member) !== null;
        const isRuntime = hasRuntimeStateTag(member);
        if (!isAuthorable && !isRuntime) continue;
        const field = fieldNameOf(member);
        if (isAuthorable && !authorableFields.has(field)) {
          authorableFields.set(field, member);
        }
        if (isRuntime) runtimeFields.add(field);
      }

      if (
        fieldSet.size === 0 &&
        authorableFields.size === 0 &&
        runtimeFields.size === 0
      ) {
        continue; // not a field-bearing mixin
      }

      const mixinKey =
        readStaticStringLiteral(cls, "_mixinName") ?? cls.name;

      // Descriptors for authorable fields.
      const descriptors: AuthorableFieldDescriptor[] = [];
      for (const [field, member] of authorableFields) {
        const kind: "property" | "instruction" = instruction.has(field)
          ? "instruction"
          : "property";
        let typeShape: string;
        if (kind === "instruction") {
          const applier = members.find(
            (m) => m.name === `apply${capitalize(field)}`,
          );
          const sig = applier?.signatures?.[0];
          const payload = sig?.parameters?.[0]?.type;
          typeShape = payload ? renderType(payload) : "json";
        } else {
          typeShape = member.type ? renderType(member.type) : "json";
        }
        const descriptor: AuthorableFieldDescriptor = {
          mixin: mixinKey,
          field,
          kind,
          typeShape,
          description: joinText(member.comment?.summary),
        };
        const enumValues = unionStringLiterals(member.type);
        if (enumValues) descriptor.enumValues = enumValues;
        const tag = authorableTag(member) ?? "";
        const refMatch = tag.match(/\bref:([A-Za-z0-9_]+)/);
        if (refMatch) {
          descriptor.refShape = "path";
          descriptor.refType = refMatch[1]!;
        }
        descriptors.push(descriptor);
      }
      if (descriptors.length > 0) {
        descriptors.sort((a, b) => a.field.localeCompare(b.field));
        fields[mixinKey] = descriptors;
      }

      // Coverage: every declared field must carry exactly one tag.
      for (const field of fieldSet) {
        const inA = authorableFields.has(field);
        const inR = runtimeFields.has(field);
        if (inA && inR) doubleClassified.push(`${mixinKey}.${field}`);
        else if (!inA && !inR) unclassified.push(`${mixinKey}.${field}`);
      }
    }
  }

  unclassified.sort();
  doubleClassified.sort();
  return { fields, coverage: { unclassified, doubleClassified } };
}

/** Upper the first character (`name` → `Name`) — `apply<Field>` join. */
function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
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
 * Render a TypeDoc serialized `TdType` to a readable type string.
 * Pure — recurses through the structural shapes the surface speaks:
 * intrinsics, references (incl. generics via `typeArguments`), unions,
 * intersections, arrays, literals, tuples. Anything else degrades to a
 * safe `name`/`object`/`unknown` rendering rather than throwing.
 */
function renderType(t: TdType | undefined): string {
  if (!t || typeof t !== "object") return "unknown";
  switch (t.type) {
    case "intrinsic":
      return typeof t.name === "string" ? t.name : "unknown";
    case "reference": {
      const name = typeof t.name === "string" ? t.name : "unknown";
      const args = t.typeArguments ?? [];
      if (args.length > 0) {
        return `${name}<${args.map((a) => renderType(a)).join(", ")}>`;
      }
      return name;
    }
    case "union":
      return (t.types ?? []).map((s) => renderType(s)).join(" | ");
    case "intersection":
      return (t.types ?? []).map((s) => renderType(s)).join(" & ");
    case "array":
      return `${renderType(t.elementType)}[]`;
    case "tuple":
      return `[${(t.elements ?? []).map((e) => renderType(e)).join(", ")}]`;
    case "literal": {
      const v = (t as { value?: unknown }).value;
      if (v === null) return "null";
      if (typeof v === "string") return `"${v}"`;
      return String(v);
    }
    case "reflection":
      // Inline object / function type — render compactly.
      return "object";
    case "predicate":
      // A type predicate (`x is Foo`) renders as its runtime type.
      return "boolean";
    default:
      return typeof t.name === "string" ? t.name : "unknown";
  }
}

/**
 * Render one parameter reflection to `name: T`, honoring optional
 * (`name?: T`), rest (`...name: T[]`), and default-valued (treated as
 * optional) flags.
 */
function renderParam(p: Refl): string {
  const rest = p.flags?.isRest ? "..." : "";
  const optional =
    !p.flags?.isRest &&
    (p.flags?.isOptional === true || p.defaultValue !== undefined)
      ? "?"
      : "";
  return `${rest}${p.name}${optional}: ${renderType(p.type)}`;
}

/**
 * Render a member's first call signature to `name(p1: T1, p2?: T2): Ret`.
 * Methods with no signature (shouldn't reach consumer tier) render the
 * bare name.
 */
function renderSignature(member: Refl): string {
  const sig = member.signatures?.[0];
  if (!sig) return member.name;
  const params = (sig.parameters ?? []).map((p) => renderParam(p)).join(", ");
  const ret = sig.type ? renderType(sig.type) : "void";
  return `${member.name}(${params}): ${ret}`;
}

/** Join a TextPart array to plain text. */
function joinText(parts: TextPart[] | undefined): string {
  return (parts ?? []).map((p) => p.text).join("").trim();
}

/** The TSDoc payload extracted from a consumer member. */
interface MemberTsdoc {
  summary: string;
  params: { name: string; text: string }[];
  returns: string | undefined;
  examples: string[];
}

/**
 * Extract the first-paragraph summary + `@param`/`@returns`/`@example`
 * from a member's comment (and its first signature's comment, which is
 * where TypeDoc usually lands a method's doc). All optional — absence
 * degrades to `''`/empty.
 */
function extractTsdoc(member: Refl): MemberTsdoc {
  const comments = [member.comment, ...(member.signatures ?? []).map((s) => s.comment)];
  let summary = "";
  const params: { name: string; text: string }[] = [];
  let returns: string | undefined;
  const examples: string[] = [];

  for (const c of comments) {
    if (!c) continue;
    if (!summary) summary = joinText(c.summary);
    for (const tag of c.blockTags ?? []) {
      if (tag.tag === "@param") {
        // TypeDoc serializes the param name on the tag's `name` slot
        // (when present) and the description in `content`.
        const name = (tag as { name?: string }).name;
        const text = joinText(tag.content);
        params.push({ name: typeof name === "string" ? name : "", text });
      } else if (tag.tag === "@returns" && returns === undefined) {
        returns = joinText(tag.content);
      } else if (tag.tag === "@example") {
        examples.push(joinText(tag.content));
      }
    }
  }
  return { summary, params, returns, examples };
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

        const ids = new Set<number>();
        signatureTypeRefs(member, ids);
        for (const id of ids) referencedTypeIds.add(id);
        memberTypeRefs.push({ module: mod.name, member: qualified, typeIds: ids });

        // Resolve referenced ids to NAMED project-type names (the
        // relation join key the runtime API projector consumes).
        const signatureTypes: string[] = [];
        const seenName = new Set<string>();
        for (const id of ids) {
          const hit = byId.get(id);
          if (!hit) continue;
          if (
            hit.refl.kind === Kind.TypeAlias ||
            hit.refl.kind === Kind.Interface ||
            hit.refl.kind === Kind.Enum ||
            hit.refl.kind === Kind.Class
          ) {
            if (!seenName.has(hit.refl.name)) {
              seenName.add(hit.refl.name);
              signatureTypes.push(hit.refl.name);
            }
          }
        }
        signatureTypes.sort();

        const tsdoc = extractTsdoc(member);
        const entry: ConsumerMember = {
          kind: isStaticApi ? "api-static" : "stuff-method",
          module: mod.name,
          face: cls.name,
          name: member.name,
          qualified,
          signature: renderSignature(member),
          summary: tsdoc.summary,
          signatureTypes,
        };
        if (tsdoc.params.length > 0) entry.params = tsdoc.params;
        if (tsdoc.returns !== undefined && tsdoc.returns.length > 0) {
          entry.returns = tsdoc.returns;
        }
        if (tsdoc.examples.length > 0) entry.examples = tsdoc.examples;
        consumer.push(entry);
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

  // Second artifact: the @authorable field schema (Studio composer).
  const authorablePath = join(dirname(outPath), "authorable-fields.json");
  const authorable = projectAuthorableFields(project);
  writeFileSync(authorablePath, JSON.stringify(authorable, null, 2));
  const authorableCount = Object.values(authorable.fields).reduce(
    (n, d) => n + d.length,
    0
  );
  console.log(
    `authorable-fields: ${authorableCount} field(s) across ` +
      `${Object.keys(authorable.fields).length} mixin(s); coverage ` +
      `unclassified=${authorable.coverage.unclassified.length} ` +
      `doubleClassified=${authorable.coverage.doubleClassified.length} ` +
      `→ ${authorablePath}`
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
