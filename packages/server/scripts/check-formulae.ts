/**
 * check-formulae — ⭐⭐ **the census of the game's mathematics.**
 *
 * > *"a lot of our codebase relies on mathematical formulas — formulas
 * > often derived from real life physical theorems and axioms. in a math
 * > textbook you get an index of all the different formulae used in the
 * > book. it'd be nice if we had such a thing."* — the user, 2026-09-14
 *
 * This is the index, **derived**. It moves no code and gates nothing
 * today: it reports what relationships exist, where they live, whether
 * they are functions of their arguments, and — the part that pays for
 * itself — **which ones are the same formula written more than once.**
 *
 * ⚠ Census FIRST, on purpose. The refactor it might justify (a declared
 * `Formula` object, one home per relationship) works against this
 * codebase's grain everywhere else: verbs live on objects, free helpers
 * are banned, barrels were rejected. So the honest order is to look at
 * the population before deciding whether it wants centralising — and if
 * the answer is "leave them local", this report IS the index and nothing
 * needs to move at all.
 *
 * ## What counts as a formula
 *
 * ⭐ **Not "has no branches".** `Contamination.growthRate` is five
 * branches of Arrhenius — kill band, lag band, growth floor, water-
 * activity floor, then the rate — and a piecewise-defined function is
 * ordinary mathematics. `Math.max(0, x)` is a domain restriction, not
 * control flow.
 *
 * The line is **referential transparency**: same inputs, same output.
 * A function that reads the world, the clock, or an operator dial is not
 * a function of its arguments, and the report says so per row rather
 * than dropping it — *"this formula's output depends on a setting and
 * its signature does not say so"* is the finding, not a disqualification.
 *
 * ## What it reads
 *
 * Every non-test `.ts` under the kernel's `lib/` + `platform/` and every
 * capability pack's `src/` (`scripts/pack-roots.ts`, the shared reader).
 * A candidate is any function-like declaration — static method, instance
 * method, or module-private function — whose body does arithmetic and
 * whose result is numeric.
 *
 * ## Usage
 *
 *   pnpm formulae              the index, grouped by family
 *   pnpm formulae --flat       one row per formula, no grouping
 *   pnpm formulae --impure     only the ones that are not functions of
 *                              their arguments (the ratchet candidate)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import { packSources, packSrcFiles } from "./pack-roots";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "..");
const REPO = join(SERVER, "..", "..");
const MUD = join(SERVER, "src", "mud");

/** One arithmetic relationship found in the tree. */
export interface Formula {
  /** `Charge.decayFor` / `decayWeight` (a module-private free function). */
  name: string;
  /** Repo-relative file. */
  file: string;
  line: number;
  /** `static` | `method` | `function` — where it is declared. */
  form: "static" | "method" | "function";
  /** Declared parameters, `name: Type`. */
  params: string[];
  /** Declared return type, or `""` when inferred. */
  returns: string;
  /** Why it is not a function of its arguments — empty when it is. */
  impurities: string[];
  /** The named family this belongs to, or `""` when unclassified. */
  family: string;
  /** A real-world derivation cited in its docstring, if any. */
  derivation: string;
  /** Transcendental calls used (`exp`, `pow`, …). */
  maths: string[];
}

/**
 * ⭐ The family table — the *chapters* of the index.
 *
 * ⚠⚠ **This is curated, and that is the point.** An index of sixty
 * entries in arbitrary order is not a textbook index; a textbook groups
 * by chapter. Automatic clustering on expression shape puts
 * `Math.pow(0.5, a/b)` and `Math.pow(2, -a/b)` in different buckets when
 * they are the SAME function in two bases — which is exactly the
 * duplication worth finding. So the shapes are named by hand and
 * anything unmatched is reported as `unclassified` rather than silently
 * grouped.
 */
const FAMILIES: ReadonlyArray<{ name: string; test: RegExp }> = [
  {
    // e^(-E/R · (1/T₁ − 1/T₂)) — rate against temperature.
    name: "Arrhenius (rate vs temperature)",
    test: /1\s*\/\s*\w*K\b[\s\S]{0,60}-\s*1\s*\/\s*\w*K\b|activationEnergy\s*\/\s*R\b/,
  },
  {
    // a + (b − a)·e^(−t/τ) — Newton's cooling, and every relaxation.
    name: "Exponential approach to a target (Newton relaxation)",
    test: /\w+\s*\+\s*\(\s*\w+\s*-\s*\w+\s*\)\s*\*\s*Math\.exp\(\s*-|1\s*-\s*Math\.exp\(\s*-/,
  },
  {
    // x·e^(−λt), and its half-life spellings in base 2 and base ½.
    name: "Exponential decay / half-life",
    test: /Math\.exp\(\s*-|Math\.pow\(\s*0?\.5\s*,|Math\.pow\(\s*2\s*,\s*-/,
  },
  { name: "Logarithmic compression", test: /Math\.log\w*\(\s*1\s*\+|Math\.log10\(/ },
  { name: "Euclidean distance", test: /Math\.hypot\(|Math\.sqrt\(\s*\w*d[xyz]\w*\s*\*/i },
  { name: "Inverse-square falloff", test: /\/\s*\(?\s*\w*(dist|radius)\w*\s*\*\s*\w*(dist|radius)\w*/i },
  { name: "Trigonometric", test: /Math\.(sin|cos|tan|atan2?)\(/ },
  { name: "Square / cube root", test: /Math\.sqrt\(|Math\.cbrt\(/ },
  { name: "Power law (unnamed exponent)", test: /Math\.pow\(/ },
];

/** Reads that make a function's output depend on something unstated. */
const IMPURITIES: ReadonlyArray<{ why: string; test: RegExp }> = [
  { why: "operator dial", test: /\bdial\(|AppSettingKeys\.|AppApi\.setting/ },
  { why: "world clock", test: /WorldClockApi\.|Date\.now\(/ },
  { why: "world lookup", test: /StuffApi\.|DocumentApi\.|\bfindByTemplatePath\b/ },
  { why: "randomness", test: /Math\.random\(|\bdraw\(/ },
  { why: "another Api", test: /\b[A-Z]\w*Api\./ },
];

/** Real-world antecedents worth citing in the index. */
const DERIVATIONS: ReadonlyArray<{ name: string; test: RegExp }> = [
  { name: "Arrhenius", test: /arrhenius/i },
  { name: "Newton's law of cooling", test: /newton/i },
  { name: "Ohm's law", test: /ohm'?s? law/i },
  { name: "Beer–Lambert", test: /beer.?lambert/i },
  { name: "Stefan–Boltzmann", test: /stefan/i },
  { name: "von Thünen", test: /von th[uü]nen/i },
  { name: "half-life", test: /half.?life/i },
  { name: "logistic", test: /logistic/i },
];

const TRANSCENDENTAL = /Math\.(exp|pow|log|log2|log10|sqrt|cbrt|hypot|sin|cos|tan|atan|atan2)\b/g;

function tsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      const full = join(d, e);
      if (statSync(full).isDirectory()) {
        if (e === "__tests__" || e === "node_modules") continue;
        walk(full);
      } else if (e.endsWith(".ts") && !e.endsWith(".d.ts") && !e.endsWith(".test.ts")) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

/** Does this body do arithmetic on numbers (rather than build strings)? */
function doesArithmetic(body: string): boolean {
  if (TRANSCENDENTAL.test(body)) {
    TRANSCENDENTAL.lastIndex = 0;
    return true;
  }
  TRANSCENDENTAL.lastIndex = 0;
  // `*` `/` `%` are unambiguous; `+` is not (string concatenation), so a
  // bare `+` only counts alongside one of the others or a numeric literal.
  if (/[^*/]\*[^*/=]|\s\/\s|\s%\s/.test(body)) return true;
  return /\b\d+(\.\d+)?\s*[-+]\s*\w|\w\s*[-+]\s*\b\d+(\.\d+)?/.test(body);
}

function numericReturn(t: string): boolean {
  if (t === "") return true; // inferred — judged on the body instead
  return /^(number|readonly number\[\]|number\[\]|Quantity<)/.test(t.trim());
}

export function scan(file: string, source: string): Formula[] {
  const rel = relative(REPO, file);
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const out: Formula[] = [];

  const record = (
    node: ts.FunctionDeclaration | ts.MethodDeclaration,
    form: Formula["form"],
    name: string,
  ): void => {
    if (!node.body) return;
    const body = node.body.getText(sf);
    // ⚠⚠ A MIXIN FACTORY is not a formula, and skipping it is not a
    // detail: its body is an entire class, so every arithmetic
    // expression anywhere inside the mixin was being attributed to the
    // factory. `SelfHeatingMixin(Base)`, `GrowingMixin(Base)` and
    // `VitalsMixin(Base)` each landed in the index as ONE relationship
    // carrying the maths of twenty methods.
    // ⚠ Both spellings: `return class X extends Base {…}` AND the
    // `class X extends Base {…}; return X;` form half the tree uses.
    if (/\breturn class\b|\bclass\s+\w+\s+extends\s+Base\b/.test(body)) return;
    const returns = node.type ? node.type.getText(sf) : "";
    if (!numericReturn(returns)) return;
    if (!doesArithmetic(body)) return;

    // The docstring immediately above, for the derivation citation.
    const lead = source.slice(Math.max(0, node.getFullStart()), node.getStart(sf));

    const impurities = IMPURITIES.filter((i) => i.test.test(body)).map((i) => i.why);
    // An instance method reading `this` is bound to a subject — a GAUGE,
    // not a free formula. Reported, because the distinction is the whole
    // question: a gauge's verbs belong on the object; a formula's do not.
    if (form === "method" && /\bthis\./.test(body)) impurities.push("bound to `this`");

    const family = FAMILIES.find((f) => f.test.test(body))?.name ?? "";
    const derivation = DERIVATIONS.find((d) => d.test.test(lead) || d.test.test(body))?.name ?? "";
    const maths = [...new Set((body.match(TRANSCENDENTAL) ?? []).map((m) => m.slice(5)))];

    out.push({
      name,
      file: rel,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      form,
      params: node.parameters.map((p) => p.getText(sf).replace(/\s+/g, " ")),
      returns,
      impurities,
      family,
      derivation,
      maths,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      record(node, "function", node.name.getText(sf));
    } else if (ts.isMethodDeclaration(node) && node.name) {
      const mods = ts.getModifiers(node) ?? [];
      const isStatic = mods.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);
      const cls =
        node.parent && ts.isClassLike(node.parent) && node.parent.name
          ? node.parent.name.getText(sf)
          : "";
      const label = cls ? `${cls}.${node.name.getText(sf)}` : node.name.getText(sf);
      record(node, isStatic ? "static" : "method", label);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return out;
}

/**
 * ⚠⚠ **Arithmetic that has no name.**
 *
 * The index can only list a relationship somebody named. Newton's cooling
 * appears twice in the tree — `Thermal.ts:483` and
 * `ThermalRegulation.ts:328` — as bare expressions INSIDE a method, so no
 * census can see them as the same formula, and no index will ever carry
 * them until they are named. Counting them is how we know how much of the
 * science is currently unindexable.
 */
function anonymousMathSites(files: string[], named: Formula[]): number {
  const namedLines = new Set(named.map((f) => `${f.file}:${f.line}`));
  let n = 0;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const rel = relative(REPO, file);
    src.split("\n").forEach((line, i) => {
      if (!/Math\.(exp|pow|log|log10|sqrt|cbrt|hypot|sin|cos|tan|atan2?)\(/.test(line)) return;
      // Inside an indexed formula? (a formula's declaration line is its key;
      // a site within ~60 lines after one is assumed to belong to it)
      for (const f of named) {
        if (f.file === rel && i + 1 >= f.line && i + 1 <= f.line + 60) return;
      }
      void namedLines;
      n += 1;
    });
  }
  return n;
}

function allFiles(): string[] {
  return [
    ...tsFiles(join(MUD, "lib")),
    ...tsFiles(join(MUD, "platform")),
    ...packSources().flatMap((p) => packSrcFiles(p.srcDir).filter((f) => !f.endsWith(".test.ts"))),
  ];
}

function collect(): Formula[] {
  return allFiles().flatMap((f) => scan(f, readFileSync(f, "utf8")));
}

function main(): void {
  const flat = process.argv.includes("--flat");
  const onlyImpure = process.argv.includes("--impure");
  let all = collect();
  if (onlyImpure) all = all.filter((f) => f.impurities.length > 0);

  const pure = all.filter((f) => f.impurities.length === 0);
  const gauges = all.filter((f) => f.impurities.includes("bound to `this`"));
  const dialled = all.filter((f) => f.impurities.includes("operator dial"));
  const cited = all.filter((f) => f.derivation !== "");
  // ⭐ The extraction candidates: free (not bound to a subject) and a
  // function of their arguments. Everything else is either a GAUGE — whose
  // verbs belong on its object, which is settled doctrine — or impure,
  // which is a different conversation about dials.
  const candidates = all.filter(
    (f) => f.impurities.length === 0 && f.form !== "method",
  );
  const anon = anonymousMathSites(allFiles(), all);

  const row = (f: Formula): string => {
    const where = `${f.file.replace("packages/", "")}:${f.line}`;
    const sig = `(${f.params.map((p) => p.split(":")[0]?.trim()).join(", ")})`;
    const tags = [
      f.derivation && `⚖ ${f.derivation}`,
      f.maths.length ? f.maths.join("/") : "",
      ...f.impurities.map((i) => `⚠ ${i}`),
    ].filter(Boolean);
    return `  ${(f.name + sig).padEnd(46)} ${where}\n${tags.length ? `      ${tags.join(" · ")}\n` : ""}`;
  };

  console.log(
    `THE FORMULA INDEX — ${all.length} arithmetic relationship(s) in lib/, platform/ and the packs\n` +
      `  ${pure.length} are functions of their arguments · ${all.length - pure.length} are not\n` +
      `  ${gauges.length} are bound to \`this\` (a GAUGE, not a free formula)\n` +
      `  ${dialled.length} read an operator dial — output depends on a setting the signature does not name\n` +
      `  ${cited.length} cite a real-world derivation\n` +
      `  ${candidates.length} are FREE and PURE — the actual extraction candidates\n` +
      `  ${anon} transcendental site(s) have NO NAME — arithmetic inline in a method,\n` +
      `      which no index can carry until somebody names it\n`,
  );

  if (process.argv.includes("--candidates")) {
    for (const f of candidates.sort((a, b) => a.file.localeCompare(b.file)))
      process.stdout.write(row(f));
    return;
  }

  if (flat) {
    for (const f of all.sort((a, b) => a.name.localeCompare(b.name))) process.stdout.write(row(f));
    return;
  }

  // ⭐⭐ **The same name in more than one file.** The single most useful
  // thing a census of scattered mathematics can report: `decayWeight` is
  // written three times identically in three logic singletons, and
  // `round2` five times across five packs. Neither set can see the
  // others, so a change to what decay MEANS reaches one of them.
  const byName = new Map<string, Formula[]>();
  for (const f of all) {
    const short = f.name.includes(".") ? f.name.split(".")[1]! : f.name;
    byName.set(short, [...(byName.get(short) ?? []), f]);
  }
  const repeats = [...byName.entries()]
    .filter(([, fs]) => new Set(fs.map((f) => f.file)).size > 1)
    .sort((a, b) => b[1].length - a[1].length);
  if (repeats.length > 0) {
    console.log(`━━ ⭐ REPEATED — one name, several files  (${repeats.length})\n`);
    for (const [name, fs] of repeats) {
      console.log(`  ${name}  ×${fs.length}`);
      for (const f of fs) console.log(`      ${f.file.replace("packages/", "")}:${f.line}`);
    }
    console.log('');
  }

  const byFamily = new Map<string, Formula[]>();
  for (const f of all) {
    const k = f.family || "unclassified";
    byFamily.set(k, [...(byFamily.get(k) ?? []), f]);
  }
  const named = [...byFamily.entries()].filter(([k]) => k !== "unclassified");
  named.sort((a, b) => b[1].length - a[1].length);

  for (const [family, fs] of named) {
    console.log(`\n━━ ${family}  (${fs.length})`);
    for (const f of fs.sort((a, b) => a.file.localeCompare(b.file))) process.stdout.write(row(f));
  }
  const rest = byFamily.get("unclassified") ?? [];
  console.log(`\n━━ unclassified  (${rest.length})`);
  if (!process.argv.includes("--all")) {
    console.log(`     (${rest.length} rows — \`--flat\` or \`--all\` to list them)`);
    return;
  }
  for (const f of rest.sort((a, b) => a.file.localeCompare(b.file))) process.stdout.write(row(f));
}

if (process.argv[1] && /check-formulae\.ts$/.test(process.argv[1])) main();
