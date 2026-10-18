/**
 * StoreBook — the house's book, standing on the platform beside the
 * counter: the instrument `deposit` and `withdraw` are done with
 * (storage-and-ice D6). See {@link StoreBookMixin}.
 *
 * Affords the `store` verb to whoever shares its room (`peers`) and to
 * whoever holds it (`environment`).
 */

import Thing from './Thing';
import { StoreBookMixin } from '../../lib/storage/StoreBook';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';
import type { StoreReceipt } from '../../lib/storage/Receipt';

const CUSTODY_VIEWS = ['platform/cmd/custody/store.yaml'];

export default class StoreBook extends StoreBookMixin(Thing) {
  static fieldMeta: FieldMeta = {};

  static commandContributions: CommandContributions = {
    peers: CUSTODY_VIEWS,
    environment: CUSTODY_VIEWS,
  };

  /** ⭐ `look book`: the outstanding claims, by line, as last read. */
  public override getLongDescription(): string {
    const base = super.getLongDescription();
    const store = this.getStore();
    if (store === null) return base;
    const claims = store.cachedClaims();
    const body = claims.length === 0 ? 'Nothing is owed to anyone.' : claimLines(claims);
    return `${base.trimEnd()}\n${body}`;
  }
}

function claimLines(claims: StoreReceipt[]): string {
  const byLine = new Map<string, StoreReceipt[]>();
  for (const c of claims) {
    const list = byLine.get(c.poolKey) ?? [];
    list.push(c);
    byLine.set(c.poolKey, list);
  }
  const out: string[] = [];
  for (const [key, list] of byLine) {
    const label = key.startsWith('live:') ? (list[0]?.what ?? 'goods held') : key.replace('|', ', ');
    const entries = list.map((c) => {
      const who = c.depositor === c.bailee ? 'the house' : (c.depositor.split('/').pop() ?? c.depositor);
      return c.unit === 'count' ? `${who}` : `${who} ${Math.round(c.amountKg)} kg`;
    });
    out.push(`${label}: ${entries.join('; ')}.`);
  }
  return out.join('\n');
}
