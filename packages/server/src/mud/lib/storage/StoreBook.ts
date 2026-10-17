/**
 * StoreBookMixin — ⭐ **the house's book: the instrument custody is done
 * with** (storage-and-ice D6). A store's receipts are documents; the book
 * is the THING in the room that affords `deposit` and `withdraw` and names
 * the store it keeps. The verb goes on the instrument that performs the
 * act — never on the keeper, never on the room.
 *
 * `look book` reads the outstanding claims by line, as last read from the
 * store (the store refreshes it on every custody act and reconcile). The
 * keeper compares a stocktake with the book by eye; the engine prints no
 * verdict.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Store } from './Store';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';

export interface StoreBook {
  /** The store this book keeps (its template path). */
  getStorePath(): string;
  /** The live store, or `null` when it is not standing. */
  getStore(): (Stuff & Store) | null;
}

export function StoreBookMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class StoreBookMixin extends Base implements StoreBook {
    static _mixinName: string = 'StoreBookMixin';

    static fieldMeta: FieldMeta = {
      storePath: { persistent: true, authorable: true, authorPicker: 'Template' },
    };

    /** The store this book keeps. */
    public storePath = '';

    public getStorePath(): string {
      return this.storePath;
    }

    public getStore(): (Stuff & Store) | null {
      if (!this.storePath) return null;
      const s = StuffApi.findByTemplatePath<Stuff>(this.storePath);
      return s && MixinApi.isStore(s) ? s : null;
    }
  };
}
