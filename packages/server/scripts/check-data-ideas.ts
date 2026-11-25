/**
 * ⭐⭐ `lint:data-ideas` — **metadata is a Document, not an Idea**
 * (docs/review-questions.md P10).
 *
 * ## The defect
 *
 * ```typescript
 * // BAD — a vocabulary nothing writes, read by name, given a class and rows
 * export default class Form extends SingletonMixin(Idea) {
 *   static fieldMeta = { name: …, aspect: …, rigid: … };
 *   protected aspect = { width: 1, depth: 1, height: 1 };
 *   getAspect() { return { ...this.aspect }; }
 *   setAspect(v) { this.aspect = new Dimensions(…).toSpec(); }
 * }
 * ```
 *
 * The size and carrying build shipped exactly that (`Form`, five rows) right
 * after the documents build had converted the pattern away, and it cost a
 * `lint:boundary-roles` rise and a load-on-use workaround before W10j
 * retired it. The test is document-store.md § *Idea or document*: a row
 * family is an Idea when something writes it, acts on it, or it is a link
 * in a query chain — otherwise it is a document kind with a value class
 * over it (`Placement`, `Shape`).
 *
 * ## What it counts (the TypeScript AST, syntax only — no type checker)
 *
 * Every class declared under an `idea/` branch directory — the kernel's
 * `platform/idea/**` (and `world/**\/idea/**`), and every pack's
 * `src/**\/idea/**` — that reaches `lib/stuff/Idea` through its `extends`
 * chain and is **data-only**: no member in its own body, nor in any class
 * or mixin factory it composes between itself and `Idea`, carries
 * behavior. A member carries behavior when it
 *
 *   1. is a **lifecycle hook** — named `on*`, `can*`, `pre*`, `post*` or
 *      `around*` (the framework or a sibling calls it to react or veto), or
 *      a static initialization block;
 *   2. is `async` or **awaits**;
 *   3. **calls an Api or a logic singleton** — any value identifier ending
 *      `Api` or `Logic` in its body (types are skipped);
 *   4. **schedules** — `setTimeout` / `setInterval` / `setImmediate` /
 *      `queueMicrotask`.
 *
 * Everything else — fields, `static fieldMeta`, accessors, `get*`/`is*`/
 * `has*`/`set*` methods and pure computation over the class's own fields
 * (`dimensionsFor(volume)`, which a document's value class holds as
 * happily) — is data. Out of the census by construction: controllers
 * (`*\/cmd/**`, `*Controller*.ts`), logic singletons (`*\/api/**`,
 * `*Logic.ts`, anything reaching `lib/stuff/ApiLogic`), and the
 * catalogues and registries that SERVE documents (`*Catalogue.ts`,
 * `*Registry.ts` — they act).
 *
 * ⚠ Syntax only, so limb 3 of the test (*could it be a link in a query
 * chain?*) is invisible here, and a direct poke at another Stuff's method
 * reads as computation. That is why this is a CENSUS of candidates and not
 * a verdict: Discipline, Spell, Corpo/Brand and Government stay Ideas by
 * limb 3 (document-store.md) and are counted if their bodies are data.
 * Each name in `--report` is a candidate for a document conversion, to be
 * argued by the test, not by this gate.
 *
 * ⭐ Census, then ratchet (docs/lint-family.md): the ceiling is today's
 * count. It may fall (a conversion lowers it); it may not rise — a NEW
 * data-only Idea class fails until it is a document kind, or until it
 * grows the behavior that makes it an Idea.
 *
 *   tsx scripts/check-data-ideas.ts --lint      # the gate
 *   tsx scripts/check-data-ideas.ts --report    # the census, every class named
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative, resolve, sep } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import {
  CONTENT,
  MUD,
  classFileOf,
  classPathOfFile,
  packSources,
  packSrcFiles,
  parseTs,
  ratchet,
  type PackSource,
} from "./pack-roots";

/**
 * Data-only `Idea` classes in the tree today (the census; it may only fall).
 * 2026-11-17: Condition, CredentialWalletUpdate (WalletApp since aether-devices), Discipline, LocomotionMode,
 * Corpo, Spell, Modality, QuantityMarshaller, BodyPlan (kernel); Deposit
 * (ground), Lane and ServiceRoute (transport). `--report` lists them.
 * (SoundModality left the census in crowded-rooms W1: its gather now holds
 * the world still, an Api call.)
 */
// aether-devices: +1, a STATED rise for the owner's eye — `App` (D2, D2a).
// It replaced `CommsUpdate`, which carried comms and so was never counted;
// Messages is now a pure marker the person's comms looks for. Caller audit:
// an App is ACTED ON (cloned and hosted by `AetherHostMixin.installApp`,
// destroyed by `unhostApp` and its host's destruct) and is a link in the
// MQL `reachable` chain (a host's apps) — limb 3 of the Idea test, which
// this syntax-only census cannot see; its subclasses (`ForumsApp`,
// `CalendarApp`) carry behavior and are not counted. The plan (P10) said to
// bring it back as a finding: it is the MR's first item.
export const DATA_IDEAS_CEILING = 13; // organism-biology W1: −1 (re-pinned at the merged floor). // stream arrival (owner, 2026-11-24): +1, `BroadcastApp` — an App whose body is only its verbs. Each device hosts its own copy, but the fix is the verbs on its app-listing document so an app needs no class (aether-devices.md § Deferred seams); that conversion lowers this back to 13.

const IDEA_ROOT = "/lib/stuff/Idea";
const LOGIC_ROOT = "/lib/stuff/ApiLogic";
const STUFF_ROOT = "/lib/stuff/Stuff";

/** One class's verdict. */
export interface ClassVerdict {
  /** Its `extends` chain reaches `lib/stuff/Idea`. */
  idea: boolean;
  /** Its chain passes through `lib/stuff/ApiLogic` (a logic singleton). */
  logic: boolean;
  /** The first behavior found in it or its chain, or null (data-only). */
  behavior: string | null;
}

export interface DataIdeaFinding {
  /** Repo-relative file. */
  file: string;
  /** The class name. */
  cls: string;
  /** The class path the file backs, when it backs one. */
  classPath: string | null;
}

const HOOK = /^(on|can|pre|post|around)[A-Z]/;
const TIMERS = new Set(["setTimeout", "setInterval", "setImmediate", "queueMicrotask"]);

/** The member's name as written, or null for a computed/unnamed member. */
function memberName(m: ts.ClassElement, sf: ts.SourceFile): string | null {
  if (ts.isConstructorDeclaration(m)) return "constructor";
  const n = m.name;
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n) || ts.isStringLiteral(n)) return n.text;
  return n.getText(sf);
}

/** The first behavior in a body or initializer (types skipped), or null. */
function bodyBehavior(node: ts.Node | undefined): string | null {
  if (!node) return null;
  let found: string | null = null;
  const visit = (n: ts.Node): void => {
    if (found !== null || ts.isTypeNode(n)) return;
    if (ts.isAwaitExpression(n)) {
      found = "awaits";
      return;
    }
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const isMemberName =
        p !== undefined &&
        ((ts.isPropertyAccessExpression(p) && p.name === n) ||
          (ts.isPropertyAssignment(p) && p.name === n) ||
          (ts.isMethodDeclaration(p) && p.name === n));
      if (!isMemberName && /.(Api|Logic)$/.test(n.text)) {
        found = `calls ${n.text}`;
        return;
      }
      if (!isMemberName && TIMERS.has(n.text) && p !== undefined && ts.isCallExpression(p) && p.expression === n) {
        found = `schedules (${n.text})`;
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/** The first behavior among a class body's own members, or null. */
export function ownBehavior(cls: ts.ClassLikeDeclaration, sf: ts.SourceFile): string | null {
  for (const m of cls.members) {
    const name = memberName(m, sf) ?? "<computed>";
    if (ts.isClassStaticBlockDeclaration(m)) return "a static initialization block";
    if (ts.isPropertyDeclaration(m)) {
      const init = m.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        if (HOOK.test(name)) return `hook ${name}`;
        if (init.modifiers?.some((x) => x.kind === ts.SyntaxKind.AsyncKeyword)) return `${name} is async`;
      }
      const b = bodyBehavior(init);
      if (b) return `${name} ${b}`;
      continue;
    }
    if (
      ts.isMethodDeclaration(m) ||
      ts.isGetAccessorDeclaration(m) ||
      ts.isSetAccessorDeclaration(m) ||
      ts.isConstructorDeclaration(m)
    ) {
      if (ts.isMethodDeclaration(m) && HOOK.test(name)) return `hook ${name}`;
      if (ts.isMethodDeclaration(m) && m.modifiers?.some((x) => x.kind === ts.SyntaxKind.AsyncKeyword)) {
        return `${name} is async`;
      }
      const b = bodyBehavior(m.body);
      if (b) return `${name} ${b}`;
    }
  }
  return null;
}

/** Resolve a module specifier to a source file path, or null. */
function resolveSpecifier(spec: string, fromFile: string, sources: readonly PackSource[], mudDir: string): string | null {
  if (spec.startsWith("@saxonberg/server/mud/")) {
    return classFileOf("/" + spec.slice("@saxonberg/server/mud/".length), sources, mudDir);
  }
  if (spec.startsWith(".")) {
    const base = resolve(dirname(fromFile), spec);
    if (existsSync(base + ".ts")) return base + ".ts";
    if (existsSync(join(base, "index.ts"))) return join(base, "index.ts");
    return base + ".ts";
  }
  const pack = /^@saxonberg\/content-([^/]+)\/(.+)$/.exec(spec);
  if (pack) {
    const contentDir = sources[0] ? dirname(sources[0].packDir) : CONTENT;
    return join(contentDir, pack[1]!, pack[2]!) + ".ts";
  }
  return null;
}

/** The mud class path of a file (kernel or pack), or null. */
function pathOf(file: string, sources: readonly PackSource[], mudDir: string): string | null {
  return classPathOfFile(file, sources, mudDir);
}

/** A reader with one cache per run: files parsed once, verdicts memoized. */
export class IdeaCensus {
  private readonly files = new Map<string, ts.SourceFile | null>();
  private readonly verdicts = new Map<ts.Node, ClassVerdict>();

  constructor(
    private readonly sources: readonly PackSource[],
    private readonly mudDir: string = MUD,
    /** Text overrides by absolute file (the fixture test plants classes here). */
    private readonly planted: ReadonlyMap<string, string> = new Map(),
  ) {}

  source(file: string): ts.SourceFile | null {
    if (this.files.has(file)) return this.files.get(file)!;
    let sf: ts.SourceFile | null = null;
    const text = this.planted.get(file) ?? (existsSync(file) ? readFileSync(file, "utf8") : null);
    if (text !== null) sf = parseTs(file, text);
    this.files.set(file, sf);
    return sf;
  }

  /** The verdict for one class node in `sf`. */
  classVerdict(cls: ts.ClassLikeDeclaration, sf: ts.SourceFile, hole: string | null = null): ClassVerdict {
    const cached = this.verdicts.get(cls);
    if (cached) return cached;
    // Cycle guard: a class under evaluation reads as a plain, behavior-free link.
    this.verdicts.set(cls, { idea: false, logic: false, behavior: null });
    const v: ClassVerdict = { idea: false, logic: false, behavior: ownBehavior(cls, sf) };
    const heritage = cls.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    const expr = heritage?.types[0]?.expression;
    if (expr) this.mergeExpression(v, expr, sf, new Set(hole ? [hole] : []));
    this.verdicts.set(cls, v);
    return v;
  }

  private merge(into: ClassVerdict, from: ClassVerdict): void {
    into.idea ||= from.idea;
    into.logic ||= from.logic;
    into.behavior ??= from.behavior;
  }

  /** Walk an `extends` expression: every callee and argument is a link. */
  private mergeExpression(v: ClassVerdict, expr: ts.Expression, sf: ts.SourceFile, holes: Set<string>): void {
    let e: ts.Expression = expr;
    while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
    if (ts.isCallExpression(e)) {
      this.mergeExpression(v, e.expression, sf, holes);
      for (const a of e.arguments) this.mergeExpression(v, a, sf, holes);
      return;
    }
    if (ts.isClassExpression(e)) {
      this.merge(v, this.classVerdict(e, sf));
      return;
    }
    if (ts.isIdentifier(e)) {
      if (holes.has(e.text)) return;
      this.merge(v, this.identifierVerdict(e.text, sf, holes));
      return;
    }
    v.behavior ??= `an extends link this reader cannot follow (${e.getText(sf).slice(0, 40)})`;
  }

  /** Resolve an identifier in `sf` to a class / mixin factory / const, and judge it. */
  private identifierVerdict(id: string, sf: ts.SourceFile, holes: Set<string>): ClassVerdict {
    const local = this.localDeclaration(id, sf);
    if (local) return this.declarationVerdict(local, sf, holes);
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const clause = st.importClause;
      if (!clause) continue;
      let exported: string | null = null;
      if (clause.name?.text === id) exported = "default";
      const nb = clause.namedBindings;
      if (exported === null && nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          if (el.name.text === id) exported = el.propertyName?.text ?? el.name.text;
        }
      }
      if (exported === null) continue;
      const file = resolveSpecifier(st.moduleSpecifier.text, sf.fileName, this.sources, this.mudDir);
      if (!file) return { idea: false, logic: false, behavior: `an external base (${id})` };
      const path = pathOf(file, this.sources, this.mudDir);
      if (path === IDEA_ROOT) return { idea: true, logic: false, behavior: null };
      if (path === LOGIC_ROOT) return { idea: true, logic: true, behavior: null };
      if (path === STUFF_ROOT) return { idea: false, logic: false, behavior: null };
      const target = this.source(file);
      if (!target) return { idea: false, logic: false, behavior: `an unreadable base (${id})` };
      const decl = exported === "default" ? this.defaultDeclaration(target) : this.localDeclaration(exported, target);
      if (!decl) return { idea: false, logic: false, behavior: `an unresolved base (${id})` };
      return this.declarationVerdict(decl, target, new Set());
    }
    return { idea: false, logic: false, behavior: `an unresolved base (${id})` };
  }

  private declarationVerdict(decl: ts.Node, sf: ts.SourceFile, holes: Set<string>): ClassVerdict {
    if (ts.isClassDeclaration(decl) || ts.isClassExpression(decl)) return this.classVerdict(decl, sf);
    if (ts.isVariableDeclaration(decl) && decl.initializer) {
      const init = decl.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return this.factoryVerdict(init, sf);
      const v: ClassVerdict = { idea: false, logic: false, behavior: null };
      this.mergeExpression(v, init, sf, holes);
      return v;
    }
    if (ts.isFunctionDeclaration(decl)) return this.factoryVerdict(decl, sf);
    return { idea: false, logic: false, behavior: "a base that is not a class or mixin" };
  }

  /** A mixin factory: the class it returns, its `Base` parameter a hole. */
  private factoryVerdict(fn: ts.FunctionLikeDeclaration, sf: ts.SourceFile): ClassVerdict {
    const param = fn.parameters[0];
    const hole = param && ts.isIdentifier(param.name) ? param.name.text : null;
    let cls: ts.ClassLikeDeclaration | null = null;
    const find = (n: ts.Node): void => {
      if (cls) return;
      if (ts.isClassExpression(n) || ts.isClassDeclaration(n)) {
        cls = n;
        return;
      }
      ts.forEachChild(n, find);
    };
    if (fn.body) find(fn.body);
    if (!cls) return { idea: false, logic: false, behavior: "a mixin factory with no class" };
    return this.classVerdict(cls, sf, hole);
  }

  /** A same-file top-level class / function / const named `id`. */
  private localDeclaration(id: string, sf: ts.SourceFile): ts.Node | null {
    for (const st of sf.statements) {
      if ((ts.isClassDeclaration(st) || ts.isFunctionDeclaration(st)) && st.name?.text === id) return st;
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.name.text === id) return d;
        }
      }
    }
    return null;
  }

  /** The module's default export. */
  private defaultDeclaration(sf: ts.SourceFile): ts.Node | null {
    for (const st of sf.statements) {
      if (
        (ts.isClassDeclaration(st) || ts.isFunctionDeclaration(st)) &&
        st.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        return st;
      }
      if (ts.isExportAssignment(st) && !st.isExportEquals) {
        if (ts.isIdentifier(st.expression)) return this.localDeclaration(st.expression.text, sf);
        if (ts.isClassExpression(st.expression)) return st.expression;
      }
    }
    return null;
  }

  /** The data-only Idea classes one file declares. */
  scanFile(file: string, rel: string): DataIdeaFinding[] {
    const sf = this.source(file);
    if (!sf) return [];
    const out: DataIdeaFinding[] = [];
    for (const st of sf.statements) {
      if (!ts.isClassDeclaration(st) || !st.heritageClauses) continue;
      const v = this.classVerdict(st, sf);
      if (v.idea && !v.logic && v.behavior === null) {
        out.push({ file: rel, cls: st.name?.text ?? "<default>", classPath: pathOf(file, this.sources, this.mudDir) });
      }
    }
    return out;
  }

  /** The verdict for every class one file declares (the `--report` detail). */
  verdictsOf(file: string): Array<{ cls: string; verdict: ClassVerdict }> {
    const sf = this.source(file);
    if (!sf) return [];
    return sf.statements
      .filter((st): st is ts.ClassDeclaration => ts.isClassDeclaration(st) && st.heritageClauses !== undefined)
      .map((st) => ({ cls: st.name?.text ?? "<default>", verdict: this.classVerdict(st, sf) }));
  }
}

/** Is this module out of the census by its home or its name? */
export function excluded(relFromIdea: string): boolean {
  const segs = relFromIdea.split(/[\\/]/);
  const leaf = segs[segs.length - 1] ?? "";
  if (segs.includes("__tests__") || segs.includes("cmd") || segs.includes("api")) return true;
  return /(Logic|Catalogue|Registry|Controller|ControllerBase)\.ts$/.test(leaf) || leaf.endsWith(".d.ts");
}

function tsUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      const full = join(d, e);
      if (statSync(full).isDirectory()) {
        if (e !== "node_modules") walk(full);
      } else if (e.endsWith(".ts")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** Every module on an `idea/` branch, kernel and packs, before exclusions. */
export function ideaModules(contentDir: string = CONTENT, mudDir: string = MUD): string[] {
  const out: string[] = [];
  const onIdeaBranch = (rel: string): string | null => {
    const segs = rel.split(sep);
    const i = segs.indexOf("idea");
    return i === -1 ? null : segs.slice(i + 1).join("/");
  };
  for (const f of tsUnder(join(mudDir, "platform", "idea"))) {
    if (!excluded(relative(join(mudDir, "platform", "idea"), f))) out.push(f);
  }
  for (const f of tsUnder(join(mudDir, "world"))) {
    const inner = onIdeaBranch(relative(join(mudDir, "world"), f));
    if (inner !== null && !excluded(inner)) out.push(f);
  }
  for (const pack of packSources(contentDir)) {
    for (const f of packSrcFiles(pack.srcDir)) {
      const inner = onIdeaBranch(relative(pack.srcDir, f));
      if (inner !== null && !excluded(inner)) out.push(f);
    }
  }
  return out.sort();
}

/** The live census. */
export function collectLiveFindings(contentDir: string = CONTENT, mudDir: string = MUD): DataIdeaFinding[] {
  const census = new IdeaCensus(packSources(contentDir), mudDir);
  const repo = resolve(mudDir, "..", "..", "..", "..");
  const out: DataIdeaFinding[] = [];
  for (const file of ideaModules(contentDir, mudDir)) out.push(...census.scanFile(file, relative(repo, file)));
  return out;
}

function main(): void {
  const all = collectLiveFindings();
  const fmt = (f: DataIdeaFinding): string => `${f.classPath ?? f.file}  (${f.cls})`;
  if (process.argv.includes("--report")) {
    console.log(`check-data-ideas: ${all.length} data-only Idea classes (ceiling ${DATA_IDEAS_CEILING}):\n`);
    for (const f of all) console.log(`  ${fmt(f)}`);
    console.log("\nEach is a candidate for a document conversion — argue it by document-store.md § Idea or document.");
    return;
  }
  const ok = ratchet(
    "check-data-ideas",
    "data-only Idea classes",
    all.length,
    DATA_IDEAS_CEILING,
    all.map(fmt),
    "A vocabulary or table that nothing writes and that is read by name or path is a\n" +
      "DOCUMENT kind with a value class over it (Placement, Shape), not an Idea class with\n" +
      "rows (review-questions.md P10; document-store.md § Idea or document). If it is an\n" +
      "Idea by limb 2 or 3 of that test, it has the behavior to show for it.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
