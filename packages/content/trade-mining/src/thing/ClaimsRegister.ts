/**
 * ClaimsRegister — the ledger on the claims-office counter, and the one
 * thing that tells `stake` which diggings it is recording for.
 *
 * ⭐ A fixture rather than a global: a second mining town's claims office
 * has its own register naming its own warren, and neither pack learns
 * about the other. The view binds it by class, and since
 * controller-liquidity W9 it decides the claim itself
 * ({@link ClaimsRegister.stakePlanFor}): a surface working by name, or a
 * block of ground by its centre cell; first come is the whole rule, and the
 * refusal says whose the ground already is — yours included.
 *
 * ⚠ It holds NO claims. Title lives in `ParcelRecord`, written only by
 * the gated `ParcelApi` — which is exactly why a content edit cannot
 * forge one, and why this row is a pointer rather than a database.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { ParcelOwner } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import MineWarren, { type ClaimBlock } from '../idea/MineWarren';

/** How big a staked block is, in cells, either side of its centre. */
const BLOCK_HALF = 3;
/** …and its depth either side, in cells. */
const BLOCK_HALF_DEPTH = 1;

/** ⭐ Every reason the recorder will not write a claim. */
export type StakeRefusal =
  /** The register names no diggings. */
  | ActRefusal<'no-diggings'>
  /** The books name diggings the recorder cannot find — a fault in the books. */
  | ActRefusal<'warren-unresolvable', { path: string }>
  /** Not a surface working in the book, and not three numbers. */
  | ActRefusal<'no-block'>
  /** First come is the whole rule — and it may be your own claim. */
  | ActRefusal<'already-claimed', { yours: boolean; held: boolean; surface: string | null }>
  | ActRefusal<'subdivide-failed'>;

/** What was recorded. */
export type StakeDone =
  | { kind: 'block'; number: number }
  | { kind: 'surface'; word: string };

/** A claim — instant: the recorder writes, and it is yours. */
export type StakePlan = ActPlan<undefined, StakeDone, StakeRefusal>;

export default class ClaimsRegister extends Thing {
  /**
   * ⭐ The counter affords `stake` to whoever is in the room — the
   * content-affords-the-verb rule. A mine's acts are conferred by the
   * mine's own fixtures, never by a core mixin.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/mining/cmd/mining/stake.yaml'],
    peers: ['trade/mining/cmd/mining/stake.yaml'],
  };

  static fieldMeta: FieldMeta = {
    warrenPath: { persistent: true, authorable: true },
    surfaceWorkings: { persistent: true, authorable: true },
  };

  /** The diggings this register records claims for. */
  protected warrenPath: string = '';

  /**
   * ⭐⭐ **The book of SURFACE workings open to claim** — a quarry, a chalk
   * pit, a turf bank.
   *
   * A mine is claimed by naming three numbers, because a mine is a warren
   * and a claim is a block of cells nobody has cut yet. A surface working is
   * not: it is an authored ROOM with a real path, and longest-prefix title
   * resolution answers directly about it. So the counter keeps a second
   * list, and `stake pit` takes the other fork: no warren, no block
   * arithmetic, one `subdivide`.
   *
   * ⚠ Content authors this. Each entry is `{ path, keywords }` — the room's
   * parcel extent, and the words a player would actually type.
   */
  protected surfaceWorkings: Array<{ path: string; keywords: string[] }> = [];

  public getWarrenPath(): string { return this.warrenPath; }
  public setWarrenPath(value: string): void { this.warrenPath = value; }

  public getSurfaceWorkings(): readonly { path: string; keywords: string[] }[] {
    return this.surfaceWorkings;
  }
  public setSurfaceWorkings(
    value: Array<{ path: string; keywords: string[] }>,
  ): void {
    this.surfaceWorkings = Array.isArray(value) ? value : [];
  }

  /**
   * The surface working a player's word names, or `null`.
   *
   * ⚠ Matched case-insensitively against each entry's authored keywords,
   * because `stake Pit` and `stake the quarry` are the same request and a
   * counter clerk would not quibble.
   */
  /**
   * ⭐⭐ Record a claim for `actor` over `where` — a surface working's name
   * in this book, or a block's centre cell as three numbers (`-4,-8,-2`).
   * Every refusal is decided here before the title is written; the plan's
   * completion subdivides beneath the mine's extent (the gated
   * `ParcelApi` — a content edit cannot forge a title) and registers the
   * block. ⭐ It mints a title and no room, which is what a claim IS.
   */
  public async stakePlanFor(actor: Stuff, where: string): Promise<StakePlan | StakeRefusal> {
    const word = where.trim();
    const owner: ParcelOwner = { kind: 'player', templatePath: actor.getIdentityPath() ?? '' };
    const yours = (o: ParcelOwner | null): boolean =>
      o !== null && o.kind === 'player' && o.templatePath === owner.templatePath;
    const centre = this.cellOf(word);
    const surface = centre === null ? this.surfaceWorkingFor(word) : null;
    if (surface !== null) {
      const existing = await ParcelApi.coveringParcelOf(surface);
      if (existing !== null && existing.getExtent() === surface) {
        return { ok: false, reason: 'already-claimed', facts: { yours: yours(existing.getOwner()), held: true, surface: word } };
      }
      return this.instant(async () => {
        const record = await ParcelApi.subdivide(surface, this.parentExtentOf(surface), owner, 0, 1, 'industrial');
        return record ? { ok: true, facts: { kind: 'surface', word } } : { ok: false, reason: 'subdivide-failed' };
      });
    }
    if (!this.warrenPath) return { ok: false, reason: 'no-diggings' };
    let warren: MineWarren;
    try {
      warren = await StuffApi.singleton<MineWarren>(this.warrenPath);
    } catch (err) {
      console.error(`ClaimsRegister: warren '${this.warrenPath}' did not resolve`, err);
      return { ok: false, reason: 'warren-unresolvable', facts: { path: this.warrenPath } };
    }
    if (centre === null) return { ok: false, reason: 'no-block' };
    const from: [number, number, number] = [centre[0] - BLOCK_HALF, centre[1] - BLOCK_HALF, centre[2] - BLOCK_HALF_DEPTH];
    const to: [number, number, number] = [centre[0] + BLOCK_HALF, centre[1] + BLOCK_HALF, centre[2] + BLOCK_HALF_DEPTH];
    const existing = warren.overlappingClaim(from, to);
    if (existing) {
      // ⚠ Survey C21: this said "not yours" for your own block.
      const held = await ParcelApi.ownerOf(existing.parcelExtent);
      return { ok: false, reason: 'already-claimed', facts: { yours: yours(held), held: held !== null, surface: null } };
    }
    const mine = warren.getMineExtent();
    const number = warren.getClaimBlocks().length + 1;
    const extent = `${mine}/claims/${number}`;
    return this.instant(async () => {
      const record = await ParcelApi.subdivide(extent, mine, owner, 0, 1, 'industrial');
      if (!record) return { ok: false, reason: 'subdivide-failed' };
      const block: ClaimBlock = { parcelExtent: extent, from, to };
      warren.addClaimBlock(block);
      return { ok: true, facts: { kind: 'block', number } };
    });
  }

  /** A zero-length plan: the recorder writes now, inside the command. */
  protected instant(run: StakePlan['onComplete']): StakePlan {
    return { ok: true, durationMs: 0, effortW: 0, facts: undefined, onComplete: run };
  }

  /** `-4,-8,-2` → a cell, or `null` when the words are not three numbers. */
  protected cellOf(words: string): [number, number, number] | null {
    if (words === '') return null;
    const parts = words.split(',').map((n) => Number(n.trim()));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
    return [parts[0]!, parts[1]!, parts[2]!];
  }

  /**
   * The parent extent a surface working's claim subdivides FROM —
   * everything up to the last path segment. ⚠ Derived rather than authored:
   * a second field could disagree with the first.
   */
  protected parentExtentOf(path: string): string {
    const cut = path.lastIndexOf('/');
    return cut > 0 ? path.slice(0, cut) : path;
  }

  public surfaceWorkingFor(word: string): string | null {
    const want = word.trim().toLowerCase();
    if (want === '') return null;
    for (const entry of this.surfaceWorkings) {
      for (const kw of entry.keywords ?? []) {
        if (typeof kw === 'string' && kw.toLowerCase() === want) return entry.path;
      }
    }
    return null;
  }
}
