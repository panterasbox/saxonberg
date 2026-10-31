import type { ChatLine, ChatService } from '../../hooks/useStreamState';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

const SERVICE_LETTER: Record<ChatService, string> = {
  twitch: 'T',
  youtube: 'Y',
  kick: 'K',
};

/**
 * The platform glyph — a small chip in the platform's colour. ⚠ It carries a
 * white rim because some platform colours are red, and red never touches blue
 * (DESIGN-SYSTEM § Colour).
 */
function ServiceGlyph({ service }: { service: ChatService }) {
  return (
    <span
      aria-label={service}
      style={{
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        marginTop: 3,
        borderRadius: 5,
        border: `2px solid ${palette.brand.white}`,
        background: palette.platform[service],
        color: service === 'kick' ? '#04150a' : palette.brand.white,
        fontFamily: FACE_STACKS.chrome,
        fontWeight: 700,
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      {SERVICE_LETTER[service]}
    </span>
  );
}

/**
 * The unified chat — Twitch, YouTube and Kick merged by the server's relay,
 * newest at the bottom, older lines fading upward. A civic panel: surface
 * ground, hairline rule, the section label in engraved capitals.
 */
export default function ChatPanel({ lines, max = 12 }: { lines: ChatLine[]; max?: number }) {
  const shown = lines.slice(-max);
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(13, 28, 56, 0.82)',
        border: `1px solid ${palette.line}`,
        boxShadow: '0 18px 60px rgba(4, 11, 23, 0.55)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 24px 14px',
          borderBottom: `1px solid ${palette.line}`,
          fontFamily: FACE_STACKS.display,
          fontWeight: 500,
          fontSize: 18,
          letterSpacing: '0.19em',
          textTransform: 'uppercase',
          color: palette.text.dim,
        }}
      >
        Chat
        <span style={{ flex: 1, height: 1, background: palette.lineSoft }} />
        <span style={{ display: 'flex', gap: 6 }}>
          <ServiceGlyph service="twitch" />
          <ServiceGlyph service="youtube" />
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 12,
          padding: '16px 24px 20px',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, transparent 0, black 22%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 22%)',
        }}
      >
        {shown.length === 0 ? (
          <div
            style={{
              fontFamily: FACE_STACKS.chrome,
              fontSize: 20,
              color: palette.text.mute,
              textAlign: 'center',
              paddingBottom: 8,
            }}
          >
            Say hello — chat from Twitch and YouTube lands here.
          </div>
        ) : (
          shown.map((line) => (
            <div key={line.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <ServiceGlyph service={line.service} />
              <div
                style={{
                  fontFamily: FACE_STACKS.chrome,
                  fontSize: 22,
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
