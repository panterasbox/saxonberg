/**
 * Document - base for plain MongoDB-backed records (NOT Stuff).
 *
 * A Document is *persisted state*: the row IS the thing. Unlike the Stuff
 * hierarchy it carries no call-security proxy, no `StuffApi` registry
 * membership, no security gate, and no create/destroy lifecycle. A loaded
 * Document is a plain object you read and drop — it is **value-like** (two
 * `findById` calls return distinct instances), in contrast to Stuff's
 * **identity-like** registry-deduped instances.
 *
 * Live game-world entities stay Stuff and are *hydrated from* a Document
 * (data in, entity out); a Stuff is never itself a row. Document is for
 * everything that only needs to persist: auth/meta records (`User`,
 * `GoogleProfile`) and CMS assets (`Template`).
 *
 * Subclasses must declare:
 *   - `static collectionName` — always a {@link Collections} member,
 *     never a string literal. `pnpm lint:schema` enforces it: a literal
 *     names a collection the vocabulary cannot see, and the collection
 *     it names then has no schema doc, no index, and no help topic.
 *     (Test fixtures under `__tests__` are the one exemption; they name
 *     collections that are deliberately outside the vocabulary.)
 *   - `static fieldMeta: FieldMeta` — the fields copied to/from the doc
 *     are its `{ persistent: true }` entries. Also what the collection's
 *     help topic harvests its field list from, so this is the only place
 *     that list is written down.
 *
 * Every collection also has an authored doc at
 * `packages/server/src/schema/<collection>.yaml` — see
 * docs/subsystems/persistence.md § Collections.
 *
 * Construction is a plain `new T()` — no `StuffApi.create`:
 *
 * ```typescript
 * class User extends Document {
 *   static collectionName = Collections.Users;
 *   static fieldMeta: FieldMeta = {
 *     googleProfileId: { persistent: true },
 *     playerIds: { persistent: true },
 *   };
 *   googleProfileId = '';
 *   playerIds: string[] = [];
 * }
 *
 * const user = new User();
 * user.googleProfileId = '...';
 * await user.save();
 *
 * const found = await User.findById(id);
 * const matches = await User.find({ googleProfileId: 'xyz' });
 * ```
 *
 * Marshaller resolution (for the rare marshalled field) is provided via an
 * injected seam — see {@link Document.setMarshallerResolver} — so the
 * persistence core stays free of any `StuffApi` import. Marshallers remain
 * Idea-rooted Stuff (for HMR) and are reached through the injected resolver.
 */

import { PersistApi } from '../../api/persist';
import { MixinApi, type AnyConstructor } from '../../api/mixin';

type Indexable = Record<string, unknown>;

/**
 * Structural shape of a marshaller, kept Stuff-independent so `Document`
 * never imports the Idea-rooted `Marshaller` class.
 */
export interface MarshallerLike {
  toStored(value: unknown): unknown;
  fromStored(stored: unknown): unknown;
}

type SyncMarshallerResolver = (path: string) => MarshallerLike | undefined;
type AsyncMarshallerResolver = (path: string) => Promise<unknown>;

let resolveMarshaller: SyncMarshallerResolver = () => {
  throw new Error(
    'Document: marshaller resolver not wired (call Document.setMarshallerResolver at boot)'
  );
};
let preloadMarshaller: AsyncMarshallerResolver = () => {
  throw new Error(
    'Document: marshaller resolver not wired (call Document.setMarshallerResolver at boot)'
  );
};

/**
 * Interface for Document constructors. Used by the static `findById` /
 * `find` `this`-bound generics so the inferred subclass type carries
 * through.
 */
export interface DocumentConstructor {
  collectionName: string;
  // No `persistentFields` here: the field list is read through
  // `MixinApi.getAllPersistentFields` (see `persistentFieldsFor` below),
  // which now derives it from `static fieldMeta`. The old member was
  // already dead — nothing consulted it.
  getAllPersistentFields?(): string[];
  new (...args: unknown[]): Document;
}

/**
 * Base for MongoDB-backed records. NOT in the Stuff hierarchy.
 */
export class Document {
  /**
   * MongoDB ObjectId (undefined until saved).
   */
  _id?: string;

  /**
   * Created timestamp (set on construction).
   */
  createdAt: Date;

  /**
   * Last updated timestamp (set on every save).
   */
  updatedAt: Date;

  /**
   * Collection name (must be overridden in subclass).
   */
  static collectionName: string;

  constructor() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Get collection name for this class.
   * @throws Error if collectionName not defined in subclass
   */
  protected getCollectionName(): string {
    const constructor = this.constructor as typeof Document;
    if (!constructor.collectionName) {
      throw new Error(
        `${constructor.name}.collectionName not defined - must be set in subclass`
      );
    }
    return constructor.collectionName;
  }

  /**
   * Get all persistent fields for this class (mixin + own declarations).
   */
  protected getAllFields(): string[] {
    const constructor = this.constructor as typeof Document & {
      getAllPersistentFields?: () => string[];
    };
    if (typeof constructor.getAllPersistentFields === 'function') {
      return constructor.getAllPersistentFields();
    }
    return MixinApi.getAllPersistentFields(constructor as AnyConstructor);
  }

  /**
   * Convert this object to a plain document for MongoDB.
   *
   * Marshallers (declared as a `marshaller` entry in `fieldMeta` on a mixin or
   * class) intercept their assigned fields: the runtime value-object
   * value is passed through `marshaller.toStored` before being written
   * into the doc. Fields without a marshaller pass through bracket-read
   * unchanged.
   */
  protected toDocument(): Record<string, unknown> {
    const doc: Record<string, unknown> = {};
    const self = this as unknown as Indexable;

    if (this._id) doc._id = this._id;

    const fields = this.getAllFields();
    const marshallerPaths = MixinApi.getAllFieldMarshallers(
      this.constructor as AnyConstructor
    );
    for (const field of fields) {
      if (!(field in this)) continue;
      const value = self[field];
      const path = marshallerPaths[field];
      // An absent value has nothing to marshal — a null/undefined field
      // stores as null and rehydrates as null (see `fromDocument`). Every
      // marshaller speaks a value-object contract (`toStored` takes an
      // instance), so handing it a null would throw; the alternative is
      // every marshaller growing its own null branch. This is what makes
      // an OPTIONAL marshalled field (`ParcelRecord.area`) expressible.
      if (path && value !== null && value !== undefined) {
        const marshaller = resolveMarshaller(path);
        if (!marshaller) {
          throw new Error(
            `Document.toDocument: marshaller '${path}' for field '${field}' is not registered.`
          );
        }
        doc[field] = marshaller.toStored(value);
      } else if (path) {
        doc[field] = null;
      } else {
        doc[field] = value;
      }
    }

    doc.createdAt = this.createdAt;
    doc.updatedAt = this.updatedAt;

    return doc;
  }

  /**
   * Load data from a MongoDB document into this object.
   *
   * Symmetric to `toDocument`: marshallers transform their assigned
   * fields' raw values via `fromStored` before bracket-assign hits the
   * runtime setter.
   */
  protected fromDocument(doc: Record<string, unknown>): void {
    const self = this as unknown as Indexable;

    if (doc._id) this._id = doc._id as string;

    const fields = this.getAllFields();
    const marshallerPaths = MixinApi.getAllFieldMarshallers(
      this.constructor as AnyConstructor
    );
    for (const field of fields) {
      if (!(field in doc)) continue;
      const raw = doc[field];
      const path = marshallerPaths[field];
      // Symmetric with `toDocument`: a stored null rehydrates as null
      // rather than being handed to a marshaller that expects a value.
      if (path && raw !== null && raw !== undefined) {
        const marshaller = resolveMarshaller(path);
        if (!marshaller) {
          throw new Error(
            `Document.fromDocument: marshaller '${path}' for field '${field}' is not registered.`
          );
        }
        self[field] = marshaller.fromStored(raw);
      } else if (path) {
        self[field] = null;
      } else {
        self[field] = raw;
      }
    }

    if (doc.createdAt) this.createdAt = doc.createdAt as Date;
    if (doc.updatedAt) this.updatedAt = doc.updatedAt as Date;
  }

  /**
   * Save this object to MongoDB. Updates `updatedAt` automatically.
   *
   * Pre-resolves any registered field marshallers via the async resolver
   * before the sync `toDocument` walk; the sync resolver lookup inside
   * `toDocument` then always hits a populated cache.
   */
  public async save(): Promise<void> {
    this.updatedAt = new Date();
    await this.preloadFieldMarshallers();
    const collection = this.getCollectionName();
    const doc = this.toDocument();
    const savedId = await PersistApi.save(collection, doc);
    if (!this._id) this._id = savedId;
  }

  /**
   * Pre-warm the marshaller cache for this instance's class via the async
   * resolver. Static counterpart {@link Document.preloadFieldMarshallersFor} is used
   * by the `findById` / `find` paths.
   */
  protected async preloadFieldMarshallers(): Promise<void> {
    const paths = Object.values(
      MixinApi.getAllFieldMarshallers(this.constructor as AnyConstructor)
    );
    if (paths.length === 0) return;
    await Promise.all(paths.map((p) => preloadMarshaller(p)));
  }

  /**
   * Delete this object from MongoDB.
   *
   * Unlike the former `Persistable.delete`, there is no
   * `StuffApi.destruct` cascade — a Document is not registered, so there
   * is no runtime instance to unregister.
   */
  public async delete(): Promise<void> {
    if (!this._id) {
      throw new Error(
        `${this.constructor.name}.delete(): Cannot delete unsaved object (no _id)`
      );
    }
    const collection = this.getCollectionName();
    await PersistApi.delete(collection, this._id);
  }

  /**
   * Find a document by MongoDB _id. Returns null if not found.
   *
   * Construction is a plain `new this()` — the returned instance is NOT
   * registered with `StuffApi` and is NOT proxy-wrapped. Two calls for the
   * same id return two distinct instances (value semantics).
   */
  public static async findById<T extends Document>(
    this: DocumentConstructor & { new (): T },
    id: string
  ): Promise<T | null> {
    if (!this.collectionName) {
      throw new Error(
        `${this.name}.collectionName not defined - must be set in subclass`
      );
    }
    const doc = await PersistApi.findById(this.collectionName, id);
    if (!doc) return null;
    await Document.preloadFieldMarshallersFor(this as AnyConstructor);
    const instance = new this() as T;
    instance.fromDocument(doc);
    return instance;
  }

  /**
   * Find documents matching a query. Same construction story as findById.
   */
  public static async find<T extends Document>(
    this: DocumentConstructor & { new (): T },
    query: Record<string, unknown>
  ): Promise<T[]> {
    if (!this.collectionName) {
      throw new Error(
        `${this.name}.collectionName not defined - must be set in subclass`
      );
    }
    const docs = await PersistApi.find(this.collectionName, query);
    await Document.preloadFieldMarshallersFor(this as AnyConstructor);
    return docs.map((doc) => {
      const instance = new this() as T;
      instance.fromDocument(doc);
      return instance;
    });
  }

  /**
   * Wire the marshaller-resolution seam once at boot (and in tests).
   * Keeps `Document` free of a `StuffApi` import while still reaching
   * the Idea-rooted marshaller instances. `sync` mirrors
   * `StuffApi.findByTemplatePath` (returns the registered instance or
   * `undefined`); `async` mirrors `StuffApi.singleton` (resolves /
   * lazy-clones the instance, warming the cache `sync` then hits).
   */
  public static setMarshallerResolver(
    sync: SyncMarshallerResolver,
    async: AsyncMarshallerResolver
  ): void {
    resolveMarshaller = sync;
    preloadMarshaller = async;
  }

  /**
   * Static-context preload helper. Used by `findById` / `find` where
   * there's no instance to call `preloadFieldMarshallers` on yet, and
   * by `Template._materialize` for the same reason. Symmetric with the
   * protected instance method.
   */
  public static async preloadFieldMarshallersFor(
    ctor: AnyConstructor
  ): Promise<void> {
    const paths = Object.values(MixinApi.getAllFieldMarshallers(ctor));
    if (paths.length === 0) return;
    await Promise.all(paths.map((p) => preloadMarshaller(p)));
  }

  public toString(): string {
    return `[${this.constructor.name} ${this._id ?? '(unsaved)'}]`;
  }
}