/**
 * Trap — **a pot, a net and a keepnet are one class and three rows**
 * (fishing D13, B8). They differ by numbers only: how fast each draws,
 * which roles it takes, and how much it holds. There is no `trapKind`
 * branch anywhere.
 *
 * ## A trap is a container, and a laid one is full of water (B8)
 *
 * A trap holds what is in it — what the water put there, or what you
 * put there. The **keepnet** is the trap that draws nothing
 * (`drawPerHour: 0`) and is only ever filled by hand: `put trout in
 * keepnet` while it is laid, and the trout lives, because a laid trap
 * with an interior (`interiorBulk: true`) is full of the reach's water
 * and respiration reads the vessel a body is inside. `haul` drains it
 * and hands you what it held. No new machinery: the bowl's immersion
 * read, the trap's lay/haul.
 *
 * ## Lay, then haul — reconcile at the haul
 *
 * `lay` moves the trap from your hand into the water (the room), stamps
 * when, where and by whom, fixes it in place and vetoes its eviction: a
 * set trap survives a bounce. `haul` integrates the elapsed game-hours
 * against the reach's record — `Σ min(level, drawPerHour × hours ×
 * level/capacity)` over the roles it takes, capped by what it holds —
 * and hands over that many fish, the fraction decided by one seeded
 * unit. No skill, no engagement, no tick: a trap is a thing you leave.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { HabitatRole } from '@saxonberg/server/mud/platform/idea/species/Species';
import { HABITAT_ROLES } from '@saxonberg/server/mud/platform/idea/species/Species';
import type { Haulable, HaulOutcome, HaulSense } from '@saxonberg/server/mud/lib/spatial/Haulable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Seeded } from '@saxonberg/server/mud/lib/Seeded';
import type { SpeciesStanding } from '../lib/FisheryRead';
import Waters, { WATERS_PATH } from '../idea/Waters';
import Fish from '../agent/Fish';

const TrapBase = BulkableMixin(ContainerMixin(Tool));

const AGENT_PREFIX = '/trade/fishing/agent/';

export default class Trap extends TrapBase implements Haulable {
  static commandContributions: CommandContributions = {
    self: [],
    // `peers` = whoever stands where it lies (a set trap in the water);
    // `environment` = whoever holds it. `lay` needs it held; `haul` needs
    // it set; both views are offered either way and the controllers
    // narrow on state.
    // ⭐ `haul` is the KERNEL's verb over the `Haulable` protocol now
    // (underwater D19): the trap says what hauling it means.
    peers: ['trade/fishing/cmd/fishing/lay.yaml', 'platform/cmd/inventory/haul.yaml'],
    environment: ['trade/fishing/cmd/fishing/lay.yaml', 'platform/cmd/inventory/haul.yaml'],
  };

  static fieldMeta: FieldMeta = {
    drawPerHour: { persistent: true, authorable: true },
    takesRoles: { persistent: true, authorable: true },
    capacity: { persistent: true, authorable: true },
    setAtS: { persistent: true },
    setReach: { persistent: true },
    setBy: { persistent: true },
  };

  /** Fish per game-hour at a full reach. */
  public drawPerHour = 0;
  /** Which of the food web it takes. */
  public takesRoles: HabitatRole[] = [];
  /** How many it holds. */
  public capacity = 1;
  /** Game-seconds it was set, `0` while carried. */
  public setAtS = 0;
  /** The reach it was set on. */
  public setReach = '';
  /** Who set it — an identity path. */
  public setBy = '';

  constructor() {
    super();
    this.capabilities = ['trapping'];
  }

  public getDrawPerHour(): number {
    return this.drawPerHour;
  }
  public setDrawPerHour(value: number): void {
    this.drawPerHour = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public getTakesRoles(): readonly HabitatRole[] {
    return this.takesRoles;
  }
  public setTakesRoles(value: HabitatRole[]): void {
    this.takesRoles = Array.isArray(value)
      ? value.filter((r) => (HABITAT_ROLES as readonly string[]).includes(r))
      : [];
  }
  public getCapacity(): number {
    return this.capacity;
  }
  public setCapacity(value: number): void {
    this.capacity = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
  }
  public getSetAtS(): number {
    return this.setAtS;
  }
  public getSetReach(): string {
    return this.setReach;
  }
  public getSetBy(): string {
    return this.setBy;
  }
  public isSet(): boolean {
    return this.setAtS > 0 && this.setReach !== '';
  }

  /** Stamp the set: when, where, by whom. Fixed in place from here. */
  public markSet(nowS: number, reachRef: string, byKey: string): void {
    this.setAtS = nowS;
    this.setReach = reachRef;
    this.setBy = byKey;
    this.fixedInPlace = true;
  }

  /** Clear the set: back in a hand. */
  public markLifted(): void {
    this.setAtS = 0;
    this.setReach = '';
    this.setBy = '';
    this.fixedInPlace = false;
  }

  /**
   * How many the water would have put in it over `hours`, given each
   * species' level and capacity and the roles this trap takes — the
   * expectation, before the seeded fraction. Pure over its inputs.
   */
  public expectedTake(
    hours: number,
    species: ReadonlyArray<{ role: HabitatRole; level: number; capacity: number }>,
  ): number {
    if (!(hours > 0)) return 0;
    let expected = 0;
    for (const s of species) {
      if (!this.takesRoles.includes(s.role) || s.capacity <= 0 || s.level <= 0) continue;
      expected += Math.min(s.level, this.drawPerHour * hours * (s.level / s.capacity));
    }
    return Math.min(this.capacity, expected);
  }

  /** ⭐ A set trap stays resident — a pot in the water survives the sweep. */
  public override canEvict(context: EvictionContext): VetoResult {
    if (this.isSet()) return { ok: false, reason: 'a set trap stays in the water' };
    return super.canEvict(context);
  }

  /* ─────────────────────────── the haul (Haulable) ─────────────────────────── */

  /**
   * ⭐ `haul pot`: what the water put in it since it was set, reconciled
   * now against the reach's record, into the hauler's hands — the
   * fraction one seeded unit, nothing saying which was luck. Whatever was
   * already IN it (a keepnet's fish) comes up too; the water it held
   * drains away (fishing B8). A pot only comes up: `sense` is ignored.
   */
  public async haulBy(hauler: Stuff, sense: HaulSense | null): Promise<HaulOutcome> {
    void sense;
    if (!this.isSet()) return { ok: false, reason: 'not-set', line: 'It is not set.' };
    if (!MixinApi.isContainer(hauler)) return { ok: false, reason: 'not-haulable', line: "You can't haul that." };
    const nowS = WorldClockApi.getNow().rawValue();
    const hours = Math.max(0, nowS - this.getSetAtS()) / 3600;
    const reach = this.getSetReach();
    const registry = await (await StuffApi.singleton<Waters>(WATERS_PATH)).registry();
    const standing = registry === null ? null : await registry.standingAt(reach, nowS);
    const took: string[] = [];
    if (registry !== null && standing !== null) {
      const eligible = standing.species.filter(
        (sp) => this.getTakesRoles().includes(sp.role) && sp.level > 0 && sp.capacity > 0,
      );
      const expected = this.expectedTake(hours, eligible);
      const seed = hashString(`${this.getIdentityPath() ?? ''}|${reach}`);
      const fraction = expected - Math.floor(expected);
      const count = Math.floor(expected) + (Seeded.unit(seed, this.getSetAtS() >>> 0) < fraction ? 1 : 0);
      const organic = standing.contamination?.byKind?.organic ?? 0;
      for (let i = 0; i < count; i++) {
        const species = pickWeighted(eligible, Seeded.unit(seed, (this.getSetAtS() >>> 0) + 1 + i));
        if (species === null) break;
        if ((await registry.draw(reach, species.speciesPath, 1, nowS)) < 1) {
          species.level = 0;
          continue;
        }
        const fish = await mintFish(species, organic);
        if (fish === null) continue;
        ContainmentApi.move(fish as Stuff & Containable, hauler as Stuff & Container);
        took.push(species.name);
      }
    }
    // What it already held comes out into your hands.
    const held: string[] = [];
    for (const item of [...this.getContents()]) {
      if (!MixinApi.isContainable(item)) continue;
      ContainmentApi.move(item as Stuff & Containable, hauler as Stuff & Container);
      held.push(item.getPresentation());
    }
    if (this.hasInteriorBulk()) this.setBulkAmount('interior', Quantity.of(0, 'L'));
    this.markLifted();
    ContainmentApi.move(this as unknown as Stuff & Containable, hauler as Stuff & Container);
    const me = this as unknown as Stuff;
    if (took.length === 0 && held.length > 0) {
      return {
        ok: true,
        self: Mml.compose`You haul ${Mml.thing(me)} up and take out what you kept in it: ${held.join(', ')}.`,
        peers: Mml.compose`${Mml.actor(hauler)} hauls ${Mml.thing(me)} out of the water and takes something out of it.`,
      };
    }
    if (took.length === 0) {
      return {
        ok: true,
        self: Mml.compose`You haul ${Mml.thing(me)} up. Nothing in it.`,
        peers: Mml.compose`${Mml.actor(hauler)} hauls ${Mml.thing(me)} out of the water, empty.`,
      };
    }
    return {
      ok: true,
      self: Mml.compose`You haul ${Mml.thing(me)} up. ${countWords(took)} in it.`,
      peers: Mml.compose`${Mml.actor(hauler)} hauls ${Mml.thing(me)} out of the water, with something in it.`,
    };
  }
}

async function mintFish(species: SpeciesStanding, organic: number): Promise<Fish | null> {
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
