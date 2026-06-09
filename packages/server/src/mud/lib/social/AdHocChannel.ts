/**
 * AdHocChannel — runtime-only identity-like type for an ephemeral
 * conversation channel.
 *
 * Created on first multi-target `dm` invocation; lives in the
 * `ChannelCatalogue`'s `byHandle` map until disbanded or promoted
 * to a persistent `Channel` Document. Distinct from `Channel` (which
 * is `Document`-backed and value-like, returning a fresh instance per
 * `findById`); the type-level distinction makes the lifetime
 * difference visible.
 *
 * Subscription state for ad-hoc channels is ephemeral — it dies with
 * the channel. (Persistent channels store subscriptions on the
 * Avatar's PropertiedMixin per the design.)
 */

import { nanoid } from 'nanoid';
import type { Stuff } from '../stuff/Stuff';

export class AdHocChannel {
  /** Short generated handle — used as the channel id in wire frames. */
  readonly handle: string;
  /** Live Avatar references of current members. */
  readonly members: Set<Stuff>;
  /** Player reference of the creator. */
  readonly createdBy: string;
  /** ms-since-epoch creation time. Useful for sort / pruning. */
  readonly createdAt: number;

  constructor(args: {
    handle?: string;
    members: Iterable<Stuff>;
    createdBy: string;
  }) {
    this.handle = args.handle ?? AdHocChannel.generateHandle();
    this.members = new Set(args.members);
    this.createdBy = args.createdBy;
    this.createdAt = Date.now();
  }

  /**
   * Short URL-safe handle. Length 6 picks a nanoid-ish identifier
   * that fits inline in a chat prose ("invited Bobalu, Jane to
   * conversation [pXkJh2]"). 6 chars of nanoid alphabet ≈ 6e10
   * combinations — comfortable for ephemeral lifetimes.
   */
  static generateHandle(): string {
    return nanoid(6);
  }
}
