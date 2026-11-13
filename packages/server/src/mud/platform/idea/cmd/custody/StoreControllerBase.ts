/**
 * StoreControllerBase — what the `store` subcommands share (storage-and-ice
 * D6; one noun since the review, the `bank` precedent): the book the
 * binder bound, or the one that afforded the verb, and the store behind
 * it. Bare `store` and `store receipts` list your receipts here
 * (`StoreReceiptsController`); `store deposit <thing>`
 * (`StoreDepositController`) and `store withdraw [<n>] <good>`
 * (`StoreWithdrawController`) are the two entries a keeper writes.
 *
 * ⚠ Dumb by design: each resolves the book, hands the act to the store —
 * which owns the whole sequence (reconcile, the keeper, the veto, absorb,
 * the receipt; the payout rule, the fee, the hand-over) — and renders what
 * came back. Refusals are the store's, in its words.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Store } from '../../../../lib/storage/Store';
import { MixinApi } from '../../../../api/mixin';

export const TOPIC = 'act.deed';

export interface StoreModel extends CommandModel {
  subcommand?: string;
  book?: MqlOneResult;
  thing?: MqlOneResult;
  what?: string;
}

export type StoreStuff = Stuff & Store;

export abstract class StoreControllerBase extends CommandController<StoreModel> {
  /** The store behind the bound book (or the affording one), or a `no-book` refusal. */
  protected storeFor(model: StoreModel, context: CommandContext): StoreStuff | null {
    const book = (model.book?.stuff ?? null) as Stuff | null ?? this.bookHere(context);
    const store = book && MixinApi.isStoreBook(book) ? (book.getStore() as StoreStuff | null) : null;
    if (store === null) {
      this.refuse(context, TOPIC, 'There is no book here to keep anything against.', 'no-book');
    }
    return store;
  }

  /**
   * Bare `store` binds no book: the book that AFFORDED the verb — it confers
   * `store` on whoever shares its room — is the one meant (bare `bank`'s rule).
   */
  private bookHere(context: CommandContext): Stuff | null {
    const source = context.commandSource as Stuff | undefined;
    return source && MixinApi.isStoreBook(source) ? source : null;
  }

  protected static round1(n: number): number {
    return Math.round(n * 10) / 10;
  }
}
