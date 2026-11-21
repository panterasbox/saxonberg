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

/** Measured at C0 (2026-11-21): 36. C2: 35 (the form word). C3: 30 (lanes, nodes, organizations). */
export const ARTICLE_STRIP_CEILING = 0; // C5: 0 — every recorded name and slug uses GrammarApi.withoutArticle; the binder's fold is exempt as the command grammar.
/**
 * Measured at C0 (2026-11-21): 92. C1: 89 — −2 the census corrected (a
 * length or number test names nothing), −1 the world clock's own parser.
 */
// C2: 84 — the recipe, form, operation and call-up names go through the
// rule, and the census was tightened (a variable holds a lowered value only
// when the lowering is on its own receiver chain, not buried in an argument).
// C3: 75 — spells, readings, conditions, lanes, nodes, species, apps,
// localities, organizations, brands, offices, accounts.
// C4: 71 — the stock line, priced key, held goods, receipts, hulls and
// services; and a compare operand counts only when it IS a lowered word.
// C6: 0 — records, labels, social and the controller leftovers through the
// rule; the keyword substrate, parsers and validation exempt with reasons.
// C5: 46 — the holders name their own entries (harbor, herds, fields,
// bands, claims, ice, landings, loads, lines, moulds, cuts, metals, parts).
export const HAND_COMPARE_CEILING = 0;
/**
 * Measured at C0 (2026-11-21): 6. C1: 0 — rent, fire, the script `wait`, the
 * world clock and the test-harness clock read the one grammar
 * (`GrammarApi.parseDuration`, D-C6).
 */
export const DURATION_PARSE_CEILING = 0;
/** Measured at C0 (2026-11-21): 14. C2: 11 (the recipe word index; `soul search` exempt as a search). */
export const WORD_MAP_CEILING = 0; // C6: 0 — channel/subject lookups go through the rule; their UNIQUENESS indexes are exempt.

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
  { file: "platform/idea/SoulCatalogue.ts", symbol: "SoulCatalogue.search", why: "`soul search` is a search, not a name" },
  { file: "platform/idea/SoulCatalogue.ts", symbol: "buildSearchIndex", why: "`soul search`'s index — a search, not a name" },
  { file: "platform/idea/api/StreamLogic.ts", symbol: "*", why: "the stream verbs read the wall clock (owner, 2026-11-20)" },
  { file: "trade-chandlery/src/thing/Candle.ts", symbol: "Candle.getShortDescription", why: "RENDERING a name (no doubled stem), not naming" },
  { file: "platform/idea/api/ContainmentLogic.ts", symbol: "isRegionZeroWord", why: "a preposition — the command grammar's closed vocabulary (D-C5 rule 8)" },
  { file: "lib/spatial/Placing.ts", symbol: "PlacingMixin.resolvePlacement", why: "a preposition — the command grammar's closed vocabulary (D-C5 rule 8)" },
  { file: "platform/idea/ChannelCatalogue.ts", symbol: "*", why: "the name-UNIQUENESS index (a case-insensitive collision check on create/rename), not naming; lookups go through the rule" },
  { file: "platform/idea/SubjectCatalogue.ts", symbol: "*", why: "the title-UNIQUENESS index, not naming; lookups go through the rule" },
  { file: "lib/description/Perceptible.ts", symbol: "*", why: "the KEYWORD substrate's own upkeep (add/remove/has/primary normalize the list the rule reads)" },
  { file: "lib/description/Detailed.ts", symbol: "wrapDetailKeywords", why: "keyword DERIVATION for a detail — the list the rule reads" },
  { file: "lib/document/DocumentKind.ts", symbol: "DocumentKind.keywordsOf", why: "keyword DERIVATION for a document — the list the rule reads" },
  { file: "platform/idea/BerthExit.ts", symbol: "BerthExit.getKeywords", why: "keyword DERIVATION for a berth — the list the rule reads" },
  { file: "lib/streaming/StreamerTarget.ts", symbol: "StreamerTarget.parseUrl", why: "a URL parser, not naming" },
  { file: "lib/time/DefaultCalendar.ts", symbol: "DefaultCalendar.parseDate", why: "a date parser, not naming" },
  { file: "platform/idea/WorldClockRegistry.ts", symbol: "WorldClockRegistry.resolveName", why: "AUTHORED cron names (code), not a player's words" },
  { file: "platform/idea/WikiRenderer.ts", symbol: "WikiRenderer.expandOne", why: "template expansion over authored markup, not naming" },
  { file: "platform/idea/HelpCatalogue.ts", symbol: "HelpCatalogue.findCommandTopic", why: "a VERB word — command dispatch's vocabulary, not a name" },
  { file: "platform/idea/api/CommandLogic.ts", symbol: "bindPositionalsImpl", why: "the binder itself — the command grammar, the rule's home with MQL" },
  { file: "platform/idea/cmd/charactergen/EmbodyController.ts", symbol: "*", why: "name VALIDATION (reserved words) and the enroll draft's CLOSED choices (species/sex keys, `reroll`) — a choice list, not naming an entry" },
  { file: "lib/husbandry/Bonded.ts", symbol: "BondedMixin.takeName", why: "a name being GIVEN (its validation), not naming" },
  { file: "lib/behavior/doorman.ts", symbol: "judge", why: "an NPC's authored admission rules, not a player's words" },
  { file: "platform/idea/cmd/work/JobPostController.ts", symbol: "*", why: "a CONDITION grammar parser (`job post … when …`), not naming" },
  { file: "trade-farming/src/lib/Share.ts", symbol: "Share.constructor", why: "a FRACTION parser (`a third`, `the rest`), not naming" },
  { file: "platform/idea/species/Species.ts", symbol: "pickGiven", why: "name GENERATION (a first-letter riff), not naming" },
  { file: "platform/idea/api/CommandLogic.ts", symbol: "<module>", why: "the binder's article fold — the command grammar, the rule's home with MQL" },
];

/**
 * ⭐ The undercount guard (plan § the census gate): sites from the
 * grounding list the census must find by name. A heuristic that misses
 * one of these is blind to its family — the wave fails, never the list.
 * A site leaves this list in the commit that removes it.
 */
export const MUST_FIND: ReadonlyArray<{ file: string; symbol: string; kind: MatcherKind }> = [
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
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && lowersDirectly(node.initializer)) {
      a.lowered.add(node.name.text);
    }
    // An operand that IS a lowered word — lowered on its own receiver chain,
    // or a variable holding one — never one with a lowering buried in an
    // argument (`GrammarApi.name(w, keys.map(k => k.toLowerCase())).kind`).
    const isLowered = (x: ts.Node | undefined): boolean => !!x && (lowersDirectly(x) || readsLoweredVar(x, a.lowered));
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)) {
      // An emptiness or length test (`w === ''`, `t.length === 0`) names nothing.
      const empty = (x: ts.Node): boolean =>
        ((ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) && x.text === "") ||
        ts.isNumericLiteral(x) ||
        (ts.isPropertyAccessExpression(x) && x.name.text === "length");
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

/**
 * Is `n` itself a lowered string — a `toLowerCase()` on its receiver chain
 * (`word.trim().toLowerCase()`, `(x ?? '').toLowerCase().replace(…)`) —
 * rather than an expression with a lowering buried in an argument?
 */
function lowersDirectly(n: ts.Node): boolean {
  let x: ts.Node = n;
  for (;;) {
    if (isLowerCall(x)) return true;
    if (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x)) x = x.expression;
    else if (ts.isCallExpression(x)) x = x.expression;
    else if (ts.isPropertyAccessExpression(x)) x = x.expression;
    else if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) x = x.left;
    else return false;
  }
}

/** Is `n` (through `.trim()`-style receiver chains) a variable holding a lowered value? */
function readsLoweredVar(n: ts.Node, lowered: ReadonlySet<string>): boolean {
  let x: ts.Node = n;
  for (;;) {
    if (ts.isIdentifier(x)) return lowered.has(x.text);
    if (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x)) x = x.expression;
    else if (ts.isCallExpression(x)) x = x.expression;
    else if (ts.isPropertyAccessExpression(x)) x = x.expression;
    else if (ts.isElementAccessExpression(x)) x = x.expression;
    else return false;
  }
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
