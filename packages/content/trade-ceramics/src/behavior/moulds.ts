/**
 * moulds — ⭐ the moulder's day (ceramics S20): clay dug at the pit, trodden
 * in the temper pit with sand, moulded at the table, and the green bricks
 * borne off to the hacks to dry.
 *
 * ONE act per beat, furthest along first (the `reels` shape): bricks in
 * hand go to the hacks before more are taken off the pallet; tempered clay
 * is moulded before more is tempered; raw clay is put in the pit before
 * more is dug. Each stage runs only when its input is THERE, so a moulder
 * with nothing to do says so (`idle`) and a fellow brain gets the beat.
 *
 * Every step is the LITERAL verb through `forceCommand` — `dig clay`,
 * `put clay in pit`, `knead pit`, `get clay from pit`, `shape clay into
 * brick`, `get 10 bricks`, `put bricks on hack` — so a player watching sees the
 * same acts a player would type, and the gang's bricks are made by the
 * same chain a player's are: the clay's composition, the moulder's band,
 * the weather in the hacks. Nothing here mints, nothing teleports.
 *
 * ⭐ The moulder knows the field: every walk is an AUTHORED way from the
 * shed (`ways`), the `stocks`/`relines` shape. Nothing searches a graph;
 * blocked means blocked, and the next beat walks home first.
 *
 * ⚠ A moulder never touches a PLAYER's goods — a player's bricks on the
 * pallet or clay in the pit stops the step that would have moved them,
 * rather than carrying somebody's day off to the hacks.
 *
 * Config: `{ shed, temper, hacks, pit, ways, carry? }` — `shed` the
 * moulding shed (home), `temper` the temper pit THING's row, `hacks` and
 * `pit` rooms, `carry` the bricks borne off at a time (default 10).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PlayerApi } from '@saxonberg/server/mud/api/player';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import { BEHAVIOR_BEAT_TYPE } from '@saxonberg/server/mud/lib/behavior/BehaviorBeat';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

type Moulder = Stuff & Mobile & Containable & Container & CommandGiver;
type Way = { to: string; go: readonly string[]; back: readonly string[] };

const CLAY = '/trade/quarrying/thing/clay';
const BRICK = '/trade/ceramics/thing/brick';
/** The tempers a pit takes: anything that opens a fat clay. */
const OPENER_WORDS = ['sand', 'breeze'] as const;
const DEFAULT_CARRY = 10;

export const brain = class {
  static label = 'moulds';
  static kind: TaskKind = 'work';
  static summary = 'Digs and tempers clay, moulds bricks at the table, and bears them off to the hacks.';
  static discipline = 'brickmaking';
  static produces: readonly string[] = ['bricks'];
  static consumes: readonly string[] = ['clay', 'sand'];
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  // A functional poller (it makes bricks), not ambient chatter.
  static ambient = false;

  /** Wanted on shift; idle off it — a moulder off shift is not at the table. */
  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (MixinApi.isEmployed(host) && !host.isFulfilling()) return new Urgency('idle');
    return new Urgency('wanted', 'throws a clot of clay into the mould');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isContainable(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    if (MixinApi.isEmployed(host) && !host.isFulfilling()) return;
    const m = host as Moulder;
    // ⚠ Busy means a REAL act (a day at the table, a dig, a tread) — the
    // beat claims this brain's slots itself before `act` runs.
    if (MixinApi.isEngaged(m) && m.getEngagements().some((e) => e.type !== BEHAVIOR_BEAT_TYPE)) return;
    const { shed, temper: temperPath, hacks, pit } = ctx.config;
    if (typeof shed !== 'string' || typeof temperPath !== 'string') return;
    if (typeof hacks !== 'string' || typeof pit !== 'string') return;
    const ways = waysOf(ctx);
    const wayTo = (path: string): Way | null => ways.find((w) => w.to === path) ?? null;

    // Away from the shed (an act ended elsewhere, a walk was refused):
    // come home the way he went, and only then work.
    const standing = roomOf(m);
    if (standing !== shed) {
      // ⭐ The spade is the PIT's: leave it there for the next hand (a
      // brain that carried the pit's spades home left the brickfield with
      // none — the ceramics drive).
      if (standing === pit && digsWith(m)) await m.forceCommand('drop spade');
      const back = wayTo(standing);
      if (back) await walkRoute(m, back.back);
      return;
    }
    const shedRoom = m.getContainer() as (Stuff & Container) | null;
    if (!shedRoom || !MixinApi.isContainer(shedRoom)) return;
    const carry = positiveInt(ctx.config.carry, DEFAULT_CARRY);

    // 1. Green bricks in hand go to the hacks — set ON the hack, where the
    //    air reaches every face (dropped on the yard they never dried).
    if (count(m, (s) => isGreenBrick(s)) > 0) {
      const way = wayTo(hacks);
      if (!way || !(await walkRoute(m, way.go))) return;
      try {
        await m.forceCommand('put bricks on hack');
      } finally {
        await walkRoute(m, way.back);
      }
      return;
    }

    // 2. Green bricks on the pallet — the gang's own — are borne off.
    // ⭐ By IDENTITY, so a player's bricks lying beside them are neither
    // taken nor a reason to stop (a bare `get N bricks` takes whatever
    // answers — the setter carried a player's brick off so, run 22).
    const pallet = (shedRoom.getContents() as Stuff[]).filter((s) => isGreenBrick(s) && !isPlayers(s));
    if (pallet.length > 0) {
      let want = carry;
      for (const b of pallet) {
        if (want <= 0) break;
        const n = Math.min(want, MixinApi.isStackable(b) ? b.getQuantity() : 1);
        await m.forceCommand(`get ${n} #${b.stuffId}`);
        want -= n;
      }
      return;
    }

    // 3. Tempered clay in hand is moulded: a day at the table.
    if (count(m, (s) => isClay(s) && isTempered(s)) > 0) {
      await m.forceCommand('shape clay into brick');
      return;
    }

    const pitThing = StuffApi.findByTemplatePath(temperPath);
    const temperRoom =
      pitThing && MixinApi.isContainable(pitThing) ? (pitThing.getContainer()?.getTemplatePath() ?? '') : '';
    const toTemper = temperRoom === '' ? null : wayTo(temperRoom);
    const inPit =
      pitThing && MixinApi.isContainer(pitThing)
        ? ((pitThing.getContents() as Stuff[]).filter((s) => MixinApi.isTangible(s)) as Stuff[])
        : [];
    // ⚠ Somebody else's work in the pit is left alone.
    const pitIsOurs = inPit.every((s) => !isPlayers(s));

    // 4. A tempered clay waiting in the pit is fetched.
    if (toTemper && pitIsOurs && inPit.length === 1 && isClay(inPit[0]!) && isTempered(inPit[0]!)) {
      if (!(await walkRoute(m, toTemper.go))) return;
      try {
        await m.forceCommand('get clay from pit');
      } finally {
        await walkRoute(m, toTemper.back);
      }
      return;
    }

    // 5. Raw clay in the pit is tempered — an opener in first if there is
    //    one in the yard, then tread it. He stays for the tread; the next
    //    beat walks him home.
    if (toTemper && pitIsOurs && inPit.some((s) => isClay(s) && !isTempered(s))) {
      if (!(await walkRoute(m, toTemper.go))) return;
      const yard = m.getContainer() as (Stuff & Container) | null;
      const opened = inPit.some((s) => isOpener(s));
      if (!opened && yard && MixinApi.isContainer(yard)) {
        const word = OPENER_WORDS.find((w) =>
          (yard.getContents() as Stuff[]).some((s) => isOpener(s) && !isPlayers(s) && hasWord(s, w)),
        );
        if (word) await m.forceCommand(`put ${word} in pit`);
      }
      await m.forceCommand('knead pit');
      return;
    }

    // 6. Raw clay in hand goes into the pit.
    if (toTemper && pitIsOurs && count(m, (s) => isClay(s) && !isTempered(s)) > 0) {
      if (!(await walkRoute(m, toTemper.go))) return;
      try {
        await m.forceCommand('put clay in pit');
      } finally {
        await walkRoute(m, toTemper.back);
      }
      return;
    }

    // 7. No clay anywhere: dig some. The spade is the pit's own; he stays
    //    for the dig, and carries the lump home next beat.
    const toPit = wayTo(pit);
    if (!toPit || !(await walkRoute(m, toPit.go))) return;
    if (count(m, (s) => MixinApi.isTool(s) && s.getCapabilities().includes('digging')) === 0) {
      await m.forceCommand('get 1 spade');
    }
    await m.forceCommand('dig clay');
  }
} satisfies BrainStatics;

/** A green (unfired) brick. */
function isGreenBrick(s: Stuff): boolean {
  return s.getTemplatePath() === BRICK && MixinApi.isGreenware(s) && s.isGreen();
}

function isClay(s: Stuff): boolean {
  return s.getTemplatePath() === CLAY;
}

/** Tempered = something was kneaded into it (its own make-up is recorded). */
function isTempered(s: Stuff): boolean {
  return MixinApi.isComposition(s) && s.getMakeup().length > 0;
}

/** Sand, grog or breeze — the materials a temper reads as openers. */
function isOpener(s: Stuff): boolean {
  if (!MixinApi.isTangible(s)) return false;
  const mat = s.getMaterial();
  return mat !== null && (mat.hasTag('silica') || mat.hasTag('grog') || mat.hasTag('breeze'));
}

function hasWord(s: Stuff, word: string): boolean {
  return MixinApi.isPerceptible(s) && s.hasKeyword(word);
}

/** Is this good stamped to a player? Then it is not the gang's to move. */
function isPlayers(s: Stuff): boolean {
  if (MixinApi.isChattel(s) && s.stampedOwner()?.kind === 'player') return true;
  // ⭐ A STACK bears no title (owned by possession), so a player's bricks
  // set out to dry carry no stamp at all — the maker is what says whose
  // they are, and the setter carted a drive's nine bone-dry bricks to the
  // clamp off its hack (drive A, runs 29 and 32).
  return MixinApi.isCrafted(s) && PlayerApi.isAvatarIdentityPath(s.getMaker());
}

/** How many of what the moulder holds match — a stack by its quantity. */
function count(m: Moulder, pred: (s: Stuff) => boolean): number {
  let n = 0;
  for (const s of m.getContents() as Stuff[]) {
    if (!pred(s)) continue;
    n += MixinApi.isStackable(s) ? s.getQuantity() : 1;
  }
  return n;
}

function roomOf(m: Moulder): string {
  return m.getContainer()?.getTemplatePath() ?? '';
}

function positiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : fallback;
}

function waysOf(ctx: BrainContext): Way[] {
  const rows = Array.isArray(ctx.config.ways) ? ctx.config.ways : [];
  const dirs = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((d): d is string => typeof d === 'string') : [];
  const out: Way[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as { to?: unknown; go?: unknown; back?: unknown };
    if (typeof r.to !== 'string' || r.to === '') continue;
    const way = { to: r.to, go: dirs(r.go), back: dirs(r.back) };
    if (way.go.length === 0 || way.back.length === 0) continue;
    out.push(way);
  }
  return out;
}

async function walkRoute(m: Moulder, directions: readonly string[]): Promise<boolean> {
  for (const direction of directions) {
    const room = m.getContainer();
    if (!room || !MixinApi.isExitable(room)) return false;
    const exit = (room as Stuff & Exitable).getExits().get(direction);
    if (!exit) return false;
    const stepped = await LocomotionApi.traverseWithDefault(m, exit);
    if (!stepped.ok) return false;
  }
  return true;
}

/** Is this body holding a digging tool (the pit's spade)? */
function digsWith(body: Stuff & Container): boolean {
  return (body.getContents() as Stuff[]).some(
    (s) => MixinApi.isTool(s) && s.getCapabilities().includes('digging'),
  );
}
