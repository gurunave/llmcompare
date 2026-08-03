# LLM Compare

A visual side-by-side comparison of large language models — capability, price,
speed and context, for 97 models across 25 providers — 64 of them open-weights,
from cluster-scale MoEs down to models that fit on a laptop.

Everything is driven by one bundled file — `data/models.json` — so there are no API
keys, no backend and no network calls at runtime.

## Pages

| Route | What it does |
|---|---|
| `/` | Browse: cost-vs-capability scatter over the whole catalog, plus a sortable, filterable table. Selection happens here. |
| `/compare` | The selection side by side: capability radar, benchmark bars with a leaderboard mode, and a spec table marking the best value per row. |
| `/models/[id]` | One page per model — headline stats, its own radar and benchmark bars, full specs, and the closest alternatives by price and capability. 97 statically generated pages. |
| `/recommend` | Four questions about task, budget, deployment target and context; hard constraints filter, cost and speed preferences rank. |
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
  "url": "https://example.com/docs"
}
```

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

- Categorical colors come from a CVD-validated palette; the four series slots pass
  the adjacent-pair separation gates, and because four slots do not clear the
  all-pairs gates, every chart pairs color with a second channel — dash patterns on
  the radar strokes, direct labels on scatter points, and colored chips beside names
  in the legend, table headers and selection tray.
- Color outside the charts is an identity layer, never decoration for its own sake.
  Each provider draws a stable hue from the same eight-slot palette (hashed from the
  name, so a provider keeps its color as the catalog grows), licence has its own two
  hues — aqua for open weights, violet for proprietary — and the nav rail gives each
  section a hue so the sidebar reads as a map. Every dot and badge sits beside the
  text it labels, so nothing rests on hue alone.
- The cost-vs-capability cloud is split by licence in those same two hues. They clear
  the all-pairs CVD and normal-vision gates in both modes; the cloud sits at partial
  opacity so the labeled selection still reads on top of it.
- Readability: table text at 15px with zebra striping, a sticky header and a hover
  wash; the mean and SWE-bench columns carry a length bar under the number; light-mode
  muted ink is stepped down from the palette default to clear 4.5:1 on the page plane;
  and focus-visible draws one accent ring everywhere.
- Dark is the default theme; the toggle persists to `localStorage` and is stamped
  before first paint so the page never flashes.
- The selection lives in the URL (`?m=claude-opus-5,gpt-5`), so any comparison is
  shareable.
- Wide tables scroll inside their own containers; the page body never scrolls
  sideways.

## Layout

```
app/                 one directory per route, plus design tokens and the root layout
app/models/[id]/     statically generated model pages (generateStaticParams)
components/          app shell, browser, recommender, spec table, selection tray
components/charts/   radar, cost-vs-capability scatter, benchmark bars
lib/                 typed catalog, derived metrics, selection state, scoring
data/models.json     the catalog
```
