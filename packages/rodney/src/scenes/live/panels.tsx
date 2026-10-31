import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import type { Arrival, Community, Money, Show, WikiArticle } from '../../hooks/useShow';
import ServiceGlyph, { type Platform } from '../shared/ServiceGlyph';
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
    key: 'money',
    weight: 2,
    seconds: 18,
    when: (show) => show.money !== null,
    render: (show) => show.money && <MoneyPanel money={show.money} />,
  },
  {
    key: 'community',
    weight: 2,
    seconds: 18,
    when: (show) => show.community !== null,
    render: (show) => show.community && <CommunityPanel community={show.community} />,
  },
  {
    key: 'wiki',
    weight: 1,
    seconds: 20,
    when: (show) => show.wikiOfDay !== null,
    render: (show) => show.wikiOfDay && <WikiPanel article={show.wikiOfDay} />,
  },
  {
    key: 'compact',
    weight: 1,
    seconds: 20,
    when: () => true,
    render: () => <CompactPanel />,
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
  const qr = useQr(JOIN_URL);

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
const STACK = ['TypeScript', 'Node', 'React', 'MongoDB', 'AWS', 'WebSockets'];

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

/** "$142" for whole dollars, "$3.50" otherwise. */
function dollars(n: number): string {
  return n >= 100 || Number.isInteger(n) ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
}

/**
 * The money — dollars only: this month's income against this month's costs,
 * back to zero on the 1st, because that is how the bills are paid. Income is
 * at net (what reached the project after each platform's cut); the costs say
 * what drives them, so "costs rise as more people play" is visible.
 */
function MoneyPanel({ money }: { money: Money }) {
  const total = money.costs.reduce((n, c) => n + c.amount, 0);
  const share = total > 0 ? Math.min(1, money.income / total) : 0;
  const label = {
    fontFamily: FACE_STACKS.display,
    fontWeight: 500,
    fontSize: 16,
    letterSpacing: '0.19em',
    textTransform: 'uppercase',
    color: palette.text.dim,
  } as const;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 56 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={label}>{money.month}</span>
          <span style={{ fontFamily: FACE_STACKS.chrome, fontSize: 20, color: palette.text.mute }}>
            {money.daysLeft} {money.daysLeft === 1 ? 'day' : 'days'} left
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
          <span
            style={{
              fontFamily: FACE_STACKS.display,
              fontWeight: 500,
              fontSize: 56,
              lineHeight: 1,
              color: palette.text.fg,
              fontVariantNumeric: 'lining-nums',
            }}
          >
            {dollars(money.income)}
          </span>
          <span style={{ fontFamily: FACE_STACKS.chrome, fontSize: 28, color: palette.text.dim }}>
            of {dollars(total)} this month
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            height: 14,
            marginTop: 12,
            background: palette.bg.sunken,
            border: `1px solid ${palette.line}`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${share * 100}%`,
              background: palette.accent,
              transition: 'width 1.2s ease-out',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 20,
            color: palette.text.dim,
            marginTop: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {money.costs.map((c) => `${c.label} ${dollars(c.amount)}`).join(' · ')}
          <span style={{ color: palette.text.mute }}> · income after platform fees</span>
        </div>
      </div>

      {money.recent.length > 0 && (
        <div style={{ width: 380, flex: '0 0 auto' }}>
          <div style={label}>Latest</div>
          {money.recent.slice(0, 3).map((g, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 8,
                fontFamily: FACE_STACKS.chrome,
                fontSize: 22,
              }}
            >
              <ServiceGlyph service={g.via} size={22} />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: palette.text.fg,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.who}
              </span>
              <span style={{ color: palette.accent, fontWeight: 600 }}>{dollars(g.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** How an arrival reads, in a few words. */
function arrivalText(a: Arrival): string {
  switch (a.kind) {
    case 'player':
      return 'joined Saxonberg';
    case 'follow':
      return 'followed';
    case 'sub':
      return 'subscribed';
    case 'gift':
      return `gifted ${a.count ?? 1} ${a.count === 1 ? 'sub' : 'subs'}`;
    case 'member':
      return 'became a member';
    case 'patron':
      return 'became a patron';
  }
}

/** The social platforms — GitLab is the code's card, not this one. */
const SOCIAL = CHANNEL.platforms.filter((p) => p.service !== 'gitlab') as unknown as {
  service: Platform;
  handle: string;
}[];

/**
 * The community — people joining, never money: tonight's goal and the
 * segment it unlocks, the latest arrivals (⭐ new Saxonberg players among
 * them, by character name) with tonight's tallies, and where to find the
 * channel in one column.
 */
function CommunityPanel({ community }: { community: Community }) {
  const label = {
    fontFamily: FACE_STACKS.display,
    fontWeight: 500,
    fontSize: 16,
    letterSpacing: '0.19em',
    textTransform: 'uppercase',
    color: palette.text.dim,
  } as const;
  const goal = community.goal;
  const current = goal
    ? goal.metric === 'subs'
      ? community.subsAndGifts
      : community.newFollowers
    : 0;
  const reached = goal !== null && current >= goal.target;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 48 }}>
      {goal && (
        <div style={{ flex: '0 0 520px' }}>
          <div style={label}>Tonight&rsquo;s goal</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <span
              style={{
                fontFamily: FACE_STACKS.display,
                fontWeight: 500,
                fontSize: 48,
                lineHeight: 1,
                color: palette.text.fg,
                fontVariantNumeric: 'lining-nums',
              }}
            >
              {Math.min(current, goal.target)} / {goal.target}
            </span>
            <span style={{ fontFamily: FACE_STACKS.chrome, fontSize: 26, color: palette.text.dim }}>
              {goal.metric === 'subs' ? 'new subs' : 'new followers'}
            </span>
          </div>
          <div
            style={{
              position: 'relative',
              height: 12,
              marginTop: 10,
              background: palette.bg.sunken,
              border: `1px solid ${palette.line}`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${Math.min(1, current / goal.target) * 100}%`,
                background: palette.accent,
                transition: 'width 1.2s ease-out',
              }}
            />
          </div>
          {(reached || goal.reward) && (
            <div
              style={{
                fontFamily: FACE_STACKS.chrome,
                fontSize: 21,
                color: reached ? palette.accent : palette.text.dim,
                fontWeight: reached ? 600 : 400,
                marginTop: 8,
                whiteSpace: 'nowrap',
              }}
            >
              {reached
                ? goal.reward
                  ? `Goal reached — we end with ${goal.reward}!`
                  : 'Goal reached — thank you!'
                : `Hit it and we end with ${goal.reward}`}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={label}>Latest</span>
          <span style={{ fontFamily: FACE_STACKS.chrome, fontSize: 18, color: palette.text.mute }}>
            tonight +{community.newPlayers} players · +{community.newFollowers} followers
          </span>
        </div>
        {community.recent.slice(0, 3).map((a, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 8,
              fontFamily: FACE_STACKS.chrome,
              fontSize: 22,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {a.via ? (
              <ServiceGlyph service={a.via} size={22} />
            ) : (
              <img src="/brand/saxonberg-seal.svg" alt="" style={{ width: 24, height: 24 }} />
            )}
            <span
              style={{
                color: a.kind === 'player' ? palette.accent : palette.text.fg,
                fontWeight: 600,
              }}
            >
              {a.who}
            </span>
            <span style={{ color: palette.text.dim }}>{arrivalText(a)}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: '0 0 auto' }}>
        {SOCIAL.map((p) => (
          <div
            key={p.service}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
              fontFamily: FACE_STACKS.chrome,
              fontSize: 18,
              color: palette.text.dim,
            }}
          >
            <ServiceGlyph service={p.service} size={18} />
            {p.handle}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A QR code for a URL, white on the ink ground. */
function useQr(url: string): string | null {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      color: { dark: palette.bg.ground, light: palette.brand.white },
    }).then(setQr, () => setQr(null));
  }, [url]);
  return qr;
}

/** The lead's two marks: **bold** in full white, `code` in brass. */
function Lead({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') ? (
          <strong key={i} style={{ color: palette.text.fg, fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        ) : part.startsWith('`') ? (
          <span key={i} style={{ color: palette.accent, fontWeight: 600 }}>
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/**
 * The wiki's article of the day — a way into the architecture, a page at a
 * time. The summary is the page's own lead, never anyone's paraphrase.
 */
function WikiPanel({ article }: { article: WikiArticle }) {
  const qr = useQr(article.url);
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 40 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              fontFamily: FACE_STACKS.display,
              fontWeight: 500,
              fontSize: 16,
              letterSpacing: '0.19em',
              textTransform: 'uppercase',
              color: palette.text.dim,
            }}
          >
            Wiki · article of the day
          </span>
          {article.kind && (
            <span
              style={{
                fontFamily: FACE_STACKS.chrome,
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: palette.text.fg,
                padding: '1px 8px',
                border: `1px solid ${palette.line}`,
                background: palette.bg.raised,
              }}
            >
              {article.kind}
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 40,
            lineHeight: 1.1,
            color: palette.text.fg,
            marginTop: 4,
          }}
        >
          {article.title}
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 23,
            lineHeight: 1.3,
            color: palette.text.dim,
            marginTop: 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <Lead text={article.lead} />
        </div>
      </div>
      {qr && (
        <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
          <img
            src={qr}
            alt=""
            style={{ width: 120, height: 120, border: `3px solid ${palette.brand.white}` }}
          />
          <div
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontSize: 14,
              color: palette.text.mute,
              marginTop: 4,
            }}
          >
            read it
          </div>
        </div>
      )}
    </div>
  );
}

/** The draft constitution, readable on GitLab. */
const CONSTITUTION_URL =
  'https://gitlab.com/panterasbox/saxonberg/-/blob/master/docs/compact/governance/draft-constitution.md';

/**
 * The three chambers, in the manifesto's words — labor · capital · consumer,
 * make · fund · play, standing (the draft constitution's own terms are
 * Producer House and influence). Labor and consumer standing is given by
 * others; capital's is funded.
 */
const CHAMBERS = [
  { name: 'Labor', act: 'Make it', how: 'valued for what you make' },
  { name: 'Capital', act: 'Fund it', how: 'for what you give' },
  { name: 'Consumer', act: 'Play it', how: 'valued for how you play' },
];

/**
 * The Compact — who governs Saxonberg, evergreen. Nothing is governed yet
 * (standing begins at launch), so the card describes the design, never a
 * live vote; live civics replace it once the government sits.
 */
function CompactPanel() {
  const qr = useQr(CONSTITUTION_URL);
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 40 }}>
      <div style={{ flex: '0 0 470px' }}>
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
          The Compact
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 30,
            lineHeight: 1.15,
            color: palette.text.fg,
            marginTop: 6,
          }}
        >
          Governed by the people who make it, fund it and play it
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontSize: 18,
            color: palette.text.mute,
            marginTop: 8,
          }}
        >
          A draft constitution · standing begins at launch
        </div>
      </div>

      {CHAMBERS.map((h) => (
        <div
          key={h.name}
          style={{
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderLeft: `1px solid ${palette.line}`,
            paddingLeft: 24,
          }}
        >
          <div
            style={{
              fontFamily: FACE_STACKS.display,
              fontWeight: 500,
              fontSize: 15,
              letterSpacing: '0.19em',
              textTransform: 'uppercase',
              color: palette.text.dim,
            }}
          >
            {h.name}
          </div>
          <div
            style={{
              fontFamily: FACE_STACKS.display,
              fontWeight: 500,
              fontSize: 34,
              lineHeight: 1.1,
              color: palette.text.fg,
              marginTop: 6,
            }}
          >
            {h.act}
          </div>
          <div
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontSize: 19,
              lineHeight: 1.3,
              color: palette.text.dim,
              marginTop: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {h.how}
          </div>
        </div>
      ))}

      {qr && (
        <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
          <img
            src={qr}
            alt=""
            style={{ width: 110, height: 110, border: `3px solid ${palette.brand.white}` }}
          />
          <div
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontSize: 14,
              color: palette.text.mute,
              marginTop: 4,
            }}
          >
            read it
          </div>
        </div>
      )}
    </div>
  );
}
