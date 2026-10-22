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
  loaf: boolean;
  nips: boolean;
  piece: boolean;
  quern: boolean;
  sack: boolean;
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
    return { ...TERMINUS, ...c, fuels: c.fuels ?? TERMINUS.fuels };
  }

  static urgency(ctx: BrainContext): Urgency {
    const w = brain.words(ctx.config);
    const floor = brain.read(ctx.host, w);
    if (floor === null) return new Urgency('idle');
    return brain.next(floor, w) === null
      ? new Urgency('idle')
      : new Urgency('wanted', `turns to the ${w.kettle}`);
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
    if (f.liquor === 'struck') {
      if (f.onFire) return `get ${w.kettle}`;
      if (f.coneReady) return `pour ${w.kettle} into ${w.mould}`;
      if (f.coneAndPot) return `put ${w.mould} on ${w.pot}`;
    }
    // Finish what is made before starting more.
    if (w.finish === 'loaf') {
      if (f.sack) return errand('put sack in counter');
      if (f.piece && f.quern) return 'mill piece';
      if (f.loaf && f.nips) return 'cut loaf with nips';
      if (f.setLoaf) return `get loaf from ${w.mould}`;
    } else {
      if (f.block) return errand('put block in counter');
      if (f.setBlock) return `get block from ${w.mould}`;
    }
    if (f.liquor === 'struck' || f.liquor === 'spoilt') return null;
    if (f.liquor === 'empty') {
      if (w.source === 'juice') return f.juice ? `pour tub into ${w.kettle}` : null;
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
    if (!f.fireFuelled) return f.fuel ? `stoke ${f.fuel} into ${w.fire}` : null;
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
    const coneReady = cones.some((c) => placedOn(c) instanceof CuringPot);
    const freePot = pots.some((p) => MixinApi.isPlacing(p) && p.getPlaced('on').length === 0);

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

    const moulded = (pred: (c: Stuff) => boolean): boolean =>
      here.some(
        (m) =>
          MixinApi.isMould(m) &&
          MixinApi.isContainer(m) &&
          ((m as unknown as Container).getContents() as Stuff[]).some(pred),
      );
    const isSack = (s: Stuff): boolean =>
      s.getTemplatePath() === '/trade/cooking/thing/sugar-sack' &&
      MixinApi.isBulkable(s) &&
      !s.isBulkEmpty('interior');
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
    const counter = w.counter ? StuffApi.findByTemplatePath(w.counter) : null;
    const onCounter = (tag: string): boolean =>
      !!counter &&
      MixinApi.isContainer(counter) &&
      (counter.getContents() as Stuff[]).some((s) => hasTag(s, tag));

    return {
      copper,
      onFire: !!copper && fire !== null && placedOn(copper) === fire,
      fireLit: !!fire && MixinApi.isBurner(fire) && fire.isLit(),
      fireFuelled: !!fire && MixinApi.isBurner(fire) && fire.fuelRemaining() > 0,
      liquor,
      limed,
      skimmed,
      block: here.some((s) => hasTag(s, 'raw-sugar')),
      juice: here.some(
        (s) =>
          MixinApi.isBulkable(s) &&
          !s.isBulkEmpty('interior') &&
          (s.getBulkMaterial('interior')?.hasTag('cane-juice') ?? false),
      ),
      lime: here.some((s) => hasTag(s, 'liming')),
      fuel: w.fuels.find(dryFuel) ?? '',
      coneReady,
      coneAndPot: cones.length > 0 && freePot,
      setLoaf: moulded((c) => c instanceof SugarLoaf),
      setBlock: moulded((c) => hasTag(c, 'raw-sugar')),
      loaf: here.some((s) => s instanceof SugarLoaf),
      nips: here.some((s) => MixinApi.isTool(s) && s.hasCapability('nipping')),
      piece: here.some((s) => !(s instanceof SugarLoaf) && hasTag(s, 'loaf-sugar')),
      quern: here.some((s) => MixinApi.isTool(s) && s.hasCapability('millstone')),
      sack: here.some(isSack),
      counterBlock: onCounter('raw-sugar'),
      counterLime: onCounter('liming'),
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
