/**
 * Program — what a broadcast's standing record IS (stream arrival D10):
 * one document at `/platform/programs/<short-name>`, served by
 * `ProgramCatalogue` (`StreamApi.programs()`), written by `StreamLogic`
 * alone through `DocumentApi.saveProgram`.
 *
 * ⭐ **Nobody is *the* streamer; the unit is the program.** A program has
 * an owner — a titled path whose pen edits it (a player's own home, or an
 * institution's branch: `/compact/…`, `/corpo/<key>`, `/studio/<group>`) —
 * a title, a one-line schedule, and the video feeds that carry it. A feed
 * is the attacher's OWN channel, read from their linked account when it is
 * attached (D13) — `provenBy` names who proved it. A program with no feed
 * is still a program.
 *
 * ⭐ The run is the BODY's (D12): phases, timers, the segment, the agenda
 * all stay on whoever is running it. The program only names who has the
 * chair (`runner`), so *is this program on air* follows a reference.
 *
 * A value object: immutable, read off a document's data, written back as
 * data. It decides nothing — `StreamLogic` decides the pen, the proof and
 * the chair.
 */

import type { BroadcastService } from './Broadcast';

/** A program's short name: what a link names and the path's leaf. */
export const PROGRAM_NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])$/;

/** The branch every program is filed under — one keeper for one register of names. */
export const PROGRAMS_BRANCH = '/platform/programs';

/** One proven feed: the channel in the form the embed uses, and who proved it. */
export interface ProgramFeed {
  /** A lower-case Twitch login, a lower-case Kick slug, a YouTube `UC…` id. */
  channel: string;
  /** The identity path of the player whose linked account proved it. */
  provenBy: string;
  /** When it was proved (epoch ms). */
  provenAt: number;
}

/** A program's feeds, by carrier. */
export type ProgramFeeds = Partial<Record<BroadcastService, ProgramFeed>>;

/** The record's data, as stored. */
export interface ProgramData {
  title: string;
  owner: string;
  ownerName: string;
  schedule: string;
  feeds: ProgramFeeds;
  runner: string | null;
}

export class Program {
  constructor(
    private readonly name: string,
    private readonly data: Readonly<ProgramData>,
  ) {}

  /** The short name — the path's leaf. */
  getName(): string {
    return this.name;
  }

  /** Where the record lives. */
  getPath(): string {
    return `${PROGRAMS_BRANCH}/${this.name}`;
  }

  /** The title; the short name when none was given. */
  getTitle(): string {
    return this.data.title || this.name;
  }

  /** The owning titled path — whose pen edits and runs it (D11). */
  getOwner(): string {
    return this.data.owner;
  }

  /** The owner's caption for a page (D11, conflict note 3). */
  getOwnerName(): string {
    return this.data.ownerName;
  }

  /** The one free line: the next show, with its time zone. Empty when unsaid. */
  getSchedule(): string {
    return this.data.schedule;
  }

  /** The proven feed on `carrier`, or null. */
  feedOn(carrier: BroadcastService): ProgramFeed | null {
    return this.data.feeds[carrier] ?? null;
  }

  /** Every carrier with a feed, in the carriers' order. */
  feedCarriers(): BroadcastService[] {
    return (['twitch', 'youtube', 'kick'] as const).filter((c) => this.data.feeds[c]);
  }

  /** The playerId in the chair, or null. */
  getRunner(): string | null {
    return this.data.runner;
  }

  /** The record as stored. */
  toData(): ProgramData {
    return {
      title: this.data.title,
      owner: this.data.owner,
      ownerName: this.data.ownerName,
      schedule: this.data.schedule,
      feeds: { ...this.data.feeds },
      runner: this.data.runner,
    };
  }

  /** The same program with `patch` applied — the next record to save. */
  with(patch: Partial<ProgramData>): Program {
    return new Program(this.name, { ...this.toData(), ...patch });
  }
}
