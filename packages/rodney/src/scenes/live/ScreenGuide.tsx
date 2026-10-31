import type { ClientFacts } from '../../hooks/useShow';
import { CHANNEL } from '../../show/channel';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/*
 * The screen guide — "what am I looking at?" for someone who tunes in to a
 * man talking over a browser. It says, first, that this is a GAME, then
 * points at the client's regions, drawn as a sketch of the explore layout
 * the client-surface build ships (mode rail · panel with the map · the story
 * column with the command line · the cards). When the streamer's client
 * reports what it is doing, the guide lights the region that is live and
 * says so in a line — it never repeats the sidebar's topic.
 */

type Region = 'map' | 'story' | 'command' | 'cards';

const LEGEND: { id: Region; n: string; text: string }[] = [
  { id: 'map', n: '1', text: 'Where he is — the map and the ways out' },
  { id: 'story', n: '2', text: 'The story — what happens, told in prose' },
  { id: 'command', n: '3', text: 'The command line — he types what to do' },
  { id: 'cards', n: '4', text: 'Cards — the places, people and things he looks at' },
];

/** What the looked-at verbs do on screen. */
const CARD_VERBS = new Set(['look', 'examine', 'l', 'inspect']);
const MOVE_VERBS = new Set(['north', 'south', 'east', 'west', 'up', 'down', 'go', 'n', 's', 'e', 'w']);

/** Which regions are live, and the line that says why — from the client's facts. */
function liveState(client: ClientFacts | null): { live: Region[]; line: string | null } {
  if (!client) return { live: [], line: null };
  if (client.foreground !== 'saxonberg') {
    return {
      live: [],
      line: 'Right now he’s in another window — usually the code. The game is the one with the map.',
    };
  }
  switch (client.mode) {
    case 'build':
      return { live: ['story'], line: 'Build mode — he’s writing the world from inside it.' };
    case 'chat':
      return { live: ['story'], line: 'Chat — he’s talking with the people in the world.' };
    case 'govern':
      return { live: ['cards'], line: 'Govern — the Compact’s business, in the open.' };
    case 'watch':
      return { live: ['story'], line: 'Watch — a stream inside the game, with the game beside it.' };
  }
  const verb = client.lastVerb;
  if (!verb) return { live: [], line: null };
  if (CARD_VERBS.has(verb)) {
    return { live: ['command', 'cards'], line: `He just typed “${verb}” — what he looked at opened as a card.` };
  }
  if (MOVE_VERBS.has(verb)) {
    return { live: ['command', 'map'], line: `He just typed “${verb}” — and walked; the map follows him.` };
  }
  return { live: ['command', 'story'], line: `He just typed “${verb}” — anyone in the game can type the same.` };
}

/** The client's explore layout, as a sketch: 300 × 160, regions numbered. */
function Sketch({ live }: { live: Region[] }) {
  const on = (r: Region) => live.includes(r);
  const fill = (r: Region) => (on(r) ? 'rgba(201,162,39,0.22)' : palette.bg.raised);
  const stroke = (r: Region) => (on(r) ? palette.accent : palette.line);
  const badge = (r: Region, n: string, x: number, y: number) => (
    <g key={n}>
      <circle cx={x} cy={y} r={9} fill={on(r) ? palette.accent : palette.bg.ground} stroke={stroke(r)} />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontFamily={FACE_STACKS.chrome}
        fontSize={11}
        fontWeight={700}
        fill={on(r) ? palette.bg.ground : palette.text.fg}
      >
        {n}
      </text>
    </g>
  );
  const mapCells = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const path = (y === 2 && x > 0) || (x === 2 && y > 0);
      mapCells.push(
        <rect
          key={`${x}-${y}`}
          x={22 + x * 9}
          y={40 + y * 9}
          width={7}
          height={7}
          fill={x === 2 && y === 2 ? palette.accent : path ? '#2f6d62' : palette.bg.sunken}
        />
      );
    }
  }
  return (
    <svg width={300} height={160} viewBox="0 0 300 160" style={{ display: 'block', flex: '0 0 auto' }}>
      <rect x={0} y={0} width={300} height={160} fill={palette.bg.ground} stroke={palette.line} />
      {/* the mode rail */}
      <rect x={4} y={4} width={10} height={152} fill={palette.bg.sunken} />
      {/* the panel: here, the map, the ways out */}
      <rect x={17} y={4} width={56} height={152} fill={fill('map')} stroke={stroke('map')} />
      <rect x={22} y={12} width={46} height={10} fill={palette.bg.sunken} />
      {mapCells}
      {/* the story column */}
      <rect x={77} y={4} width={110} height={132} fill={fill('story')} stroke={stroke('story')} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={84} y={78 + i * 9} width={i % 3 === 2 ? 60 : 94} height={4} fill={palette.text.mute} />
      ))}
      {/* the command line */}
      <rect x={77} y={139} width={110} height={17} fill={fill('command')} stroke={stroke('command')} />
      <text x={83} y={151} fontFamily={FACE_STACKS.chrome} fontSize={9} fill={palette.accent}>
        here›
      </text>
      {/* the cards */}
      <rect x={191} y={4} width={105} height={152} fill={fill('cards')} stroke={stroke('cards')} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={196} y={12 + i * 46} width={95} height={40} fill={palette.bg.surface} stroke={palette.line} />
      ))}
      {badge('map', '1', 45, 120)}
      {badge('story', '2', 132, 40)}
      {badge('command', '3', 172, 147)}
      {badge('cards', '4', 243, 148)}
    </svg>
  );
}

/** "What you're looking at" — the game, said plainly, and its screen. */
export default function ScreenGuide({ client }: { client: ClientFacts | null }) {
  const { live, line } = liveState(client);
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 36 }}>
      <div style={{ flex: '0 0 560px' }}>
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
          What you&rsquo;re looking at
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 30,
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            color: palette.text.fg,
            marginTop: 6,
          }}
        >
          A multiplayer game, played in text
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 20,
            lineHeight: 1.3,
            color: palette.text.dim,
            marginTop: 6,
          }}
        >
          {line ?? `Saxonberg runs in your browser. ${CHANNEL.person.split(' ')[0]} types what he does; the world answers.`}
        </div>
      </div>
      <Sketch live={live} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {LEGEND.map((l) => {
          const on = live.includes(l.id);
          return (
            <div
              key={l.id}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
                marginTop: 6,
                fontFamily: FACE_STACKS.chrome,
                fontSize: 19,
                color: on ? palette.text.fg : palette.text.dim,
                fontWeight: on ? 600 : 400,
              }}
            >
              <span style={{ color: on ? palette.accent : palette.text.mute, fontWeight: 700 }}>{l.n}</span>
              {l.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
