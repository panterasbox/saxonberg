/**
 * check-instrument-args — ⭐⭐ **an instrument is an ARGUMENT, not a
 * search.**
 *
 * ## The defect
 *
 * A controller needs the thing the verb acts *with* — the stones, the
 * furnace, the clamp, the counter — and hunts for it: walk the room's
 * contents (or the actor's), narrow by type, take the first hit.
 *
 * ```typescript
 * // BAD — the controller re-deriving what the binder already resolves
 * const mill = room.getContents().find((c) => c instanceof GristMill);
 * ```
 *
 * The house style is to **declare it** on the view, with an MQL default,
 * and read it off the model. `buy.yaml` says so in a comment left by
 * whoever fixed it there:
 *
 * > *WHERE you are buying from, DECLARED rather than re-derived. The
 * > controller used to hunt for a counter itself; now the binder resolves
 * > it like any other object and the controller just reads it.*
 *
 * ```yaml
 * - name: mill
 *   type: object
 *   required: false
 *   prepositions: [at, with]
 *   default: "reachable:[mixin.ComminutingMixin]"
 *   scope: ["reachable"]
 *   requires: [ComminutingMixin]
 * ```
 *
 * ## ⭐ Why it is worth a gate — two costs, and the second is silent
 *
 * **1. The instrument becomes unaddressable.** A room with a hand quern
 * *and* a water mill hands you whichever the walk hits first, and no
 * sentence a player can type changes it. A declared arg gets
 * `mill the wheat at the quern` for free.
 *
 * **2. ⚠⚠ The walk almost always narrows on a CLASS, and a class is the
 * wrong question.** This is what the gate really exists for.
 * `ComminutingMixin` is kernel substrate for exactly one reason — the
 * metal chain's stamp mill is its second consumer, in a pack with no
 * ancestor in common — so `instanceof GristMill` would have silently
 * refused to find the very thing the mixin was lifted to the kernel
 * *for*. The mixin query finds both; the class check finds one and says
 * nothing about the other.
 *
 * ## ⚠ What this is NOT, and why `lint:world-scan` did not catch it
 *
 * These walks are **bounded** — one room, one inventory — so the
 * world-scan gate has nothing to fire on and is right not to. This is a
 * different rule: not *"you may not be handed the world"* but
 * ***"resolution belongs to the binder."***
 *
 * So the gate is deliberately narrow. It fires only where **both** hold:
 *
 *   - the receiver is the actor or their surroundings (`giver`, `room`,
 *     `location`, a `getContainer()` call…) — never an object the
 *     controller was already handed;
 *   - the predicate is a **type test** (`instanceof X` or
 *     `MixinApi.isX`) — the signature of *finding a kind of thing*
 *     rather than reading a known one.
 *
 * Asking an object you already hold for its own contents is the
 * `ask-the-owner` rung and is always fine: `pit.getContents()` for the
 * charge inside the clamp, `furnace.getContents()` for what is in the
 * fire, `counter.getContents()` for what is on the shelf.
 *
 * ⭐⭐ **Census, then ratchet** (docs/lint-family.md). The count below is
 * what shipped the day this landed; it may fall and must never rise.
 * Each one is a view that wants an arg.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');
const MUD = join(SERVER_ROOT, 'src', 'mud');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/**
 * ⭐⭐⭐ **Zero, and the ratchet is closed.** No shipped controller hunts
 * for an instrument any more.
 *
 * The census landed at 14 and the same build drove it out, in three
 * kinds of fix — worth recording, because each one names a different
 * thing that was missing:
 *
 *   1. **Five** were expressible all along. `check` and `consign`
 *      hand-rolled a keyword match against inventory — the binder's own
 *      job — three lines below a comment saying the *rack* was "bound
 *      by the view, not hunted for here". `char`, `stake` and `smelt`
 *      wanted a fixture by class or mixin.
 *   2. ⭐ **Seven** needed a word the query language did not have. Every
 *      one asked *"which thing here can do job Y"* and the bracket
 *      vocabulary had only kinds of thing, so `[capability.X]` was
 *      added to close them. Before it, declaring an arg would have
 *      bound any tool at all and then failed the verb's own check —
 *      the "fix" would have been a regression.
 *   3. ⭐⭐ **Two** needed a different SHAPE of arg. `scry`'s instrument
 *      was an option (no `default:`), and its walk did something a
 *      singular arg could not survive: try each candidate until one can
 *      reach *this* target. `type: objects` keeps both — the binder
 *      resolves every candidate, the controller asks each about the
 *      pair.
 *
 *   4. ⭐⭐⭐ **Twenty-six more were hiding behind a base class.** The day
 *      after the ratchet closed at zero, a design conversation about the
 *      capability vocabulary found `ManualBuildController.findCapability`
 *      and `findBuildVessel`: the same walk, hoisted into the shared
 *      base so that 24 controllers across seven packs hunted through a
 *      method call the census could not see — plus five more that had
 *      spread the surroundings into an accumulator instead of looping
 *      (`eat`'s cutlery, `wash`'s water, `dye`'s bath, `butcher`'s
 *      blade and block, `measure figure`'s book). The gate learned the
 *      accumulator shape, the count went 0 → 13 → 0, and the fix was
 *      the same each time: a plural arg with a default, and the
 *      controller narrowing on the one thing no predicate asks (best
 *      rate, clean, holds water, holds dyestuff, bladed).
 *
 *      ⚠⚠ And it found a shipped defect the walk had been covering:
 *      `hammer ingot` had ALWAYS been refused (`requires: DurableMixin`,
 *      which no Ingot satisfies) — the verb only ever ran through the
 *      fallback walk, which the wire suite triggered by naming a word
 *      that matched nothing. A hunt is not just unaddressable; it hides
 *      the view being wrong.
 *
 * ⭐ Which is the general lesson this file would offer the next reader:
 * when resolution looks like it has to live in a controller, the honest
 * question is usually *what can the view not say yet* — a missing atom,
 * or a plural — rather than *this one is special*. And a ratchet at zero
 * is only as honest as the shapes it knows.
 *
 * ⚠ A controller may still narrow on STATE after the binder resolves
 * identity: `bake` checks lit + fuelled, `sharpen` checks unbroken,
 * `scry` checks reach. No predicate expresses those, and pretending one
 * could would be the worse lie. This gate does not fire on them,
 * because the walk is what it watches for, not the check.
 */
const BESPOKE_RESOLUTION_CEILING = 0;

/**
 * Receivers that mean *the actor, or the world around them*. A walk over
 * one of these is a search; a walk over anything else is an object
 * answering about itself, which is the sanctioned rung.
 */
const SURROUNDINGS = new Set([
  'giver',
  'actor',
  'commandGiver',
  'room',
  'loc',
  'location',
  'place',
  'where',
  'here',
  'scope',
  'env',
  'environment',
  'container',
  'holder',
  'surroundings',
]);

/**
 * A predicate that asks *what KIND is this* rather than reading it.
 *
 * ⚠ It must be applied to the **candidate**, never to the receiver. The
 * first cut of this gate matched anywhere in a three-line window, so the
 * near-universal guard
 *
 * ```typescript
 * if (!MixinApi.isContainer(giver)) return null;
 * for (const item of giver.getContents()) { …read its contents… }
 * ```
 *
 * read as a type-narrowed search and produced a third of the census as
 * false positives. A gate that cries wolf teaches people to ignore it,
 * which is the mirror of the failure this family already knows (gates
 * that ship broken and silently pass).
 */
const TYPE_TEST = /instanceof\s+[A-Z]|MixinApi\.is[A-Z]|\bis[A-Z]\w*\s*\(/;

/** `for (const <name> of <recv>.getContents())` — the loop form. */
const FOR_WALK =
  /for\s*\(\s*const\s+([A-Za-z_$][\w$]*)\s+of\s+([^)]*?)\.getContents\(\)/;

/** `<recv>.getContents().find(…)` / `.filter(…)` — the inline form. */
const CHAIN_WALK = /\.getContents\(\)\s*(?:as[^;]*?)?\.(find|filter|some)\(/;

/**
 * `candidates.push(...<recv>.getContents())` — the ACCUMULATOR form.
 *
 * ⚠⚠ The first cut of this gate did not know this shape, and it hid the
 * biggest offender in the tree: `ManualBuildController.findCapability`
 * gathered the actor's kit and the room into one array, then ranked it
 * by type test and rate — a walk in every respect, hoisted into a base
 * class so that **fourteen** controllers across six packs hunted for
 * their instrument through one method the census could not see. The
 * ratchet read zero while the pattern was at its widest.
 *
 * The lesson is the one `lint:family` already carries: a gate that
 * reads zero is only as honest as the shapes it knows. A spread of
 * surroundings into a list is a walk; what the list is then filtered by
 * is read from the lines that follow.
 */
const SPREAD_WALK = /\.\.\.\s*([^)]*?)\.getContents\(\)/;

interface Finding {
  file: string;
  line: number;
  text: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('Controller.ts') && !full.includes('__tests__')) {
      out.push(full);
    }
  }
  return out;
}

/** Every shipped command controller — the kernel's and every pack's. */
function controllerFiles(): string[] {
  const out = walk(join(MUD, 'platform', 'idea', 'cmd'));
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) {
      out.push(...walk(join(CONTENT, pack, 'src', 'idea', 'cmd')));
    }
  }
  return out;
}

/**
 * Strip comments so a doc block describing the defect is not the defect.
 *
 * ⚠ **Line-count preserving**, and that is not a nicety: collapsing a
 * block comment to one space shifts every line number after it, so the
 * gate reports a real finding at a line that has nothing to do with it —
 * which is worse than no line number, because it sends the reader to an
 * innocent piece of code and invites them to call the gate wrong.
 */
function stripComments(src: string): string {
  const blank = (m: string): string => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

/**
 * The receiver of a `.getContents()` call — the identifier immediately
 * before it, or `'<expr>'` when the call hangs off an expression (which
 * `getContainer()` does, and which counts as surroundings).
 */
function receiverOf(window: string): string {
  const call = /([A-Za-z_$][\w$]*)\s*(?:as[^)]*\))?\s*\.getContents\(\)/.exec(
    window,
  );
  if (call) return call[1]!;
  if (/getContainer\(\)[^;]*\.getContents\(\)/.test(window)) return '<expr>';
  return '';
}

/**
 * The list a spread lands in — `NAME.push(...x.getContents())` or
 * `const NAME: Stuff[] = [...x.getContents()]`.
 */
function accumulatorOf(statement: string): string {
  const push = /([A-Za-z_$][\w$]*)\.push\(\s*\.\.\./.exec(statement);
  if (push) return push[1]!;
  const lit = /(?:const|let)\s+([A-Za-z_$][\w$]*)[^=]*=\s*\[\s*\.\.\./.exec(
    statement,
  );
  return lit ? lit[1]! : '';
}

/**
 * Whether the gathered list is then hunted through for a KIND — a loop
 * whose variable is type-tested, an inline find/filter with a type test,
 * or the list returned bare for a caller to do the same.
 */
function searchesAccumulator(after: string, acc: string): boolean {
  const loop = new RegExp(`for\\s*\\(\\s*const\\s+([A-Za-z_$][\\w$]*)\\s+of\\s+${acc}\\b`).exec(
    after,
  );
  if (loop) {
    const v = loop[1]!;
    const aboutVar = new RegExp(
      `(instanceof\\s+[A-Z]|MixinApi\\.is[A-Z]\\w*|\\bis[A-Z]\\w*)` +
        `\\s*\\(?\\s*${v}\\b|${v}\\s+instanceof\\s+[A-Z]`,
    );
    if (aboutVar.test(after)) return true;
  }
  const chain = new RegExp(`${acc}\\.(find|filter|some)\\(`).exec(after);
  if (chain && TYPE_TEST.test(after.slice(chain.index))) return true;
  return new RegExp(`return\\s+${acc}\\s*;`).test(after);
}

/** The last identifier in an expression — the thing being walked. */
function tailIdentifier(expr: string): string {
  const ids = expr.match(/[A-Za-z_$][\w$]*/g);
  if (/getContainer\(\)/.test(expr)) return '<expr>';
  return ids && ids.length > 0 ? ids[ids.length - 1]! : '';
}

function main(): void {
  const files = controllerFiles();
  const findings: Finding[] = [];

  for (const file of files) {
    const src = stripComments(readFileSync(file, 'utf8'));
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!;
      if (!line.includes('.getContents()')) continue;

      // The statement a chained walk lives on can wrap; the BODY of a
      // for-walk is what carries its predicate. Read each accordingly.
      const statement = lines.slice(i, i + 3).join(' ');
      const forMatch = FOR_WALK.exec(statement);

      const spreadMatch = forMatch ? null : SPREAD_WALK.exec(statement);

      let receiver: string;
      let predicate: string;
      if (spreadMatch) {
        // What is gathered is then SEARCHED — or handed back for someone
        // else to search (`reachOf()`), which is the same act one call
        // away. A perception verb that gathers the room because the room
        // is its SUBJECT and passes the set on whole (`look`'s hints,
        // `search`'s scope) is not hunting for anything and must not
        // fire — that was the false positive the first spread cut had.
        const acc = accumulatorOf(statement);
        receiver = tailIdentifier(spreadMatch[1]!);
        const after = lines.slice(i + 1, i + 24).join(' ');
        if (!acc || !searchesAccumulator(after, acc)) continue;
        predicate = after;
      } else if (forMatch) {
        // ⭐ The loop VARIABLE is what a type test has to be about. A
        // body that only reads each item's contents, tags or slots is
        // asking the owner, not hunting for a kind.
        const varName = forMatch[1]!;
        receiver = tailIdentifier(forMatch[2]!);
        const body = lines.slice(i + 1, i + 10).join(' ');
        const aboutVar = new RegExp(
          `(instanceof\\s+[A-Z]|MixinApi\\.is[A-Z]\\w*|\\bis[A-Z]\\w*)` +
            `\\s*\\(?\\s*${varName}\\b|${varName}\\s+instanceof\\s+[A-Z]`,
        );
        if (!aboutVar.test(body)) continue;
        predicate = body;
      } else {
        if (!CHAIN_WALK.test(statement)) continue;
        // The predicate is the arrow body, which is inside the same
        // statement — so a receiver guard on an EARLIER line cannot
        // reach it.
        const from = statement.indexOf('.getContents()');
        predicate = statement.slice(from);
        if (!TYPE_TEST.test(predicate)) continue;
        receiver = receiverOf(statement);
      }

      const isSearch =
        receiver === '<expr>' ||
        SURROUNDINGS.has(receiver) ||
        /getContainer\(\)/.test(line);
      if (!isSearch) continue;

      findings.push({
        file: relative(REPO_ROOT, file),
        line: i + 1,
        text: lines[i]!.trim().slice(0, 96),
      });
    }
  }

  console.log(
    `check-instrument-args: ${files.length} controller(s) scanned; ` +
      `${findings.length} bespoke instrument resolution(s) ` +
      `(ceiling ${BESPOKE_RESOLUTION_CEILING}).`,
  );

  if (findings.length > BESPOKE_RESOLUTION_CEILING) {
    console.error(
      `\ncheck-instrument-args: ✗ ${findings.length} controller(s) hunt ` +
        `for an instrument instead of reading it off the model, above the ` +
        `ceiling of ${BESPOKE_RESOLUTION_CEILING}.\n\n` +
        `⭐ Declare it on the VIEW and let the binder resolve it:\n\n` +
        `  - name: <instrument>\n` +
        `    type: object\n` +
        `    required: false\n` +
        `    prepositions: [at, with]\n` +
        `    default: "reachable:[mixin.<Capability>Mixin]"\n` +
        `    scope: ["reachable"]\n` +
        `    requires: [<Capability>Mixin]\n\n` +
        `⚠ The query is the MIXIN, never the class: a class check finds ` +
        `one implementation and silently refuses every other.\n\n` +
        findings
          .map((f) => `  ✗ ${f.file}:${f.line}\n      ${f.text}`)
          .join('\n'),
    );
    process.exit(1);
  }

  if (findings.length < BESPOKE_RESOLUTION_CEILING) {
    console.log(
      `check-instrument-args: ⭐ below the ceiling — lower ` +
        `BESPOKE_RESOLUTION_CEILING to ${findings.length}.`,
    );
  }
  console.log('check-instrument-args: ✔');
}

main();
