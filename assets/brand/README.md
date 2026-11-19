# YMCA brand assets

Logos and brand reference for the Grants & Outcomes tracker — the app UI and anything
that renders a funder-facing report.

Everything here was downloaded on **19 November 2026** from sources the YMCA publishes
itself. Nothing was traced, redrawn, or invented; the two derived files are noted below
and are exact recolours of a downloaded original.

## Where things live

| Path | For |
| --- | --- |
| `assets/brand/logos/` | Canonical set — every variant, full resolution. Use for reports, decks, print. |
| `assets/brand/reference/` | The Y's own brand guide. |
| `assets/brand/ymca-palette.{css,json}` | Official palette + fonts, transcribed from the guide. |
| `frontend/public/brand/` | The web subset, served by Vite at `/brand/…`. Copies of files from `logos/`. |

The frontend copy exists because Vite only serves what is under `frontend/public/`. It is
a deliberate duplicate of six small files — if you change a logo here, re-copy it there.

## The logos

### The mark

| File | Format | Notes |
| --- | --- | --- |
| `ymca-mark-white.svg` | vector | Knockout. For dark backgrounds. **As downloaded.** |
| `ymca-mark-purple.svg` | vector | `#5c2e91`. **Derived** — recoloured from the white SVG. |
| `ymca-mark-black.svg` | vector | `#231f20`. **Derived** — recoloured from the white SVG. |
| `ymca-mark-purple-180.webp` | 180×180 | The association's own colour mark, as downloaded. |
| `ymca-mark-dark-180.webp` | 180×180 | Soft black `#2d2d2d`, as downloaded. |
| `ymca-mark-white-107.png` | 107×82 | Small knockout, as downloaded. |

Prefer the SVGs everywhere. The rasters are only worth using at their native size.

### The mark with the areas of impact

"Areas of impact" is the Y's term for the FOR YOUTH DEVELOPMENT / FOR HEALTHY LIVING /
FOR SOCIAL RESPONSIBILITY block. Per the brand guide it must never appear without the logo.

| File | Format | Notes |
| --- | --- | --- |
| `ymca-lockup-impact-white.png` | 1218×394 | Knockout, for dark backgrounds. **As downloaded.** |
| `ymca-lockup-impact-purple.png` | 1218×394 | `#5c2e91`. **Derived.** For light backgrounds and white paper. |
| `ymca-lockup-impact-black.png` | 1218×394 | `#231f20`. **Derived.** |
| `ymca-lockup-impact-white-alt.png` | 1218×394 | Slightly wider text block. As downloaded; alternative to the above. |

Every lockup the YMCA of East Tennessee publishes is white-only, which is unusable on a
light page. The purple and black versions were produced by taking the white PNG — a pure
`#ffffff` image whose shape lives entirely in its alpha channel — and replacing the RGB
while leaving alpha untouched. The result is pixel-for-pixel the same artwork in a
different colour; no edges were redrawn. The guide sanctions exactly this: when the logo
is paired with the areas of impact, the areas of impact take the logo's primary colour.

### National mark

| File | Format | Notes |
| --- | --- | --- |
| `ymca-usa-mark-2color.svg` | vector | YMCA of the USA blue/purple mark, from Wikimedia Commons. |

Use the association's own marks above by default. This one is here for the rare case
where the national brand is the right one to show.

## Why purple

`#5c2e91` is not a guess. The colour mark on ymcaetn.org samples to `#5c2e92`, which is
`#5c2e91` — **PMS 268C** — after WebP compression. That is one of the official palette
colours, so the association's own usage and the national palette agree.

Note that this is the saturated official Y purple, and the Grants & Outcomes deck
deliberately uses a calmer teal/sage system instead. The palette's teal family
(`#006b6b`, `#01a490`, `#20bdbe` — all official) is the bridge if you want chrome that
sits closer to the deck while still being on-brand.

## Rules worth knowing before you place a logo

From `reference/YMCA-Brand-Quick-Guide-2021.pdf`:

- **Clear space** around the logo equals the full height of the word "the" in it.
- **Minimum size** is 0.25 inches tall.
- **Colour versions**: full-colour, 2-colour, white, and black are the only acceptable
  ones. White and black are for when colour is not possible.
- **Do not** assign a logo colour to a location, department, or program.
- **Fonts**: Cachet Pro, with Verdana where Cachet Pro is unavailable — which includes
  the browser, since Cachet Pro is a licensed font and is not bundled here.
- **Tagline**: "For a better us.®" — the ® is required.

## Provenance and rights

| Source | What came from it |
| --- | --- |
| `ymcaetn.org` (WordPress media, `ymcaetn.wpenginepowered.com`) | Every association mark and lockup, and the brand guide PDF. |
| Wikimedia Commons | `ymca-usa-mark-2color.svg` — copyright public domain, **tagged "trademarked"**. |

The Y logo is a registered trademark of YMCA of the USA. These files are here to build a
tool *for* the YMCA of East Tennessee, which is ordinary permitted use — but it is their
mark, not ours, and the repo being public would make these files public too.

**These are web-resolution files pulled from a public website, not official brand
artwork.** The authoritative originals — full-colour and 2-colour vectors, the five logo
colour families, and colour swatches — live in the Y's Brand Resource Center at
`link.ymca.net`, which needs a staff login. Kelly Martin can pull them. Worth doing before
anything goes to a funder; what is here is right for building and demoing.

`ymca.org` itself is behind a Cloudflare challenge and could not be downloaded from.

## Not included

- **World YMCA** wordmark (the global federation's red logotype). Available on Commons,
  deliberately left out so nobody reaches for the wrong mark.
- Two further lockups on ymcaetn.org (`footer-logo-NEW.png` 1100×400 and
  `ymca-aof-logo-400x129-1.png`). Both put the impact text small and far from the mark,
  against the guide's spacing, and the smaller one is visibly soft. Still on the site if
  that proportion is ever wanted.
- **Cachet Pro**, which is licensed and must be obtained through the Y.
