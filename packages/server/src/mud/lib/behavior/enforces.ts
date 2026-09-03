/**
 * `enforces` brain — the house's own peace, kept by hand.
 *
 * A kernel-commons brain (nothing in it names lounge content — the rack,
 * the office direction, the taser keyword, the eject direction, the
 * records path are all `config`), so any barkeep or innkeeper reuses it
 * (the `cellars`/`wary` precedent). It drives the venue's proprietor (Dave)
 * on a presence-ungated cadence, in two priorities:
 *
 *   1. **A fight in the room** — the escalation ladder. Shout "break it
 *      up!" first (one beat's grace to let the fighters `fight break`
 *      themselves), then wade in **hands-first** (`subdue` the fighter he
 *      *believes* started it). Only under a real threat — a weapon visibly
 *      drawn, or three-plus parties — does he fetch the office taser first
 *      (a real round trip; the fight runs unattended while he's gone) and
 *      tase the believed aggressor. **He only knows what he saw**: the
 *      aggressor call is the read-the-room heuristic (the fighter who is
 *      *winning* — least hurt — is believed the aggressor), NEVER the
 *      accountability ledger. So he can be wrong, and tasing the wrong
 *      patron is a legitimate, blameworthy act (the combat harm producers
 *      attribute it to him like anyone's blow — no staff exemption).
 *
 *   2. **A visibly-armed patron, no fight** — the house rule. Warn first
 *      (naming the rack), then on the next look if they're still armed,
 *      86 them (a record in the venue's document-tree slice) and order
 *      them out; if they still won't leave, eject them (subdue → bum's
 *      rush through the door). Drawing a weapon is not an accident, so an
 *      already-86'd arrival skips the warning.
 *
 * config: `{
 *   alertness?: number,       // perception vs a concealed weapon (default 4)
 *   shoutLine?: string, warnLine?: string, orderLine?: string,
 *   ejectDirection?: string,  // throw an ejectee this way (default 'south')
 *   officeDirection?: string, // to the taser (default 'north')
 *   officeReturn?: string,    // back to the floor (default 'south')
 *   taserKeyword?: string,    // the office weapon (default 'taser')
 *   recordsPath?: string,     // the venue's 86-list document
 * }`
 */

import { MixinApi } from '../../api/mixin';
import { CombatApi } from '../../api/combat';
import { CommandApi } from '../../api/command';
import { DocumentApi } from '../../api/document';
import type { Stuff } from '../stuff/Stuff';
import type { CommandGiver } from '../command/CommandGiver';
import type { BrainContext } from './brain';
import type { Combatant } from '../combat/Combatant';

const BAND_ORDER = [
  'healthy',
  'hurt',
  'serious',
  'critical',
  'dying',
  'dead',
] as const;

function bandRank(s: Stuff): number {
  if (!MixinApi.isVitals(s)) return 0;
  const i = BAND_ORDER.indexOf(s.getConditionBand() as (typeof BAND_ORDER)[number]);
  return i < 0 ? 0 : i;
}

function str(v: unknown, dflt = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : dflt;
}
function num(v: unknown, dflt: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt;
}

/** Occupants of the host's room, minus the host itself. */
function occupantsAround(host: Stuff): Stuff[] {
  if (!MixinApi.isContainable(host)) return [];
  const room = host.getContainer();
  if (!room || !MixinApi.isContainer(room)) return [];
  return room.getContents().filter((o) => (o as Stuff) !== host) as Stuff[];
}

/** The fighter the host BELIEVES started it — the one who is winning
 * (least hurt). What he saw, never the ledger; a loser who threw first is
 * not who he blames (the wrong-guy path). Ties resolve to the first. */
function believedAggressor(fighters: Stuff[]): Stuff | null {
  let best: Stuff | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const f of fighters) {
    const r = bandRank(f);
    if (r < bestRank) {
      bestRank = r;
      best = f;
    }
  }
  return best;
}

/** A real threat that justifies the taser: a weapon visibly out among the
 * fighters, or three-plus parties, or the host himself taking hurt. */
function threatTripped(
  host: Stuff,
  fighters: Stuff[],
  alertness: number,
): boolean {
  if (fighters.length >= 3) return true;
  if (bandRank(host) >= 1) return true;
  for (const f of fighters) {
    if (
      MixinApi.isCombatant(f) &&
      f.visibleArmsFor(host, alertness).length > 0
    ) {
      return true;
    }
  }
  return false;
}

/** Is the host wielding the (switched-on) office taser right now? */
function hasTaser(host: Stuff, keyword: string): boolean {
  if (!MixinApi.isCombatant(host)) return false;
  return host
    .visibleArmsFor(host)
    .some((w) => MixinApi.isPerceptible(w) && w.hasKeyword(keyword));
}

async function readEightySixed(path: string): Promise<Set<string>> {
  if (!path) return new Set();
  const doc = await DocumentApi.read(path);
  const raw = doc?.getData().subjects;
  return new Set(Array.isArray(raw) ? (raw as string[]) : []);
}

async function recordEightySix(path: string, subjectKey: string): Promise<void> {
  if (!path || !subjectKey) return;
  const subjects = await readEightySixed(path);
  if (subjects.has(subjectKey)) return;
  subjects.add(subjectKey);
  // Owner is derived from the acting author (the host) — the write is
  // gated by `canAtPath`. The venue-records carve-out
  // (`AccessRegistry.canWriteVenueRecord`) authorizes the venue's Business
  // proprietor/staff to write the venue's OWN records subtree
  // (`<operatingLocation>/records/…`, which the config `recordsPath`
  // names), while the parcel's title-holder (the wizard group over the
  // whole lounge) keeps full authority. `kind` is an opaque discriminator
  // (the store never validates it against the pack-installable
  // vocabulary). A denial is still swallowed so a mis-scoped `recordsPath`
  // never breaks enforcement — the sanction is the order-out + ejection;
  // the record is institutional memory riding on top.
  try {
    await DocumentApi.save(path, 'venue-eighty-six', {
      subjects: [...subjects],
    });
  } catch (err) {
    console.warn(
      `enforces: could not persist the 86 record at '${path}' ` +
        `(venue-records write standing — bar-fight P9 open item)`,
      err,
    );
  }
}

export const brain = class {
  static label = 'enforces';
  static presenceGated = false; // the house is kept even in an empty bar
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const cfg = ctx.config;
    const alertness = num(cfg.alertness, 4);

    const occupants = occupantsAround(host);
    const fighters = occupants.filter((o) => CombatApi.sessionFor(o));

    if (fighters.length > 0) {
      await breakUpFight(ctx, host, fighters, alertness);
      return;
    }
    // The floor is quiet — reset the fight episode.
    ctx.state.shouted = false;

    // The house rule: a visibly-armed patron.
    const armed = occupants.filter(
      (o) =>
        MixinApi.isCombatant(o) &&
        o.visibleArmsFor(host, alertness).length > 0,
    );
    if (armed.length > 0) await enforceHouseRule(ctx, host, armed[0]!);
  }
};

/** The escalation ladder over a live fight in the room. */
async function breakUpFight(
  ctx: BrainContext,
  host: Stuff,
  fighters: Stuff[],
  alertness: number,
): Promise<void> {
  const cfg = ctx.config;
  // Rung zero: the shout, and one beat's grace to let them break it up
  // themselves (no 86, no taser).
  if (!ctx.state.shouted) {
    ctx.state.shouted = true;
    ctx.say(str(cfg.shoutLine, 'Break it up! Not in my house.'));
    return;
  }
  const aggressor = believedAggressor(fighters);
  if (!aggressor) return;
  const aggressorKw = firstKeyword(aggressor);
  const threat = threatTripped(host, fighters, alertness);
  const taserKw = str(cfg.taserKeyword, 'taser');

  if (threat && !hasTaser(host, taserKw)) {
    // Size it up as dangerous BEFORE wading in — fetch the taser first
    // (the office round trip; the fight runs unattended while he's gone).
    const toOffice = str(cfg.officeDirection, 'north');
    const back = str(cfg.officeReturn, 'south');
    await (host as unknown as CommandGiver).forceCommand(`go ${toOffice}`);
    await (host as unknown as CommandGiver).forceCommand(`get ${taserKw}`);
    await (host as unknown as CommandGiver).forceCommand(`wield ${taserKw}`);
    await (host as unknown as CommandGiver).forceCommand(`switch on ${taserKw}`);
    await (host as unknown as CommandGiver).forceCommand(`go ${back}`);
  }
  // Wade in on the believed aggressor — hands-first (a subdue) when
  // unarmed, or a taser blow when he came back armed (the baton's shock
  // rides its own augment on the strike).
  if (aggressorKw) {
    await (host as unknown as CommandGiver).forceCommand(`attack ${aggressorKw}`);
    await (host as unknown as CommandGiver).forceCommand(`fight subdue`);
  }
}

/** The house rule over one visibly-armed patron. */
async function enforceHouseRule(
  ctx: BrainContext,
  host: Stuff,
  patron: Stuff,
): Promise<void> {
  const cfg = ctx.config;
  const key = patron.getIdentityPath() ?? patron.getTemplatePath() ?? '';
  const recordsPath = str(cfg.recordsPath);
  const patronKw = firstKeyword(patron);

  const already = await readEightySixed(recordsPath);
  const warned = ((ctx.state.warned as Record<string, boolean>) ??= {});

  // An already-86'd patron (or one who's been warned and stayed armed) is
  // past talking — order out, then eject.
  if (already.has(key) || warned[key]) {
    if (!already.has(key)) await recordEightySix(recordsPath, key);
    ctx.say(str(cfg.orderLine, "You're eighty-sixed. Out — now."));
    // Eject: subdue and throw them through the door (the bum's rush).
    if (patronKw) {
      await (host as unknown as CommandGiver).forceCommand(`attack ${patronKw}`);
      await (host as unknown as CommandGiver).forceCommand(`fight subdue`);
      await (host as unknown as CommandGiver).forceCommand(`fight rush ${str(cfg.ejectDirection, 'south')}`,
      );
    }
    return;
  }

  // First sight of a weapon: the warning + the grace window (no record).
  warned[key] = true;
  ctx.say(
    str(
      cfg.warnLine,
      'No steel in here — check it at the rack by the door, or step out.',
    ),
  );
}

/** The patron's first keyword, for a literal `attack <kw>` / `get <kw>`. */
function firstKeyword(s: Stuff): string {
  if (MixinApi.isPerceptible(s)) {
    const kws = s.getKeywords();
    if (kws.length > 0) return kws[0]!;
  }
  return '';
}
