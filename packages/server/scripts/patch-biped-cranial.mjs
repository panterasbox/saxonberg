import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
await client.connect();
const db = client.db('saxonberg');
const domain = db.collection('domain');

const targetPaths = [
  '/lib/body-plans/biped',
  '/lib/body-plans/quadruped',
];

for (const p of targetPaths) {
  const doc = await domain.findOne({ path: p });
  if (!doc) {
    console.log('  -', p, 'NOT FOUND');
    continue;
  }
  const slots = doc.data?.slots ?? [];
  const hasCranial = slots.some((s) => s.name === 'cranial');
  console.log(p, '  before: slots.count =', slots.length, 'hasCranial =', hasCranial);
  if (!hasCranial) {
    const newSlots = [...slots, { name: 'cranial', accepts: 'SlottableMixin' }];
    await domain.updateOne(
      { path: p },
      { $set: { 'data.slots': newSlots } },
    );
    console.log('  -', p, 'added cranial slot');
  }
  const after = await domain.findOne({ path: p });
  console.log(p, '  after:  slots.count =', after.data?.slots?.length);
}

// Also: the old avatar instance(s) hold a snapshot. If they were
// loaded under the OLD biped, they have no cranial. But the body
// plan slots are pulled from the BodyPlan template at slot-query
// time (BodyPlanSlotsMixin), so once we update the template +
// restart, the next Avatar.enter sees the new slots.
await client.close();
