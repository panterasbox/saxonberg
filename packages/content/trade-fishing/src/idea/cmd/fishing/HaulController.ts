/**
 * HaulController — `haul <trap>`: what the water put in it since it was
 * set, reconciled now against the reach's record, into your hands. The
 * fraction is one seeded unit; nothing says which was luck.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Seeded } from '@saxonberg/server/mud/lib/Seeded';
import { FishingController, FISHING_TOPIC } from './FishingController';
import type { SpeciesStanding } from '../../../lib/FisheryRead';
import Trap from '../../../thing/Trap';
import Fish from '../../../agent/Fish';

interface HaulModel extends CommandModel {
  trap: MqlOneResult;
}

const AGENT_PREFIX = '/trade/fishing/agent/';

export default class HaulController extends FishingController<HaulModel> {
  async execute(model: HaulModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const trap = model.trap?.stuff as Stuff | undefined;
    if (!trap || !(trap instanceof Trap)) {
      this.decline(context, "That isn't a trap.", 'not-a-trap');
      return;
    }
    if (!trap.isSet()) {
      this.decline(context, 'It is not set.', 'not-set');
      return;
    }
    if (!MixinApi.isContainer(giver) || !MixinApi.isContainable(trap)) {
      this.decline(context, "You can't haul that.", 'not-haulable');
      return;
    }
    const nowS = WorldClockApi.getNow().rawValue();
    const hours = Math.max(0, nowS - trap.getSetAtS()) / 3600;
    const reach = trap.getSetReach();
    const registry = await this.registry();
    const standing = registry === null ? null : await registry.standingAt(reach, nowS);
    const took: string[] = [];
    if (registry !== null && standing !== null) {
      const eligible = standing.species.filter(
        (s) => trap.getTakesRoles().includes(s.role) && s.level > 0 && s.capacity > 0,
      );
      const expected = trap.expectedTake(hours, eligible);
      const seed = hashString(`${trap.getIdentityPath() ?? ''}|${reach}`);
      const fraction = expected - Math.floor(expected);
      const count = Math.floor(expected) + (Seeded.unit(seed, trap.getSetAtS() >>> 0) < fraction ? 1 : 0);
      const organic = standing.contamination?.byKind?.organic ?? 0;
      for (let i = 0; i < count; i++) {
        const species = pickWeighted(eligible, Seeded.unit(seed, (trap.getSetAtS() >>> 0) + 1 + i));
        if (species === null) break;
        if ((await registry.draw(reach, species.speciesPath, 1, nowS)) < 1) {
          species.level = 0;
          continue;
        }
        const fish = await this.mint(species, organic);
        if (fish === null) continue;
        ContainmentApi.move(fish as Stuff & Containable, giver as Stuff & Container);
        took.push(species.name);
      }
    }
    trap.markLifted();
    ContainmentApi.move(trap as Stuff & Containable, giver as Stuff & Container);

    const scene = MessageApi.scene(giver).topic(FISHING_TOPIC);
    if (took.length === 0) {
      scene
        .toSelf(Mml.compose`You haul ${Mml.thing(trap)} up. Nothing in it.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} hauls ${Mml.thing(trap)} out of the water, empty.`);
    } else {
      const names = countWords(took);
      scene
        .toSelf(Mml.compose`You haul ${Mml.thing(trap)} up. ${names} in it.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} hauls ${Mml.thing(trap)} out of the water, with something in it.`);
    }
    scene.send();
  }

  private async mint(species: SpeciesStanding, organic: number): Promise<Fish | null> {
    const leaf = species.speciesPath.split('/').pop() ?? '';
    try {
      const fish = await StuffApi.clone<Fish>(`${AGENT_PREFIX}${leaf}`);
      if (!(fish instanceof Fish)) return null;
      if (organic > 0) {
        fish.setPathogenLoads({ 'e-coli': Math.min(1, organic * dial('fishing.contamination.loadPerUnit', 2)) });
      }
      return fish;
    } catch {
      return null;
    }
  }
}

function pickWeighted(eligible: SpeciesStanding[], u: number): SpeciesStanding | null {
  const live = eligible.filter((s) => s.level > 0);
  const total = live.reduce((sum, s) => sum + s.level, 0);
  if (total <= 0) return null;
  let acc = 0;
  for (const s of live) {
    acc += s.level / total;
    if (u < acc) return s;
  }
  return live[live.length - 1] ?? null;
}

/** "A shore crab", "Two eels and a shore crab" — in words, never a figure. */
function countWords(names: string[]): string {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  const parts = [...counts.entries()].map(([name, n]) => `${numberWord(n)} ${n === 1 ? name : plural(name)}`);
  const joined = parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

function numberWord(n: number): string {
  const words = ['no', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return words[n] ?? 'a great many';
}

function plural(name: string): string {
  if (/(trout|carp|eel|mullet|sturgeon|fish|pike|perch|bream)$/.test(name)) return name;
  return `${name}s`;
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function hashString(s: string): number {
  let v = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    v ^= s.charCodeAt(i);
    v = Math.imul(v, 0x01000193);
  }
  return v >>> 0;
}
