/**
 * check-hand-matchers (`lint:hand-matchers`) — ⭐⭐ **one naming rule**
 * (naming overhaul D-C10; one-resolution slate §§ 6–7).
 *
 * A player's words name a thing by ONE rule — `GrammarApi`'s keyword
 * tiers, reached through MQL for runtime Stuff and through
 * `GrammarApi.name` for everything else (a quay in a book, a reading
 * channel, a list label, an offer not yet made). Every hand-rolled matcher
 * is a second rule that disagrees with the first somewhere: `the` stripped
 * here and not there, `plant` finding `implant` by a substring, a plural
 * that one verb hears and the next does not.
 *
 * ## What it counts — per named function or method
 *
 * Over the kernel's `lib/` and `platform/` (controllers included) and every
 * capability pack's `src/` — never `api/grammar.ts` or `api/mql/**` (the
 * rule's home), never tests:
 *
 *   1. **article strips** — a regex that removes a leading `the` / `a` /
 *      `an`, or a read of `GrammarApi.ARTICLES`;
 *   2. **hand compares** — a value lower-cased and compared (`===`,
 *      `includes`, `startsWith`, `endsWith`, `indexOf`, or a `find` /
 *      `some` / `filter`) in a function that speaks of names, keywords,
 *      labels, titles, keys or words;
 *   3. **duration parses** — a regex or word table over time-unit words
 *      outside `CommandDefinition` (the `type: duration` slot's home);
 *   4. **word-keyed maps** — a lookup keyed by a lower-cased name
 *      (`map.set(name.toLowerCase(), …)`, `byName[word.toLowerCase()]`).
 *
 * A function is counted once per kind, however many sites it holds; an
 * anonymous callback rolls up into the named function around it.
 *
 * ## The ratchet
 *
 * Census, then ratchet (docs/lint-family.md): each count's ceiling is the
 * number measured at C0, lowered by the wave that removes the sites, and
 * C7 sets every one to 0.
 *
 * ## Exemptions — a reviewed table, never an `@internal`
 *
 * `EXEMPT` names a file and a symbol, with the slate that retires it. A
 * search is not a name (`help search`, `who --country`); `hail` waits on
 * the signalling slate; the stream verbs read the wall clock (owner,
 * 2026-11-20).
 */

import { readFileSync } from "fs";
import { relative, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { CONTENT, MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

/** Measured at C0 (2026-11-21): 36. Lower it as the waves remove sites. */
export const ARTICLE_STRIP_CEILING = 36;
/** Measured at C0 (2026-11-21): 92. */
export const HAND_COMPARE_CEILING = 92;
/** Measured at C0 (2026-11-21): 6. */
export const DURATION_PARSE_CEILING = 6;
/** Measured at C0 (2026-11-21): 14. */
export const WORD_MAP_CEILING = 14;

export type MatcherKind = "article-strip" | "hand-compare" | "duration-parse" | "word-map";

export interface MatcherSite {
  file: string;
  line: number;
  /** `Class.method`, `function`, or `<module>`. */
  symbol: string;
  kind: MatcherKind;
}

/**
 * The reviewed exemptions: a file suffix, a symbol (`*` = the whole file),
 * and the slate or ruling that retires or keeps it.
 */
export const EXEMPT: ReadonlyArray<{ file: string; symbol: string; why: string }> = [
  { file: "lib/expanse/Hailable.ts", symbol: "*", why: "signalling-slate — hail's matchers" },
  { file: "platform/idea/cmd/social/HailController.ts", symbol: "*", why: "signalling-slate — hail's matchers" },
  { file: "platform/idea/HelpCatalogue.ts", symbol: "HelpCatalogue.search", why: "a search is not a name" },
  { file: "platform/idea/HelpCatalogue.ts", symbol: "HelpCatalogue.typeaheadMatch", why: "a search is not a name" },
  { file: "platform/idea/cmd/social/WhoController.ts", symbol: "*", why: "`who --country` is a search, not a name" },
  { file: "platform/idea/api/StreamLogic.ts", symbol: "*", why: "the stream verbs read the wall clock (owner, 2026-11-20)" },
];

/**
 * ⭐ The undercount guard (plan § the census gate): sites from the
 * grounding list the census must find by name. A heuristic that misses
 * one of these is blind to its family — the wave fails, never the list.
 * A site leaves this list in the commit that removes it.
 */
export const MUST_FIND: ReadonlyArray<{ file: string; symbol: string; kind: MatcherKind }> = [
  { file: "platform/thing/CharterBook.ts", symbol: "CharterBook.shipFor", kind: "article-strip" },
  { file: "platform/idea/cmd/retail/RentController.ts", symbol: "RentController.daysOf", kind: "duration-parse" },
  { file: "platform/idea/cmd/device/FireController.ts", symbol: "FireController.parseHoldS", kind: "duration-parse" },
  { file: "lib/script/Interpreter.ts", symbol: "parseDurationSeconds", kind: "duration-parse" },
  { file: "platform/idea/SpellCatalogue.ts", symbol: "SpellCatalogue.loadCacheFromTemplates", kind: "word-map" },
  { file: "lib/retail/Stock.ts", symbol: "Stock.lineForWord", kind: "hand-compare" },
  { file: "lib/retail/Stock.ts", symbol: "Stock.pricedKeyFor", kind: "hand-compare" },
  { file: "lib/archetype/Archetype.ts", symbol: "answersTo", kind: "hand-compare" },
  { file: "platform/idea/cmd/social/CallController.ts", symbol: "answersTo", kind: "hand-compare" },
  { file: "transport/src/idea/Harbor.ts", symbol: "Harbor.quayNamed", kind: "hand-compare" },
  { file: "trade-ranching/src/idea/HerdRegistry.ts", symbol: "HerdRegistry.named", kind: "hand-compare" },
  { file: "platform/idea/cmd/social/ContactsRemoveController.ts", symbol: "ContactsRemoveController.execute", kind: "hand-compare" },
];

const NAMEISH = /\b\w*(name|keyword|label|title|key|leaf|word|berth|alias)\w*\b/i;
const ARTICLE_RX = /^\^\(?(\?:)?\(?(the|an?\b|a\|)/;
const DURATION_RX = /\b(seconds?|minutes?|mins?|hours?|days?|weeks?|fortnight|months?|years?)\b/;
/** The short forms: `(s|m|h|d)`, `[smhd]`. */
const SHORT_UNITS_RX = /\(\??:?s\|m\|h|\[smhd\]|\(\??:?h\|m\|s/;
const DURATION_WORDS = new Set(["second", "seconds", "minute", "minutes", "hour", "hours", "day", "days", "week", "weeks", "fortnight", "month", "months"]);
const NUMBER_WORDS = new Set(["a", "an", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "twelve", "fourteen", "half"]);
const COMPARE_CALLS = new Set(["includes", "startsWith", "endsWith", "indexOf", "find", "some", "filter", "findIndex"]);

/** The name a function-like node is counted under, or null to roll up. */
function namedFunction(node: ts.Node, sf: ts.SourceFile): string | null {
  const cls = (n: ts.Node): string => {
    for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
      if (ts.isClassLike(p) && p.name) return `${p.name.text}.`;
    }
    return "";
  };
  if ((ts.isMethodDeclaration(node) || ts.isGetAccessor(node) || ts.isConstructorDeclaration(node)) && node.parent) {
    const n = ts.isConstructorDeclaration(node) ? "constructor" : node.name.getText(sf);
    return `${cls(node)}${n}`;
  }
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.parent) {
    const p = node.parent;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && isTopLevelish(p)) return p.name.text;
    if (ts.isPropertyDeclaration(p)) return `${cls(p)}${p.name.getText(sf)}`;
  }
  return null;
}

/** A variable declared at module scope or as a class-body-level const. */
function isTopLevelish(decl: ts.VariableDeclaration): boolean {
  const stmt = decl.parent?.parent;
  return !!stmt && ts.isVariableStatement(stmt) && ts.isSourceFile(stmt.parent);
}

function isLowerCall(n: ts.Node): boolean {
  return (
    ts.isCallExpression(n) &&
    ts.isPropertyAccessExpression(n.expression) &&
    (n.expression.name.text === "toLowerCase" || n.expression.name.text === "toLocaleLowerCase")
  );
}

/** Scan one module: every matcher site, attributed to its named function. */
export function scanModule(sf: ts.SourceFile, rel: string): MatcherSite[] {
  const sites: MatcherSite[] = [];
  const isDurationHome = rel.endsWith("lib/command/CommandDefinition.ts");

  // Per named function: what it contains.
  interface Acc { line: number; lowered: Set<string>; compare: number; nameish: boolean; strip: number; duration: number; map: number }
  const accs = new Map<string, Acc>();
  const accFor = (sym: string, node: ts.Node): Acc => {
    let a = accs.get(sym);
    if (!a) {
      a = { line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, lowered: new Set(), compare: 0, nameish: false, strip: 0, duration: 0, map: 0 };
      accs.set(sym, a);
    }
    return a;
  };

  const visit = (node: ts.Node, sym: string): void => {
    const own = namedFunction(node, sf);
    const here = own ?? sym;
    const a = accFor(here, node);

    if (ts.isRegularExpressionLiteral(node)) {
      const src = node.text.slice(1, node.text.lastIndexOf("/"));
      if (ARTICLE_RX.test(src)) a.strip++;
      // A parser reads digits or spaces beside the unit — `\{day\}` in a
      // date format is a placeholder, not a parse.
      if (!isDurationHome && (DURATION_RX.test(src) || SHORT_UNITS_RX.test(src)) && /\\[ds]/.test(src)) a.duration++;
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === "ARTICLES") a.strip++;
    // A word table: time-unit keys beside number-word keys (`{ a: 1, two: 2,
    // week: 7 }`) — never a calendar's own `{ day, hour }` record.
    if (!isDurationHome && ts.isObjectLiteralExpression(node)) {
      const keys = node.properties.flatMap((p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? [p.name.text] : []));
      if (keys.some((k) => DURATION_WORDS.has(k)) && keys.some((k) => NUMBER_WORDS.has(k))) a.duration++;
    }
    // A variable that holds a lowered value (`const w = word.trim().toLowerCase()`).
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && containsLower(node.initializer)) {
      a.lowered.add(node.name.text);
    }
    const isLowered = (x: ts.Node | undefined): boolean => !!x && mentionsLowered(x, a.lowered);
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)) {
      const empty = (x: ts.Node): boolean => (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) && x.text === "";
      if ((isLowered(node.left) || isLowered(node.right)) && !empty(node.left) && !empty(node.right)) a.compare++;
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && COMPARE_CALLS.has(node.expression.name.text)) {
      const fn = node.expression.name.text;
      const arg = node.arguments[0];
      // `x.includes(w)` / `w.startsWith(x)`: a lowered side. A `find`/`some`
      // callback is judged by the compares inside it (visited below).
      if (fn !== "find" && fn !== "some" && fn !== "filter" && fn !== "findIndex" && (isLowered(node.expression.expression) || isLowered(arg))) a.compare++;
    }
    if (ts.isIdentifier(node) && NAMEISH.test(node.text)) a.nameish = true;
    // A word-keyed index BUILT: `map.set(<lowered>, value)` (a variable
    // holding the lowered word counts) or `x[<lowered>] = value`. A Set's
    // `add` (dedup) and a read are not an index.
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "set" && node.arguments.length === 2) {
      const k = node.arguments[0];
      if (k && isLowered(k)) a.map++;
    }
    if (
      ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isElementAccessExpression(node.left) && isLowered(node.left.argumentExpression)
    ) {
      a.map++;
    }
    ts.forEachChild(node, (c) => visit(c, here));
  };
  ts.forEachChild(sf, (c) => visit(c, "<module>"));

  for (const [symbol, a] of accs) {
    const at = { file: rel, line: a.line, symbol };
    if (a.strip > 0) sites.push({ ...at, kind: "article-strip" });
    if (a.compare > 0 && a.nameish) sites.push({ ...at, kind: "hand-compare" });
    if (a.duration > 0) sites.push({ ...at, kind: "duration-parse" });
    if (a.map > 0) sites.push({ ...at, kind: "word-map" });
  }
  return sites.filter((s) => !EXEMPT.some((e) => s.file.endsWith(e.file) && (e.symbol === "*" || e.symbol === s.symbol)));
}

/** Does `n` lower-case something, or read a variable holding a lowered value? */
function mentionsLowered(n: ts.Node, lowered: ReadonlySet<string>): boolean {
  let hit = false;
  const walk = (x: ts.Node): void => {
    if (hit) return;
    if (isLowerCall(x) || (ts.isIdentifier(x) && lowered.has(x.text))) hit = true;
    else ts.forEachChild(x, walk);
  };
  walk(n);
  return hit;
}

function containsLower(n: ts.Node): boolean {
  let hit = false;
  const walk = (x: ts.Node): void => {
    if (hit) return;
    if (isLowerCall(x)) hit = true;
    else ts.forEachChild(x, walk);
  };
  walk(n);
  return hit;
}

/** The files the census reads: lib/, platform/ and every pack's src/. */
function corpus(contentDir: string, mudDir: string): string[] {
  return mudSourceFiles(contentDir, mudDir)
    .map(({ file }) => file)
    .filter((f) => !/\/api\/(grammar\.ts|mql\/)/.test(f))
    .filter((f) => !f.includes(`${mudDir}/api/`) || f.includes("/content/"));
}

export function census(contentDir: string = CONTENT, mudDir: string = MUD): MatcherSite[] {
  const repo = resolve(mudDir, "..", "..", "..", "..");
  const out: MatcherSite[] = [];
  for (const file of corpus(contentDir, mudDir)) {
    out.push(...scanModule(parseTs(file, readFileSync(file, "utf8")), relative(repo, file)));
  }
  return out;
}

function main(): void {
  const sites = census();
  const missed = MUST_FIND.filter(
    (m) => !sites.some((s) => s.kind === m.kind && s.symbol === m.symbol && s.file.endsWith(m.file)),
  );
  if (missed.length > 0) {
    console.error("check-hand-matchers: ✗ the census is BLIND to known sites (it undercounts):");
    for (const m of missed) console.error(`  ✗ ${m.file} ${m.symbol} (${m.kind})`);
    process.exit(1);
  }
  const fmt = (s: MatcherSite): string => `${s.file}:${s.line}  ${s.symbol}`;
  const advice =
    "⭐ Name it by the one rule: an `object` slot (runtime Stuff), the holder's\n" +
    "  `…Named(text)` over `GrammarApi.name` (everything else), or `type: duration`.";
  const of = (k: MatcherKind): MatcherSite[] => sites.filter((s) => s.kind === k);
  const oks = [
    ratchet("check-hand-matchers", "article strips", of("article-strip").length, ARTICLE_STRIP_CEILING, of("article-strip").map(fmt), advice),
    ratchet("check-hand-matchers", "hand compares", of("hand-compare").length, HAND_COMPARE_CEILING, of("hand-compare").map(fmt), advice),
    ratchet("check-hand-matchers", "duration parses", of("duration-parse").length, DURATION_PARSE_CEILING, of("duration-parse").map(fmt), advice),
    ratchet("check-hand-matchers", "word-keyed maps", of("word-map").length, WORD_MAP_CEILING, of("word-map").map(fmt), advice),
  ];
  if (oks.includes(false)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--list")) {
    for (const s of census()) console.log(`${s.kind}\t${s.file}:${s.line}\t${s.symbol}`);
  } else {
    main();
  }
}
