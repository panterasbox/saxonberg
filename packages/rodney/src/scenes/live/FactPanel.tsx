import { useState } from 'react';
import { FACTS, type Fact } from '../../show/facts';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/*
 * The deck's order for this page load: the strong facts first, then the rest,
 * each group shuffled by today's date — so a stream never shows one twice
 * until the deck runs out, and two loads on the same day agree.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const today = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
const ORDER: Fact[] = [
  ...seededShuffle(FACTS.filter((f) => f.strong), today),
  ...seededShuffle(FACTS.filter((f) => !f.strong), today + 1),
];
const shown = new Set<Fact>();

/**
 * The next fact: one about what the streamer just did when his last verb
 * belongs to a trade (he typed `smelt`, so smelting comes up), else the next
 * in the deck. A fact is not repeated until every fact has been shown.
 */
let lastPick: { at: number; verb: string | null; fact: Fact } | null = null;

function pickFact(lastVerb: string | null): Fact {
  // A turn mounts the card once, but React's dev mode builds it twice; the
  // same ask within a moment is the same turn, so it gets the same fact.
  const now = Date.now();
  if (lastPick && now - lastPick.at < 1000 && lastPick.verb === lastVerb) return lastPick.fact;
  if (shown.size >= ORDER.length) shown.clear();
  const steered =
    lastVerb !== null ? ORDER.find((f) => !shown.has(f) && f.verbs.includes(lastVerb)) : undefined;
  const fact = steered ?? ORDER.find((f) => !shown.has(f)) ?? ORDER[0];
  shown.add(fact);
  lastPick = { at: now, verb: lastVerb, fact };
  return fact;
}

/**
 * "What can you do here?" — one true, surprising thing about a trade or a
 * system, from the docs that say it ships. Picked once per turn (the card
 * mounts fresh on each turn).
 */
export default function FactPanel({ lastVerb }: { lastVerb: string | null }) {
  const [fact] = useState(() => pickFact(lastVerb));
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 40 }}>
      <div style={{ flex: '0 0 300px' }}>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 16,
            letterSpacing: '0.19em',
            textTransform: 'uppercase',
            color: palette.accent,
          }}
        >
          What can you do here?
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 52,
            lineHeight: 1.05,
            color: palette.text.fg,
            marginTop: 8,
          }}
        >
          {fact.trade}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          borderLeft: `1px solid ${palette.line}`,
          paddingLeft: 36,
          fontFamily: FACE_STACKS.display,
          fontSize: 34,
          lineHeight: 1.25,
          color: palette.text.fg,
        }}
      >
        {fact.text}
      </div>
    </div>
  );
}
