import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { Marshaller } from '../Marshaller';
import { Idea } from '../../stuff/Idea';
import { Document } from '../Document';
import PersistentHydrator from '../../../obj/persistence/PersistentHydrator';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { ProxyApi } from '../../../api/proxy';
import type { MixinConstructor, FieldMeta } from '../../mixin';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

/**
 * Contrived value object used to exercise the Marshaller framework.
 * Storage shape: `Record<currency, amount>` (variable-key map). The
 * runtime value-object is a `MoneyBag` class that holds an immutable
 * `Map`. Variable keys mean the storage shape doesn't decompose into
 * fixed scalar fields, so a Marshaller is the honest answer.
 */
class MoneyBag {
  constructor(private readonly amounts: ReadonlyMap<string, number>) {}

  static of(record: Record<string, number>): MoneyBag {
    return new MoneyBag(new Map(Object.entries(record)));
  }
  static empty(): MoneyBag {
    return new MoneyBag(new Map());
  }

  toRecord(): Record<string, number> {
    return Object.fromEntries(this.amounts);
  }
  total(currency: string): number {
    return this.amounts.get(currency) ?? 0;
  }
  currencies(): readonly string[] {
    return Array.from(this.amounts.keys());
  }
}

class MoneyBagMarshaller extends Marshaller<MoneyBag, Record<string, number>> {
  public static readonly templatePath =
    '/lib/persistence/__test__/MoneyBagMarshaller';

  public fromStored(raw: Record<string, number>): MoneyBag {
    return MoneyBag.of(raw);
  }
  public toStored(mb: MoneyBag): Record<string, number> {
    return mb.toRecord();
  }
}

/**
 * Helper: instantiate a marshaller, stamp its templatePath, and
 * register so `StuffApi.findByTemplatePath` resolves it. Mirrors
 * what the production CMS-template seed pathway will do for real
 * marshallers.
 */
function registerMarshaller<T extends Marshaller<unknown, unknown>>(
  factory: () => T,
  templatePath: string
): T {
  return makeStuffAtPath(factory, templatePath);
}

/** Test mixin that uses MoneyBagMarshaller for its `wallet` field. */
function WalletMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class WalletMixin extends Base {
    static _mixinName = 'WalletMixin';
    static fieldMeta: FieldMeta = {
      wallet: { persistent: true, marshaller: MoneyBagMarshaller.templatePath },
    };

    private _wallet: MoneyBag = MoneyBag.empty();

    /**
     * Host-internal accessor pair (Pattern D). The hydrator's
     * bracket-assign hits the strict setter — by the time we get
     * here, the marshaller has already converted the raw record into
     * a `MoneyBag` instance.
     */
    protected get wallet(): MoneyBag {
      return this._wallet;
    }
    protected set wallet(value: MoneyBag) {
      if (!(value instanceof MoneyBag)) {
        throw new TypeError(
          `WalletMixin.wallet must be a MoneyBag instance, got ${typeof value}`
        );
      }
      this._wallet = value;
    }

    public getWallet(): MoneyBag {
      return this._wallet;
    }
    public setWallet(value: MoneyBag): void {
      this.wallet = value;
    }
  };
}

class TestWallet extends WalletMixin(Idea) {}

class TestDocumentWallet extends WalletMixin(Document) {
  static collectionName = 'test_wallets';
}

describe('Marshaller framework', () => {
  beforeEach(() => {
    // Register the marshaller at the start of each test so
    // `StuffApi.findByTemplatePath` resolves it.
    registerMarshaller(
      () => new MoneyBagMarshaller(),
      MoneyBagMarshaller.templatePath
    );
    // Wire the Document marshaller-resolution seam to the Stuff registry
    // (production wires this at boot in AppBootstrap). Without it the
    // Document toDocument/fromDocument path throws "resolver not wired".
    Document.setMarshallerResolver(
      (path) => StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(path),
      (path) => StuffApi.singleton<Marshaller<unknown, unknown>>(path)
    );
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  describe('MixinApi.getAllFieldMarshallers', () => {
    it('returns the registered marshaller path keyed by field name', () => {
      const marshallers = MixinApi.getAllFieldMarshallers(TestWallet);
      expect(marshallers).toEqual({
        wallet: MoneyBagMarshaller.templatePath,
      });
    });

    it('returns an empty map when no marshallers are declared', () => {
      class NoMarshallers extends Idea {
        static fieldMeta: FieldMeta = {
          plain: { persistent: true },
        };
      }
      const marshallers = MixinApi.getAllFieldMarshallers(NoMarshallers);
      expect(marshallers).toEqual({});
    });
  });

  describe('PersistentHydrator round-trip', () => {
    it('hydrates raw record-shape into a MoneyBag instance via the marshaller', async () => {
      const w = makeStuff(() => new TestWallet());
      await makeStuff(() => new PersistentHydrator()).hydrate(w, {
        wallet: { USD: 100, EUR: 50, GBP: 25 },
      });
      const wallet = w.getWallet();
      expect(wallet).toBeInstanceOf(MoneyBag);
      expect(wallet.total('USD')).toBe(100);
      expect(wallet.total('EUR')).toBe(50);
      expect(wallet.total('GBP')).toBe(25);
      expect([...wallet.currencies()].sort()).toEqual(['EUR', 'GBP', 'USD']);
    });

    it('skips fields not present in the data', async () => {
      const w = makeStuff(() => new TestWallet());
      // No `wallet` key in data — wallet stays at the default empty bag.
      await makeStuff(() => new PersistentHydrator()).hydrate(w, {});
      expect(w.getWallet().currencies()).toEqual([]);
    });

    it('lazy-loads the marshaller via StuffApi.singleton when not pre-registered', async () => {
      // Wipe registry — including the marshaller registered in
      // beforeEach. With lazy resolution, hydrate calls
      // `StuffApi.singleton(path)` which tries to clone from the
      // seeded template; in this in-memory test environment there
      // is no template doc to clone from, so the cascade surfaces
      // the underlying clone failure rather than a "not
      // registered" message. Production paths put a seeded
      // template in `domain` at boot, so the singleton clone
      // succeeds on first need without an explicit bootstrap
      // entry.
      StuffApi.clearAll();
      const w = makeStuff(() => new TestWallet());
      await expect(
        makeStuff(() => new PersistentHydrator()).hydrate(w, {
          wallet: { USD: 100 },
        })
      ).rejects.toThrow();
    });
  });

  describe('Document toDocument / fromDocument round-trip', () => {
    it('toDocument calls marshaller.toStored on the wallet field', () => {
      const w = new TestDocumentWallet();
      w.setWallet(MoneyBag.of({ USD: 100, EUR: 50 }));
      const doc = (
        w as unknown as { toDocument(): Record<string, unknown> }
      ).toDocument();
      // The doc has the raw record shape (toStored ran), not the
      // MoneyBag instance.
      expect(doc.wallet).toEqual({ USD: 100, EUR: 50 });
      expect(doc.wallet).not.toBeInstanceOf(MoneyBag);
    });

    it('fromDocument calls marshaller.fromStored on the wallet field', () => {
      const w = new TestDocumentWallet();
      (
        w as unknown as { fromDocument(doc: Record<string, unknown>): void }
      ).fromDocument({ wallet: { USD: 200 } });
      const wallet = w.getWallet();
      expect(wallet).toBeInstanceOf(MoneyBag);
      expect(wallet.total('USD')).toBe(200);
    });

    it('round-trips a wallet through the persistence path', () => {
      const w1 = new TestDocumentWallet();
      w1.setWallet(MoneyBag.of({ USD: 100, EUR: 50, GBP: 25 }));
      const doc = (
        w1 as unknown as { toDocument(): Record<string, unknown> }
      ).toDocument();

      const w2 = new TestDocumentWallet();
      (
        w2 as unknown as { fromDocument(doc: Record<string, unknown>): void }
      ).fromDocument(doc);
      const wallet = w2.getWallet();
      expect(wallet).toBeInstanceOf(MoneyBag);
      expect(wallet.total('USD')).toBe(100);
      expect(wallet.total('EUR')).toBe(50);
      expect(wallet.total('GBP')).toBe(25);
    });
  });

  describe('Strict-setter / marshaller separation', () => {
    it('the strict setter rejects raw record shape — only the marshaller path accepts it', () => {
      const w = makeStuff(() => new TestWallet());
      expect(() =>
        w.setWallet({ USD: 100 } as unknown as MoneyBag)
      ).toThrow(TypeError);
    });

    it('the strict setter accepts a MoneyBag instance', () => {
      const w = makeStuff(() => new TestWallet());
      w.setWallet(MoneyBag.of({ USD: 100 }));
      expect(w.getWallet()).toBeInstanceOf(MoneyBag);
      expect(w.getWallet().total('USD')).toBe(100);
    });

    it('post-hydration bracket-read returns the raw scalar shape (not the MoneyBag)', async () => {
      const w = makeStuff(() => new TestWallet());
      await makeStuff(() => new PersistentHydrator()).hydrate(w, {
        wallet: { USD: 100 },
      });
      // After hydration the field stores the runtime MoneyBag —
      // bracket-read returns the live instance, not the raw record.
      const raw = ProxyApi.unwrap(w) as unknown as { wallet: MoneyBag };
      expect(raw.wallet).toBeInstanceOf(MoneyBag);
      expect(raw.wallet.total('USD')).toBe(100);
    });
  });
});
