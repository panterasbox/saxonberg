/**
 * FishingEngagement — **the wait, the bite, and the landing** (fishing
 * D5). A sustained engagement on the angler's `hands`, hosted by the
 * rod, ticking once a game minute.
 *
 * ## The bite is the fish's decision
 *
 * Each tick the engagement asks the water pack's record what the reach
 * holds and accumulates **pressure** — deterministically — from every
 * species' level, the hour (dawn and dusk), the weather (rain on the
 * water), whether the bait suits the species' role, and the tackle.
 * When pressure crosses one there is a take, and **the one draw** in
 * the whole act decides which species: a seeded unit weighted by each
 * species' term. Epistemic, not resolutional — what the water held under
 * the hook was always going to be something; the draw says which, never
 * whether your act worked.
 *
 * ## The landing
 *
 * A small fish lands itself. A fighter opens a `LandingContest`, and
 * `reel` / `slack` act on it through this engagement; the tick tires
 * it. Landed, the fish is minted alive into the angler's hands (and
 * starts drowning — a body in air), drawn from the record, stamped with
 * whatever the water carries, and credited to the Discipline. Snapped,
 * the rod is intact, the fish is gone, and the line says what the reach
 * holds — never what you did wrong. A tick with no bite prints
 * **nothing**.
 *
 * ## An NPC angler
 *
 * The fisher's brain starts this same engagement with no bait; when the
 * actor is not a player the landing releases the fish at once and speaks
 * one line. He draws from the same record through the same arithmetic,
 * so a netted-out reach is a reach he sits at all day with nothing on
 * the line.
 */

import type {
  SustainedEngagement,
  ScheduledEmission,
} from '@saxonberg/server/mud/api/scheduler';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Seeded } from '@saxonberg/server/mud/lib/Seeded';
import type { EngagementSlot, Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { LandingContest, CONTEST_DEFAULTS, type ContestDials, type ContestOutcome } from './LandingContest';
import type { FisheryRegistry, FisheryStanding, SpeciesStanding } from './FisheryRead';
import type { FeedFactors } from '../idea/Waters';
import Fish from '../agent/Fish';
import Bait from '../thing/Bait';
import Rod from '../thing/Rod';

export const FISHING_TYPE = 'fishing';
export const FISHING_TOPIC = 'act.deed';

const SLOTS: readonly EngagementSlot[] = ['hands'];
const TICK_GAME_MS = 60 * 1000;

/** Where a species' individual is minted from: the trade's agent row of the same leaf. */
const AGENT_PREFIX = '/trade/fishing/agent/';

export interface FishingSpec {
  actor: Stuff & Engaged;
  rod: Stuff;
  bait: Stuff | null;
  reachRef: string;
  room: Stuff;
  registry: FisheryRegistry;
  /** The hour's and the weather's factors, asked fresh each tick. */
  feedFactors: (room: Stuff, nowS: number) => Promise<FeedFactors>;
}

/** What a tick or a verb found out — for the controllers' prose and the tests. */
export interface FishingEvent {
  kind: 'bite' | 'fighter' | 'landed' | 'snapped' | 'thrown';
  species: SpeciesStanding;
  fish?: Fish;
}

export class FishingEngagement implements SustainedEngagement {
  engagementId = '';
  readonly type = FISHING_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable = true;
  readonly emissions: readonly ScheduledEmission[];

  readonly reachRef: string;
  private readonly rod: Stuff;
  private bait: Stuff | null;
  private readonly room: Stuff;
  private readonly registry: FisheryRegistry;
  private readonly feedFactors: FishingSpec['feedFactors'];

  /** Bite pressure, deterministic; a take at 1. */
  private pressure = 0;
  private tickIndex = 0;
  private ticking = false;
  private ended = false;
  /** The open contest and the fish on the line, while fighting. */
  private contest: LandingContest | null = null;
  private hooked: SpeciesStanding | null = null;
  private hookedLengthM = 0;

  constructor(spec: FishingSpec) {
    this.actor = spec.actor;
    this.rod = spec.rod;
    this.bait = spec.bait;
    this.reachRef = spec.reachRef;
    this.room = spec.room;
    this.registry = spec.registry;
    this.feedFactors = spec.feedFactors;
    this.emissions = [
      {
        intervalMs: TICK_GAME_MS,
        event: () => {
          void this.tick();
        },
      },
    ];
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(_reason: AbortReason): void {
    this.ended = true;
  }

  /** The rod: its destruction tears the wait down. */
  getHost(): Stuff | null {
    return this.rod;
  }

  /** Is there a fish on the line? */
  public isFighting(): boolean {
    return this.contest !== null;
  }

  /* ─────────────────────────── the verbs ─────────────────────────── */

  /** `reel` — take line in. `null` when nothing is on the line. */
  public async reel(): Promise<FishingEvent | null> {
    if (this.contest === null || this.hooked === null) return null;
    return this.resolve(this.contest.reel());
  }

  /** `slack` — give line. `null` when nothing is on the line. */
  public async slack(): Promise<FishingEvent | null> {
    if (this.contest === null || this.hooked === null) return null;
    return this.resolve(this.contest.slack());
  }

  /* ─────────────────────────── the beat ─────────────────────────── */

  private async tick(): Promise<void> {
    if (this.ended || this.ticking) return;
    this.ticking = true;
    try {
      this.tickIndex += 1;
      if (this.contest !== null) {
        const event = await this.resolve(this.contest.tick());
        if (event) this.narrate(event);
        return;
      }
      const event = await this.wait();
      if (event) this.narrate(event);
    } finally {
      this.ticking = false;
    }
  }

  /** One minute of waiting: accumulate pressure; a take when it crosses one. */
  private async wait(): Promise<FishingEvent | null> {
    const nowS = WorldClockApi.getNow().rawValue();
    const standing = await this.registry.standingAt(this.reachRef, nowS);
    if (standing === null) return null;
    this.noteContamination(standing);
    const factors = await this.feedFactors(this.room, nowS);
    const terms = this.terms(standing, factors);
    const total = terms.reduce((sum, t) => sum + t.term, 0);
    this.pressure += total * dial('fishing.bite.ratePerMinute', 0.12);
    if (this.pressure < 1 || total <= 0) return null;
    this.pressure -= 1;

    // ⭐ The one draw: which species — epistemic, seeded on the reach,
    // this wait and this minute. It says what was under the hook, never
    // whether the act worked.
    const u = Seeded.unit(hashString(`${this.reachRef}|${this.engagementId}`), this.tickIndex);
    let pick = terms[terms.length - 1]!.species;
    let acc = 0;
    for (const t of terms) {
      acc += t.term / total;
      if (u < acc) {
        pick = t.species;
        break;
      }
    }
    return this.take(pick, nowS);
  }

  /** Each species' share of the bite this minute. */
  private terms(standing: FisheryStanding, factors: FeedFactors): Array<{ species: SpeciesStanding; term: number }> {
    const showing = this.rod instanceof Rod ? this.rod.getShowing() : 1;
    const out: Array<{ species: SpeciesStanding; term: number }> = [];
    for (const s of standing.species) {
      if (s.capacity <= 0 || s.level <= 0) continue;
      const match = this.baitMatch(s.role);
      if (match <= 0) continue;
      out.push({
        species: s,
        term: (s.level / s.capacity) * factors.twilight * factors.weather * match * showing,
      });
    }
    return out;
  }

  /** How well what is on the hook suits a species' place in the food web. */
  private baitMatch(role: SpeciesStanding['role']): number {
    const matched = dial('fishing.bite.match', 1);
    if (this.bait === null || this.bait.isDestroyed()) return dial('fishing.bite.bareHook', 0.15);
    if (!(this.bait instanceof Bait)) return 0; // crumbs, a boot — nothing takes it
    switch (this.bait.getBaitKind()) {
      case 'worm':
        return role === 'bait' || role === 'forage' ? matched : role === 'predator' ? matched * 0.5 : matched * 0.3;
      case 'baitfish':
        return role === 'predator' || role === 'apex' ? matched : role === 'forage' ? matched * 0.3 : 0;
      case 'crumbs':
        return 0;
    }
  }

  /** The take: consume the bait, size the fish, land it or open the fight. */
  private async take(species: SpeciesStanding, nowS: number): Promise<FishingEvent | null> {
    if (this.bait !== null && !this.bait.isDestroyed()) {
      StuffApi.destruct(this.bait);
      this.bait = null;
    }
    // The individual's length, seeded around the species' stature — the
    // ordinal is how many this wait has taken, so no two are alike.
    const stature = await this.statureOf(species.speciesPath);
    const spread = Seeded.unit(hashString(`${this.reachRef}|${species.speciesPath}`), this.tickIndex + 7);
    this.hookedLengthM = stature * (0.6 + spread);
    const fight = species.fightRating * (stature > 0 ? this.hookedLengthM / stature : 1);

    if (fight < dial('fishing.contest.fighterAt', 0.45)) {
      return this.land(species, 'easy', nowS);
    }
    this.hooked = species;
    this.contest = new LandingContest(fight, this.dials());
    return { kind: 'fighter', species };
  }

  private async resolve(outcome: ContestOutcome): Promise<FishingEvent | null> {
    const species = this.hooked;
    if (species === null) return null;
    switch (outcome) {
      case 'fighting':
        return null;
      case 'landed': {
        this.contest = null;
        this.hooked = null;
        return this.land(species, species.role === 'apex' ? 'hard' : 'standard', WorldClockApi.getNow().rawValue());
      }
      case 'snapped':
      case 'thrown': {
        this.contest = null;
        this.hooked = null;
        await this.credit('standard', 'failure');
        if (outcome === 'snapped') this.finish();
        return { kind: outcome, species };
      }
    }
  }

  /** Mint the fish into the angler's hands — or, for an NPC, let it go. */
  private async land(species: SpeciesStanding, difficulty: 'easy' | 'standard' | 'hard', nowS: number): Promise<FishingEvent | null> {
    const taken = await this.registry.draw(this.reachRef, species.speciesPath, 1, nowS);
    if (taken < 1) return null; // the water gave it up in the meantime
    await this.credit(difficulty, 'success');

    if (!MixinApi.isPersona(this.actor)) {
      // The fisher: catch and release, at once, and one line.
      await this.registry.release(this.reachRef, species.speciesPath, 1, nowS);
      return { kind: 'landed', species };
    }

    const fish = await this.mint(species);
    if (fish === null) return null;
    if (species.role === 'apex') {
      void this.actor
        .recordDeed({
          template: 'Landed a {{ species }} at {{ reach }}.',
          vars: { species: species.name, reach: this.reachRef },
          tags: ['fishing', 'landmark'],
        })
        .catch(() => {});
    }
    return { kind: 'landed', species, fish };
  }

  private async mint(species: SpeciesStanding): Promise<Fish | null> {
    const leaf = species.speciesPath.split('/').pop() ?? '';
    try {
      const fish = await StuffApi.clone<Fish>(`${AGENT_PREFIX}${leaf}`);
      if (!(fish instanceof Fish)) return null;
      fish.setLengthM(this.hookedLengthM);
      // What the water carries, the fish carries — silently.
      const organic = this.lastContamination;
      if (organic > 0) {
        fish.setPathogenLoads({ 'e-coli': Math.min(1, organic * dial('fishing.contamination.loadPerUnit', 2)) });
      }
      if (MixinApi.isContainer(this.actor) && MixinApi.isContainable(fish)) {
        ContainmentApi.move(fish as Stuff & Containable, this.actor as Stuff & Container);
      }
      return fish;
    } catch {
      return null;
    }
  }

  /** The reach's organic load, as of the last standing read. */
  private lastContamination = 0;

  private async statureOf(speciesPath: string): Promise<number> {
    try {
      const sp = (await StuffApi.singleton<Stuff>(speciesPath)) as unknown as { getStature?: () => number } | null;
      return sp?.getStature?.() ?? 0;
    } catch {
      return 0;
    }
  }

  private async credit(difficulty: 'easy' | 'standard' | 'hard', outcome: 'success' | 'failure'): Promise<void> {
    if (!MixinApi.isAdvancing(this.actor)) return;
    try {
      await this.actor.creditDeed({ discipline: 'fishing', difficulty, outcome });
    } catch {
      /* no transcript, no credit */
    }
  }

  private dials(): ContestDials {
    const rodBreak = this.rod instanceof Rod ? this.rod.getBreakStrain() : 0;
    return {
      reelGain: dial('fishing.contest.reelGain', CONTEST_DEFAULTS.reelGain),
      reelStrain: dial('fishing.contest.reelStrain', CONTEST_DEFAULTS.reelStrain),
      slackRelief: dial('fishing.contest.slackRelief', CONTEST_DEFAULTS.slackRelief),
      slackRun: dial('fishing.contest.slackRun', CONTEST_DEFAULTS.slackRun),
      tire: dial('fishing.contest.tire', CONTEST_DEFAULTS.tire),
      pull: dial('fishing.contest.pull', CONTEST_DEFAULTS.pull),
      breakStrain: rodBreak > 0 ? rodBreak : dial('fishing.contest.breakStrain', CONTEST_DEFAULTS.breakStrain),
      landAt: dial('fishing.contest.landAt', CONTEST_DEFAULTS.landAt),
    };
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    SchedulerApi.complete(this);
  }

  /* ─────────────────────────── the prose ─────────────────────────── */

  /** What the angler and the bank hear. Never a number; a refusal is silence. */
  public narrate(event: FishingEvent): void {
    const actor = this.actor;
    const name = event.species.name;
    const scene = MessageApi.scene(actor).topic(FISHING_TOPIC);
    switch (event.kind) {
      case 'landed': {
        if (event.fish) {
          scene
            .toSelf(Mml.compose`Something takes it — a ${name}, ${event.fish.sizeWords()}. You bring it in.`)
            .toPeers(Mml.compose`${Mml.actor(actor)} lands a ${name}.`);
        } else {
          scene
            .toSelf(Mml.compose`A ${name} comes to the hook. You look at it a moment and let it go.`)
            .toPeers(Mml.compose`${Mml.actor(actor)} lifts a ${name} out of the water, looks at it, and lets it go.`);
        }
        break;
      }
      case 'fighter':
        scene
          .toSelf(Mml.compose`Something big takes it and runs — the rod bends double. Give it line when it runs; take it in when it rests.`)
          .toPeers(Mml.compose`${Mml.actor(actor)}'s rod bends double.`);
        break;
      case 'snapped':
        scene
          .toSelf(Mml.compose`The line parts. Whatever it was is gone, and the water is as it was.`)
          .toPeers(Mml.compose`${Mml.actor(actor)}'s line parts.`);
        break;
      case 'thrown':
        scene
          .toSelf(Mml.compose`The line goes slack. It threw the hook.`)
          .toPeers(Mml.compose`${Mml.actor(actor)}'s line goes slack.`);
        break;
      case 'bite':
        break;
    }
    scene.send();
  }

  /** Remember the reach's organic load from a standing — read by `mint`. */
  public noteContamination(standing: FisheryStanding | null): void {
    this.lastContamination = standing?.contamination?.byKind?.organic ?? 0;
  }
}

/* ───────────────────────── module-private ───────────────────────── */

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
