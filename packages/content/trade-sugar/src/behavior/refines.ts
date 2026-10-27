/**
 * refines — a sugar boiler's brain (sugar D19), the same at a Terminus
 * refinery and on an island estate.
 *
 * ⭐ **One beat, one act; every act a verb a player could type.** The boiler
 * reads the pan and the fire where they stand and does the next thing a
 * boiler would — the liquor in, lime, the skim, the fire laid and lit, the
 * pan set on it, the strike taken off and poured into a mould on its pot.
 * A player at the same pan does the same verbs by hand. ⚠ No `boil`
 * anywhere: `heat` sets the pan on the fire and the plateau does the
 * boiling, and the strike is read off the pan's own liquor.
 *
 * ⭐ **The words are the place's** (sugar W6): a refinery dissolves bought
 * raw sugar in a COPPER over an ARCH and sets LOAVES in CONES; an estate
 * pours cane juice from the mill's tubs into a KETTLE over the TRAIN and
 * cures BLOCKS in HOGSHEADS. Same machine, different config.
 *
 * ⭐ **It finishes what it makes** so the house sells something with nobody
 * about (the NPC always covers): a refinery's loaf is taken out, nipped, a
 * piece pounded at the quern and the sack carried to the counter; an
 * estate's block is knocked out of its hogshead and carried to the counter.
 *
 * ⭐⭐ **The backstop is the house's own counter.** A refinery's raw sugar
 * comes off the island when a player has carried some (`restocks` posts that
 * bounty; it lands on the floor). With none on the floor it buys a block of
 * the IMPORT off its own counter — and lime likewise — so the house keeps
 * boiling with nobody sailing. What it does NOT do: decant the molasses.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import Copper from '../thing/Copper';
import CuringPot from '../thing/CuringPot';
import SugarLoaf from '../thing/SugarLoaf';

/** Litres of water a refinery batch starts from — a block's worth. */
const BATCH_WATER = '30L';
/** Litres a boiler charges from a juice cistern when the row names none. */
const DEFAULT_BATCH_L = 40;
/** Moisture above which bagasse will not catch (wet off the rollers). */
const TOO_WET = 0.5;

/** The place's words, and where its counter is (config). */
interface Words {
  kettle: string;
  fire: string;
  mould: string;
  pot: string;
  /** Fuel keywords in order of preference — the first dry one in reach. */
  fuels: readonly string[];
  /** Where the liquor comes from: a bought block dissolved, or mill juice. */
  source: 'block' | 'juice';
  /** What is finished: a loaf nipped and pounded, or a raw block carried. */
  finish: 'loaf' | 'block';
  /** The house's counter (a path), and the way to it and back — directions
   *  separated by spaces (`south east north`). */
  counter: string;
  out: string;
  back: string;
  /**
   * ⭐ The working charge, kg — what a stoker keeps in the bed. A fire
   * burns at most its fuel's mass × the per-kilo rate, so one log at a
   * time runs a twenty-kilowatt train at three (probed: four game hours on
   * the fire and the juice still "thin and watery"). Absent, the boiler
   * stokes when the bed is empty (the Terminus arch, a single pan).
   */
  charge?: number;
  /**
   * What a spoilt pan (caramel, burnt, blackstrap) gets: `leave` it be —
   * the default, because in Terminus a player boils molasses to
   * blackstrap on purpose — or `spill` it and start again, which a
   * working estate must or its boiler stands idle for good after one
   * burnt batch (probed: a batch went to "burnt toffee" and stayed).
   */
  spoilt?: 'leave' | 'spill';
  /**
   * ⭐ Ladle the strike out where the pan stands, never lift it: a full
   * train kettle "won't budge" (probed: twelve refused `get kettle` at the
   * strike while the batch burned to toffee). The Jamaica train was always
   * ladled. Absent, the boiler lifts the pan off (the Terminus copper).
   */
  ladle?: boolean;
  /**
   * ⭐ Where the juice waits for the pan (a keyword): the boiler charges an
   * EMPTY kettle from it, `batch` litres at a time. Absent, the juice comes
   * in the mill's tub. A miller pouring every tub into the kettle kept
   * topping up a boiling pan with thin juice, and two hundred litres never
   * struck inside a shift (probed, drive 13).
   */
  cistern?: string;
  /** Litres charged from the cistern per batch (default 40). */
  batch?: number;
}

const TERMINUS: Words = {
  kettle: 'copper',
  fire: 'arch',
  mould: 'cone',
  pot: 'pot',
  fuels: ['coal'],
  source: 'block',
  finish: 'loaf',
  counter: '',
  out: 'south',
  back: 'north',
};

/** What the boiler can see of the floor. */
interface Floor {
  copper: Copper | null;
  onFire: boolean;
  fireLit: boolean;
  fireFuelled: boolean;
  liquor: 'empty' | 'water' | 'liquor' | 'struck' | 'spoilt';
  limed: number;
  skimmed: boolean;
  /** Raw sugar on the floor or in hand. */
  block: boolean;
  /** A tub of cane juice here (the estate's source). */
  juice: boolean;
  lime: boolean;
  /** The first dry fuel's keyword in reach, or `''`. */
  fuel: string;
  /** An empty mould stands on a pot, ready to take a strike. */
  coneReady: boolean;
  /** An empty mould and an empty pot are both here, apart. */
  coneAndPot: boolean;
  /** A mould holds a set loaf. */
  setLoaf: boolean;
  /** A mould holds a set raw-sugar block (an estate's hogshead). */
  setBlock: boolean;
  /**
   * ⭐ The pan is thick (syrup) — the strike is minutes off. From syrup to
   * strike to caramel is a few game minutes on a full fire, and a boiler
   * idle on a twenty-second beat (four game minutes; twenty-four unwatched)
   * walked away from every batch at exactly that moment and came back to
   * blackened toffee (probed, drive 13). A boiler stands over a pan coming
   * to the strike, testing the thread.
   */
  thick?: boolean;
  /**
   * ⭐ How many pieces of fuel to stoke at once to bring the bed up to its
   * charge (default 1). A boiler's beats come round every few game minutes
   * and a twenty-kilowatt train burns ~4.5 kg of oak an hour, so a log a
   * beat never built the bed and the batch only warmed (probed, drive 13).
   */
  stokes?: number;
  /**
   * ⭐ Which one, by id (`#…`), where a floor has several of a kind — the
   * empty mould on its pot, a free mould and a free pot, the mould holding
   * what has set. A floor of three hogsheads binds `hogshead` to whichever
   * answers first, full or not (drive 13); absent, the plain word.
   */
  refs?: { ready?: string; mould?: string; pot?: string; set?: string; sack?: string };
  loaf: boolean;
  nips: boolean;
  piece: boolean;
  quern: boolean;
  sack: boolean;
  /** The filled sack is in her hands (a milled one lands where its empty stood). */
  sackHeld?: boolean;
  /** The house's counter has raw sugar / lime to buy (the import). */
  counterBlock: boolean;
  counterLime: boolean;
}

export const brain = class {
  static label = 'refines';
  static kind: TaskKind = 'work';
  static summary =
    'Runs the pan: the liquor in, tempered, skimmed, the fire lit, boiled ' +
    'to the strike, poured into a mould, and the sugar finished and shelved.';
  static discipline = 'sugar-refining';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  static ambient = false;

  /** The place's words: Terminus's, overridden by the row's config. */
  static words(config: unknown): Words {
    const c = (config ?? {}) as Partial<Words>;
    // ⚠ Words, never commands (the forced-command review): every keyword is
    // one plain word and a way is plain words, or the default stands — a
    // row cannot splice a command into the boiler's errands.
    const word = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z-]*$/i.test(v);
    const way = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z-]*( [a-z][a-z-]*)*$/i.test(v);
    const merged = { ...TERMINUS, ...c };
    return {
      ...merged,
      kettle: word(c.kettle) ? c.kettle : TERMINUS.kettle,
      fire: word(c.fire) ? c.fire : TERMINUS.fire,
      mould: word(c.mould) ? c.mould : TERMINUS.mould,
      pot: word(c.pot) ? c.pot : TERMINUS.pot,
      out: way(c.out) ? c.out : TERMINUS.out,
      back: way(c.back) ? c.back : TERMINUS.back,
      fuels: Array.isArray(c.fuels) ? c.fuels.filter(word) : TERMINUS.fuels,
      cistern: word(c.cistern) ? c.cistern : undefined,
      batch: typeof c.batch === 'number' && c.batch > 0 && c.batch <= 1000 ? c.batch : undefined,
    };
  }

  static urgency(ctx: BrainContext): Urgency {
    const w = brain.words(ctx.config);
    const floor = brain.read(ctx.host, w);
    if (floor === null) return new Urgency('idle');
    const next = brain.next(floor, w);
    if (next === null) return new Urgency('idle');
    // ⭐ A pan coming to the strike is CRITICAL — the band that wakes the
    // agent early, so she checks the thread every few seconds rather than
    // every beat, and ladles the moment it strikes.
    if (brain.watching(floor)) return new Urgency('critical', `stands over the ${w.kettle}, testing the thread`);
    // …and STRUCK on the fire it is critical too: strike to caramel is
    // minutes, and a `wanted` beat (four game minutes) let every struck pan
    // burn before it was ladled (drive 21).
    if (floor.liquor === 'struck' && floor.onFire) return new Urgency('critical', `strikes the ${w.kettle}`);
    return new Urgency('wanted', `turns to the ${w.kettle}`);
  }

  /** Is the pan thick on the fire, minutes from the strike? */
  static watching(f: Floor): boolean {
    return f.liquor === 'liquor' && f.onFire && f.thick === true;
  }

  /**
   * ⭐ The next verbs a boiler would type (an errand is several, one per
   * line), or `null` when there is nothing to do. Pure: the state machine
   * is this one function.
   */
  static next(f: Floor, w: Words = TERMINUS): string | null {
    if (!f.copper) return null;
    // The way to the counter and back, a step at a time (`south east north`).
    const steps = (way: string): string[] => way.split(/\s+/).filter(Boolean).map((d) => `go ${d}`);
    const errand = (...verbs: string[]): string => [...steps(w.out), ...verbs, ...steps(w.back)].join('\n');
    const ref = f.refs ?? {};
    if (f.liquor === 'struck') {
      if (f.onFire && !w.ladle) return `get ${w.kettle}`;
      if (f.coneReady) return `pour ${w.kettle} into ${ref.ready ?? w.mould}`;
      // `put … on` takes it from the hands: pick the mould up first (drive
      // 23 — "you don't have a curing hogshead", every beat, as the pan burnt).
      if (f.coneAndPot) return `get ${ref.mould ?? w.mould}\nput ${ref.mould ?? w.mould} on ${ref.pot ?? w.pot}`;
    }
    // Finish what is made before starting more.
    if (w.finish === 'loaf') {
      // A milled sack is filled where the empty stood, so she picks it up
      // first, by its id: the empties beside the quern are sacks too.
      if (f.sack && f.sackHeld === false) return `get ${ref.sack ?? 'sack'}`;
      if (f.sack) return errand(`put ${ref.sack ?? 'sack'} in counter`);
      if (f.piece && f.quern) return 'mill piece';
      if (f.loaf && f.nips) return 'cut loaf with nips';
      if (f.setLoaf) return `get loaf from ${ref.set ?? w.mould}`;
    } else {
      if (f.block) return errand('put block in counter');
      if (f.setBlock) return `get block from ${ref.set ?? w.mould}`;
    }
    if (f.liquor === 'spoilt' && w.spoilt === 'spill') {
      return f.onFire && !w.ladle ? `get ${w.kettle}` : `spill ${w.kettle}`;
    }
    if (f.liquor === 'struck' || f.liquor === 'spoilt') return null;
    if (f.liquor === 'empty') {
      if (w.source === 'juice') {
        if (!f.juice) return null;
        return w.cistern
          ? `pour ${w.cistern} into ${w.kettle} --amount ${w.batch ?? DEFAULT_BATCH_L}L`
          : `pour tub into ${w.kettle}`;
      }
      return `pour butt into ${w.kettle} --amount ${BATCH_WATER}`;
    }
    if (f.liquor === 'water') {
      if (f.block) return `put block in ${w.kettle}`;
      // The backstop: no island sugar on the floor — buy the import.
      return f.counterBlock ? errand('wallet use house', 'buy block') : null;
    }
    // A liquor: temper and skim it before it goes on.
    if (f.limed === 0) {
      if (f.lime) return `temper ${w.kettle} with lime`;
      return f.counterLime ? errand('wallet use house', 'buy quicklime') : null;
    }
    if (!f.skimmed) return `skim ${w.kettle} into pail`;
    // ⭐ Thick on the fire, the strike is minutes off: she stands over the
    // pan testing the thread — reading it settles the boil, so the beat
    // after it strikes sees it struck and ladles it. Stoking INSTEAD of
    // watching let the strike slip past at `wanted` (probed live).
    if (brain.watching(f)) {
      // …but she keeps the fire up while she watches: a starved bed crawls,
      // and the strike never came (the live walk: six game hours over a
      // thick pan on a dying fire). Stoke and test in the one beat.
      const stoke = !f.fireFuelled && f.fuel
        ? Array.from({ length: Math.max(1, f.stokes ?? 1) }, () => `stoke ${f.fuel} into ${w.fire}`)
        : [];
      // ⭐ And she readies the cooler BEFORE the strike: an empty mould on
      // its pot, so at the strike there is only the ladling left (drive 21:
      // a hogshead set on its pot AFTER the strike cost a beat the strike
      // did not have).
      const ready = !f.coneReady && f.coneAndPot
        ? [`get ${(f.refs ?? {}).mould ?? w.mould}`, `put ${(f.refs ?? {}).mould ?? w.mould} on ${(f.refs ?? {}).pot ?? w.pot}`]
        : [];
      return [...ready, ...stoke, `analyze boil ${w.kettle}`].join('\n');
    }
    if (!f.fireFuelled) {
      if (!f.fuel) return null;
      return Array.from({ length: Math.max(1, f.stokes ?? 1) }, () => `stoke ${f.fuel} into ${w.fire}`).join('\n');
    }
    if (!f.fireLit) return `light ${w.fire}`;
    if (!f.onFire) return `heat ${w.kettle}`;
    return null;
  }

  static read(host: Stuff, w: Words = TERMINUS): Floor | null {
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') return null;
    if (!MixinApi.isContainable(host)) return null;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    const here = [
      ...(room as Stuff & Container).getContents(),
      ...(MixinApi.isContainer(host) ? host.getContents() : []),
    ] as Stuff[];
    const named = (s: Stuff, word: string): boolean =>
      MixinApi.isPerceptible(s) && s.hasKeyword(word);
    const hasTag = (s: Stuff, tag: string): boolean =>
      MixinApi.isTangible(s) && (s.getMaterial()?.hasTag(tag) ?? false);
    const placedOn = (s: Stuff): Stuff | undefined =>
      MixinApi.isContainable(s) ? (s.getPlacement()?.host as unknown as Stuff | undefined) : undefined;

    const fire = here.find((s) => MixinApi.isBurner(s) && named(s, w.fire)) ??
      here.find((s) => MixinApi.isBurner(s)) ??
      null;
    const coppers = [
      ...here,
      ...here.flatMap((s) => (MixinApi.isPlacing(s) ? ([...s.getPlaced()] as Stuff[]) : [])),
    ].filter((s): s is Copper => s instanceof Copper);
    // The pan on the fire first, else any — a second kettle is a spare.
    const copper = coppers.find((c) => fire !== null && placedOn(c) === fire) ?? coppers[0] ?? null;

    const isEmptyMould = (s: Stuff): boolean =>
      MixinApi.isMould(s) && MixinApi.isBulkable(s) && s.isBulkEmpty('interior') && !s.holdsCast();
    const cones = here.filter(isEmptyMould);
    const pots = here.filter((s) => s instanceof CuringPot);
    const readyCone = cones.find((c) => placedOn(c) instanceof CuringPot);
    const looseCone = cones.find((c) => !(placedOn(c) instanceof CuringPot));
    const potFree = pots.find((p) => MixinApi.isPlacing(p) && p.getPlaced('on').length === 0);
    const coneReady = readyCone !== undefined;
    const freePot = potFree !== undefined;
    const id = (s?: Stuff): string | undefined => (s ? `#${s.stuffId}` : undefined);

    // ⭐⭐ A boiler READS her pan every time she looks at it, and the read is
    // what settles the boil: `getTemperature()` runs the thermal reconcile,
    // and that runs the phase pass (the plateau and its arrows). Reading
    // only the material and payload left the pan stale between beats, so
    // the next read that did settle it covered hours at once and jumped
    // past syrup, strike and caramel together — every estate batch spoilt
    // and none was ever seen thick (drive 22's trace). The live walk passed
    // only because a watcher looked at the kettle every minute.
    if (copper && MixinApi.isThermal(copper)) copper.getTemperature();
    let liquor: Floor['liquor'] = 'empty';
    let limed = 0;
    let skimmed = false;
    if (copper && !copper.isBulkEmpty('interior')) {
      const mat = copper.getBulkMaterial('interior');
      const payload = copper.getBulkPayload('interior') ?? {};
      limed = payload.limed ?? 0;
      skimmed = payload.skimmed ?? false;
      if (!mat || mat.getSolidsKgPerL() <= 0) liquor = 'water';
      else if (mat.hasTag('strike')) liquor = 'struck';
      else if (mat.hasTag('caramel') || mat.hasTag('burnt') || mat.hasTag('blackstrap')) liquor = 'spoilt';
      else liquor = 'liquor';
    }
    const thick = liquor === 'liquor' && !!copper && (copper.getBulkMaterial('interior')?.hasTag('syrup') ?? false);

    const mouldOf = (pred: (c: Stuff) => boolean): Stuff | undefined =>
      here.find(
        (m) =>
          MixinApi.isMould(m) &&
          MixinApi.isContainer(m) &&
          ((m as unknown as Container).getContents() as Stuff[]).some(pred),
      );
    const moulded = (pred: (c: Stuff) => boolean): boolean => mouldOf(pred) !== undefined;
    const setMould = mouldOf((c) => c instanceof SugarLoaf || hasTag(c, 'raw-sugar'));
    const isSack = (s: Stuff): boolean =>
      s.getTemplatePath() === '/trade/cooking/thing/sugar-sack' &&
      MixinApi.isBulkable(s) &&
      !s.isBulkEmpty('interior');
    const sackHere = here.find(isSack);
    // ⭐ Fuel is what BURNS — the fire's own test (heat of combustion), not
    // a `fuel` tag: oak carries "wood, flammable" and no such tag, so the
    // island's boiler stood over a cold train beside ten logs (probed).
    const burns = (s: Stuff): boolean =>
      MixinApi.isTangible(s) && (s.getMaterial()?.getHeatOfCombustion().rawValue() ?? 0) > 0;
    const dryFuel = (word: string): boolean =>
      here.some(
        (s) =>
          named(s, word) &&
          burns(s) &&
          !(MixinApi.isWaterActive(s) && s.getWaterState().moisture > TOO_WET),
      );
    const fuelWord = w.fuels.find(dryFuel) ?? '';
    const fuelPieces = fuelWord
      ? here.filter((s) => named(s, fuelWord) && burns(s) && !(MixinApi.isWaterActive(s) && s.getWaterState().moisture > TOO_WET))
      : [];
    const pieceKg = fuelPieces.length > 0 && MixinApi.isTangible(fuelPieces[0]!) ? fuelPieces[0]!.getMass().rawValue() : 0;
    const shortKg =
      w.charge && fire && MixinApi.isBurner(fire) ? Math.max(0, w.charge - fire.fuelRemaining()) : 0;
    const stokes = pieceKg > 0 ? Math.min(fuelPieces.length, Math.max(1, Math.ceil(shortKg / pieceKg))) : 1;
    const counter = w.counter ? StuffApi.findByTemplatePath(w.counter) : null;
    const onCounter = (tag: string): boolean =>
      !!counter &&
      MixinApi.isContainer(counter) &&
      (counter.getContents() as Stuff[]).some((s) => hasTag(s, tag));

    return {
      copper,
      onFire: !!copper && fire !== null && placedOn(copper) === fire,
      fireLit: !!fire && MixinApi.isBurner(fire) && fire.isLit(),
      fireFuelled:
        !!fire &&
        MixinApi.isBurner(fire) &&
        (w.charge ? fire.fuelRemaining() >= w.charge : fire.fuelRemaining() > 0),
      liquor,
      limed,
      skimmed,
      block: here.some((s) => hasTag(s, 'raw-sugar')),
      // ⭐ With a cistern, a pan is charged only from a FULL batch: a trickle
      // of juice boils past the strike between two beats (probed live — a
      // few litres went from juice to burnt toffee inside four game
      // minutes). Without one, any tub of juice will do.
      juice: here.some(
        (s) =>
          s !== copper &&
          MixinApi.isBulkable(s) &&
          !s.isBulkEmpty('interior') &&
          (s.getBulkMaterial('interior')?.hasTag('cane-juice') ?? false) &&
          (!w.cistern || s.getBulkAmount('interior').rawValue() >= (w.batch ?? DEFAULT_BATCH_L) - 1e-6),
      ),
      lime: here.some((s) => hasTag(s, 'liming')),
      fuel: fuelWord,
      stokes,
      thick,
      coneReady,
      coneAndPot: cones.length > 0 && freePot,
      setLoaf: moulded((c) => c instanceof SugarLoaf),
      setBlock: moulded((c) => hasTag(c, 'raw-sugar')),
      loaf: here.some((s) => s instanceof SugarLoaf),
      nips: here.some((s) => MixinApi.isTool(s) && s.hasCapability('nipping')),
      piece: here.some((s) => !(s instanceof SugarLoaf) && hasTag(s, 'loaf-sugar')),
      quern: here.some((s) => MixinApi.isTool(s) && s.hasCapability('millstone')),
      sack: sackHere !== undefined,
      sackHeld: sackHere !== undefined && MixinApi.isContainer(host) && host.getContents().includes(sackHere as never),
      counterBlock: onCounter('raw-sugar'),
      counterLime: onCounter('liming'),
      refs: { ready: id(readyCone), mould: id(looseCone), pot: id(potFree), set: id(setMould), sack: id(sackHere) },
    };
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const w = brain.words(ctx.config);
    const floor = brain.read(host, w);
    if (floor === null) return;
    const verbs = brain.next(floor, w);
    if (verbs === null) return;
    // An errand is a few verbs in a row (out, the act, back) — one beat's.
    for (const verb of verbs.split('\n')) {
      // NOT forced: the work is the hand's own act, and a forced frame is
      // unattributable by design — the maker verbs (`mill`, `cut`) read
      // the acting author and found none, so the estate's miller declined
      // `no-maker` at every bundle (sugar drive 8; `prints`' precedent).
      await (host as Stuff & CommandGiver).executeCommand(verb);
    }
  }
};
