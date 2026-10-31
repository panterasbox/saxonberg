import { CHANNEL } from '../../show/channel';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/**
 * "Bobalu Smallberries @ Pantera's Box" — who you are watching. Set flush
 * right, so the studio's hex — a box, drawn as three rhombi — sits against
 * the word BOX. The white hex is the mark standalone; it carries no blue, so
 * it sits on the dark strip without a seal.
 */
export default function Nameplate({ size = 'small' }: { size?: 'small' | 'large' }) {
  const big = size === 'large';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: big ? 8 : 6,
      }}
    >
      <div style={{ lineHeight: 1.15, whiteSpace: 'nowrap', textAlign: 'right' }}>
        <div
          style={{
            fontFamily: FACE_STACKS.chrome,
            fontWeight: 600,
            fontSize: big ? 24 : 18,
            color: palette.text.fg,
          }}
        >
          {CHANNEL.person}
        </div>
        <div
          style={{
            fontFamily: FACE_STACKS.display,
            fontWeight: 500,
            fontSize: big ? 15 : 12,
            // Letter-spacing trails the last glyph; pull it back so BOX ends
            // flush with the name above and meets the mark.
            letterSpacing: '0.19em',
            marginRight: '-0.19em',
            textTransform: 'uppercase',
            color: palette.text.dim,
            marginTop: 2,
          }}
        >
          @ {CHANNEL.studio}
        </div>
      </div>
      <img
        src="/brand/panterasbox-hex-white.svg"
        alt=""
        style={{
          width: big ? 50 : 38,
          height: big ? 50 : 38,
          display: 'block',
          // The hex sits inside ~17% padding in its viewBox; pull it in so the
          // box meets BOX.
          marginLeft: big ? -8 : -6,
        }}
      />
    </div>
  );
}
