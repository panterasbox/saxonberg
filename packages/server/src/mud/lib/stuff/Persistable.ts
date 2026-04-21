/**
 * Persistable - Base class for records that save to MongoDB
 *
 * Persistable is intentionally **not** part of the `Stuff` hierarchy.
 * It represents records that exist in MongoDB but do not live in the
 * game filesystem (no path, no zone, no clone pipeline). Its current
 * inhabitants are auth/meta-game records: `User`, `GoogleProfile`.
 *
 * Game-world objects (rooms, doors, props, avatars, NPCs) are Stuff and
 * persist through the clone/hydrate/save-template pipeline instead.
 *
 * Subclasses must declare:
 * - static collectionName: string
 * - static persistentFields: string[]  (fields copied to/from the doc)
 *
 * Example:
 * ```typescript
 * class User extends Persistable {
 *   static collectionName = 'users';
 *   static persistentFields = ['googleProfileId', 'playerIds'];
 *   googleProfileId = '';
 *   playerIds: string[] = [];
 * }
 *
 * await user.save();
 * const found = await User.findById(id);
 * const matches = await User.find({ googleProfileId: 'xyz' });
 * ```
 */

import { PersistenceManager } from '../../../backend/PersistenceManager';
import { MixinApi } from '../../api/mixin';

type Indexable = Record<string, unknown>;

/**
 * Interface for persistable constructors.
 * Ensures subclasses have required static properties.
 */
export interface PersistableConstructor {
  collectionName: string;
  persistentFields?: string[];
  getAllPersistentFields?(): string[];
  new (...args: unknown[]): Persistable;
}

/**
 * Base class for MongoDB-backed records that live outside the Stuff
 * filesystem (auth/meta-game only).
 */
export class Persistable {
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
   */
  protected toDocument(): Record<string, unknown> {
    const doc: Record<string, unknown> = {};
    const self = this as unknown as Indexable;

    if (this._id) doc._id = this._id;

    const fields = this.getAllFields();
    for (const field of fields) {
      if (field in this) doc[field] = self[field];
    }

    doc.createdAt = this.createdAt;
    doc.updatedAt = this.updatedAt;

    return doc;
  }

  /**
   * Load data from a MongoDB document into this object.
   */
  protected fromDocument(doc: Record<string, unknown>): void {
    const self = this as unknown as Indexable;

    if (doc._id) this._id = doc._id as string;

    const fields = this.getAllFields();
    for (const field of fields) {
      if (field in doc) self[field] = doc[field];
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
   * Delete this object from MongoDB.
   */
  public async delete(): Promise<void> {
    if (!this._id) {
      throw new Error(
        `${this.constructor.name}.delete(): Cannot delete unsaved object (no _id)`
      );
    }
    const collection = this.getCollectionName();
    await PersistenceManager.get().delete(collection, this._id);
  }

  /**
   * Find a document by MongoDB _id. Returns null if not found.
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
    const instance = new this() as T;
    instance.fromDocument(doc);
    return instance;
  }

  /**
   * Find documents matching a query.
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
    return docs.map((doc) => {
      const instance = new this() as T;
      instance.fromDocument(doc);
      return instance;
    });
  }

  public toString(): string {
    return `[${this.constructor.name} ${this._id ?? '(unsaved)'}]`;
  }
}
