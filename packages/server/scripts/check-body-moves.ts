/**
 * ⭐ `lint:body-moves` — **every way a thing can land on a body, counted,
 * tagged and capped** (size-and-carrying W0, D11 stage 1).
 *
 * The flip (W7) installs `Creature.canAddContainable`'s `'loose-on-body'`
 * veto: after it, the ONE way onto a body is `Carrying.receive` (and the
 * few framework paths D11 allowlists). Until then every caller that does
 * `ContainmentApi.move(item, <a body>)` is a site W4/W5 must port. This
 * gate is the port list made mechanical: today's count is the ceiling, it
 * may fall and never rise, and at W7 it reads **0 outside the allowlist**.
 *
 * ## ⚠ The heuristic, stated exactly (syntax only — no type checker)
 *
 * A type-checked census would need a full `ts.Program` over the kernel and
 * every pack (minutes, not seconds), so the classifier is SYNTACTIC and the
 * roster below is the truth it is checked against. For every
 * `ContainmentApi.move(item, dest, …)` call in non-test code under
 * `src/mud/**`, `src/backend/**` and every capability pack's `src/**`, with
 * `dest` stripped of `as …` casts, `!` and parentheses:
 *
 *   1. **body-named** — the destination's last identifier (`by`,
 *      `this.actor`, `req.by` → `by`/`actor`/`by`) is in {@link BODY_NAMES};
 *   2. **a body's own `this`/`self`** — the destination is `this`/`self` in a
 *      file whose class IS a body ({@link BODY_FILES}: `lib/character/`,
 *      `lib/creature/`, `lib/npc/`, `platform/agent/`, a pack's `src/agent/`);
 *   3. **inherit-the-container** — the destination is a `getContainer()`
 *      call, or a local whose initializer reads `getContainer()` (it is a
 *      body when the source was carried), and the enclosing function never
 *      narrows with `isPlace(` / `isLocation(`;
 *   4. **resolved through one local** — the destination is a local whose
 *      initializer names a body-named identifier (`where = … by …`).
 *
 * A **hit** must appear in {@link ROSTER}, or the gate fails naming it —
 * that is what a planted site trips. ⚠ The heuristic has a blind spot it
 * cannot close without types: a parameter named `into` / `to` / `dest`
 * that a caller fills with a body. The survey (`size-and-carrying-plan.md`
 * § Grounding *The census*) found those by reading, and they sit in the
 * roster as `survey` rows — counted whether or not the heuristic sees them,
 * and STALE-checked like every other row (a roster row that matches no site
 * fails, so a port must delete its row and lower the ceiling).
 *
 * ## The roster's tags (D-W7a, requirements § Collisions *Shops…*)
 *
 * The tag is what W4/W5's port reads to pick the idiom, and what W7's
 * behavior change keys on:
 *
 *   - `made` — crafting/cooking/smelting output, harvest and tap yields,
 *     fell, butcher, a catch, the pieces a cut leaves → `receive`, else set
 *     down where it was made (never a refusal after the inputs are spent);
 *   - `handed` — buy, `give`, `serve`, trade, payment in goods, a claim
 *     ticket, a till's change; and a thing TAKEN (`get`, `untie`, reclaim)
 *     — anything a counterparty or the world offers and the carrier may
 *     refuse → `canReceive` before any write, refuse in words, move nothing;
 *   - `granted` — the loadout, the Arrival Note, the bank card, a minted
 *     key, a template's `props:`, the wizard's `clone` → `placeLoose`'s
 *     order with the residence overflow;
 *   - `inherit` — `where = self.getContainer()` → the residue lands where
 *     its source was, which is a body when the source was carried.
 *
 * Two non-counting dispositions: `allow` (D11's allowlist — the framework
 * paths that ARE the receiving act or restore one; **the same list as
 * D11's**) and `not-body` (a heuristic hit whose destination is never a
 * body, with the reason). Both are printed by `--report`.
 *
 * Usage:
 *   tsx scripts/check-body-moves.ts --lint     # CI gate
 *   tsx scripts/check-body-moves.ts --report   # the roster by tag
 */

import { readFileSync } from "fs";
import { join, relative, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { MUD, SERVER_SRC, packSources, packSrcFiles, parseTs, ratchet } from "./pack-roots";

/**
 * ⭐ **The ceiling — every `made`/`handed`/`granted`/`inherit` site.** It may
 * fall (a port deletes its row) and may never rise; at W7 it is 0.
 *
 * W0 census (2026-11-11): **101** of 255 `ContainmentApi.move` sites —
 * made 38 · handed 20 · granted 16 · inherit 27 — plus 4 `allow` (D11) and
 * 13 `not-body`. The plan's survey said ≈75 + 16 inherit; the gap is
 * same-function duplicates the survey counted once (Trap ×3, Gus ×2,
 * `Template._stageEntries` ×2, `putPlanFor` ×2, …) and inherit sites the
 * survey missed (`Mould.castInto`, `ThrownLanding`, `Plant` seed-fall,
 * `LineEnd.followLoad`, `Colony.mintDeparture`, `reembodyImpl`,
 * `Thermal.setLump`).
 *
 * W4: every kernel caller ported → **40**, all of them pack rows (W5's).
 * The idiom is `if (isCarrying(dest)) dest.receive(x) else move(x, dest)`
 * (`inCarrierElse` skips the else). Two keys whose other branch was
 * ported became `not-body` (a Placing route).
 *
 * W5: the 40 pack rows ported with the same idiom → **0**. Only `allow`
 * and `not-body` rows remain; a new counted row fails the gate.
 */
export const BODY_MOVES_CEILING = 0;

export type BodyMoveTag = "made" | "handed" | "granted" | "inherit";
export type Disposition = BodyMoveTag | "allow" | "not-body";

export interface RosterRow {
  tag: Disposition;
  /** How many identical sites the key covers (default 1). */
  n?: number;
  /** A site the heuristic cannot see (a body behind `into`/`to`) — found by reading. */
  survey?: true;
  /** Why — required for `allow` and `not-body`. */
  why?: string;
}

/** Identifiers that name a body at a move's destination (rule 1). */
export const BODY_NAMES = new Set([
  "giver",
  "actor",
  "by",
  "buyer",
  "recipient",
  "holder",
  "maker",
  "host",
  "puller",
  "principal",
  "avatar",
  "body",
  "hand",
]);

/** A file whose class IS a body — its `this`/`self` destination is one (rule 2). */
export function isBodyFile(rel: string): boolean {
  return /^(lib\/(character|creature|npc)|platform\/agent)\//.test(rel) || /:agent\//.test(rel);
}

/**
 * ⭐ **The roster.** Key: `<file> :: <Class.method> :: <destination>` — the
 * file relative to `src/mud/` (kernel), `src/` (`backend/…`), or
 * `<pack>:` + its `src/`; the destination with casts stripped. No line
 * numbers, so an edit above a site never churns the roster.
 */
export const ROSTER: Record<string, RosterRow> = {
  // ── D11's allowlist — the receiving act and what restores one ─────────
  "lib/slot/Carrying.ts :: CarryingMixin.receive :: self": {
    tag: "allow",
    n: 5,
    why: "D11 — receive IS the receiving act (put on by its claim; tack a handless beast is handed, put on by its claim; a merge onto a held or pocketed stack; two hands; a body whose plan is not known yet, not judged)",
  },
  "lib/slot/Carrying.ts :: CarryingMixin.receive :: where.place.host": {
    tag: "allow",
    n: 2,
    why: "D11 — receive into the carry place it chose (a pocket region or a worn container)",
  },
  "lib/slot/Carrying.ts :: CarryingMixin.stow :: place.host": {
    tag: "allow",
    n: 2,
    why: "D16/W7 — a homeless held thing put away in the first carry place it fits",
  },
  "lib/slot/Carrying.ts :: CarryingMixin.settleReleased :: place.host": {
    tag: "allow",
    n: 2,
    why: "D11 — a weapon put up (`unwield`) goes to the first carry place it fits when it has no home (the drive: nothing loose after `remove`/`unwield`)",
  },
  "lib/slot/Carrying.ts :: CarryingMixin.bringToHand :: self": {
    tag: "allow",
    why: "D11/D16 — readying seats a thing in the carrier's own hands (occupyAll for two)",
  },
  "lib/slot/Carrying.ts :: CarryingMixin.releaseHeld :: place": {
    tag: "not-body",
    why: "D13 — a grip that fails drops to the place the body stands in",
  },
  "lib/slot/Slotted.ts :: SlottedMixin.seatInSlot :: this": {
    tag: "allow",
    why: "D11 — seatInSlot is the hand/slot half of the receiving act",
  },
  "platform/idea/api/PersistableLogic.ts :: restoreItem :: host": {
    tag: "allow",
    n: 2,
    why: "D11 — restoreItem re-seats a body's own persisted contents",
  },
  "platform/idea/api/PersistableLogic.ts :: restoreState :: host": {
    tag: "allow",
    n: 2,
    why: "D11 — restores a placement pair (3b by content index; 6 onto an owned host, W7); a Placing destination rides ContainmentLogic.placeOn",
  },
  "platform/idea/api/ConditionLogic.ts :: mintCorpseFrom :: corpse": {
    tag: "allow",
    why: "D11 — death moves everything to the corpse (a Thing, not a body)",
  },

  // ── heuristic hits whose destination is never a body ─────────────────
  "lib/location/Warren.ts :: Warren.reseatFixtures :: host": {
    tag: "not-body",
    why: "a warren's fixture host is a room member, never a body",
  },
  "lib/location/Warren.ts :: Warren.reapMember :: host": {
    tag: "not-body",
    why: "a warren's member host is a room, never a body",
  },
  "lib/retail/HeldGoods.ts :: HeldGoodsMixin.checkIn :: self": {
    tag: "not-body",
    why: "the shelf takes custody; `self` is the rack",
  },
  "trade-sericulture:thing/Cocoons.ts :: Cocoons.lay :: holder": {
    tag: "not-body",
    why: "the cocoons are laid in a tray/holder container, not a hand",
  },

  // ── the other branch of a ported site: a Placing route ───────────────
  "platform/idea/api/ContainmentLogic.ts :: ContainmentLogic.putPlanFor :: target": {
    tag: "not-body",
    why: "the region route: a Placing host, which a body is not (the zero route is ported, W4)",
  },
  "lib/stuff/Template.ts :: Template._stageEntries :: host": {
    tag: "not-body",
    why: "the named-placement route: a Placing host, which a body is not (the unnamed route is ported, W4)",
  },

  // ── rule-3 hits: a body's own container is the place it stands in ────
  "lib/locomotion/BelayEngagement.ts :: BelayEngagement.catches :: room": {
    tag: "not-body",
    why: "the belayer's container — the room a body stands in",
  },
  "lib/vitals/Vitals.ts :: VitalsMixin.severPart :: destination": {
    tag: "not-body",
    why: "the severed body's own container — the room it stands in (D13 makes this releaseHeld)",
  },
  "platform/idea/cmd/inventory/OfferController.ts :: OfferController.execute :: room": {
    tag: "not-body",
    why: "the offered-to animal's container — the room it stands in",
  },
  "terminus:market/thing/MarketStalls.ts :: MarketStalls.let :: square": {
    tag: "not-body",
    n: 2,
    why: "a let stall's counter stands in the market square",
  },
  "trade-farming:thing/ToolRack.ts :: ToolRack.reset :: yard": {
    tag: "not-body",
    n: 2,
    why: "a fixed rack's yard",
  },
  "trade-forestry:thing/Bole.ts :: Bole.crosscutPlan :: room": {
    tag: "not-body",
    why: "a bole is too heavy to lift (forestry.md) — its container is the wood",
  },
  "trade-forestry:thing/Bole.ts :: Bole.rivePlan :: room": {
    tag: "not-body",
    why: "a bole is too heavy to lift (forestry.md) — its container is the wood",
  },
  "transport:thing/Boat.ts :: Boat.goDown :: room": {
    tag: "not-body",
    why: "a boat stands in water; a thing you get into is never carried",
  },
  "transport:thing/Boat.ts :: Boat.capsize :: room": {
    tag: "not-body",
    why: "a boat stands in water; a thing you get into is never carried",
  },
};

export interface MoveSite {
  key: string;
  file: string;
  line: number;
  /** Which heuristic rule fired, or null when none did. */
  rule: 1 | 2 | 3 | 4 | null;
}

/** Strip `as …`, `!`, `<T>x` and parentheses from a destination. */
function unwrap(e: ts.Expression): ts.Expression {
  for (;;) {
    if (ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
    else if (ts.isTypeAssertionExpression(e)) e = e.expression;
    else if (ts.isSatisfiesExpression(e)) e = e.expression;
    else return e;
  }
}

function lastName(e: ts.Expression): string | null {
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

/**
 * Can `e` evaluate to a body-named identifier? Followed through `?:`,
 * `??`, `||` and casts — `where = isContainer(by) ? by : null` can; `room =
 * actor.getContainer()` cannot (that is the room the actor stands in).
 */
function mayBeBody(e: ts.Expression): boolean {
  const d = unwrap(e);
  const last = lastName(d);
  if (last && BODY_NAMES.has(last) && (ts.isIdentifier(d) || ts.isPropertyAccessExpression(d))) return true;
  if (ts.isConditionalExpression(d)) return mayBeBody(d.whenTrue) || mayBeBody(d.whenFalse);
  if (
    ts.isBinaryExpression(d) &&
    (d.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      d.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  ) {
    return mayBeBody(d.left) || mayBeBody(d.right);
  }
  return false;
}

function isFunctionLike(n: ts.Node): n is ts.FunctionLikeDeclaration {
  return (
    ts.isMethodDeclaration(n) ||
    ts.isFunctionDeclaration(n) ||
    ts.isFunctionExpression(n) ||
    ts.isArrowFunction(n) ||
    ts.isGetAccessor(n) ||
    ts.isSetAccessor(n) ||
    ts.isConstructorDeclaration(n)
  );
}

/** `Class.method`, `method` (a free function) or `Class.<arrow>` for a call site. */
function siteName(node: ts.Node): { name: string; outer: ts.Node | null } {
  let method: string | null = null;
  let outer: ts.Node | null = null;
  let cls: string | null = null;
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    if (isFunctionLike(p)) {
      const named =
        (ts.isMethodDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p)) &&
        p.name;
      if (named && method === null) method = p.name!.getText();
      if (ts.isConstructorDeclaration(p) && method === null) method = "constructor";
      outer = p;
    }
    if ((ts.isClassDeclaration(p) || ts.isClassExpression(p)) && cls === null) {
      // `export const brain = class {…} satisfies BrainStatics` — the name
      // is the binding's, through any cast.
      let q: ts.Node | undefined = p.parent;
      while (q && (ts.isAsExpression(q) || ts.isSatisfiesExpression(q) || ts.isParenthesizedExpression(q))) {
        q = q.parent;
      }
      cls =
        p.name?.text ??
        (q && ts.isVariableDeclaration(q) && ts.isIdentifier(q.name) ? q.name.text : "<class>");
    }
  }
  const m = method ?? "<arrow>";
  return { name: cls ? `${cls}.${m}` : m, outer };
}

/**
 * Is this move the `else` of an `isCarrying(<dest>)` test (W4's port
 * idiom)? Then the destination was already asked whether it carries, and
 * the move only runs when it does not.
 */
export function inCarrierElse(call: ts.Node, destText: string, sf: ts.SourceFile): boolean {
  let child: ts.Node = call;
  for (let p: ts.Node | undefined = call.parent; p; p = p.parent) {
    if (isFunctionLike(p)) return false;
    const test =
      ts.isIfStatement(p) && p.elseStatement === child
        ? p.expression
        : ts.isConditionalExpression(p) && p.whenFalse === child
          ? p.condition
          : null;
    if (test) {
      const t = test.getText(sf).replace(/\s+/g, " ");
      if (t.includes(`isCarrying(${destText})`)) return true;
    }
    child = p;
  }
  return false;
}

/** Every local initializer of `name` declared anywhere in `scope`. */
function initializersOf(scope: ts.Node, name: string): ts.Expression[] {
  const out: ts.Expression[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) {
      out.push(n.initializer);
    }
    ts.forEachChild(n, walk);
  };
  walk(scope);
  return out;
}

/**
 * Does `e` read some thing's `getContainer()` — and not a BODY's? A body's
 * container is the place it stands in (`actor.getContainer()` is the
 * room), so only a non-body receiver can hand back a carrier.
 */
function inheritsContainer(e: ts.Node): boolean {
  let hit = false;
  const walk = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === "getContainer"
    ) {
      const recv = lastName(unwrap(n.expression.expression));
      if (!(recv && BODY_NAMES.has(recv))) hit = true;
    }
    ts.forEachChild(n, walk);
  };
  walk(e);
  return hit;
}

/** Classify one destination by the four rules (see the header). */
export function classify(
  dest: ts.Expression,
  scope: ts.Node | null,
  rel: string,
): 1 | 2 | 3 | 4 | null {
  const d = unwrap(dest);
  const last = lastName(d);
  if (last && BODY_NAMES.has(last)) return 1;
  if ((d.kind === ts.SyntaxKind.ThisKeyword || last === "self") && isBodyFile(rel)) return 2;
  const narrows = scope !== null && /\bis(Place|Location)\(/.test(scope.getText());
  if (ts.isCallExpression(d) && inheritsContainer(d) && !narrows) return 3;
  if (ts.isIdentifier(d) && scope !== null) {
    const inits = initializersOf(scope, d.text);
    if (!narrows && inits.some(inheritsContainer)) return 3;
    if (inits.some(mayBeBody)) return 4;
  }
  return null;
}

/** Every `ContainmentApi.move` site in one module, classified. */
export function sitesIn(sf: ts.SourceFile, rel: string): MoveSite[] {
  const out: MoveSite[] = [];
  const walk = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      n.expression.getText(sf) === "ContainmentApi.move" &&
      n.arguments.length >= 2
    ) {
      const dest = n.arguments[1]!;
      const { name, outer } = siteName(n);
      const destText = unwrap(dest).getText(sf).replace(/\s+/g, " ");
      // ⭐ The ported idiom: `if (MixinApi.isCarrying(dest)) dest.receive(x);
      // else ContainmentApi.move(x, dest);` — the else branch moves into
      // something that is NOT a carrier, so it is not a body move at all.
      if (inCarrierElse(n, destText, sf)) {
        ts.forEachChild(n, walk);
        return;
      }
      out.push({
        key: `${rel} :: ${name} :: ${destText}`,
        file: rel,
        line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
        rule: classify(dest, outer, rel),
      });
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}

/** The corpus: kernel `mud/` + `backend/` + every pack `src/`, tests excluded. */
function corpus(): Array<{ file: string; rel: string }> {
  const out: Array<{ file: string; rel: string }> = [];
  for (const file of packSrcFiles(MUD)) out.push({ file, rel: relative(MUD, file) });
  for (const file of packSrcFiles(join(SERVER_SRC, "backend"))) {
    out.push({ file, rel: relative(SERVER_SRC, file) });
  }
  for (const pack of packSources()) {
    for (const file of packSrcFiles(pack.srcDir)) out.push({ file, rel: `${pack.id}:${relative(pack.srcDir, file)}` });
  }
  return out.filter((f) => f.file.endsWith(".ts") && !f.file.includes("__tests__"));
}

export function allSites(): MoveSite[] {
  const out: MoveSite[] = [];
  for (const { file, rel } of corpus()) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("ContainmentApi.move")) continue;
    out.push(...sitesIn(parseTs(file, text), rel));
  }
  return out;
}

export interface Verdict {
  /** Counted rows (made/handed/granted/inherit), one line per site. */
  counted: Array<{ key: string; tag: BodyMoveTag; where: string }>;
  /** Heuristic hits with no roster row — the planted-site failure. */
  unrostered: string[];
  /** Roster rows whose site count disagrees with the tree. */
  stale: string[];
}

export function judge(sites: readonly MoveSite[], roster: Record<string, RosterRow> = ROSTER): Verdict {
  const byKey = new Map<string, MoveSite[]>();
  for (const s of sites) byKey.set(s.key, [...(byKey.get(s.key) ?? []), s]);
  const counted: Verdict["counted"] = [];
  const unrostered: string[] = [];
  const stale: string[] = [];
  for (const [key, list] of byKey) {
    const row = roster[key];
    if (!row) {
      for (const s of list) if (s.rule !== null) unrostered.push(`${s.file}:${s.line}  ${key}  (rule ${s.rule})`);
      continue;
    }
    const want = row.n ?? 1;
    if (list.length !== want) stale.push(`${key} — roster says ${want}, the tree has ${list.length}`);
    if (row.tag !== "allow" && row.tag !== "not-body") {
      for (const s of list) counted.push({ key, tag: row.tag, where: `${s.file}:${s.line}` });
    }
  }
  for (const key of Object.keys(roster)) {
    if (!byKey.has(key)) stale.push(`${key} — no such site any more (ported? delete the row, lower the ceiling)`);
  }
  return { counted, unrostered, stale };
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  const sites = allSites();
  const v = judge(sites);

  if (mode === "--report") {
    const tags: Disposition[] = ["made", "handed", "granted", "inherit"];
    for (const t of tags) {
      const rows = v.counted.filter((c) => c.tag === t);
      console.log(`\n${t} (${rows.length})`);
      for (const r of rows) console.log(`  ${r.where.padEnd(70)} ${r.key.split(" :: ").slice(1).join(" → ")}`);
    }
    for (const t of ["allow", "not-body"] as const) {
      const keys = Object.entries(ROSTER).filter(([, r]) => r.tag === t);
      console.log(`\n${t} (${keys.length}, not counted)`);
      for (const [k, r] of keys) console.log(`  ${k}\n      ${r.why ?? ""}`);
    }
    console.log(`\n${v.counted.length} body move(s) counted; ceiling ${BODY_MOVES_CEILING}.`);
    console.log(`${sites.length} ContainmentApi.move sites scanned.`);
    return;
  }

  let ok = true;
  if (v.unrostered.length) {
    ok = false;
    console.error(
      `check-body-moves: ✗ ${v.unrostered.length} move(s) that can land on a body are not in the roster:\n`,
    );
    for (const u of v.unrostered) console.error(`  ✗ ${u}`);
    console.error(
      "\n⭐ A thing reaches a body through `Carrying.receive` (D11). Call it\n" +
        "  instead of `ContainmentApi.move(item, <body>)`. If the destination is\n" +
        "  never a body, add a `not-body` row to ROSTER with the reason.\n",
    );
  }
  if (v.stale.length) {
    ok = false;
    console.error(`check-body-moves: ✗ ${v.stale.length} roster row(s) disagree with the tree:\n`);
    for (const s of v.stale) console.error(`  ✗ ${s}`);
    console.error("");
  }
  ok =
    ratchet(
      "check-body-moves",
      "moves onto a body outside D11's allowlist",
      v.counted.length,
      BODY_MOVES_CEILING,
      v.counted.map((c) => `${c.where}  [${c.tag}]  ${c.key}`),
      "⭐ Port the new site to `Carrying.receive` (or `receive({slot})`); the\n" +
        "  ceiling may fall and never rise. At W7 it reads 0.",
    ) && ok;
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
