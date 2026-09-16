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
 * ⭐ The ceiling: bespoke instrument resolutions in shipped controllers.
 * **It may fall and must never rise.** Each is a verb whose view wants
 * an `object` arg with an MQL default instead.
 *
 * ⚠⚠ **14 is the census, not an endorsement.** Every one is the same
 * sentence — *find the tool in my hands or the room* — written fourteen
 * times, which is exactly the shape the census-then-ratchet pattern
 * exists for: stop the growth today, at a cost of one constant, and let
 * a later sweep drive it to zero. Fixing fourteen controllers across
 * eight packs is a build of its own and emphatically not a review
 * round's work.
 *
 * ⭐ `CharController`'s `instanceof CharcoalPit` is on the list and is
 * the exact shape this gate was written for — which is the evidence the
 * rule points at something real rather than at a style I happen to
 * prefer.
 */
const BESPOKE_RESOLUTION_CEILING = 14;

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

      let receiver: string;
      let predicate: string;
      if (forMatch) {
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
