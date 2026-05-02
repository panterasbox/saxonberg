/**
 * Initialize PM hook templates.
 *
 * The `domain` collection's folder/leaf invariant is enforced via
 * `DomainHook` — an `Idea` subclass cloned at boot from a template stored
 * in the `domain` collection itself. This script seeds that template (and
 * any future system-backed hook templates) before the server is started
 * for the first time.
 *
 * Usage:
 *   tsx scripts/init-hooks.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saxonberg';

const HOOK_TEMPLATES = [
  {
    path: '/system/hooks/domain-folder-leaf',
    class: '/obj/hooks/DomainHook',
    data: {},
  },
];

async function main() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('saxonberg');
    const domain = db.collection('domain');

    for (const template of HOOK_TEMPLATES) {
      const existing = await domain.findOne({ path: template.path });
      if (existing) {
        console.log(`Template already exists at ${template.path} — skipping.`);
        continue;
      }
      const result = await domain.insertOne(template);
      console.log(`Seeded ${template.path} (id ${result.insertedId})`);
    }
  } catch (error) {
    console.error('Error seeding hook templates:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
