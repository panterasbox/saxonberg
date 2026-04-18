/**
 * Initialize Starting Room Template
 *
 * This script creates the default starting room template in the domain collection.
 * Run this once to set up the game world with the initial void location.
 *
 * Usage:
 *   tsx scripts/init-starting-room.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saxonberg';

/**
 * Starting room template definition
 */
const startingRoomTemplate = {
  path: '/domain/void',
  class: '/lib/stuff/Location',
  data: {
    name: 'The Void',
    description:
      'You find yourself in a featureless void. There is nothing here but potential.',
  },
};

/**
 * Main execution function
 */
async function main() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Use 'saxonberg' database (same as PersistenceManager)
    const db = client.db('saxonberg');
    console.log('Using database:', db.databaseName);
    const domainCollection = db.collection('domain');

    // Check if starting room already exists
    const existing = await domainCollection.findOne({ path: '/domain/void' });

    if (existing) {
      console.log('Starting room template already exists at /domain/void');
      console.log('Existing template:', JSON.stringify(existing, null, 2));
      console.log('\nTo update, delete it first or modify this script.');
    } else {
      // Insert starting room template
      const result = await domainCollection.insertOne(startingRoomTemplate);
      console.log('✅ Starting room template created successfully!');
      console.log('Inserted ID:', result.insertedId);
      console.log('Template:', JSON.stringify(startingRoomTemplate, null, 2));
    }
  } catch (error) {
    console.error('❌ Error initializing starting room:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the script
main();
