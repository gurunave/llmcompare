# LLM Compare

A visual side-by-side comparison of large language models — capability, price,
speed and context, for 50 models across 14 providers.

Pick up to four models and the app renders a capability radar, a cost-vs-capability
scatter, benchmark bars with a leaderboard mode, and a full spec table with the
best value in each row marked. There is also a short questionnaire that shortlists
models against a budget, deployment target and context requirement.

Everything is driven by one bundled file — `data/models.json` — so there are no API
keys, no backend and no network calls at runtime.

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

The app is a fully static Next.js App Router page, so `vercel` (or `vercel --prod`)
with the defaults is enough — framework detection, build command and output
directory all resolve on their own. Any host that can run `next build` / `next start`
works equally well.

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
- Dark is the default theme; the toggle persists to `localStorage` and is stamped
  before first paint so the page never flashes.
- The selection lives in the URL (`?m=claude-opus-5,gpt-5`), so any comparison is
  shareable.
- Wide tables scroll inside their own containers; the page body never scrolls
  sideways.

## Layout

```
app/                 layout, page shell, design tokens
components/          browser, recommender, spec table, selection tray
components/charts/   radar, cost-vs-capability scatter, benchmark bars
lib/                 typed catalog, derived metrics, recommender scoring
data/models.json     the catalog
```
