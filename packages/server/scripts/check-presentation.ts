/**
 * check-presentation — ⭐⭐ **the invisibility bar, made mechanical.**
 *
 * The presentation build moved the article out of 634 authored
 * descriptions and into a `register:` field, so the realm can say *the*
 * collie, *a* collie and *two collies* without any of them being guessed
 * at from a string. The acceptance bar for that change was not a
 * judgment: **a player must not be able to tell it happened.**
 *
 * ⚠ **That proof was a build-cycle instrument and is gone.** The sweep
 * shipped behind a golden (`--snapshot` on the pre-sweep tree, `--verify`
 * after) which held 635 rows byte-identical; the golden was retired with
 * the plan at `/finalize`, because a golden re-snapshotted by whoever
 * next changes a row proves nothing. What remains is the half that
 * keeps working: the permanent clauses below, which are what stop the
 * articles growing back one row at a time.
 *
 * ## The permanent clauses
 *
 *   a. ⭐ **No description stem begins with an article.** Census, then
 *      ratchet: the ceiling started at today's count and may only fall.
 *      It is now a hard zero. (`docs/lint-family.md § census-then-ratchet`.)
 *   b. Every authored `register:` is one of the three.
 *   c. Every Position `noun:` is a single lowercase token — it is what
 *      one holder is CALLED (`bartender`), not what the job is.
 *   d. An authored `primaryKeyword` is one of that row's own `keywords`.
 *
 * ⚠ A gate does not import the mudlib (the `pack-roots` license), so the
 * rendering rule is reimplemented statically here. `NounPhrase`'s unit
 * tests are what prove the engine implements it.
 *
 * Usage:
 *   tsx scripts/check-presentation.ts --lint      # CI gate
 *   tsx scripts/check-presentation.ts --report    # the census, by branch
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { composesMixin, packSources } from './pack-roots';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

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
export const LEADING_ARTICLE_CEILING = 0;

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
 * is exactly the class of change a case-insensitive match loses.
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
 * `NounPhrase.render()`. The plural branch is deliberately absent: this
 * gate reads authored text, and a row's count is a runtime quantity that
 * `NounPhrase.withCount` splices in past the article.
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

/* ──────────────────────────── the gate itself ──────────────────────── */

/**
 * ⚠ A pack's `src/` also holds authored prose that reaches
 * `setShortDescription` — `eternal-university/src/duncan-hall/
 * dorm-themes.yaml` dresses a dorm room in 28 of them. It is not a
 * template row so `contentRows` never sees it, and an article that crept
 * back there would render *"a a miner's dorm room"* with no gate saying
 * so. Clause (a) walks it too, by text.
 */
function srcProseArticles(): string[] {
  const out: string[] = [];
  for (const pack of packSources()) {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir).sort()) {
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) {
          if (entry !== '__tests__') walk(abs);
          continue;
        }
        if (!entry.endsWith('.yaml')) continue;
        for (const line of readFileSync(abs, 'utf8').split('\n')) {
          const m = /^\s*shortDescription:\s+"?'?(.+?)"?'?\s*$/.exec(line);
          const text = m?.[1];
          if (text && leadingArticleOf(text)) {
            out.push(`${relative(REPO_ROOT, abs)} (shortDescription: "${text}")`);
          }
        }
      }
    };
    walk(pack.srcDir);
  }
  return out;
}

function lint(rows: Row[]): string[] {
  const failures: string[] = [];
  const articled: string[] = [...srcProseArticles()];

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
    // (d) — an authored primaryKeyword must be in the row's keywords.
    //   ⭐ Keywords are authored-only since 2026-09-11, so the pool no
    //   longer "catches up" from a description: a pinned word that is
    //   not in the list is a click affordance sending `look <word>` at
    //   nothing. The runtime setter warns; this refuses.
    const pinned = str(row.data.primaryKeyword);
    if (pinned) {
      const pool = Array.isArray(row.data.keywords)
        ? row.data.keywords.map((k) => str(k).toLowerCase())
        : [];
      if (!pool.includes(pinned.toLowerCase())) {
        failures.push(
          `${row.file}: primaryKeyword '${pinned}' is not in this row's ` +
            `keywords [${pool.join(', ')}]. A click sends ` +
            `\`look ${pinned}\`, which would resolve nothing. Add it to ` +
            `keywords, or drop the pin — the default is keywords[0].`,
        );
      }
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

  const failures = lint(rows);
  if (failures.length) {
    console.error(`\n✖ lint:presentation — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `✔ lint:presentation — no description stem carries an article, every ` +
      `register is one of the three, every position noun is one word, and ` +
      `every pinned primaryKeyword is a keyword the row actually has.`,
  );
}

if (process.argv[1] && /check-presentation\.ts$/.test(process.argv[1])) main();
