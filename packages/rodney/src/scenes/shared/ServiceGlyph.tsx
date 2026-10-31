import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/** Every platform the overlay names: the chat services, plus Patreon. */
export type Platform = keyof typeof palette.platform;

const LETTER: Record<Platform, string> = {
  twitch: 'T',
  youtube: 'Y',
  kick: 'K',
  patreon: 'P',
};

/**
 * The platform glyph — a small chip in the platform's colour. ⚠ It carries a
 * white rim because some platform colours are red, and red never touches blue
 * (DESIGN-SYSTEM § Colour).
 */
export default function ServiceGlyph({ service, size = 22 }: { service: Platform; size?: number }) {
  return (
    <span
      aria-label={service}
      style={{
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        marginTop: Math.round(size * 0.14),
        borderRadius: 5,
        border: `2px solid ${palette.brand.white}`,
        background: palette.platform[service],
        color: service === 'kick' ? '#04150a' : palette.brand.white,
        fontFamily: FACE_STACKS.chrome,
        fontWeight: 700,
        fontSize: Math.round(size * 0.55),
        lineHeight: 1,
      }}
    >
      {LETTER[service]}
    </span>
  );
}
