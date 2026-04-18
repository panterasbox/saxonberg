/**
 * PersistenceManager - MongoDB singleton
 *
 * Responsibilities:
 * - MongoDB connection management
 * - CRUD operations (save, findById, find, delete)
 * - Collection management
 * - Error handling and retry logic
 * - Connection pooling
 *
 * This is a singleton - only one instance exists per application.
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

/**
 * MongoDB collections enum.
 */
export enum Collections {
  Users = 'users',
  Players = 'players',
  CharacterSheets = 'character_sheets',
  GoogleProfiles = 'google_profiles',
  Domain = 'domain',
}

/**
 * PersistenceManager - Singleton for MongoDB operations.
 */
export class PersistenceManager {
  private static instance: PersistenceManager;

  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionUri: string = '';
  private databaseName: string = 'saxonberg';

  /**
   * Private constructor (singleton pattern).
   */
  private constructor() {}

  /**
   * Get the singleton instance.
   */
  public static get(): PersistenceManager {
    if (!this.instance) {
      this.instance = new PersistenceManager();
    }
    return this.instance;
  }

  /**
   * Connect to MongoDB.
   *
   * @param uri - MongoDB connection URI (from env var MONGODB_URI)
   * @param dbName - Database name (default: 'saxonberg')
   */
  public async connect(uri: string, dbName: string = 'saxonberg'): Promise<void> {
    if (this.client) {
      console.warn('PersistenceManager: Already connected to MongoDB');
      return;
    }

    try {
      this.connectionUri = uri;
      this.databaseName = dbName;

      console.log('PersistenceManager: Connecting to MongoDB...');

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      await this.client.connect();

      this.db = this.client.db(dbName);

      console.log(`PersistenceManager: Connected to MongoDB database '${dbName}'`);

      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('PersistenceManager: Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB.
   */
  public async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('PersistenceManager: Disconnected from MongoDB');
    } catch (error) {
      console.error('PersistenceManager: Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get a MongoDB collection.
   *
   * @param collectionName - Name of the collection
   * @returns MongoDB Collection instance
   */
  public getCollection(collectionName: string): Collection {
    if (!this.db) {
      throw new Error('PersistenceManager: Not connected to MongoDB');
    }

    return this.db.collection(collectionName);
  }

  /**
   * Save a document (insert or update).
   * If document has _id, updates it; otherwise inserts new document.
   *
   * @param collectionName - Collection name
   * @param document - Document to save
   * @returns MongoDB _id (as string)
   */
  public async save(collectionName: string, document: any): Promise<string> {
    const collection = this.getCollection(collectionName);

    try {
      if (document._id) {
        // Update existing document
        const id = typeof document._id === 'string'
          ? new ObjectId(document._id)
          : document._id;

        const { _id, ...updateDoc } = document;

        await collection.updateOne(
          { _id: id },
          { $set: updateDoc }
        );

        return document._id;
      } else {
        // Insert new document
        const result = await collection.insertOne(document);
        return result.insertedId.toString();
      }
    } catch (error) {
      console.error(`PersistenceManager: Error saving document to ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find a document by MongoDB _id.
   *
   * @param collectionName - Collection name
   * @param id - MongoDB _id (string or ObjectId)
   * @returns Document or null if not found
   */
  public async findById(collectionName: string, id: string): Promise<any | null> {
    const collection = this.getCollection(collectionName);

    try {
      const objectId = new ObjectId(id);
      const doc = await collection.findOne({ _id: objectId });

      if (doc) {
        // Convert _id to string for consistency
        return {
          ...doc,
          _id: doc._id.toString(),
        };
      }

      return null;
    } catch (error) {
      console.error(`PersistenceManager: Error finding document by id in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find documents matching a query.
   *
   * @param collectionName - Collection name
   * @param query - MongoDB query object
   * @returns Array of matching documents
   */
  public async find(
    collectionName: string,
    query: Record<string, unknown>
  ): Promise<any[]> {
    const collection = this.getCollection(collectionName);

    try {
      const docs = await collection.find(query).toArray();

      // Convert _id to string for each document
      return docs.map((doc) => ({
        ...doc,
        _id: doc._id.toString(),
      }));
    } catch (error) {
      console.error(`PersistenceManager: Error finding documents in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document by MongoDB _id.
   *
   * @param collectionName - Collection name
   * @param id - MongoDB _id (string or ObjectId)
   */
  public async delete(collectionName: string, id: string): Promise<void> {
    const collection = this.getCollection(collectionName);

    try {
      const objectId = new ObjectId(id);
      await collection.deleteOne({ _id: objectId });
    } catch (error) {
      console.error(`PersistenceManager: Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create indexes for collections.
   * Called during connection setup.
   */
  private async createIndexes(): Promise<void> {
    try {
      // Google Profiles: unique index on googleId
      await this.getCollection(Collections.GoogleProfiles).createIndex(
        { googleId: 1 },
        { unique: true }
      );

      // Google Profiles: index on email
      await this.getCollection(Collections.GoogleProfiles).createIndex(
        { email: 1 }
      );

      // Users: index on googleProfileId
      await this.getCollection(Collections.Users).createIndex(
        { googleProfileId: 1 }
      );

      // Players: index on userId
      await this.getCollection(Collections.Players).createIndex(
        { userId: 1 }
      );

      console.log('PersistenceManager: Indexes created successfully');
    } catch (error) {
      console.error('PersistenceManager: Error creating indexes:', error);
      // Don't throw - indexes are optional for basic functionality
    }
  }

  /**
   * Check if connected to MongoDB.
   */
  public isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  /**
   * Get the database instance (for advanced operations).
   */
  public getDatabase(): Db | null {
    return this.db;
  }
}
