/**
 * check-descriptor-banks — the descriptor / material disjointness lint.
 *
 * The invariant (magic-items D32):
 *
 * > descriptor banks ∩ (material **names** ∪ **keywords** ∪
 * > **appearance** words) = ∅
 *
 * ## Why this is a build check and not a review note
 *
 * **A collision is a parser ambiguity bug, not a stylistic wobble.**
 * `Material` carries `keywords`, and keywords drive the parser's
 * material resolution — so if *amber* is both a wand descriptor and a
 * material keyword, `look at amber` has two answers. That is a
 * correctness failure, and it is exactly the class of thing the build
 * should catch rather than a human.
 *
 * It is also a **modelling** failure. Material is a closed curated set
 * with real physical consequences (`response = f(mechanism, material,
 * construction)`), so a descriptor naming one is either a lie in the
 * model — the wand is *not* actually amber — or an unintended constraint
 * on manufacture. And the closed set is nowhere near deep enough to feed
 * a descriptor pool anyway.
 *
 * A runtime check would fail in front of a player; the CMS may warn
 * while authoring but cannot guarantee, since packs install by other
 * paths. So: the build. Same shape as `check-boundary-exemptions`, which
 * exists for the same reason — two sets must stay disjoint.
 *
 * ## ⚠ It runs in BOTH directions
 *
 * This is the half nobody thinks to check. Adding *amber* as a gemstone
 * years after a wand descriptor shipped collides just as badly as the
 * reverse, and the person adding the gemstone has no reason to be
 * thinking about wands. Because the check is a set intersection over
 * *both* corpora, re-run on every build, a new material trips it exactly
 * as a new descriptor does.
 *
 * ## What it also checks
 *
 * **Depth** (AC 25). A class with N item types needs N descriptors live,
 * 2N during a transition window, and roughly N × (reuseDelay + 1)
 * overall. A bank too shallow for its class would start reissuing
 * descriptors before the reuse delay expired, which is the one thing the
 * delay exists to prevent.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import YAML from 'yaml';

const EXIT_ON_FINDINGS = true;

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, '..', 'src');
const CONTENT_ROOT = join(here, '..', '..', 'content');
const SEEDS = join(SERVER_SRC, 'mud', 'seeds');

/**
 * The reuse delay, mirrored from `lib/identification/Appearance.ts`.
 * Duplicated deliberately: a lint that imported the mudlib would drag
 * the whole Stuff graph into a build script.
 */
const REUSE_DELAY = 3;

/**
 * How many item types each class is expected to support. The depth
 * requirement is `types × (REUSE_DELAY + 1)`. Grow these as content
 * grows — the lint failing is the intended signal that a bank needs
 * more words, not that the number needs lowering.
 */
const EXPECTED_TYPES: Record<string, number> = {
  potion: 12,
  wand: 10,
  ring: 10,
  amulet: 8,
  spellbook: 12,
  // Scrolls are the free case — arbitrary text, unbounded — so they are
  // held to a token depth only.
  scroll: 4,
};

/** Recursively collect `.yaml` files under `root`. */
function walkYaml(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (entry.endsWith('.yaml')) out.push(full);
    }
  }
  return out;
}

/** Directories holding content packs (each with a `content/` tree). */
function packContentRoots(): string[] {
  if (!existsSync(CONTENT_ROOT)) return [];
  return readdirSync(CONTENT_ROOT)
    .map((name) => join(CONTENT_ROOT, name, 'content'))
    .filter((p) => existsSync(p));
}

/**
 * Normalize a word for comparison: lowercase, punctuation-stripped.
 * Deliberately NOT stemmed — *banded* and *band* are different words to
 * a player and to the parser, and conflating them would reject usable
 * vocabulary.
 */
function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .trim();
}

/** Split a phrase into normalized words, dropping trivial ones. */
function words(phrase: string): string[] {
  return phrase
    .split(/[\s,/]+/)
    .map(normalize)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Words too common to be a meaningful collision. A material appearance
 * reading "a foamy amber ale" must not reserve *the* forever.
 */
const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'its',
  'his',
  'her',
  'their',
  'that',
  'this',
  'from',
  'into',
  'over',
  'under',
]);

interface Finding {
  bank: string;
  word: string;
  where: string;
}

/** Every word the materials vocabulary reserves, with its source. */
function collectMaterialWords(): Map<string, string> {
  const reserved = new Map<string, string>();
  const roots = [
    ...packContentRoots().map((p) => join(p, 'obj', 'material')),
    join(SEEDS, 'obj', 'material'),
  ];
  for (const root of roots) {
    for (const file of walkYaml(root)) {
      let parsed: unknown;
      try {
        parsed = YAML.parse(readFileSync(file, 'utf-8'));
      } catch {
        continue; // a malformed material is another lint's problem
      }
      const data = (parsed as { data?: Record<string, unknown> })?.data;
      if (!data) continue;
      const label = basename(file);
      const add = (w: string, kind: string): void => {
        const n = normalize(w);
        if (n.length > 2 && !STOP_WORDS.has(n) && !reserved.has(n)) {
          reserved.set(n, `${label} (${kind})`);
        }
      };
      if (typeof data.name === 'string') {
        for (const w of words(data.name)) add(w, 'name');
      }
      if (typeof data.appearance === 'string') {
        for (const w of words(data.appearance)) add(w, 'appearance');
      }
      if (Array.isArray(data.keywords)) {
        for (const k of data.keywords) {
          if (typeof k === 'string') for (const w of words(k)) add(w, 'keyword');
        }
      }
    }
  }
  return reserved;
}

interface BankFile {
  key: string;
  primary: string[];
  secondary: string[];
  file: string;
}

/** Every authored descriptor bank across every pack. */
function collectBanks(): BankFile[] {
  const banks: BankFile[] = [];
  for (const root of packContentRoots()) {
    for (const file of walkYaml(join(root, 'descriptor-banks'))) {
      let parsed: unknown;
      try {
        parsed = YAML.parse(readFileSync(file, 'utf-8'));
      } catch (err) {
        console.error(`check-descriptor-banks: malformed bank ${file}: ${String(err)}`);
        process.exitCode = 1;
        continue;
      }
      const doc = (parsed ?? {}) as Record<string, unknown>;
      banks.push({
        key: basename(file).replace(/\.yaml$/, ''),
        primary: Array.isArray(doc.primary)
          ? doc.primary.filter((v): v is string => typeof v === 'string')
          : [],
        secondary: Array.isArray(doc.secondary)
          ? doc.secondary.filter((v): v is string => typeof v === 'string')
          : [],
        file,
      });
    }
  }
  return banks;
}

function main(): void {
  const reserved = collectMaterialWords();
  const banks = collectBanks();

  const collisions: Finding[] = [];
  const shallow: string[] = [];
  const dupes: string[] = [];

  for (const bank of banks) {
    const all = [...bank.primary, ...bank.secondary];
    // ── The disjointness invariant, in both directions ──
    for (const descriptor of all) {
      for (const w of words(descriptor)) {
        const where = reserved.get(w);
        if (where) collisions.push({ bank: bank.key, word: w, where });
      }
    }
    // ── Depth (AC 25) ──
    const depth =
      bank.secondary.length > 0
        ? bank.primary.length * bank.secondary.length
        : bank.primary.length;
    const types = EXPECTED_TYPES[bank.key];
    if (types !== undefined) {
      const need = types * (REUSE_DELAY + 1);
      if (depth < need) {
        shallow.push(
          `  ${bank.key}: depth ${depth} < ${need} ` +
            `(${types} item types × (reuseDelay ${REUSE_DELAY} + 1))`,
        );
      }
    }
    // A duplicated word inside one axis silently shrinks the pool.
    for (const axis of [bank.primary, bank.secondary]) {
      const seen = new Set<string>();
      for (const w of axis) {
        const n = normalize(w);
        if (seen.has(n)) dupes.push(`  ${bank.key}: duplicate '${w}'`);
        seen.add(n);
      }
    }
  }

  let failed = false;

  if (collisions.length > 0) {
    failed = true;
    console.error(
      'check-descriptor-banks: descriptor words collide with the materials\n' +
        'vocabulary. A collision is a PARSER AMBIGUITY BUG — `look at <word>`\n' +
        'would have two answers — and a modelling lie besides: material is a\n' +
        'closed set with real physical consequences, so a descriptor naming\n' +
        'one either asserts something false or constrains manufacture.\n' +
        '\n' +
        'This fires in BOTH directions: a NEW MATERIAL colliding with a\n' +
        'shipped descriptor lands here too, which is the direction nobody\n' +
        'thinks to check.\n',
    );
    for (const c of collisions) {
      console.error(`  ${c.bank}: '${c.word}' is reserved by ${c.where}`);
    }
    console.error(
      '\nThe tempting words are material claims in disguise — gilded,\n' +
        'vellum, leathery, cloth, crystal, glassy, waxen, iron-bound.\n' +
        'Every one asserts a substance. Reach for a DECORATIVE word.',
    );
  }

  if (shallow.length > 0) {
    failed = true;
    console.error(
      '\ncheck-descriptor-banks: bank(s) too shallow. A class with N item\n' +
        'types needs N descriptors live, 2N during a transition window, and\n' +
        'roughly N × (reuseDelay + 1) overall — otherwise descriptors get\n' +
        'reissued before the delay expires, which is the one thing the delay\n' +
        'exists to prevent. Add words to an AXIS: the bank is the product of\n' +
        'its two axes, so ten and ten give a hundred.\n',
    );
    for (const s of shallow) console.error(s);
  }

  if (dupes.length > 0) {
    failed = true;
    console.error('\ncheck-descriptor-banks: duplicate words shrink the pool silently:\n');
    for (const d of dupes) console.error(d);
  }

  if (failed) {
    if (EXIT_ON_FINDINGS) process.exit(1);
    return;
  }

  const total = banks.reduce(
    (n, b) =>
      n +
      (b.secondary.length > 0
        ? b.primary.length * b.secondary.length
        : b.primary.length),
    0,
  );
  console.log(
    `check-descriptor-banks: ${banks.length} bank(s), ${total} distinguishable ` +
      `descriptor(s), disjoint from ${reserved.size} reserved material word(s).`,
  );
}

main();
