/**
 * Block — ⭐ **a mass of stone off a face, and how many pieces are left in
 * it.**
 *
 * What comes off a stone face is too heavy for a body, exactly as a felled
 * trunk is: half a cubic metre of granite is about 1375 kg, so `get block`
 * refuses because of **what it weighs** and never because of a flag.
 * Bigness is emergent from mass — the bole's rule, one trade over.
 *
 * ⭐ It affords its own **`split`**, wherever it lies: a block dragged to a
 * yard one day is still splittable there with no face in the room. Each
 * swing takes one carryable piece off and drops the mass by that much, so
 * the count and the weight move together and cannot disagree.
 *
 * ⚠ `split` and not `dig block` (bad English) and not `quarry block` (a
 * whole verb kept alive to serve one target). The pattern `split` names
 * already had a second member before this build — `fell bole` cross-cuts a
 * trunk a length at a time under a verb meaning *take a tree down* — and a
 * `Stackable` is the third candidate.
 *
 * What composing it claims: a block is a Thing — Tangible, Containable (it
 * can in principle be loaded: the haulage seam), Chattel (it is somebody's)
 * — and nothing else.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type {
  Splittable,
  WorkPrognosis,
  WorkResult,
} from '@saxonberg/server/mud/lib/ground/Workable';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { Chattel } from '@saxonberg/server/mud/lib/chattel/Chattel';
import { Final } from '@saxonberg/server/mud/lib/security/decorators';

/** Cubic metres of stone a block is — what its mass is derived from. */
export const BLOCK_M3 = 0.5;

/** Carryable pieces a block carries. */
export const BLOCK_PIECES = 8;

/** Kilograms one piece takes off the block. */
export const PIECE_MASS_KG = 25;

/** The row a split piece is minted from. */
const PIECE_ROW = '/trade/quarrying/thing/piece';

/** The capability splitting stone wants — a sledge, a pick, a hammer. */
const STRIKING = 'striking';

/** Reference game-ms one split takes at reference hardness. */
const SPLIT_MS = 6_000;

/** Reference hardness (MPa) the pace is normalised at. */
const REFERENCE_MPA = 100;

/** The Discipline splitting stone credits. */
const QUARRYING = 'quarrying';

const BlockBase = DetailedMixin(Thing);

/** *"eight pieces in it yet"* / *"one piece left"* — appended on `look`. */
function piecesAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof Block)) return text;
  const left = host.getPiecesLeft();
  const line =
    left <= 0
      ? 'It is split out — nothing left but rubble.'
      : left === 1
        ? 'One piece left in it.'
        : `${GrammarApi.cap(GrammarApi.inWords(left))} pieces in it yet.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export default class Block extends BlockBase implements Splittable {
  static fieldMeta: FieldMeta = {
    piecesLeft: { persistent: true, authorable: true },
  };

  /** ⭐ The block affords its own splitting, wherever it lies. */
  static commandContributions: CommandContributions = {
    self: ['platform/cmd/ground/split.yaml'],
  };

  static markupAugmenters: MarkupAugmenter[] = [piecesAugmenter];

  /** Carryable pieces still in it. */
  public piecesLeft = BLOCK_PIECES;

  /** The declared shape's marker. */
  public readonly splittable = true as const;

  public getPiecesLeft(): number {
    return this.piecesLeft;
  }

  public setPiecesLeft(value: number): void {
    this.piecesLeft = Math.max(0, Math.floor(Number(value) || 0));
  }

  /**
   * Take one piece off: decrement, drop the mass by a piece's worth, return
   * what is left. Sealed — the count and the mass move together, so a block
   * that says it has two pieces in it weighs what two pieces weigh.
   */
  @Final
  public takePiece(): number {
    if (this.piecesLeft <= 0) return 0;
    this.piecesLeft -= 1;
    const mass = this.getMass().rawValue();
    this.setMass(Quantity.of(Math.max(0, mass - PIECE_MASS_KG), 'kg'));
    return this.piecesLeft;
  }

  // ───────────────────────── the Splittable shape ─────────────────────────

  public async planWork(
    _by: Stuff,
    tool: (Stuff & Tooled) | null,
    _what: string | null,
  ): Promise<WorkPrognosis> {
    if (this.piecesLeft <= 0) {
      return {
        kind: 'refusal',
        reason: 'block-spent',
        prose: 'There is nothing left in it worth splitting — only rubble.',
      };
    }
    // ⭐ The TOOL, named by the thing rather than by the verb: a block wants
    // something to strike and wedge with, and it says so.
    if (tool === null || !tool.hasCapability(STRIKING)) {
      return {
        kind: 'refusal',
        reason: 'no-striker',
        prose:
          'Not with your hands. You want something to strike it with — a sledge, or the back of a pick.',
      };
    }
    const hardness = this.hardnessMPa();
    return {
      kind: 'plan',
      durationMs: Math.max(1_000, Math.round(SPLIT_MS * (hardness / REFERENCE_MPA))),
      cost: 5,
      beginSelf: 'You set the wedge, find the grain, and start working a piece off it.',
      beginPeers: 'Somebody starts splitting a block of stone.',
      token: null,
    };
  }

  public async completeWork(
    by: Stuff,
    _tool: (Stuff & Tooled) | null,
    _token: unknown,
  ): Promise<WorkResult> {
    const left = this.takePiece();
    let piece: Stuff | null = null;
    try {
      piece = await StuffApi.clone<Stuff>(PIECE_ROW);
    } catch {
      // ⚠ A missing row is a content gap, not a reason to lose the work.
      console.error(`Block: piece row '${PIECE_ROW}' did not resolve`);
    }
    if (piece !== null) {
      const material = this.getMaterial();
      if (material !== null && MixinApi.isTangible(piece)) {
        // ⭐ One piece row serves every rock: the block's material is
        // restamped on, so a granite piece is granite.
        piece.setMaterial(material);
      }
      const where = MixinApi.isContainable(this as unknown as Stuff)
        ? (this as unknown as Stuff & Containable).getContainer()
        : null;
      if (where !== null && MixinApi.isContainer(where) && MixinApi.isContainable(piece)) {
        ContainmentApi.move(piece as Stuff & Containable, where as Stuff & Container);
      }
      if (MixinApi.isChattel(piece)) {
        try {
          await (piece as Stuff & Chattel).stampChattel(by);
        } catch {
          /* nobody's stone: honest */
        }
      }
    }
    const tail =
      left <= 0
        ? ' That is the last of it; what is left would not build anything.'
        : '';
    return {
      self:
        piece === null
          ? `A piece comes away.${tail}`
          : `A piece comes away clean — ${piece.getPresentation()}.${tail}`,
      peers: null,
      credit: { discipline: QUARRYING, difficulty: 'easy' },
    };
  }

  /** The stone's hardness, or the reference when the material is silent. */
  private hardnessMPa(): number {
    const material = this.getMaterial();
    if (material === null) return REFERENCE_MPA;
    const h = material.getHardness().rawValue();
    return h > 0 ? h : REFERENCE_MPA;
  }
}
