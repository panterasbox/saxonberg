/**
 * pots — ⭐ the potter's week (ceramics S20, D28): clay dug at the pit,
 * thrown at the wheel, set on the boards to dry, fired in the kiln when
 * there is a kiln-load bone-dry, glazed where the form wants it and fired
 * again, and set on the ware shelf for sale.
 *
 * ONE act per beat, furthest along first (the `reels` shape): a kiln that
 * has finished is emptied before it is loaded; fired ware in hand is
 * shelved (or glazed and put back) before more is thrown; clay is dug only
 * when there is none to throw. ⭐ The potter's own `pottery` band is what
 * decides each pot's wall, its largest form and its grade (`Clay.potterHand`)
 * — nothing here touches a number.
 *
 * Every step is the LITERAL verb through `forceCommand`: `dig clay`, `shape
 * clay into jug`, `drop jug`, `put jug in kiln`, `stoke charcoal into kiln`,
 * `ignite kiln`, `fire kiln for 10 hours`, `douse kiln`, `get jug from kiln`,
 * `dip jar inside in lead tub`, `put jug in shelf`. Nothing here mints, and
 * a player's pots are never the potter's to move.
 *
 * ⚠ The potter throws the clay as it comes out of the ground: a fat
 * alluvial clay that dries too fast checks, and some of her ware does.
 * That is the clay's honest behaviour, not a defect here.
 *
 * Config: `{ shop, kiln, pit, ways, forms, glaze?: { tub, forms }, fire?,
 * batch?, boards? }` — `shop` home, `kiln` the kiln's ROW, `pit` the clay
 * pit room, `forms` the words she throws in turn, `glaze.tub` the tub word
 * a glazed form is dipped in and `glaze.forms` which forms get it, `fire`
 * the hold (`10 hours`), `batch` pieces to a kiln-load (4), `boards` how
 * many pieces she lets stand drying before she stops throwing (6).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import { BEHAVIOR_BEAT_TYPE } from '@saxonberg/server/mud/lib/behavior/BehaviorBeat';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

type Potter = Stuff & Mobile & Containable & Container & CommandGiver;
type Way = { to: string; go: readonly string[]; back: readonly string[] };
type Kiln = Stuff & Burner & Container;

const CLAY = '/trade/quarrying/thing/clay';
const DEFAULT_FIRE = '10 hours';
const DEFAULT_BATCH = 4;
const DEFAULT_BOARDS = 6;
/** Ware is drawn when it can be handled — and not before: a hot kiln opened dunts. */
const HANDLE_BELOW_K = 330;

export const brain = class {
  static label = 'pots';
  static kind: TaskKind = 'work';
  static summary = 'Throws pots at the wheel, dries and fires them in the kiln, glazes some, and shelves them for sale.';
  static discipline = 'pottery';
  static produces: readonly string[] = ['pots'];
  static consumes: readonly string[] = ['clay', 'charcoal'];
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  static ambient = false;

  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (MixinApi.isEmployed(host) && !host.isFulfilling()) return new Urgency('idle');
    return new Urgency('wanted', 'kicks the wheel round and centres a ball of clay');
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
    const p = host as Potter;
    if (MixinApi.isEngaged(p) && p.getEngagements().some((e) => e.type !== BEHAVIOR_BEAT_TYPE)) return;
    const { shop, kiln: kilnPath, pit } = ctx.config;
    if (typeof shop !== 'string' || typeof kilnPath !== 'string' || typeof pit !== 'string') return;
    const ways = waysOf(ctx);
    const wayTo = (path: string): Way | null => ways.find((w) => w.to === path) ?? null;

    const standing = p.getContainer()?.getTemplatePath() ?? '';
    if (standing !== shop) {
      // ⭐ The spade is the PIT's: leave it there for the next hand (a
      // brain that carried the pit's spades home left the brickfield with
      // none — the ceramics drive).
      if (standing === pit && digsWith(p)) await p.forceCommand('drop spade');
      const back = wayTo(standing);
      if (back) await walkRoute(p, back.back);
      return;
    }
    const room = p.getContainer() as (Stuff & Container) | null;
    if (!room || !MixinApi.isContainer(room)) return;
    const kiln = (room.getContents() as Stuff[]).find(
      (c): c is Kiln => c.getTemplatePath() === kilnPath && MixinApi.isBurner(c) && MixinApi.isContainer(c),
    );
    if (!kiln) return;
    const forms = stringList(ctx.config.forms);
    const glaze = glazeOf(ctx.config.glaze);
    const hold = typeof ctx.config.fire === 'string' && ctx.config.fire !== '' ? ctx.config.fire : DEFAULT_FIRE;
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);
    const boards = positiveInt(ctx.config.boards, DEFAULT_BOARDS);
    const held = p.getContents() as Stuff[];
    const inKiln = (kiln.getContents() as Stuff[]).filter((c) => MixinApi.isTangible(c));

    // A kiln alight is left to fire; when its load is done, she lets it go
    // out and cool — opened hot, the ware would dunt.
    if (kiln.isLit()) {
      if (inKiln.length > 0 && inKiln.every((w) => isPlayers(w) || isDone(w))) {
        await p.forceCommand('douse kiln');
      }
      return;
    }

    // 1. Fired ware in hand: glazed and put back if its form takes a glaze
    //    it has not got; otherwise onto the shelf.
    const fired = held.find((w) => isWare(w) && isDone(w));
    if (fired) {
      const kw = keywordOf(fired);
      if (!kw) return;
      if (glaze && wantsGlaze(fired, glaze.forms)) {
        await p.forceCommand(`dip ${kw} inside in ${glaze.tub}`);
        await p.forceCommand(`put ${kw} in kiln`);
      } else {
        await p.forceCommand(`put ${kw} in shelf`);
      }
      return;
    }

    // 2. A cold kiln with finished ware in it is drawn, a piece a beat.
    const ready = inKiln.find((w) => !isPlayers(w) && isDone(w) && coolEnough(w));
    if (ready) {
      const kw = keywordOf(ready);
      if (kw) await p.forceCommand(`get ${kw} from kiln`);
      return;
    }

    // 3. Green ware in hand goes on the boards to dry.
    const wet = held.find((w) => isWare(w) && MixinApi.isGreenware(w) && w.isGreen());
    if (wet) {
      const kw = keywordOf(wet);
      if (kw) await p.forceCommand(`drop ${kw}`);
      return;
    }

    // 4. A kiln-load waiting to fire is fired.
    const toFire = inKiln.filter((w) => !isPlayers(w) && wantsFiring(w));
    const boardWare = (room.getContents() as Stuff[]).filter(
      (w) => isWare(w) && !isPlayers(w) && MixinApi.isGreenware(w) && w.isGreen() && w.getRuin() === null,
    );
    const dryOnBoards = boardWare.filter((w) => MixinApi.isGreenware(w) && w.isFireable());
    if (toFire.length > 0 && (toFire.length >= batch || dryOnBoards.length === 0)) {
      if (kiln.fuelRemaining() <= 0) {
        const fuel = (room.getContents() as Stuff[]).some(
          (c) => !isPlayers(c) && MixinApi.isPerceptible(c) && c.hasKeyword('charcoal'),
        );
        if (!fuel) return; // no charcoal: the load waits for the fuel trade
        await p.forceCommand('stoke charcoal into kiln');
      }
      await p.forceCommand('ignite kiln');
      if (kiln.isLit()) await p.forceCommand(`fire kiln for ${hold}`);
      return;
    }

    // 5. Bone-dry ware off the boards into the kiln.
    const next = dryOnBoards[0];
    if (next) {
      const kw = keywordOf(next);
      if (kw) await p.forceCommand(`put ${kw} in kiln`);
      return;
    }

    // 6. Clay in hand is thrown, while there is room on the boards.
    if (held.some((c) => c.getTemplatePath() === CLAY)) {
      if (boardWare.length >= boards || forms.length === 0) return;
      const form = forms[boardWare.length % forms.length]!;
      await p.forceCommand(`shape clay into ${form}`);
      return;
    }

    // 7. No clay: dig some at the brickmaster's pit (she stays for the
    //    dig and carries it home next beat).
    if (boardWare.length >= boards) return;
    const toPit = wayTo(pit);
    if (!toPit || !(await walkRoute(p, toPit.go))) return;
    if (!held.some((s) => MixinApi.isTool(s) && s.getCapabilities().includes('digging'))) {
      await p.forceCommand('get 1 spade');
    }
    await p.forceCommand('dig clay');
  }
} satisfies BrainStatics;

/** A potter's piece — green or fired ware, not the clay or a tool. */
function isWare(w: Stuff): boolean {
  return MixinApi.isGreenware(w) && w.getTemplatePath() !== CLAY;
}

function hasWetCoat(w: Stuff): boolean {
  if (!MixinApi.isFaced(w)) return false;
  return (['inside', 'outside'] as const).some((f) => w.getCoats(f).some((c) => c.state === 'wet'));
}

/** Fired, and nothing on it still waiting for the fire. */
function isDone(w: Stuff): boolean {
  return MixinApi.isGreenware(w) && !w.isGreen() && !hasWetCoat(w);
}

/** Bone-dry green ware, or fired ware with a coat to fuse. */
function wantsFiring(w: Stuff): boolean {
  if (!MixinApi.isGreenware(w)) return false;
  if (w.isGreen()) return w.isFireable() && w.getRuin() === null;
  return hasWetCoat(w);
}

function wantsGlaze(w: Stuff, forms: readonly string[]): boolean {
  if (!MixinApi.isFaced(w) || !MixinApi.isPerceptible(w)) return false;
  if (!forms.some((f) => w.hasKeyword(f))) return false;
  return w.getCoats('inside').length === 0;
}

function coolEnough(w: Stuff): boolean {
  return !MixinApi.isThermal(w) || w.getTemperature().rawValue() < HANDLE_BELOW_K;
}

function isPlayers(s: Stuff): boolean {
  return MixinApi.isChattel(s) && s.stampedOwner()?.kind === 'player';
}

function keywordOf(s: Stuff): string | null {
  if (!MixinApi.isPerceptible(s)) return null;
  const primary = s.getPrimaryKeyword();
  if (primary && s.hasKeyword(primary)) return primary;
  return s.getKeywords()[0] ?? primary ?? null;
}

function glazeOf(v: unknown): { tub: string; forms: string[] } | null {
  if (typeof v !== 'object' || v === null) return null;
  const g = v as { tub?: unknown; forms?: unknown };
  if (typeof g.tub !== 'string' || g.tub === '') return null;
  return { tub: g.tub, forms: stringList(g.forms) };
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s !== '') : [];
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

async function walkRoute(p: Potter, directions: readonly string[]): Promise<boolean> {
  for (const direction of directions) {
    const room = p.getContainer();
    if (!room || !MixinApi.isExitable(room)) return false;
    const exit = (room as Stuff & Exitable).getExits().get(direction);
    if (!exit) return false;
    const stepped = await LocomotionApi.traverseWithDefault(p, exit);
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
