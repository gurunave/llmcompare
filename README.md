# LLM Compare

A visual side-by-side comparison of large language models — capability, price,
speed and context, for 97 models across 25 providers — 64 of them open-weights,
from cluster-scale MoEs down to models that fit on a laptop.

Everything is driven by one bundled file — `data/models.json` — so there are no API
keys, no backend and no network calls at runtime.

## Pages

| Route | What it does |
|---|---|
| `/` | Browse: cost-vs-capability scatter over the whole catalog — either axis can be reframed onto any other metric (prices, individual benchmarks, speed, context, parameters) and reset back — plus a sortable, filterable table. Selection happens here. |
| `/compare` | The selection side by side: capability radar, benchmark bars with a leaderboard mode, and a spec table marking the best value per row. |
| `/models/[id]` | One page per model — headline stats, its own radar and benchmark bars, full specs, and the closest alternatives by price and capability. 97 statically generated pages. |
| `/recommend` | Four questions about task, budget, deployment target and context; hard constraints filter, cost and speed preferences rank. |
| `/hardware` | Pick a GPU, Mac or custom rig and a context length; every open-weight model is sized against it — weights, KV cache and overhead — showing what fits, at which quantization, and an estimated decode speed. The footprint plot's capability axis can be reframed onto any single benchmark. |
| `/methodology` | Where the numbers come from, how blended price and the mean score are computed, what each radar axis means. |

A left rail carries the navigation and the selection tray, so models can be added
or dropped from any page; below `lg` it collapses into a drawer.

### Selection state

The selection is shared across every route by `lib/selection.tsx`. It lives in the
`?m=` query **and** `localStorage`: a `?m=` link always wins on load so a shared
URL shows the sender's picks, and otherwise your last visit is restored. Links
between pages carry the current selection via `withSelection()`.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm run build && npm run start   # production build
npm run typecheck                # tsc --noEmit
```

## Deploying

### GitHub Pages (wired up)

`.github/workflows/deploy.yml` typechecks, builds a static export and publishes it
on every push to `main`.

**One-time setup:** open **Settings → Pages** and set *Source* to **GitHub Actions**.
The workflow's token cannot turn Pages on by itself — creating a Pages site needs
repository admin rights that `GITHUB_TOKEN` does not carry — so until that is set,
the `configure-pages` step fails with `Get Pages site failed` / `Resource not
accessible by integration`. Once it is set, re-run the latest workflow (or push
anything to `main`) and the site publishes to
`https://<owner>.github.io/<repo>/`.

The `GITHUB_PAGES=true` build applies the `/<repo>` base path that project pages
are served under; `REPO_NAME` comes from the workflow, so a rename needs no edit.

### Vercel

The app is a fully static Next.js App Router page, so `vercel` (or `vercel --prod`)
with the defaults is enough — framework detection, build command and output
directory all resolve on their own. Leave `GITHUB_PAGES` unset there: without it
the config is a plain Next app with no base path. Any host that can run
`next build` / `next start` works equally well.

## Editing the data

`data/models.json` is the single source of truth. Add or correct an entry and the
charts, filters, normalization and recommender all pick it up on the next build —
no other file needs to change.

```jsonc
{
  "id": "some-model",           // stable, used in the shareable ?m= URL
  "name": "Some Model",
  "provider": "Some Lab",
  "released": "2026-05",        // YYYY-MM
  "license": "open",            // "open" | "proprietary"
  "params": 32,                 // billions, or null when undisclosed
  "localTier": "workstation",   // laptop | workstation | server | cluster | null
  "context": 131072,            // tokens
  "maxOutput": 32768,
  "modalities": ["text", "image"],
  "reasoning": true,
  "pricing": { "input": 0.1, "output": 0.3 },   // USD per 1M tokens
  "cutoff": "2024-12",
  "speed": 120,                 // output tokens/sec
  "scores": {                   // null means "not published", never zero
    "mmluPro": 70, "gpqa": 56, "swebench": 30, "aime": 72, "mmmu": null
  },
  "tags": ["open-weights", "self-host"],
  "url": "https://example.com/docs",

  // Open-weight entries only — what it takes to size the model in memory.
  "arch": {
    "layers": 64,
    "kvLayers": 64,          // blocks holding a KV cache; fewer for SSM hybrids
    "kvHeads": 8,            // after GQA grouping; null on MLA
    "headDim": 128,
    "attn": "gqa",           // mha | gqa | mla | hybrid
    "kvLatentDim": null,     // MLA's compressed cache width, when it applies
    "activeParams": null,    // billions per token; null means dense
    "slidingWindow": null,   // local-attention window, when layers interleave
    "globalEvery": null,     // 1 in N layers is full-attention
    "source": "config"       // "config" | "estimated"
  }
}
```

`arch` comes from each model's published `config.json`; where no config exists it
is scaled from the nearest sibling and marked `"estimated"`, which the hardware
page surfaces as `est.` rather than passing off as measured. A hosted model has no
`arch` — nothing is published to size — so it shows as *hosted only* instead of as
a model that does not fit.

`data/hardware.json` is the second catalog: GPUs, Macs and CPU tiers with their
memory, bandwidth and device count. Adding a card is one entry, no code change.

Two derived values are computed from that, never stored:

- **Blended price** — `(3 × input + output) / 4`, a 3:1 input:output token mix.
- **Mean score** — the average of the capability benchmarks a model actually
  publishes, so a missing benchmark lowers coverage rather than scoring zero.

The radar axes for speed, value and context are log-scaled before being normalized
across the catalog, so a 10× lead reads as a step instead of flattening every other
model against the axis.

## About the numbers

The figures are approximate and community-reported, reviewed **July 2026**.
Pricing and benchmark scores move constantly, and list prices ignore batch,
cached-input and volume discounts. Verify against the provider's own documentation
before making a purchasing decision. A blank cell means "not published or not
comparably measured" — it is never a zero.

## Design notes

- Up to ten models can be compared at once, which is more than any palette can name.
  Categorical colors come from a CVD-validated palette, ordered so the first six
  selections take its most separated slots; past eight the hues repeat outright. So
  identity never rests on hue: every series carries a **number**, drawn as a badge on
  the mark and repeated in the legend, the selection tray and the table header. Radar
  strokes add a dash pattern, bars label their ends with the badge, and scatter points
  keep their names while few enough are labeled to fit.
- Each chart legend is also a visibility control: click a chip to hide that series
  everywhere on the page, shift-click to isolate it. Hidden state is carried by a
  strike-through and a hollow mark as well as by opacity, rides along in the share
  link as `?hide=`, and never touches the spec table — a data table stays complete.
  A hidden model on the scatter rejoins the anonymous cloud rather than vanishing.
- Color outside the charts is an identity layer, never decoration for its own sake.
  Each provider draws a stable hue from the same eight-slot palette (hashed from the
  name, so a provider keeps its color as the catalog grows), licence has its own two
  hues — aqua for open weights, violet for proprietary — and the nav rail gives each
  section a hue so the sidebar reads as a map. Every dot and badge sits beside the
  text it labels, so nothing rests on hue alone.
- The cost-vs-capability cloud is split by licence in those same two hues. They clear
  the all-pairs CVD and normal-vision gates in both modes; the cloud sits at partial
  opacity so the labeled selection still reads on top of it.
- Fit state on `/hardware` is a four-way encoding — fits, tight, too big, hosted-only — and
  every cell carries a glyph and a screen-reader label as well as a status hue, so the
  quantization ladder survives greyscale and CVD. "Too big" is drawn hollow on the scatter as
  well as dim. Hosted models are labelled *hosted only*, never *won't fit*: they are not too
  large, they are undownloadable, and the distinction is the reader's whole question.
- Readability: table text at 15px with zebra striping, a sticky header and a hover
  wash; the mean and SWE-bench columns carry a length bar under the number; light-mode
  muted ink is stepped down from the palette default to clear 4.5:1 on the page plane;
  and focus-visible draws one accent ring everywhere.
- Dark is the default theme; the toggle persists to `localStorage` and is stamped
  before first paint so the page never flashes.
- The selection lives in the URL (`?m=claude-opus-5,gpt-5`), so any comparison is
  shareable. Order matters: it assigns the colors and badge numbers, and the tray's
  arrows reorder it.
- Charts grow rather than shrink. Benchmark bars run as columns or rows, at three bar
  sizes, and the plot scrolls inside its container while the 0-100 axis is drawn a
  second time in a pinned strip outside the scroller, so the scale is still there once
  you have scrolled away from it. A brush windows the benchmark axis. The radar drops
  its fills above four series so ten outlines stay traceable.
- Wide tables scroll inside their own containers, with the spec column pinned; the page
  body never scrolls sideways.

## Layout

```
app/                 one directory per route, plus design tokens and the root layout
app/models/[id]/     statically generated model pages (generateStaticParams)
components/          app shell, browser, recommender, spec table, selection tray
components/charts/   radar, cost-vs-capability scatter, benchmark bars
lib/                 typed catalog, derived metrics, selection state, scoring
lib/hardware.ts      memory and throughput model — pure functions, no React
data/models.json     the catalog
data/hardware.json   GPUs, Macs and CPU tiers: memory, bandwidth, device count
```
