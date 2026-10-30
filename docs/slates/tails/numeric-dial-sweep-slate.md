# Numeric dials — one read, not a hundred copies

> **Status: UNBUILT · opened 2026-10-29 (owner, ceramics review !437).**
> **Left:** the kernel read · the census gate · the sweep to zero.
> **Size:** a tail (a gate, then a mechanical sweep).

## Where this came from

The Thermal review (B105) found `thermalDial(key, fallback)` — a module
function that reads an app setting, parses it as a number, and falls back to
a literal when it is unseeded, unparseable or the read throws. The same
function exists in about **100 files** across the kernel and the packs under
a hundred names (`mouldDial`, `integrityDial`, `ceramicsDial`, `dial`, …).
`AppApi` offers only `setting(key): string`, so every consumer that wants a
number writes its own.

## Why it matters

- **Each copy is a free helper function**, the export discipline's
  antipattern; most survive only because they are not exported.
- **They disagree at the edges**: some swallow a throwing read, some do
  not; some accept `0`, some treat it as unseeded. A dial is a value an
  author tunes, and its reading should be one rule.
- **A typo'd key is silent** in every copy: it reads as unseeded and the
  literal wins. One read is one place to make that loud (an unknown key
  against `AppSettingKeys`).

## The shape

- `AppApi.numberSetting(key, fallback): number` — the one parse, the one
  fallback rule, and the place a key outside `AppSettingKeys` is an error.
- `lint:dial-copies` — a census of module functions that call
  `AppApi.setting` and `Number.parseFloat` together; today's count is the
  ceiling, and the sweep drives it to 0 (the lint-family census-then-ratchet
  pattern).

## Rides into

Any build. It is mechanical once the kernel read exists; the first consumer
is the next build that adds a dial.
