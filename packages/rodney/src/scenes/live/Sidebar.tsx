import type { ChatLine } from '../../hooks/useStreamState';
import type { Show } from '../../hooks/useShow';
import ChatPanel from '../shared/ChatPanel';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/** The sidebar's box: 400 wide, beside the content area, above the camera. */
export const SIDEBAR = { width: 400, height: 855 } as const;

const label = {
  fontFamily: FACE_STACKS.display,
  fontWeight: 500,
  fontSize: 15,
  letterSpacing: '0.19em',
  textTransform: 'uppercase',
  color: palette.text.dim,
} as const;

/**
 * Brand — always on screen. The seals are the marks APPLIED (red field, white
 * rim), because the sidebar is a surface they do not own (brand/README.md).
 * The live pill is red, so it carries a white rim too.
 */
function Brand({ live }: { live: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '22px 20px 20px',
        borderBottom: `1px solid ${palette.line}`,
      }}
    >
      <img src="/brand/saxonberg-seal.svg" alt="" style={{ width: 54, height: 54 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: palette.text.fg,
            lineHeight: 1.1,
          }}
        >
          Saxonberg
        </div>
        <div style={{ ...label, fontSize: 13, marginTop: 4, color: palette.text.mute }}>
          Pantera's Box
        </div>
      </div>
      {live && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            border: `2px solid ${palette.brand.white}`,
            background: palette.brand.red,
            color: palette.brand.white,
            fontFamily: FACE_STACKS.chrome,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.08em',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: palette.brand.white,
              animation: 'rodney-pulse 2s ease-in-out infinite',
            }}
          />
          LIVE
        </div>
      )}
    </div>
  );
}

/** Topic and agenda — always on screen; the current item marked in brass. */
function Agenda({ show }: { show: Show }) {
  return (
    <div style={{ padding: '18px 20px 18px', borderBottom: `1px solid ${palette.line}` }}>
      <div style={label}>Now</div>
      <div
        style={{
          fontFamily: FACE_STACKS.display,
          fontWeight: 500,
          fontSize: 28,
          lineHeight: 1.15,
          color: palette.text.fg,
          marginTop: 6,
        }}
      >
        {show.topic ?? 'Working on Saxonberg'}
      </div>
      {show.agenda.length > 0 && (
        <ol style={{ listStyle: 'none', margin: '14px 0 0', padding: 0 }}>
          {show.agenda.map((item, i) => {
            const current = i === show.current;
            return (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  padding: '3px 0',
                  fontFamily: FACE_STACKS.chrome,
                  fontSize: 18,
                  fontWeight: current ? 600 : 400,
                  color: current
                    ? palette.text.fg
                    : item.done
                      ? palette.text.mute
                      : palette.text.dim,
                }}
              >
                <span
                  style={{
                    width: 16,
                    flex: '0 0 auto',
                    textAlign: 'center',
                    color: current ? palette.accent : palette.text.mute,
                  }}
                >
                  {item.done ? '✓' : current ? '▸' : '·'}
                </span>
                <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
                  {item.title}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function Sidebar({
  show,
  chat,
  live,
}: {
  show: Show;
  chat: ChatLine[];
  live: boolean;
}) {
  return (
    <div
      style={{
        width: SIDEBAR.width,
        height: SIDEBAR.height,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg.surface,
        borderLeft: `1px solid ${palette.line}`,
        boxSizing: 'border-box',
      }}
    >
      <style>{`@keyframes rodney-pulse { 50% { opacity: 0.35; } }`}</style>
      <Brand live={live} />
      <Agenda show={show} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatPanel lines={chat} density="compact" max={20} />
      </div>
    </div>
  );
}
