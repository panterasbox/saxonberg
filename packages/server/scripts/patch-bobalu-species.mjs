import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('no MONGODB_URI'); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
const db = client.db('saxonberg');
const domain = db.collection('domain');

const avatars = await domain.find({ path: { $regex: '^/obj/Avatar/' } }).toArray();
console.log('Avatar templates:');
for (const a of avatars) {
  console.log(' -', a.path, '_speciesPath=', a.data?._speciesPath ?? 'NULL');
}

const targetPath = '/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens';

const result = await domain.updateMany(
  { path: { $regex: '^/obj/Avatar/' }, $or: [
    { 'data._speciesPath': { $exists: false } },
    { 'data._speciesPath': null },
    { 'data._speciesPath': '' },
  ] },
  { $set: { 'data._speciesPath': targetPath } },
);
console.log('Updated', result.modifiedCount, 'avatars with species', targetPath);

const after = await domain.find({ path: { $regex: '^/obj/Avatar/' } }).toArray();
console.log('After:');
for (const a of after) {
  console.log(' -', a.path, '_speciesPath=', a.data?._speciesPath ?? 'NULL');
}

await client.close();
