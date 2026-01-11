/**
 * Persistent - Base class for persistent game objects
 *
 * Provides generic CRUD operations for objects that persist to MongoDB.
 * Subclasses must declare:
 * - static collectionName: string
 * - static persistentFields: string[]
 *
 * This eliminates boilerplate - no need to implement save/delete/findById/find
 * in every persistent class.
 *
 * Example:
 * ```typescript
 * class User extends Persistent {
 *   static collectionName = 'users';
 *   static persistentFields = ['googleProfileId'];
 *   // ... properties ...
 * }
 *
 * // Usage:
 * await user.save();
 * await user.delete();
 * const found = await User.findById(id);
 * const results = await User.find({ googleProfileId: 'xyz' });
 * ```
 */

import { Idea } from './Idea';
import { PersistenceManager, Collections } from '../../../backend/PersistenceManager';
import { MixinApi } from '../../api/mixin';

/**
 * Interface for persistent constructors.
 * Ensures subclasses have required static properties.
 */
export interface PersistentConstructor {
  collectionName: string;
  persistentFields?: string[];
  getAllPersistentFields?(): string[];
  new (...args: any[]): Persistent;
}

/**
 * Base class for persistent objects with generic CRUD operations.
 */
export abstract class Persistent extends Idea {
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

  /**
   * Constructor - initializes timestamps.
   */
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
    const constructor = this.constructor as typeof Persistent;
    if (!constructor.collectionName) {
      throw new Error(
        `${constructor.name}.collectionName not defined - must be set in subclass`
      );
    }
    return constructor.collectionName;
  }

  /**
   * Get all persistent fields for this class.
   * Includes mixin fields + class-declared fields.
   */
  protected getAllFields(): string[] {
    const constructor = this.constructor as any;

    // Try static method first (for classes with mixins)
    if (typeof constructor.getAllPersistentFields === 'function') {
      return constructor.getAllPersistentFields();
    }

    // Fallback to MixinApi
    return MixinApi.getAllPersistentFields(constructor);
  }

  /**
   * Convert this object to a plain document for MongoDB.
   * Includes _id, all persistent fields, and timestamps.
   */
  protected toDocument(): Record<string, any> {
    const doc: Record<string, any> = {};

    // Include _id if present
    if (this._id) {
      doc._id = this._id;
    }

    // Include all persistent fields
    const fields = this.getAllFields();
    for (const field of fields) {
      if (field in this) {
        doc[field] = (this as any)[field];
      }
    }

    // Always include timestamps (might not be in persistentFields)
    doc.createdAt = this.createdAt;
    doc.updatedAt = this.updatedAt;

    return doc;
  }

  /**
   * Load data from a MongoDB document into this object.
   */
  protected fromDocument(doc: Record<string, any>): void {
    // Load _id
    if (doc._id) {
      this._id = doc._id;
    }

    // Load all persistent fields
    const fields = this.getAllFields();
    for (const field of fields) {
      if (field in doc) {
        (this as any)[field] = doc[field];
      }
    }

    // Load timestamps
    if (doc.createdAt) this.createdAt = doc.createdAt;
    if (doc.updatedAt) this.updatedAt = doc.updatedAt;
  }

  /**
   * Save this object to MongoDB.
   * Updates updatedAt timestamp automatically.
   */
  public async save(): Promise<void> {
    this.updatedAt = new Date();

    const collection = this.getCollectionName();
    const doc = this.toDocument();

    const savedId = await PersistenceManager.get().save(collection, doc);

    // Update _id if this was a new document
    if (!this._id) {
      this._id = savedId;
    }
  }

  /**
   * Delete this object from MongoDB.
   * Marks as destroyed after deletion.
   */
  public async delete(): Promise<void> {
    if (!this._id) {
      throw new Error(
        `${this.constructor.name}.delete(): Cannot delete unsaved object (no _id)`
      );
    }

    const collection = this.getCollectionName();
    await PersistenceManager.get().delete(collection, this._id);

    // Mark as destroyed (triggers prepareDestroy + unregister)
    this.destroy();
  }

  /**
   * Find a document by MongoDB _id.
   * Returns null if not found.
   */
  public static async findById<T extends Persistent>(
    this: PersistentConstructor & { new (): T },
    id: string
  ): Promise<T | null> {
    if (!this.collectionName) {
      throw new Error(
        `${this.name}.collectionName not defined - must be set in subclass`
      );
    }

    const doc = await PersistenceManager.get().findById(this.collectionName, id);

    if (!doc) {
      return null;
    }

    // Create instance and load data
    const instance = new this();
    instance.fromDocument(doc);

    return instance;
  }

  /**
   * Find documents matching a query.
   * Returns empty array if none found.
   */
  public static async find<T extends Persistent>(
    this: PersistentConstructor & { new (): T },
    query: Record<string, unknown>
  ): Promise<T[]> {
    if (!this.collectionName) {
      throw new Error(
        `${this.name}.collectionName not defined - must be set in subclass`
      );
    }

    const docs = await PersistenceManager.get().find(this.collectionName, query);

    // Create instances and load data
    return docs.map((doc) => {
      const instance = new this();
      instance.fromDocument(doc);
      return instance;
    });
  }

  /**
   * String representation.
   */
  public toString(): string {
    return `[${this.constructor.name} ${this._id || this.stuffId}]`;
  }
}
