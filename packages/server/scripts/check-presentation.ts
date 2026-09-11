/**
 * check-presentation — ⭐⭐ **the invisibility bar, made mechanical.**
 *
 * The presentation build moves the article out of 634 authored
 * descriptions and into a `register:` field, so that the realm can say
 * *the* collie, *a* collie and *two collies* without any of them being
 * guessed at from a string. The acceptance bar for that change is not a
 * judgment: **a player must not be able to tell it happened.** Every
 * shipped row has to render the identical string it renders today.
 *
 * The way to know is to render them all and diff — not to reason about
 * it. That is what this gate is.
 *
 *   --snapshot   Write the golden: for every content row, the string
 *                today's `presentationCore` produces, and for every
 *                organism row, today's stranger stem. Run ONCE, on the
 *                pre-sweep tree, before a single row is touched.
 *   --verify     Recompute both from the CURRENT tree and diff against
 *                the golden. Green = every row renders byte-identically.
 *   --lint       The permanent clauses (below). The CI gate.
 *
 * ## One extractor, both sides of the sweep
 *
 * `--snapshot` and `--verify` call the same `presentationOf`, and that is
 * the whole trick — the same function reads a pre-sweep row (`a heavy
 * door`, no register) and a post-sweep row (`heavy door` + `register:
 * indefinite`) and must answer the same string for both. A golden
 * captured before the codemod therefore proves the codemod, which is the
 * `check-field-meta` pattern this borrows wholesale.
 *
 * ⚠ **What this gate proves and what it does not.** It proves the
 * *content* is equivalent under the shipped rendering rule, which it
 * reimplements statically (a gate does not import the mudlib — the
 * `pack-roots` license). It does **not** prove the engine implements
 * that rule; `NounPhrase`'s own unit tests and the drive transcript diff
 * are what prove that. Three independent instruments, because this is
 * the widest-blast-radius change in the repo's recent history.
 *
 * ## The permanent clauses
 *
 *   a. ⭐ **No description stem begins with an article.** Census, then
 *      ratchet: the ceiling starts at today's count and may only fall.
 *      Once the sweep lands it is flipped to a hard zero and stays
 *      there, which is what stops the articles growing back one row at
 *      a time. (`docs/lint-family.md § census-then-ratchet`.)
 *   b. Every authored `register:` is one of the three.
 *   c. Every Position `noun:` is a single lowercase token — it is what
 *      one holder is CALLED (`bartender`), not what the job is.
 *
 * Usage:
 *   tsx scripts/check-presentation.ts --snapshot
 *   tsx scripts/check-presentation.ts --verify
 *   tsx scripts/check-presentation.ts --lint      # CI gate
 *   tsx scripts/check-presentation.ts --report    # the census, by branch
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { composesMixin, packSources } from './pack-roots';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');
const GOLDEN = join(SERVER_ROOT, 'scripts/__fixtures__/presentation-golden.json');

const SOURCES = packSources();

/**
 * ⭐ The ceiling for clause (a) — **census, then ratchet.**
 *
 * 611 stems lead with a lowercase article on the pre-sweep tree (610
 * `shortDescription`s and the hood's one `appearsAs`). Recording today's
 * count as the ceiling is what stops the antipattern GROWING before
 * anyone has time to remove it; W1's sweep then drives it to 0 and this
 * constant is flipped, at which point the clause is absolute and the
 * articles cannot come back one row at a time.
 *
 * ⚠ It may only ever fall. Raising it to make a new row pass is the one
 * edit that defeats the gate.
 */
export const LEADING_ARTICLE_CEILING = 611;

/* ────────────────────────── the vocabularies ───────────────────────── */

/** What article a thing's identity takes. Mirrors `NounPhrase`'s. */
export const REGISTERS = ['proper', 'definite', 'indefinite'] as const;
export type Register = (typeof REGISTERS)[number];

/**
 * ⚠⚠ **Lowercase only, and that is a finding, not a nicety.** Matching
 * case-insensitively read `"The Hearthworks — Back room"` as a definite
 * article over the stem `"Hearthworks — Back room"`, which would have
 * re-rendered as *"the Hearthworks — Back room"* and quietly decapitalized
 * a venue's proper name. A capitalized article is part of a name; a
 * lowercase one is the register. One row in 635 depends on this, and it
 * is exactly the class of change the golden exists to catch.
 */
const LEADING_ARTICLE = /^(a|an|the)\s+/;

/* ──────────────────────────── the pure rules ───────────────────────── */

/**
 * The indefinite article for a stem — a vowel check on the first letter,
 * which is the rule `GrammarApi.articleFor` has always applied.
 *
 * ⭐ It reproduces all 476 authored `a`/`an` choices in the shipped
 * content with zero mismatches, which is why the sweep needs no
 * per-row article override: the content has been obeying this rule by
 * hand since the beginning.
 */
export function articleFor(stem: string): 'a' | 'an' {
  return /^[aeiou]/i.test(stem.trim()) ? 'an' : 'a';
}

/** The article a row's authored text leads with, or null. */
export function leadingArticleOf(text: string): string | null {
  const m = LEADING_ARTICLE.exec(text.trim());
  return m?.[1] ? m[1].toLowerCase() : null;
}

/** The text with its leading article removed. */
export function stemOf(text: string): string {
  return text.trim().replace(LEADING_ARTICLE, '').trim();
}

/** The register a row's authored article implies, when it has no field. */
export function impliedRegister(text: string): Register {
  const a = leadingArticleOf(text);
  if (a === 'the') return 'definite';
  if (a === 'a' || a === 'an') return 'indefinite';
  return 'proper';
}

/**
 * Render a noun phrase at count 1 — the static twin of
 * `NounPhrase.render()`. The plural branch is deliberately absent: no
 * shipped row carries both a `shortDescription` and a `quantity` other
 * than 1, and `assertNoPluralRows` below fails the gate the day one does
 * rather than letting the golden quietly stop covering it.
 */
export function renderPhrase(stem: string, register: Register): string {
  if (register === 'proper') return stem;
  if (register === 'definite') return `the ${stem}`;
  return `${articleFor(stem)} ${stem}`;
}

/* ─────────────────────────── the content walk ──────────────────────── */

export interface Row {
  /** The content path this row installs at. */
  path: string;
  /** Repo-relative file, for a finding a human can open. */
  file: string;
  raw: Record<string, unknown>;
  data: Record<string, unknown>;
}

export function contentRows(contentDir: string = CONTENT): Row[] {
  const out: Row[] = [];
  if (!existsSync(contentDir)) return out;
  for (const pack of readdirSync(contentDir).sort()) {
    const root = join(contentDir, pack, 'content');
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir).sort()) {
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) {
          walk(abs);
          continue;
        }
        if (!entry.endsWith('.yaml')) continue;
        let parsed: unknown;
        try {
          parsed = YAML.parse(readFileSync(abs, 'utf8'));
        } catch {
          continue; // a malformed row is another gate's finding
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
        const raw = parsed as Record<string, unknown>;
        out.push({
          path: '/' + relative(root, abs).replace(/\.yaml$/, ''),
          file: relative(REPO_ROOT, abs),
          raw,
          data: (raw.data ?? {}) as Record<string, unknown>,
        });
      }
    };
    walk(root);
  }
  return out;
}

const str = (v: unknown): string =>
  typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : '';

/* ─────────────────────── the two rendered strings ──────────────────── */

/**
 * A row's authored description as a phrase — reading the `register:`
 * field when the row has been swept, and the leading article when it has
 * not. ⭐ This is the function that spans both sides of the codemod.
 */
export function phraseOf(
  text: string,
  register: unknown,
): { stem: string; register: Register } {
  if (typeof register === 'string' && (REGISTERS as readonly string[]).includes(register)) {
    return { stem: text.trim(), register: register as Register };
  }
  return { stem: stemOf(text), register: impliedRegister(text) };
}

/** A species row's first common name, walking the clade chain upward. */
function commonNameOf(speciesPath: string, byPath: Map<string, Row>): string {
  let path: string | null = speciesPath;
  while (path && path.length > 1) {
    const row = byPath.get(path);
    const names = row?.data.commonNames;
    if (Array.isArray(names) && typeof names[0] === 'string') return names[0];
    path = path.slice(0, path.lastIndexOf('/'));
  }
  return '';
}

export interface Rendered {
  /** What `getPresentation()` answers: the own view. */
  presentation: string;
  /** What a stranger is shown, for an organism row. Absent otherwise. */
  stranger?: string;
}

/**
 * The two strings a row renders, computed statically by the shipped rule.
 *
 * **Own view** (`presentationCore`): the proper name if the row's class
 * can actually hold one, else the description, else `something`. ⚠ The
 * name rung is gated on `composesMixin(class, 'NamedMixin')` rather than
 * on the key being present, so the golden is **stable across the
 * host move** — a row whose `name:` is about to stop hydrating never
 * counted toward the golden in the first place.
 *
 * **Stranger view** (`RecognitionLogic.strangerStem`): the description,
 * else the species common name, else `someone`. It skips the name, which
 * is the whole of what being a stranger means.
 */
export function presentationOf(row: Row, byPath: Map<string, Row>): Rendered | null {
  const classPath = str(row.raw.class);
  const short = str(row.data.shortDescription);
  const name = str(row.data.name);
  const species = str(row.data._speciesPath);
  const holdsName = !!name && !!classPath && composesMixin(classPath, 'NamedMixin', SOURCES);

  if (!short && !holdsName && !species) return null;

  const described = short ? renderPhrase(...phraseArgs(row, short)) : '';

  const presentation = holdsName ? name : described || 'something';

  if (!species) return { presentation };

  const common = commonNameOf(species, byPath);
  const stranger = described || (common ? renderPhrase(common, 'indefinite') : 'someone');
  return { presentation, stranger };
}

const phraseArgs = (row: Row, short: string): [string, Register] => {
  const p = phraseOf(short, row.data.register);
  return [p.stem, p.register];
};

/* ──────────────────────────── the gate itself ──────────────────────── */

interface Golden {
  [path: string]: Rendered;
}

function buildGolden(rows: Row[]): Golden {
  const byPath = new Map(rows.map((r) => [r.path, r]));
  const out: Golden = {};
  for (const row of rows) {
    const rendered = presentationOf(row, byPath);
    if (rendered) out[row.path] = rendered;
  }
  return out;
}

/**
 * ⚠ The golden models count 1 only. A row that carries both a
 * description and a quantity other than 1 would render
 * `"${n} ${plural}"` at runtime and the golden would silently stop
 * covering it — so the gate fails instead, and whoever authored the row
 * gets to decide what the plural is.
 */
function assertNoPluralRows(rows: Row[], failures: string[]): void {
  for (const row of rows) {
    const q = row.data.quantity;
    if (typeof q === 'number' && q !== 1 && str(row.data.shortDescription)) {
      failures.push(
        `${row.file}: authors both a shortDescription and quantity ${q}. The ` +
          `presentation golden models count 1 only, so this row's rendered ` +
          `string is not covered. Give the row a plural form and teach the ` +
          `golden, or drop the quantity.`,
      );
    }
  }
}

function lint(rows: Row[]): string[] {
  const failures: string[] = [];
  const articled: string[] = [];

  for (const row of rows) {
    // (a) — the stem carries no article.
    for (const key of ['shortDescription', 'appearsAs'] as const) {
      const text = str(row.data[key]);
      if (text && leadingArticleOf(text)) articled.push(`${row.file} (${key}: "${text}")`);
    }
    // (b) — an authored register is one of the three.
    const register = row.data.register;
    if (register !== undefined && !(REGISTERS as readonly string[]).includes(str(register))) {
      failures.push(
        `${row.file}: register '${String(register)}' is not one of ` +
          `${REGISTERS.join(' | ')}.`,
      );
    }
    // (c) — a Position noun is one lowercase word.
    const positions = row.data.positions;
    if (Array.isArray(positions)) {
      for (const p of positions) {
        if (!p || typeof p !== 'object') continue;
        const noun = (p as Record<string, unknown>).noun;
        if (noun === undefined) continue;
        if (typeof noun !== 'string' || !/^[a-z][a-z-]*$/.test(noun)) {
          failures.push(
            `${row.file}: position '${String((p as Record<string, unknown>).key)}' ` +
              `has noun '${String(noun)}'. A noun is what ONE holder is called — ` +
              `one lowercase word ('bartender'), not the job ('tending bar').`,
          );
        }
      }
    }
  }

  assertNoPluralRows(rows, failures);

  if (articled.length > LEADING_ARTICLE_CEILING) {
    failures.push(
      `${articled.length} description stem(s) still begin with an article; ` +
        `the ceiling is ${LEADING_ARTICLE_CEILING}. The article is the ` +
        `register's job now — strip it and author 'register: definite' or ` +
        `'indefinite' instead, so the world can also say the possessive and ` +
        `the plural.\n` +
        articled
          .slice(0, 20)
          .map((a) => `    ${a}`)
          .join('\n') +
        (articled.length > 20 ? `\n    … and ${articled.length - 20} more` : ''),
    );
  }
  return failures;
}

function report(rows: Row[]): void {
  const byBranch = new Map<string, Map<string, number>>();
  let described = 0;
  for (const row of rows) {
    const text = str(row.data.shortDescription);
    if (!text) continue;
    described++;
    const branch = row.path.split('/')[2] ?? '(root)';
    const a = leadingArticleOf(text) ?? 'none';
    const b = byBranch.get(branch) ?? new Map();
    b.set(a, (b.get(a) ?? 0) + 1);
    byBranch.set(branch, b);
  }
  console.log(`${described} rows author a shortDescription:\n`);
  for (const [branch, counts] of [...byBranch].sort()) {
    const line = [...counts]
      .sort()
      .map(([a, n]) => `${a} ${n}`)
      .join(' · ');
    console.log(`  ${branch.padEnd(12)} ${line}`);
  }
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--lint';
  const rows = contentRows();

  if (mode === '--report') {
    report(rows);
    return;
  }

  if (mode === '--snapshot') {
    const golden = buildGolden(rows);
    mkdirSync(dirname(GOLDEN), { recursive: true });
    writeFileSync(GOLDEN, JSON.stringify(golden, null, 2) + '\n', 'utf8');
    console.log(
      `✔ check-presentation --snapshot — ${Object.keys(golden).length} rows ` +
        `recorded to ${relative(REPO_ROOT, GOLDEN)}.`,
    );
    return;
  }

  if (mode === '--verify') {
    if (!existsSync(GOLDEN)) {
      console.error(
        `✖ check-presentation --verify: no golden at ${relative(REPO_ROOT, GOLDEN)}. ` +
          `Run --snapshot on the pre-sweep tree first.`,
      );
      process.exit(1);
    }
    const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Golden;
    const now = buildGolden(rows);
    const diffs: string[] = [];
    for (const [path, was] of Object.entries(golden)) {
      const is = now[path];
      if (!is) {
        diffs.push(`  ${path}: rendered "${was.presentation}", now renders nothing`);
        continue;
      }
      if (is.presentation !== was.presentation) {
        diffs.push(`  ${path}: "${was.presentation}" → "${is.presentation}"`);
      }
      if ((was.stranger ?? '') !== (is.stranger ?? '')) {
        diffs.push(
          `  ${path} (stranger): "${was.stranger ?? '—'}" → "${is.stranger ?? '—'}"`,
        );
      }
    }
    const added = Object.keys(now).filter((p) => !(p in golden));
    if (diffs.length) {
      console.error(
        `\n✖ check-presentation --verify — ${diffs.length} row(s) render ` +
          `differently than they did before the sweep. A player would be ` +
          `able to tell:\n`,
      );
      for (const d of diffs.slice(0, 40)) console.error(d);
      if (diffs.length > 40) console.error(`  … and ${diffs.length - 40} more`);
      process.exit(1);
    }
    console.log(
      `✔ check-presentation --verify — ${Object.keys(golden).length} rows ` +
        `render byte-identically` +
        (added.length ? `; ${added.length} row(s) added since the golden` : '') +
        `.`,
    );
    return;
  }

  const failures = lint(rows);
  if (failures.length) {
    console.error(`\n✖ lint:presentation — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `✔ lint:presentation — no description stem carries an article, every ` +
      `register is one of the three, and every position noun is one word.`,
  );
}

if (process.argv[1] && /check-presentation\.ts$/.test(process.argv[1])) main();
