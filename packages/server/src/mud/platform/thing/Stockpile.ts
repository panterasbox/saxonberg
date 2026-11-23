/**
 * Stockpile — ⭐ the kernel's store twin (storage-and-ice D1): a fixed,
 * OPEN holder whose contents are the faces of a ledger. An icehouse's
 * stack, a depot's floor, a bin of sawdust: goods held as an amount by
 * grade, with the top of each line a real object you can `get` and the
 * stack a thing you can `put` into.
 *
 * `PersistableMixin(StoreMixin(Holder))` — no `PlacingMixin`, because a
 * thing placed `on` a host lives in the room, not in the host; a stack
 * takes things IN. Named for what it IS (a stockpile), never an adjective.
 *
 * Persistence: a kept container, so a stack standing as a prop is keyed by
 * its part name and restores its own record where it is staged
 * (persistence-model D2); the ledger is the record, the faces ride with it
 * as contents, and the authored `initialLines` are laid down only when no
 * record exists.
 */

import Holder from '../../lib/stuff/Holder';
import { StoreMixin } from '../../lib/storage/Store';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { MixinApi } from '../../api/mixin';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { StoreLine } from '../../lib/storage/StoreLine';

const StockpileBase = PersistableMixin(StoreMixin(Holder));

export default class Stockpile extends StockpileBase {
  static fieldMeta: FieldMeta = {};

  /**
   * ⭐ A fresh stack lays its authored seed down (persistence-model D2): a
   * stack standing as a prop is keyed by its part name and restored where
   * the staging walk mints it, so "no record" is the establishing
   * context's answer and this is its seed step — once (`seedFromRow`
   * refuses a store that has lines).
   */
  override async seedBornWith(): Promise<void> {
    await super.seedBornWith();
    const self = this as unknown as Stuff;
    if (MixinApi.isStore(self)) await self.seedFromRow();
  }

  /**
   * ⭐ `look <stack>` describes the ledger in WORDS — fullness against
   * capacity in bands, the packing's wetness — never a number. The face is
   * an ordinary content and shows as one.
   */
  public override getLong(): string {
    const base = super.getLong();
    const words = this.ledgerWords();
    return words ? `${base.trimEnd()}\n${words}` : base;
  }

  private ledgerWords(): string {
    const lines = this.getLines();
    if (lines.length === 0) return 'It stands empty.';
    const stock = lines.filter((l) => l.role === 'stock');
    const packing = lines.filter((l) => l.role === 'packing');
    const parts: string[] = [];
    const stockKg = stock.reduce((n, l) => n + l.amountKg, 0);
    if (stockKg > 0) parts.push(fullnessWords(stockKg, this.getCapacityKg()));
    if (packing.length > 0) parts.push(packingWords(packing));
    return parts.join(' ');
  }
}

function fullnessWords(kg: number, capacityKg: number): string {
  if (!(capacityKg > 0)) return 'The stack stands high.';
  const f = kg / capacityKg;
  if (f > 0.9) return 'The stack is packed to the rafters.';
  if (f > 0.6) return 'The stack stands well over half the house.';
  if (f > 0.4) return 'The stack fills about half the house.';
  if (f > 0.15) return 'The stack is down to a low pile.';
  return 'Only a little is left at the bottom.';
}

function packingWords(packing: StoreLine[]): string {
  const kg = packing.reduce((n, l) => n + l.amountKg, 0);
  const sat =
    kg > 0 ? packing.reduce((n, l) => n + (l.state.saturation ?? 0) * l.amountKg, 0) / kg : 0;
  if (sat >= 0.8) return 'The packing around it is sodden and dark.';
  if (sat >= 0.45) return 'The packing around it is wet through in places.';
  if (sat >= 0.15) return 'The packing around it is damp.';
  return 'It is bedded in dry packing.';
}
