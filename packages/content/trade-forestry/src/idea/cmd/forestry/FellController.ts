/**
 * FellController — `fell [<species>|bole|<planted tree>] [with <axe>]`.
 *
 * ⭐⭐ **The forestry trade's one act, and the stand is the ROOM.** A
 * `Wood` composes `StandMixin`; standing in it, a player with a felling
 * axe takes a standard down out of the stand, and what comes down is
 * the whole tree:
 *
 *   - **one bole** on the room floor — the felled trunk, mass = the
 *     species' wood density × 0.9 m³ (oak ≈ 675 kg, too much for any one
 *     back; can't-budge is emergent from mass);
 *   - four logs off the crown beside it;
 *   - a seed in hand.
 *
 * **Cross-cutting is a second act on the bole**: `fell bole` takes one
 * length of green timber off it per engagement until nothing is left but
 * the butt and the brash. A planted standard is felled where it stands
 * (`fell sapling`): mature → the same bole + logs + seed; young or
 * established → one whole carryable tree; a seedling refuses.
 *
 * ## The target is POLYMORPHIC, so the view gates nothing on it
 *
 * Three things can stand in the slot and they share no mixin: a `Bole`,
 * a growing `Plant`, or a bare species word that binds NOTHING — the
 * room is not a bindable target, so `fell oak` lands as
 * `{ stuff: null, raw: 'oak' }` and `raw` is read against the room's
 * stand. The controller narrows.
 *
 * ## The axe is an ARGUMENT, never hunted
 *
 * The view's `default: "reachable:[capability.felling]"` binds the first
 * reachable thing offering `felling`; the controller reads
 * `model.axe?.stuff`, checks the capability (a bound billhook →
 * `wrong-tool`, in words), and null → `no-axe`. `lint:instrument-args`
 * holds the hunt at zero. The stand is found as the giver's container
 * narrowed by `MixinApi.isActive(room, STAND_MIXIN)` — the mining
 * trade's `workingOf` shape, and no kernel list.
 *
 * ## The engaged act
 *
 * Extends the kernel's `ManualBuildController` — `engageStep` is the
 * mining trade's `engageAct` minus the endurance spend, which is three
 * lines here. The effect runs at COMPLETION as a module-level function
 * (the controller is destructed the moment `execute` returns), and every
 * completion opens by checking the actor, the room and the bole are
 * still there: an engaged act completes long after dispatch.
 *
 * Refusals are diegetic and noted. No deed gate — felling is labour.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Growing } from '@saxonberg/server/mud/lib/husbandry/Growing';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { STAND_MIXIN, type Stand, type StandSpecies } from '../../../lib/Stand';
import Bole, { BOLE_M3, BOLE_LENGTHS } from '../../../thing/Bole';

export const FORESTRY_TOPIC = 'act.deed';

/** Game-ms a felling takes — 2.5 real seconds at the default 12×. */
export const FELL_MS = 30_000;
/** Endurance points a felling costs. */
export const FELL_COST = 10;
/** Game-ms one cross-cut takes. */
export const CROSSCUT_MS = 15_000;
/** Endurance points a cross-cut costs. */
export const CROSSCUT_COST = 5;
/** Logs off the crown of a standard. */
export const LOGS_PER_STANDARD = 4;
/** Mass of a whole felled tree, by stage — the carryable case. */
export const FELLED_TREE_KG: Record<string, number> = { young: 8, established: 30 };

const ENDURANCE = 'endurance';
const FELLING = 'felling';

const BOLE_PATH = '/trade/forestry/thing/bole';
const TIMBER_PATH = '/trade/forestry/thing/timber';
const LOG_PATH = '/trade/forestry/thing/log';
const FELLED_TREE_PATH = '/trade/forestry/thing/felled-tree';

export interface FellModel extends CommandModel {
  /** A bole, a planted tree, or a bare species word (`stuff: null`). */
  target?: MqlOneResult;
  /** The axe the view's default bound, or the one named `with`. */
  axe?: MqlOneResult;
}

type StandRoom = Stuff & Container & Stand;

export default class FellController extends ManualBuildController<FellModel> {
  async execute(model: FellModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // The instrument — bound by the view, never hunted.
    const axe = model.axe?.stuff ?? null;
    if (!axe) {
      this.decline(context, 'no-axe', Mml.compose`You have nothing here that will fell a tree.`);
      return;
    }
    if (!MixinApi.isTool(axe) || !axe.hasCapability(FELLING)) {
      this.decline(
        context,
        'wrong-tool',
        Mml.compose`That is ${Mml.thing(axe)}. It will take a stool off at the ankle, and it will not take an oak.`,
      );
      return;
    }

    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const stand: StandRoom | null =
      room && MixinApi.isActive(room, STAND_MIXIN) ? (room as unknown as StandRoom) : null;

    const named = model.target?.stuff ?? null;

    // (a) A bole on the floor — cross-cut it.
    if (named && named instanceof Bole) {
      this.crosscut(context, named);
      return;
    }

    // (b) A planted tree — fell it where it stands.
    if (named && MixinApi.isGrowing(named)) {
      this.fellPlanted(context, named, stand);
      return;
    }

    // (c) A species word, or nothing — the room's stand. ⚠ The WORD comes
    // first when the stand knows it: in a clearing where an oak has
    // already come down, `fell oak` binds an oak LOG off the floor (the
    // binder matches materials), and the player meant the tree. So a
    // bound thing that is neither a bole nor a plant is noise if the raw
    // word names a species standing here.
    const word = (model.target?.raw ?? '').trim();
    if (named && !(stand && word && stand.speciesNamed(word))) {
      this.decline(context, 'not-a-tree', Mml.compose`${Mml.thing(named)} is not a tree.`);
      return;
    }
    if (!stand) {
      this.decline(context, 'no-stand', Mml.compose`There is nothing here to fell.`);
      return;
    }
    const sp = word ? stand.speciesNamed(word) : stand.thickestSpecies();
    if (!sp) {
      if (word) {
        this.decline(context, 'no-such-species', Mml.compose`Nothing called '${word}' stands here.`);
      } else {
        this.decline(
          context,
          'stand-empty',
          Mml.compose`There is nothing left here that is worth the axe.`,
        );
      }
      return;
    }
    if (stand.standingNow(sp) < 1) {
      this.decline(
        context,
        'stand-empty',
        Mml.compose`There is nothing left here that is worth the axe — the ${sp.name} is stumps and brash.`,
      );
      return;
    }

    this.spend(giver, FELL_COST);
    const room2: Stuff & Container = stand;
    this.engageStep(context, {
      durationMs: FELL_MS,
      effortW: 700,
      beginSelf: Mml.compose`You set your feet, sight the ${sp.name}, and swing.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets to an ${sp.name} with an axe.`,
      onComplete: () => {
        void fellStandard(context, stand, room2, sp);
      },
    });
  }

  /** `fell bole` — one length off the trunk per engagement. */
  private crosscut(context: CommandContext, bole: Bole): void {
    const giver = context.commandGiver;
    if (bole.getLengthsLeft() <= 0) {
      this.decline(context, 'bole-spent', Mml.compose`There is nothing left in ${Mml.thing(bole)} but the butt.`);
      return;
    }
    this.spend(giver, CROSSCUT_COST);
    this.engageStep(context, {
      durationMs: CROSSCUT_MS,
      effortW: 500,
      beginSelf: Mml.compose`You start cross-cutting ${Mml.thing(bole)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts cross-cutting ${Mml.thing(bole)}.`,
      onComplete: () => {
        void takeLength(context, bole);
      },
    });
  }

  /** `fell <planted tree>` — a standard in a panel, felled where it stands. */
  private fellPlanted(
    context: CommandContext,
    plant: Stuff & Growing,
    stand: StandRoom | null,
  ): void {
    const giver = context.commandGiver;
    // A stool is cut with a billhook, through `harvest`; a standard is
    // the plant that yields no crop and says its keeping is silviculture.
    if (plant.getHarvestTemplatePath() !== null || plant.getDiscipline() !== 'silviculture') {
      this.decline(
        context,
        'not-a-standard',
        Mml.compose`That is a stool — cut it with a billhook.`,
      );
      return;
    }
    const stage = plant.getGrowthStage();
    if (stage === 'seedling') {
      this.decline(
        context,
        'not-yet-a-tree',
        Mml.compose`${Mml.thing(plant)} is not yet a tree. Leave it.`,
      );
      return;
    }
    this.spend(giver, stage === 'mature' ? FELL_COST : CROSSCUT_COST);
    this.engageStep(context, {
      durationMs: stage === 'mature' ? FELL_MS : CROSSCUT_MS,
      effortW: 400,
      beginSelf: Mml.compose`You set to ${Mml.thing(plant)} with the axe.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets to ${Mml.thing(plant)} with an axe.`,
      onComplete: () => {
        void fellPlantedTree(context, plant, stand, stage);
      },
    });
  }

  /** Spend endurance. A no-op on a body that carries no reserves. */
  private spend(giver: Stuff, points: number): void {
    if (points <= 0 || !MixinApi.isReserved(giver)) return;
    if (!giver.hasReserve(ENDURANCE)) return;
    giver.adjustReserve(ENDURANCE, Quantity.of(-points, '%'));
  }

  private decline(
    context: CommandContext,
    reason: string,
    text: ReturnType<typeof Mml.compose>,
  ): void {
    MessageApi.scene(context.commandGiver).topic(FORESTRY_TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/* ─────────────────── completions (module-level: the controller is gone) ─────────────────── */

async function materialAt(path: string): Promise<Material | null> {
  if (!path) return null;
  try {
    return await StuffApi.singleton<Material>(path);
  } catch {
    return null;
  }
}

/** Mint one bole, the crown's logs and the seed for a standard of `sp`. */
async function dropStandard(
  giver: Stuff,
  room: Stuff & Container,
  woodMaterialPath: string,
  seedPath: string | null,
): Promise<Bole | null> {
  const wood = await materialAt(woodMaterialPath);
  const density = wood ? wood.getDensity().rawValue() : 750;

  const bole = await StuffApi.clone<Bole>(BOLE_PATH);
  if (wood) bole.setMaterial(wood);
  bole.setMass(Quantity.of(Math.round(density * BOLE_M3), 'kg'));
  bole.setLengthsLeft(BOLE_LENGTHS);
  ContainmentApi.move(bole, room);
  await stamp(bole, giver);

  for (let i = 0; i < LOGS_PER_STANDARD; i += 1) {
    const log = await StuffApi.clone<Stuff & Containable>(LOG_PATH);
    if (wood && MixinApi.isTangible(log)) log.setMaterial(wood);
    ContainmentApi.move(log, room);
    await stamp(log, giver);
  }

  if (seedPath && MixinApi.isContainer(giver)) {
    try {
      const seed = await StuffApi.clone<Stuff & Containable>(seedPath);
      ContainmentApi.move(seed, giver);
      await stamp(seed, giver);
    } catch (err) {
      console.warn(`FellController: no seed at '${seedPath}':`, err);
    }
  }
  return bole;
}

/**
 * Stamp the good to its owner AND record where it is. ⚠ A stamp alone
 * records no place: `drop`/`put`/`get` call `followCustody` after every
 * move, and a good minted onto a floor has been moved by nobody — so
 * without this a bole on the ride was skipped by the room's capture (a
 * player's good is the owner's to persist) and never found by the room's
 * overlay (`placedIn` had no row for it). Found by restarting the server.
 */
async function stamp(thing: Stuff, owner: Stuff): Promise<void> {
  if (MixinApi.isChattel(thing)) {
    try {
      await thing.stampChattel(owner);
      await thing.followCustody();
    } catch (err) {
      console.warn('FellController: chattel stamp failed:', err);
    }
  }
}

async function capture(host: Stuff): Promise<void> {
  try {
    await PersistableApi.captureHostOf(host);
  } catch (err) {
    console.warn('FellController: capture failed:', err);
  }
}

async function credit(giver: Stuff, difficulty: 'trivial' | 'easy' | 'standard' | 'hard'): Promise<void> {
  try {
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'silviculture', difficulty, outcome: 'success' });
    }
  } catch (err) {
    console.warn('FellController: recording the deed failed:', err);
  }
}

/** A standard out of the room's stand: the cut, the bole, the logs, the seed. */
async function fellStandard(
  context: CommandContext,
  stand: StandRoom,
  room: Stuff & Container,
  sp: StandSpecies,
): Promise<void> {
  // ⚠⚠ The actor may be GONE — an engaged act completes long after
  // dispatch. Returning is the honest answer, not narrating to nobody.
  const giver = context.commandGiver;
  if (giver.isDestroyed() || stand.isDestroyed()) return;
  const nowS = WorldClockApi.getNow().rawValue();
  if (!stand.cut(sp.speciesPath, nowS, giver.getIdentityPath() ?? '')) {
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(Mml.compose`There is nothing left here that is worth the axe.`)
      .send();
    return;
  }
  const bole = await dropStandard(giver, room, sp.woodMaterialPath, sp.seedPath);
  await capture(stand);
  // ⚠ And the FELLER. The room's record never carries a player's goods
  // (the skip rule); they ride the owner's estate, which a live player
  // writes only on the residency cadence or at logout. A felling puts
  // tonnes on the floor, so it writes the owner's record now — a hard
  // stop inside the window lost a whole clearing's trunks in the browser.
  await capture(giver);

  const seedWord = sp.seedPath ? sp.seedPath.split('/').pop()?.replace(/-/g, ' ') ?? 'a seed' : null;
  MessageApi.scene(giver)
    .topic(FORESTRY_TOPIC)
    .toSelf(
      Mml.compose`The ${sp.name} goes over with a crack you feel in your feet and lies there, the whole length of it, too much for any one back. ${GrammarApi.cap(GrammarApi.inWords(LOGS_PER_STANDARD))} logs come off the crown${seedWord ? `, and ${withArticle(seedWord)}` : ''}.`,
    )
    .toPeers(
      Mml.compose`${Mml.actor(giver)} brings ${withArticle(sp.name)} down; ${bole ? Mml.thing(bole) : 'the trunk'} lies where it fell.`,
    )
    .send();
  await credit(giver, 'standard');
}

/** One length of timber off the bole; the butt and brash at the end. */
async function takeLength(context: CommandContext, bole: Bole): Promise<void> {
  const giver = context.commandGiver;
  if (giver.isDestroyed() || bole.isDestroyed()) return;
  const room = bole.getContainer();
  const wood = bole.getMaterial();
  const timber = await StuffApi.clone<Stuff & Containable>(TIMBER_PATH);
  if (wood && MixinApi.isTangible(timber)) timber.setMaterial(wood);
  if (MixinApi.isContainer(giver)) ContainmentApi.move(timber, giver);
  else if (room) ContainmentApi.move(timber, room);
  await stamp(timber, giver);

  const left = bole.takeLength();
  if (left <= 0) {
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(
        Mml.compose`You cut the last length off ${Mml.thing(bole)}. What is left is a knotted butt and a heap of brash, and the wood can have it back.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} cuts the last length off ${Mml.thing(bole)}.`)
      .send();
    await StuffApi.destruct(bole);
  } else {
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(
        Mml.compose`You cut ${Mml.thing(timber)} off ${Mml.thing(bole)}. ${left === 1 ? 'One length left in it.' : `${GrammarApi.cap(GrammarApi.inWords(left))} lengths in it yet.`}`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} cuts a length off ${Mml.thing(bole)}.`)
      .send();
  }
  if (room) await capture(room);
  await capture(giver);
  await credit(giver, 'easy');
}

/** A planted standard, felled where it stands — the product sized by the tree. */
async function fellPlantedTree(
  context: CommandContext,
  plant: Stuff & Growing,
  stand: StandRoom | null,
  stage: string,
): Promise<void> {
  const giver = context.commandGiver;
  if (giver.isDestroyed() || plant.isDestroyed()) return;
  const panel = MixinApi.isContainable(plant) ? plant.getContainer() : null;
  const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
  if (!room) return;

  // What a felled one is made of: the room stand's entry for this species
  // when there is one, else the plant's own `standardMaterialPath`.
  const speciesPath = MixinApi.isOrganism(plant) ? plant.getSpecies()?.getTemplatePath() ?? '' : '';
  const entry = stand ? stand.getMix().find((sp) => sp.speciesPath === speciesPath) ?? null : null;
  const woodPath =
    entry?.woodMaterialPath ?? (plant instanceof Plant ? plant.getStandardMaterialPath() : null) ?? '';
  const seedPath =
    entry?.seedPath ?? (plant instanceof Plant ? plant.getSeedTemplatePath() : null);
  const plantKey = MixinApi.isPersistable(plant) ? plant.getPersistenceKey() : null;
  const name = plant.getPresentation();

  await StuffApi.destruct(plant);

  if (stage === 'mature') {
    await dropStandard(giver, room, woodPath, seedPath);
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(
        Mml.compose`${name} goes over with a crack you feel in your feet and lies there, the whole length of it. ${GrammarApi.cap(GrammarApi.inWords(LOGS_PER_STANDARD))} logs come off the crown.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} brings ${name} down.`)
      .send();
  } else {
    const wood = await materialAt(woodPath);
    const tree = await StuffApi.clone<Stuff & Containable>(FELLED_TREE_PATH);
    if (wood && MixinApi.isTangible(tree)) tree.setMaterial(wood);
    if (MixinApi.isTangible(tree)) {
      tree.setMass(Quantity.of(FELLED_TREE_KG[stage] ?? FELLED_TREE_KG.young!, 'kg'));
    }
    if (MixinApi.isContainer(giver)) ContainmentApi.move(tree, giver);
    else ContainmentApi.move(tree, room);
    await stamp(tree, giver);
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(Mml.compose`${name} comes away at the ankle, whole, and you take it up.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} fells ${name} and takes it up whole.`)
      .send();
  }

  if (stand && plantKey) stand.removePlanting(plantKey);
  if (panel) await capture(panel);
  await capture(room);
  await capture(giver);
  await credit(giver, stage === 'mature' ? 'standard' : 'easy');
}

function withArticle(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}
