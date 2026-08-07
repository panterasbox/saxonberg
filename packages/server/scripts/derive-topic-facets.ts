/**
 * derive-topic-facets — one-shot authoring aid for the five topic
 * facets (`address` · `actor` · `weight` · `audience` · `durable`).
 *
 * Five facets across ~90 topics is not 450 hand decisions: `audience`
 * and `actor` fall out of the family prefix mechanically, and `weight`
 * and `address` follow from a handful of shape rules. This script
 * derives all five for every seed under `mud/seeds/obj/Topic/`, applies
 * the {@link EXCEPTIONS} table where derivation is known to be wrong,
 * and writes the result back into each seed's `data:` block.
 *
 * ⚠ **The exceptions are the interesting part.** A derivation that
 * needed no exceptions would mean the facets carry no information the
 * topic path did not already have — the exceptions are exactly the
 * cases where attention and emitter genuinely disagree, which is the
 * whole reason the facets exist.
 *
 * Idempotent: re-running produces the same YAML. Run it again after
 * adding a topic seed, then review what it guessed.
 *
 *   pnpm tsx scripts/derive-topic-facets.ts [--check]
 *
 * `--check` reports what would change and exits non-zero if anything
 * would — suitable for CI once the facets have settled.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const SEED_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/mud/seeds/obj/Topic'
);

type Facets = {
  address: string;
  actor: string;
  weight: string;
  audience: string;
  durable: boolean;
};

/**
 * Topics whose attention shape genuinely differs from what their path
 * implies. Each entry is a partial override on top of the derivation.
 */
const EXCEPTIONS: Record<string, Partial<Facets>> = {
  // ── Speech: who it reaches is the whole distinction ──
  // A `say` is heard by the room; a `whisper` by one person standing
  // there; a `dm` is an implant message that reaches you anywhere.
  // Same family, three different answers — the case the tree cannot
  // express and the facets can.
  'world.speech.say': { address: 'broadcast', actor: 'person' },
  'world.speech.shout': { address: 'broadcast', actor: 'person' },
  'world.speech.whisper': { address: 'personal', actor: 'person' },
  'world.speech.dm': { address: 'direct', actor: 'person', durable: true },
  'world.chat.message': {
    address: 'broadcast',
    actor: 'person',
    weight: 'chatter',
    durable: true,
  },

  // ── Expression is a person acting, not the world narrating ──
  'world.expression.emote': { actor: 'person' },
  'world.emote': { actor: 'person' },

  // ── Relayed platform chat: a person, from outside ──
  'world.twitch.message': {
    address: 'broadcast',
    actor: 'person',
    weight: 'chatter',
  },
  'world.kick.message': {
    address: 'broadcast',
    actor: 'person',
    weight: 'chatter',
  },
  'world.youtube.message': {
    address: 'broadcast',
    actor: 'person',
    weight: 'chatter',
  },

  // ── Your own acts and their results ──
  // A measurement is something YOU did, it is addressed to you alone,
  // it is a consequence (you asked a question and got an answer), and
  // it is durable — a reading is a fact with a timestamp, true forever.
  'world.perception.inventory': { address: 'personal', actor: 'self' },
  'world.identity.change': {
    address: 'personal',
    actor: 'self',
    weight: 'consequence',
    durable: true,
  },

  // ── Published record ──
  'world.press.feed': {
    address: 'broadcast',
    weight: 'consequence',
    durable: true,
  },
  'world.wiki.page': { address: 'broadcast', durable: true },

  // ── System: errors are consequences, logs are noise ──
  'system.command.error': {
    address: 'personal',
    actor: 'system',
    weight: 'consequence',
  },
  'system.log.command': {
    address: 'personal',
    actor: 'self',
    weight: 'diagnostic',
  },
  'system.broadcast': {
    address: 'broadcast',
    actor: 'system',
    weight: 'consequence',
  },
  // The verb registry changing invalidates the client's verb menus —
  // that is a consequence, not chatter, even though nobody "said" it.
  'system.commands.added': { weight: 'consequence' },
  'system.commands.removed': { weight: 'consequence' },
  'system.commands.reset': { weight: 'consequence' },
  // Am I connected, and who am I. One concern, one indicator.
  'system.connection.established': { weight: 'consequence' },
  'system.connection.lost': { weight: 'consequence' },
  'system.auth.failed': { weight: 'consequence' },
  'system.auth.success': { weight: 'consequence' },
};

/** Derive the five facets from a topic's path shape. */
function derive(topic: string): Facets {
  const isSystem = topic.startsWith('system.') || topic === 'system';
  const isShell = topic.startsWith('system.shell');
  const isMeasurement = topic.startsWith('world.perception.measurement');
  const isAmbient = topic.startsWith('world.perception.ambient');
  const isSense = topic.startsWith('world.perception.sense');
  const isSearch = topic.startsWith('world.perception.search');
  const isNarration = topic.startsWith('world.narration');

  // audience — the authoring shell is the author's surface; system
  // machinery serves both; everything else is the player's.
  const audience = isShell ? 'author' : isSystem ? 'all' : 'player';

  // actor — whose voice. A reading or a look is YOUR act; narration is
  // the world's; system machinery is the machine's.
  const actor =
    isMeasurement || isSense || isSearch
      ? 'self'
      : isSystem
        ? 'system'
        : isNarration || isAmbient
          ? 'world'
          : 'world';

  // address — a reading or a look is addressed to you alone; ambient
  // perception and narration are addressed to the room.
  const address =
    isMeasurement || isSense || isSearch || isShell || isSystem
      ? 'personal'
      : 'ambient';

  // weight — an answer you asked for is a consequence; the shell and
  // the logs are diagnostics; the rest is the texture of being present.
  const weight = isMeasurement
    ? 'consequence'
    : isShell
      ? 'activity'
      : isSystem
        ? 'diagnostic'
        : 'activity';

  // durable — a measurement is a fact with a timestamp, true forever.
  // Ambient texture is not worth keeping.
  const durable = isMeasurement;

  return { address, actor, weight, audience, durable };
}

function facetsFor(topic: string): Facets {
  return { ...derive(topic), ...(EXCEPTIONS[topic] ?? {}) };
}

const check = process.argv.includes('--check');
let changed = 0;
let exceptional = 0;

for (const file of readdirSync(SEED_DIR).filter((f) => f.endsWith('.yaml'))) {
  const path = join(SEED_DIR, file);
  const raw = readFileSync(path, 'utf-8');
  const doc = YAML.parse(raw) as {
    data?: Record<string, unknown>;
  };
  const topic = doc?.data?.topic;
  if (typeof topic !== 'string') {
    console.warn(`skip ${file}: no data.topic`);
    continue;
  }
  const facets = facetsFor(topic);
  if (EXCEPTIONS[topic]) exceptional++;

  const before = JSON.stringify(
    (['address', 'actor', 'weight', 'audience', 'durable'] as const).map(
      (k) => doc.data?.[k]
    )
  );
  const after = JSON.stringify(
    (['address', 'actor', 'weight', 'audience', 'durable'] as const).map(
      (k) => facets[k]
    )
  );
  if (before === after) continue;
  changed++;

  if (check) {
    console.log(`would update ${topic}: ${before} -> ${after}`);
    continue;
  }
  Object.assign(doc.data!, facets);
  writeFileSync(path, YAML.stringify(doc, { lineWidth: 0 }), 'utf-8');
}

const verb = check ? 'would change' : 'updated';
console.log(
  `${verb} ${changed} seed(s); ${exceptional} carried a hand exception`
);
if (check && changed > 0) process.exit(1);
