/**
 * The brand palette — docs/design/handoff/DESIGN-SYSTEM.md § Colour, the
 * Ink (dark) theme. The three official colours are exact:
 * Old Glory Blue #002868 · Old Glory Red #BF0A30 · White.
 *
 * ⚠ Red never touches blue: every red element carries white between it and
 * the field. Red is for the seal, the flag rule and live/alert states only.
 */
export const palette = {
  brand: {
    blue: '#002868', // Old Glory Blue — a canton, not the whole cloth
    red: '#BF0A30', // Old Glory Red
    white: '#FFFFFF',
  },
  bg: {
    ground: '#071224',
    surface: '#0d1c38',
    raised: '#15274a',
    sunken: '#040b17',
  },
  line: '#22355e',
  lineSoft: '#132441',
  text: {
    fg: '#f2f5fa',
    dim: '#9fb0cc',
    mute: '#8494b3',
  },
  accent: '#c9a227', // brass
  platform: {
    twitch: '#9146FF',
    youtube: '#FF0033',
    kick: '#53FC18',
    patreon: '#FF424D',
  },
} as const;
