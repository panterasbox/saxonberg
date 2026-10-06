/**
 * check-closed-vocabularies — ⭐⭐ **the census of kernel words content is
 * not allowed to add to.**
 *
 * > A **pack must never need a kernel list edit.**
 *
 * That rule is in `CLAUDE.md` and in `content-packs.md`, and it is the one
 * every closed vocabulary quietly breaks. The injury is specific: a pack
 * author types a word in a YAML row, a list in kernel source decides the
 * word is not real, and the only way to add it is a kernel MR — in a
 * repo whose whole content story is *install the pack, get the thing*.
 *
 * ## ⚠⚠ Why this gate exists, stated as what actually happened
 *
 * Two receipts, both on one branch:
 *
 *   - **`MATURATION_MECHANISMS` grew 4 → 5.** The whiskey vertical needed
 *     `enzymatic` to ship floor malting, so a TRADE BUILD edited a kernel
 *     list. Nothing refused it, nothing counted it, and the diff read as
 *     ordinary work.
 *   - **`AROMAS` arrived with 11 words** (the whiskey-styles build), and
 *     its own site note conceded that a smokehouse wanting `tar` would
 *     need a kernel MR — then shipped anyway. ⭐ The author (me) knew the
 *     rule, wrote the objection down, and proceeded, because a note is
 *     not a force.
 *
 * ⭐⭐ **That is the thing this gate is for.** An agent adapts whatever it
 * finds to suit its need unless something opposes it, and prose does not
 * oppose anything — the `lint:lib-statics` header supplied the
 * justification for five ceiling rises on this same branch. A census
 * does oppose it: a twelfth aroma word stops being a comment somebody can
 * reason past and becomes a number somebody has to come back about.
 *
 * ## The question to ask
 *
 * Not *is this list closed?* — plenty of closed lists are correct. Ask:
 *
 * > **Is its closure a fact about the WORLD, or a convenience for the
 * > implementation?**
 *
 *   - **A fact about the world** → it stays, declared in
 *     {@link CLOSED_BY_DESIGN} with the reason. `BASIC_TASTES` is five
 *     words because taste physiology genuinely has five receptor classes;
 *     that is territory, not a modelling choice. A designed ladder
 *     (`DIFFICULTIES`) is the same: a sixth rung is a design change, not
 *     content.
 *   - **A convenience** → it wants to be **ROWS**, and the shape is
 *     already shipped and proven: `instrumentation.md`'s reading channels.
 *     `<root>/idea/reading/<channel>.yaml`, warmed by `ReadingCatalogue`
 *     by template-path infix, *"no kernel list, no stanza in a platform
 *     view, no boot-sequencer line"* — 31 channels across the platform and
 *     seven packs today. `Placement` made this exact move: it was an enum
 *     and is a row now.
 *
 * ⚠ **Being the right shape for its class is not an argument for growth.**
 * "This word belongs in this vocabulary" says the entry may EXIST; it says
 * nothing about whether the population may grow while the rows migration
 * is pending, which is the only thing a ratchet asserts. The same
 * conflation cost `lint:lib-statics` five rises — see
 * `docs/lint-family.md` § ratchet lesson 4.
 *
 * ## ⚠ What this detector can and cannot see
 *
 * It finds an exported closed vocabulary of string literals in kernel
 * source **whose membership is consulted somewhere that refuses or drops
 * a value** (a `throw`, a `RangeError`, a filtering `includes`). That is
 * the signature of a list standing between an author and their row.
 *
 * Three honest limits, written down because a census that claims
 * completeness is how `check-formulae` shipped counting mixin factories as
 * single formulas:
 *
 *   1. **False negatives.** A vocabulary that gates content without a
 *      refusal token within five lines is missed. The number is a floor.
 *   2. **The dispositions are HUMAN.** Which closures are facts about the
 *      world was decided by reading each one, not computed. That is the
 *      point — a classifier cannot tell physiology from convenience — but
 *      it means {@link CLOSED_BY_DESIGN} is a reviewable claim, not a
 *      derivation.
 *   3. **Shape only.** A vocabulary expressed some other way (a `Set`, a
 *      union type with no array) is invisible here. ⚠ The first draft of
 *      this detector also missed `AROMAS` itself, because `isAroma` walks
 *      the list with a `for` loop instead of `.includes` — a gate blind to
 *      its own motivating case, which is exactly the failure mode in
 *      `docs/lint-family.md` § lesson 1.
 *
 * Run: `pnpm -C packages/server lint:closed-vocabularies`
 *      (`--report` for every candidate, including the exempt ones)
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const MUD_ROOT = fileURLToPath(new URL('../src/mud/', import.meta.url));

/**
 * ⭐⭐ **The ceiling, and it is the UNDECLARED population only.** Today's
 * count of closed kernel vocabularies that content must match against and
 * whose closure nobody has claimed is a fact about the world.
 *
 * It may FALL and may never RISE. It falls when a vocabulary becomes rows
 * (the `Placement` move, or `instrumentation.md`'s reading channels), or
 * when somebody reads one and declares its closure real in
 * {@link CLOSED_BY_DESIGN} with a reason.
 *
 * ⚠ **A rise wants a caller audit, not a doctrine quotation.** Name who
 * validates against the list and ask whether a pack could ever need a word
 * in it. If it could, the answer is rows — not a bigger number here.
 */
export const CLOSED_VOCABULARY_CEILING = 5;

/**
 * Vocabularies whose closure is a **fact about the world**, each with the
 * reason. Reported but not counted — the `@internal` shape from
 * `lint:lib-statics`: an exemption that is *declared*, so a widening is a
 * visible diff in this file rather than a silent drift.
 *
 * ⚠ Adding an entry here is a claim that a pack can never legitimately
 * need a word in that list. Write the reason as the claim, not as a
 * restatement of the name.
 */
export const CLOSED_BY_DESIGN: Readonly<Record<string, string>> = {
  BASIC_TASTES:
    'Taste physiology is genuinely closed — five receptor classes, and ' +
    'that is territory rather than a modelling choice. ⚠ Smell is NOT ' +
    'the same and must not borrow this reason: ~400 receptor types, no ' +
    'agreed basis set, and "primary odors" is a research programme that ' +
    'failed. AROMAS was justified by analogy to this entry, and the ' +
    'analogy does not hold.',
  DIFFICULTIES:
    'A designed ladder of act difficulty. The rungs ARE the design, and ' +
    'the advancement maths reads their ordinal — a sixth rung is a ' +
    'balance change, not a content addition.',
  SENSE_CHANNELS:
    'The senses a body has. A new sense is a kernel capability (a ' +
    'Modality, a perception path, a verb), never a row somebody installs.',
  HAZARD_STATES:
    'The states of a state machine the kernel advances. A fourth state ' +
    'is new transition code, so a row could not mean anything by it.',
  REACH_CLASSES:
    'A designed three-rung weapon ladder whose rungs the combat ' +
    'arithmetic reads positionally. A fourth rung rebalances every ' +
    'weapon in the game.',
  DISCIPLINE_CHANNELS:
    'The procedural / conceptual / bodily split (Bloom, Kolb) — a ' +
    'taxonomy claim about how learning works, which is the advancement ' +
    "model's premise rather than a list of options.",
};

interface Vocabulary {
  name: string;
  file: string;
  words: string[];
  /** Files where a non-member is refused or dropped. */
  refusedIn: string[];
}

/** Every `.ts` under `dir`, recursively, tests excluded. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== '__tests__' && entry !== 'node_modules') {
        sourceFiles(full, out);
      }
    } else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * Blank out comments, preserving line numbers.
 *
 * ⚠ Load-bearing: without it a doc comment that merely *discusses* a
 * `throw` makes its own vocabulary look content-facing, and the census
 * would count the best-documented lists rather than the real ones.
 */
export function decomment(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

const DECL =
  /export const ([A-Z][A-Z0-9_]+)(?::[^=]*)?=\s*\[([^\]]*)\]/gs;
const REFUSES = /\bthrow\b|\.filter\(|return false|RangeError|new Error\(/;

/**
 * ⭐ A **membership test**: code asking whether some OTHER value is in the
 * vocabulary. This is the half that makes a refusal mean something, and it
 * is deliberately not just `.includes` — `isAroma` walks `AROMAS` with a
 * `for…of`, which is why `of VOCAB` counts, and `.some` / `.find` are
 * membership walks for the same reason.
 */
function membershipTest(name: string): RegExp {
  // ⚠ The `(?:\\s+as\\s+[^)]*)?\\)?` is not decoration: the codebase's
  // idiom for a `readonly T[]` vocabulary is
  // `(BASIC_TASTES as readonly string[]).includes(t)`, and a pattern
  // anchored on `NAME.includes(` misses every one of them. That cast
  // silently dropped BASIC_TASTES and RECIPE_MEDIA from the census —
  // two vocabularies content certainly names.
  return new RegExp(
    `\\b${name}\\b(?:\\s+as\\s+[^)]*)?\\s*\\)?\\s*\\.(includes|some|find)\\(` +
      `|\\bincludes\\(\\s*${name}\\b` +
      `|\\bof\\s+${name}\\b`,
  );
}

/**
 * ⚠⚠ The **declaration** line, which must never itself be the evidence.
 *
 * The first draft counted a vocabulary whenever ANY line naming it sat
 * within five lines of a refusal token — and a declaration directly above
 * its own `.filter` qualified. So the char-gen `FIELD_ORDER` counted in a
 * unit fixture and escaped in the real tree purely because its
 * declaration and its use are far apart. ⭐ A census that depends on line
 * spacing is not a census; the negative test is what found it.
 */
function isDeclaration(line: string, name: string): boolean {
  return new RegExp(`export const ${name}\\b`).test(line);
}

export function scan(root = MUD_ROOT): Vocabulary[] {
  const files = sourceFiles(root).map(
    (f) => [f.slice(root.length), decomment(readFileSync(f, 'utf8'))] as const,
  );
  const found = new Map<string, Vocabulary>();
  for (const [file, source] of files) {
    for (const m of source.matchAll(DECL)) {
      const words = [...m[2]!.matchAll(/['"]([a-z][a-z0-9 _-]*)['"]/g)].map(
        (w) => w[1]!,
      );
      // A one-word list is a constant, not a vocabulary.
      if (words.length >= 2) {
        found.set(m[1]!, { name: m[1]!, file, words, refusedIn: [] });
      }
    }
  }
  for (const [file, source] of files) {
    const lines = source.split('\n');
    for (const vocab of found.values()) {
      const tests = membershipTest(vocab.name);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // ⭐ Evidence is a MEMBERSHIP TEST near a refusal — never the
        // declaration, and never the list walking itself.
        if (isDeclaration(line, vocab.name)) continue;
        if (!tests.test(line)) continue;
        const window = lines.slice(Math.max(0, i - 5), i + 6).join('\n');
        if (REFUSES.test(window)) {
          if (!vocab.refusedIn.includes(file)) vocab.refusedIn.push(file);
          break;
        }
      }
    }
  }
  return [...found.values()].filter((v) => v.refusedIn.length > 0);
}

function main(): void {
  const facing = scan().sort((a, b) => a.name.localeCompare(b.name));
  const counted = facing.filter((v) => !(v.name in CLOSED_BY_DESIGN));
  const exempt = facing.filter((v) => v.name in CLOSED_BY_DESIGN);

  if (process.argv.includes('--report')) {
    console.log('counted — closure is a convenience, so these want ROWS:\n');
    for (const v of counted) {
      console.log(
        `  ${v.name.padEnd(24)} ${String(v.words.length).padStart(2)}w  ${v.file}`,
      );
      console.log(`  ${' '.repeat(24)} refused in: ${v.refusedIn.join(', ')}`);
    }
    console.log('\ndeclared closed by design:\n');
    for (const v of exempt) {
      console.log(`  ${v.name.padEnd(24)} ${String(v.words.length).padStart(2)}w  ${v.file}`);
      console.log(`  ${' '.repeat(24)} ${CLOSED_BY_DESIGN[v.name]}`);
    }
    return;
  }

  // ⭐⭐ **A declared exemption that matches nothing is a rubber stamp.**
  // If the scanner stops finding a vocabulary — renamed, deleted, or a
  // consult shape the detector cannot see — its entry here goes on
  // reading as a considered judgement about live code. That is the
  // enumeration rot `lint:family` was made derived to escape, so it is
  // an error rather than a note.
  const stale = Object.keys(CLOSED_BY_DESIGN).filter(
    (name) => !facing.some((v) => v.name === name),
  );
  if (stale.length > 0) {
    console.error(
      `\n✖ lint:closed-vocabularies — ${stale.length} CLOSED_BY_DESIGN ` +
        `entry(ies) match nothing the scanner finds: ${stale.join(', ')}.\n\n` +
        `  An exemption for a vocabulary that is no longer there (or ` +
        `whose consult shape the detector can no longer see) reads as a ` +
        `considered judgement about live code and is not one. Delete the ` +
        `entry, or fix the detector if the vocabulary is still gating ` +
        `content.\n`,
    );
    process.exit(1);
  }

  if (counted.length > CLOSED_VOCABULARY_CEILING) {
    console.error(
      `\n✖ lint:closed-vocabularies — ${counted.length} closed kernel ` +
        `vocabulary(ies) content must match against; the ceiling is ` +
        `${CLOSED_VOCABULARY_CEILING}.\n\n` +
        `  A pack must never need a kernel list edit. Ask of the new ` +
        `one: is its closure a fact about the WORLD, or a convenience ` +
        `for the implementation?\n\n` +
        `  A fact about the world (taste's five receptor classes, a ` +
        `designed ladder whose arithmetic reads the rungs) → declare it ` +
        `in CLOSED_BY_DESIGN with the reason as a CLAIM.\n\n` +
        `  A convenience → it wants ROWS, and the shape is shipped: ` +
        `instrumentation.md's reading channels, <root>/idea/reading/` +
        `<channel>.yaml warmed by template-path infix, no kernel list ` +
        `anywhere. Placement made this exact move from enum to row.\n\n` +
        `  ⚠ "This word belongs in this vocabulary" is not an argument ` +
        `for growing the population. The ceiling may fall; it may never ` +
        `rise.\n`,
    );
    for (const v of counted) {
      console.error(
        `  ${v.name.padEnd(24)} ${String(v.words.length).padStart(2)}w  ${v.file}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `✔ lint:closed-vocabularies — ${counted.length} content-facing ` +
      `closed kernel vocabulary(ies) (ceiling ${CLOSED_VOCABULARY_CEILING}); ` +
      `${exempt.length} declared closed by design.`,
  );
}

if (
  process.argv[1] &&
  /check-closed-vocabularies\.ts$/.test(process.argv[1])
) {
  main();
}
