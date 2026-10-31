import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import type { Show } from '../../hooks/useShow';
import { CHANNEL } from '../../show/channel';
import AtAvatar from '../shared/AtAvatar';
import repoStats from 'virtual:repo-stats';
import useGitLab, { GITLAB_PROJECT } from '../../hooks/useGitLab';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/** Where people join — the live public host (docs/deployment.md). */
export const JOIN_URL = 'https://mud.panterasbox.com';

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
    key: 'about',
    weight: 1,
    seconds: 18,
    when: () => true,
    render: () => <AboutPanel />,
  },
  {
    key: 'gitlab',
    weight: 1,
    seconds: 18,
    when: () => true,
    render: () => <GitLabPanel />,
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

/**
 * About the streamer — who Bobalu Smallberries is, without repeating the bio:
 * the avatar beside the name so viewers know who is meant, the bona fides as
 * "since" lines, when the show is on, and the quote last, unattributed.
 */
function AboutPanel() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 32 }}>
      <AtAvatar size={136} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <span
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontWeight: 600,
              fontSize: 34,
              color: palette.text.fg,
            }}
          >
            {CHANNEL.person}
          </span>
          <span style={{ fontFamily: FACE_STACKS.chrome, fontSize: 24, color: palette.accent }}>
            {CHANNEL.schedule}
          </span>
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 24,
            color: palette.text.dim,
            marginTop: 6,
          }}
        >
          {CHANNEL.since.join(' · ')}
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontSize: 24,
            lineHeight: 1.25,
            color: palette.text.fg,
            marginTop: 10,
          }}
        >
          &ldquo;{CHANNEL.quote}&rdquo;
        </div>
      </div>
    </div>
  );
}

/**
 * The stack — what a contributor or someone running the platform asks first.
 * One small server (AWS Lightsail behind Caddy) and a MongoDB is the whole of
 * a deployment (docs/deployment.md).
 */
const STACK = ['TypeScript', 'Node', 'React', 'MongoDB', 'AWS', 'pnpm monorepo'];

/** "545k" — a big count, short. */
function compact(n: number): string {
  return n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString('en-US');
}

/** One figure: a big number over its label in engraved capitals. */
function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 130 }}>
      <div
        style={{
          fontFamily: FACE_STACKS.display,
          fontWeight: 500,
          fontSize: 52,
          lineHeight: 1,
          color: palette.text.fg,
          fontVariantNumeric: 'lining-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: FACE_STACKS.display,
          fontWeight: 500,
          fontSize: 15,
          letterSpacing: '0.19em',
          textTransform: 'uppercase',
          color: palette.text.dim,
          marginTop: 10,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/**
 * The code — evergreen, never this week's news (the agenda carries that):
 * where it is, that it is open, how long it has been, and how big it is.
 * Merges and the start date come live from GitLab; packs, subsystems and
 * lines are counted from the checkout when Rodney starts.
 */
function GitLabPanel() {
  const gitlab = useGitLab();
  const since = gitlab.since
    ? new Date(gitlab.since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;
  const me = CHANNEL.platforms.find((p) => p.service === 'gitlab');
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 40 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 40,
            lineHeight: 1.1,
            color: palette.text.fg,
          }}
        >
          Saxonberg is open source
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 28,
            fontWeight: 600,
            color: palette.accent,
            marginTop: 8,
          }}
        >
          gitlab.com/{GITLAB_PROJECT}
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 22,
            color: palette.text.dim,
            marginTop: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {['AGPL-3.0', since && `since ${since}`, me && strip(me.url)]
            .filter(Boolean)
            .join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {STACK.map((name) => (
            <span
              key={name}
              style={{
                fontFamily: FACE_STACKS.chrome,
                fontSize: 18,
                fontWeight: 500,
                color: palette.text.fg,
                padding: '3px 10px',
                border: `1px solid ${palette.line}`,
                background: palette.bg.raised,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      {gitlab.merged !== null && <Figure value={compact(gitlab.merged)} label="Merges" />}
      <Figure value={String(repoStats.packs)} label="Content packs" />
      <Figure value={String(repoStats.subsystems)} label="Subsystems" />
      <Figure value={compact(repoStats.linesOfTypeScript)} label="Lines of TS" />
    </div>
  );
}
