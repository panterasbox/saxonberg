import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import type { Show } from '../../hooks/useShow';
import { CHANNEL } from '../../show/channel';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/** Where people join — the live public host (docs/deployment.md). */
export const JOIN_URL = 'https://mud.panterasbox.com';
const SOURCE_URL = 'https://gitlab.com/panterasbox/saxonberg';

/**
 * The lower third's rotation, as rows. Each row says what it shows, how long
 * a turn lasts, how heavily it is weighted, and when it may take a turn at
 * all — so an empty panel never takes one, and adding a panel is a row.
 *
 * ⭐ The owner: "I might tell you one thing and then totally hate it once I
 * see it" — this table is the thing to edit. The rows move into the game as
 * content when the broadcast-ready build lands (reasons and panels are rows
 * there too); until then they live here.
 */
export interface PanelRow {
  key: string;
  /** Relative share of turns; join is weighted heaviest. */
  weight: number;
  /** Seconds a turn lasts. */
  seconds: number;
  /** May this panel take a turn now? */
  when: (show: Show) => boolean;
  render: (show: Show) => ReactNode;
}

/**
 * Every panel there is; a show profile picks which of them it rotates
 * (`ShowProfile.panels`), so a panel row is shared across shows.
 */
export const PANELS: PanelRow[] = [
  {
    key: 'join',
    weight: 3,
    seconds: 20,
    when: () => true,
    render: (show) => <JoinPanel show={show} />,
  },
  {
    key: 'world',
    weight: 2,
    seconds: 18,
    when: (show) => show.world !== null,
    render: (show) =>
      show.world && (
        <Panel
          kicker={`${show.world.place} now`}
          title={`${capitalize(show.world.time)}, ${show.world.season}`}
          body={[capitalize(show.world.weather), show.world.headline].filter(Boolean).join(' · ')}
        />
      ),
  },
  {
    key: 'quote',
    weight: 1,
    seconds: 16,
    when: () => true,
    render: () => (
      <Panel
        quote
        title="“See now, this is why mad scientists are generally less desirable than your common or garden variety scientist.”"
      />
    ),
  },
  {
    key: 'links',
    weight: 1,
    seconds: 16,
    when: () => true,
    render: () => (
      <Panel
        kicker="The source is open"
        title="Every line of Saxonberg is public, under the AGPL"
        body={`${strip(SOURCE_URL)} · play at ${strip(JOIN_URL)}`}
      />
    ),
  },
  {
    key: 'follow',
    weight: 1,
    seconds: 16,
    when: () => true,
    render: () => (
      <Panel
        kicker="You're watching"
        title={`${CHANNEL.person} @ ${CHANNEL.studio}`}
        body={`Follow on ${CHANNEL.platforms.map((p) => p.name).join(' · ')}`}
        aside={
          <img
            src="/brand/panterasbox-hex-white.svg"
            alt=""
            style={{ width: 130, height: 130, display: 'block' }}
          />
        }
      />
    ),
  },
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function strip(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/** The shared panel shape: a kicker in engraved capitals, a title, a body. */
function Panel({
  kicker,
  title,
  body,
  quote = false,
  aside,
}: {
  kicker?: string;
  title: string;
  body?: string;
  quote?: boolean;
  aside?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 40 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {kicker && (
          <div
            style={{
              fontFamily: FACE_STACKS.display,
              fontWeight: 500,
              fontSize: 20,
              letterSpacing: '0.19em',
              textTransform: 'uppercase',
              color: palette.accent,
              marginBottom: 6,
            }}
          >
            {kicker}
          </div>
        )}
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: quote ? 32 : 40,
            lineHeight: 1.15,
            color: palette.text.fg,
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontSize: 28,
              lineHeight: 1.3,
              color: palette.text.dim,
              marginTop: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {body}
          </div>
        )}
      </div>
      {aside}
    </div>
  );
}

/** "Built 3 days ago" — how old the thing on screen is. */
function buildAge(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  const date = new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const age = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  return `build of ${date} · ${age}`;
}

/**
 * The Saxonberg card. ⭐ The hook is that the viewer can use the thing they
 * are watching — it is not a streamer's tool — and the brand is restated,
 * because "mud.panterasbox.com" is no locator for a game called Saxonberg.
 * The shared world is implied by the count, not sold.
 */
function JoinPanel({ show }: { show: Show }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(JOIN_URL, {
      margin: 1,
      width: 280,
      color: { dark: palette.bg.ground, light: palette.brand.white },
    }).then(setQr, () => setQr(null));
  }, []);

  const count =
    show.playersOnline === null
      ? null
      : `${show.playersOnline} ${show.playersOnline === 1 ? 'player' : 'players'} in the world now`;
  const facts = [count, show.build && buildAge(show.build.at)].filter(Boolean).join(' · ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 32 }}>
      {/* The mark standalone, white on Old Glory Blue — it owns this tile. */}
      <div
        style={{
          width: 140,
          height: 140,
          flex: '0 0 auto',
          background: palette.brand.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img src="/brand/saxonberg-rings-white.svg" alt="" style={{ width: 118, height: 118 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 44,
            letterSpacing: '0.19em',
            textTransform: 'uppercase',
            color: palette.text.fg,
            lineHeight: 1,
          }}
        >
          Saxonberg
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 30,
            color: palette.text.fg,
            marginTop: 10,
          }}
        >
          What you&rsquo;re watching, you can play &mdash;{' '}
          <span style={{ color: palette.accent, fontWeight: 600 }}>{strip(JOIN_URL)}</span>
        </div>
        {facts && (
          <div
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontSize: 24,
              color: palette.text.dim,
              marginTop: 8,
            }}
          >
            {facts}
          </div>
        )}
      </div>
      {qr && (
        <img
          src={qr}
          alt=""
          style={{ width: 140, height: 140, border: `3px solid ${palette.brand.white}` }}
        />
      )}
    </div>
  );
}
