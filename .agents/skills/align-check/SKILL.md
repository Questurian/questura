---
name: align-check
description: >
  Check that Questura blocks line up: draws guide lines (content edges,
  image/text edges, cap height, baseline, x-height) over screenshots of each
  block and lists every edge, top or rule that is off by a few pixels. Use when
  the user says "alignment check", "align check", "check the spacing", "line
  it up", "is this flush", "guide lines", or asks whether a block, card, grid,
  featured layout, spotlight or footer looks clean and professional.
---

# Alignment check

The user cares that blocks are flush: copy starts on the photo's edge, columns
start on the same top line, rules run gutter to gutter, icons sit centred on
the letters next to them. This skill measures that instead of eyeballing it.

## Run it

Needs the local dev server (`pnpm dev` in `apps/questura`) and Chrome.

```bash
node .agents/skills/align-check/scripts/align.mjs http://localhost:3000/ --width 1440
```

- `--width` — run at least 1440, 1024, 768 and 390. Most bugs show at one width only.
- `--block 3` — only the 4th block of a homepage-style page (`/`, `/peru/lima`, `/eat`).
- `--block 'footer'` or `--block main` — any CSS selector; use `main` for pages that are not a block list (articles, index pages).
- `--out <dir>` — where the overlay PNGs go (default `$TMPDIR/align-check`). Use a different dir per page or the files overwrite each other.
- `--scale 2` — sharper overlays for a close look at an icon or a kicker.

It prints one line per finding and writes one overlay PNG per block. Open the
PNGs too: the script only knows the checks below, and the overlay shows the
rest (uneven gaps, centred things that are not centred).

## What the lines mean

| Colour | Line |
|---|---|
| cyan | page content edges: `--block-max-width` inset by `--block-gutter` (44 / 1396 at 1440) |
| magenta | every distinct left/right edge of photos and text ink |
| red | cap height and baseline of each title |
| lime | x-height of each title |
| orange | the block's first photo top, and any rule flagged as off-grid |

## What it reports

1. Copy that starts 1.5–40px off the photo above it (the "Barranco" bug: copy indented by an extra gutter).
2. Block content or the rightmost photo that misses the page content edges.
3. Horizontal rules that run past or short of the content edges (a border on a padded box runs 24px past both edges).
4. Photos that start a few px below the block's first photo top (side stacks with top padding).
5. Kicker-to-title gaps that differ between cards of one block.

Differences ≤1.5px are rendering noise. Differences over 40px are treated as
deliberate (a second column, an indent by design). Full-bleed photos and
centred copy are skipped on purpose.

## Fixing what it finds

- Page grid: `--block-max-width` / `--block-gutter` in `foundations.css`, and `BlockSection` in `features/CityDashboard/components/blocks/BlockSection.tsx`. A block's content must sit between the cyan lines.
- A rule across a block's padded layout box: draw it as a content-width background, not a border:
  `background: linear-gradient(c, c) no-repeat var(--block-gutter) 0 / calc(100% - 2 * var(--block-gutter)) 1px;`
- An icon next to text (the Maps pin): size it in `em` and centre it with `items-center`; check at `--scale 4` that the icon's centre sits on the midpoint between the red cap-height and baseline lines.
- Re-run at every width after a fix, and show the user the overlay PNG for the block that changed.

Not every asymmetry is a bug. A centred spotlight column, a deliberately
inset pull quote, or a full-bleed photo are design choices; say so instead of
"fixing" them.
