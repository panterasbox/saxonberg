import type { ChatLine } from '../../hooks/useStreamState';
import ServiceGlyph from './ServiceGlyph';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/** Type sizes for the two places the chat appears. */
const DENSITY = {
  /** Standby's centre column — read from across the room. */
  roomy: { label: 18, text: 22, glyph: 22, pad: 24, gap: 12, chrome: true },
  /** The Live sidebar, 400 wide — the 720p legibility floor is ~26 → 17 px. */
  compact: { label: 15, text: 19, glyph: 18, pad: 16, gap: 9, chrome: false },
} as const;

/**
 * The unified chat — Twitch, YouTube and Kick merged by the server's relay,
 * newest at the bottom, older lines fading upward. A civic panel: surface
 * ground, hairline rule, the section label in engraved capitals.
 */
export default function ChatPanel({
  lines,
  max = 12,
  density = 'roomy',
}: {
  lines: ChatLine[];
  max?: number;
  density?: keyof typeof DENSITY;
}) {
  const d = DENSITY[density];
  const shown = lines.slice(-max);
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(d.chrome && {
          background: 'rgba(13, 28, 56, 0.82)',
          border: `1px solid ${palette.line}`,
          boxShadow: '0 18px 60px rgba(4, 11, 23, 0.55)',
        }),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: `${d.pad * 0.66}px ${d.pad}px ${d.pad * 0.58}px`,
          borderBottom: `1px solid ${palette.line}`,
          fontFamily: FACE_STACKS.display,
          fontWeight: 500,
          fontSize: d.label,
          letterSpacing: '0.19em',
          textTransform: 'uppercase',
          color: palette.text.dim,
        }}
      >
        Chat
        <span style={{ flex: 1, height: 1, background: palette.lineSoft }} />
        <span style={{ display: 'flex', gap: 6 }}>
          <ServiceGlyph service="twitch" size={d.glyph} />
          <ServiceGlyph service="youtube" size={d.glyph} />
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: d.gap,
          padding: `${d.pad * 0.66}px ${d.pad}px ${d.pad * 0.8}px`,
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, transparent 0, black 22%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 22%)',
        }}
      >
        {shown.length === 0 ? (
          <div
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontSize: d.text - 2,
              color: palette.text.mute,
              textAlign: 'center',
              paddingBottom: 8,
            }}
          >
            Say hello — chat from Twitch and YouTube lands here.
          </div>
        ) : (
          shown.map((line) => (
            <div key={line.id} style={{ display: 'flex', gap: d.gap, alignItems: 'flex-start' }}>
              <ServiceGlyph service={line.service} size={d.glyph} />
              <div
                style={{
                  fontFamily: FACE_STACKS.chrome,
                  fontSize: d.text,
                  lineHeight: 1.35,
                  color: palette.text.fg,
                  overflowWrap: 'anywhere',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: line.inGame ? palette.accent : palette.text.dim,
                    marginRight: 10,
                  }}
                >
                  {line.author}
                </span>
                {line.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
