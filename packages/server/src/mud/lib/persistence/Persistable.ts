/**
 * Persistable - Top-level branch for records that save to MongoDB.
 *
 * Persistable is its own top-level branch (sibling of Thing /
 * Location / Idea / Agent / Vessel / Shadow) for auth and CMS records.
 * It composes a CRUD surface (`save` / `delete` / `findById` / `find`)
 * directly on Stuff. Concrete subclasses are records — auth/meta data
 * (`User`, `GoogleProfile`) and CMS assets (`Template`). They are
 * Stuff in every other respect: they carry a `stuffId`, register with
 * `StuffApi`, flow through the call-security gate, and are destroyed
 * via `StuffApi.destruct`.
 *
 * Subclasses must declare:
 *   - `static collectionName: string`
 *   - `static persistentFields: string[]`  (fields copied to/from the doc)
 *
 * Construction goes through `StuffApi.create` like any other Stuff:
 *
 * ```typescript
 * class User extends Persistable {
 *   static collectionName = 'users';
 *   static persistentFields = ['googleProfileId', 'playerIds'];
 *   googleProfileId = '';
 *   playerIds: string[] = [];
 * }
 *
 * const user = await StuffApi.create(() => new User());
 * user.googleProfileId = '...';
 * await user.save();
 *
 * const found = await User.findById(id);
 * const matches = await User.find({ googleProfileId: 'xyz' });
 * ```
 *
 * `findById`/`find` route construction through `StuffApi.create`, so
 * loaded instances are registered + proxy-wrapped just like a fresh
 * `await StuffApi.create(() => new User())`. They live in the registry
 * until `instance.delete()` (which cascades to `StuffApi.destruct`) or
 * an explicit `StuffApi.destruct(instance)`.
 */

import { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { MixinApi } from '../../api/mixin';
import type { Marshaller } from './Marshaller';

type Indexable = Record<string, unknown>;

/**
 * Interface for persistable constructors. Used by the static `findById` /
 * `find` `this`-bound generics so the inferred subclass type carries
 * through.
 */
export interface PersistableConstructor {
  collectionName: string;
  persistentFields?: string[];
  getAllPersistentFields?(): string[];
  new (...args: unknown[]): Persistable;
}

/**
 * Top-level base for MongoDB-backed records.
 */
export class Persistable extends Stuff {
  /**
   * MongoDB ObjectId (undefined until saved).
   */
  _id?: string;

  /**
   * Created timestamp (set on first save).
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
    super();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Get collection name for this class.
   * @throws Error if collectionName not defined in subclass
   */
  protected getCollectionName(): string {
    const constructor = this.constructor as typeof Persistable;
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
    const constructor = this.constructor as typeof Persistable & {
      getAllPersistentFields?: () => string[];
    };
    if (typeof constructor.getAllPersistentFields === 'function') {
      return constructor.getAllPersistentFields();
    }
    return MixinApi.getAllPersistentFields(constructor);
  }

  /**
   * Convert this object to a plain document for MongoDB.
   *
   * Marshallers (declared via `static fieldMarshallers` on a mixin
   * or class) intercept their assigned fields: the runtime
   * value-object value is passed through `marshaller.toStored`
   * before being written into the doc. Fields without a marshaller
   * pass through bracket-read unchanged.
   */
  protected toDocument(): Record<string, unknown> {
    const doc: Record<string, unknown> = {};
    const self = this as unknown as Indexable;

    if (this._id) doc._id = this._id;

    const fields = this.getAllFields();
    const marshallerPaths = MixinApi.getAllFieldMarshallers(
      this.constructor as new (...args: unknown[]) => Stuff
    );
    for (const field of fields) {
      if (!(field in this)) continue;
      const value = self[field];
      const path = marshallerPaths[field];
      if (path) {
        const marshaller = StuffApi.findByTemplatePath<
          Marshaller<unknown, unknown>
        >(path);
        if (!marshaller) {
          throw new Error(
            `Persistable.toDocument: marshaller '${path}' for field '${field}' is not registered.`
          );
        }
        doc[field] = marshaller.toStored(value);
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
   * fields' raw values via `fromStored` before bracket-assign hits
   * the runtime setter.
   */
  protected fromDocument(doc: Record<string, unknown>): void {
    const self = this as unknown as Indexable;

    if (doc._id) this._id = doc._id as string;

    const fields = this.getAllFields();
    const marshallerPaths = MixinApi.getAllFieldMarshallers(
      this.constructor as new (...args: unknown[]) => Stuff
    );
    for (const field of fields) {
      if (!(field in doc)) continue;
      const raw = doc[field];
      const path = marshallerPaths[field];
      if (path) {
        const marshaller = StuffApi.findByTemplatePath<
          Marshaller<unknown, unknown>
        >(path);
        if (!marshaller) {
          throw new Error(
            `Persistable.fromDocument: marshaller '${path}' for field '${field}' is not registered.`
          );
        }
        self[field] = marshaller.fromStored(raw);
      } else {
        self[field] = raw;
      }
    }

    if (doc.createdAt) this.createdAt = doc.createdAt as Date;
    if (doc.updatedAt) this.updatedAt = doc.updatedAt as Date;
  }

  /**
   * Save this object to MongoDB. Updates `updatedAt` automatically.
   */
  public async save(): Promise<void> {
    this.updatedAt = new Date();
    const collection = this.getCollectionName();
    const doc = this.toDocument();
    const savedId = await PersistenceManager.get().save(collection, doc);
    if (!this._id) this._id = savedId;
  }

  /**
   * Delete this object from MongoDB and destruct the runtime instance.
   *
   * The cascade to `StuffApi.destruct` matters because Persistables are
   * registered like any other Stuff — leaving a live registered instance
   * after its DB record is gone is a footgun. Subclasses that need to
   * keep the runtime instance alive past the DB delete (rare) should
   * override `delete()` with their own ordering.
   */
  public async delete(): Promise<void> {
    if (!this._id) {
      throw new Error(
        `${this.constructor.name}.delete(): Cannot delete unsaved object (no _id)`
      );
    }
    const collection = this.getCollectionName();
    await PersistenceManager.get().delete(collection, this._id);
    StuffApi.destruct(this);
  }

  /**
   * Find a document by MongoDB _id. Returns null if not found.
   *
   * Construction routes through `StuffApi.create` so the loaded instance
   * is registered + proxy-wrapped — same lifecycle as a fresh
   * `await StuffApi.create(() => new T())`.
   */
  public static async findById<T extends Persistable>(
    this: PersistableConstructor & { new (): T },
    id: string
  ): Promise<T | null> {
    if (!this.collectionName) {
      throw new Error(
        `${this.name}.collectionName not defined - must be set in subclass`
      );
    }
    const doc = await PersistenceManager.get().findById(this.collectionName, id);
    if (!doc) return null;
    const Ctor = this;
    const instance = await StuffApi.create<T>(() => new Ctor() as T);
    instance.fromDocument(doc);
    return instance;
  }

  /**
   * Find documents matching a query. Same construction story as findById.
   */
  public static async find<T extends Persistable>(
    this: PersistableConstructor & { new (): T },
    query: Record<string, unknown>
  ): Promise<T[]> {
    if (!this.collectionName) {
      throw new Error(
        `${this.name}.collectionName not defined - must be set in subclass`
      );
    }
    const docs = await PersistenceManager.get().find(this.collectionName, query);
    const Ctor = this;
    const instances = await Promise.all(
      docs.map((doc) =>
        StuffApi.create<T>(() => new Ctor() as T).then((instance) => {
          instance.fromDocument(doc);
          return instance;
        })
      )
    );
    return instances;
  }

  public toString(): string {
    return `[${this.constructor.name} ${this._id ?? '(unsaved)'}]`;
  }
}

Stuff._registerTopLevelBranch(Persistable);
