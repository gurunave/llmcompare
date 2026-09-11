import { MODELS } from "./models";
import { monthIndex, indexToMonth } from "./timeline";
import type { DerivedModel } from "./types";

/**
 * Where the models come from.
 *
 * The catalog records a provider, not a country — so everything here hangs off
 * one hand-kept mapping from provider to the country its publishing
 * organization is headquartered in. That is a deliberately narrow claim:
 * research is international, weights get trained on rented capacity anywhere,
 * and several of these labs were founded somewhere other than where they now
 * file their paperwork. A country column says "this is the flag on the
 * organization that shipped it", nothing more, and the entries where that
 * reading is genuinely contested carry a note that says so on the page.
 */

export type CountryCode = "US" | "CN" | "FR" | "CA" | "IL" | "AE" | "CH" | "XX";

export interface Country {
  code: CountryCode;
  name: string;
  /** Shown beside the name, never instead of it — flags are decoration here. */
  flag: string;
  region: string;
  /**
   * Fixed rather than hashed. These series stack against each other on one
   * chart, so the hues are chosen for separation instead of being left to a
   * hash that could hand two large countries the same green.
   */
  tint: string;
}

const COUNTRY_LIST: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸", region: "North America", tint: "var(--series-1)" },
  { code: "CN", name: "China", flag: "🇨🇳", region: "East Asia", tint: "var(--series-2)" },
  { code: "FR", name: "France", flag: "🇫🇷", region: "Europe", tint: "var(--series-3)" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "North America", tint: "var(--series-5)" },
  { code: "IL", name: "Israel", flag: "🇮🇱", region: "Middle East", tint: "var(--series-7)" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", region: "Middle East", tint: "var(--series-4)" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", region: "Europe", tint: "var(--series-6)" },
  { code: "XX", name: "Unattributed", flag: "🏳️", region: "—", tint: "var(--text-muted)" },
];

export const COUNTRIES = new Map(COUNTRY_LIST.map((c) => [c.code, c]));

/** The fallback for a provider added to the catalog before it is mapped here. */
export const UNATTRIBUTED = COUNTRIES.get("XX") as Country;

interface Origin {
  country: CountryCode;
  /** Only where the attribution is genuinely arguable — surfaced in the UI. */
  note?: string;
}

/**
 * Provider → headquarters. Every provider in `data/models.json` needs an entry;
 * `tests/geography.test.ts` fails the build if one is missing, so a new
 * provider cannot quietly land in the unattributed bucket.
 */
export const PROVIDER_ORIGIN: Record<string, Origin> = {
  // United States
  OpenAI: { country: "US" },
  Anthropic: { country: "US" },
  Google: { country: "US" },
  Meta: { country: "US" },
  xAI: { country: "US" },
  Microsoft: { country: "US" },
  Amazon: { country: "US" },
  NVIDIA: { country: "US" },
  IBM: { country: "US" },
  "Allen AI": { country: "US" },
  "Thinking Machines": { country: "US" },
  "Liquid AI": { country: "US" },
  DeepReinforce: { country: "US" },
  Poolside: {
    country: "US",
    note: "US-incorporated, but much of the team and its training work sit in Paris.",
  },
  "Hugging Face": {
    country: "US",
    note: "Headquartered in New York, founded by a French team and still substantially based in Paris.",
  },

  // China
  DeepSeek: { country: "CN" },
  Alibaba: { country: "CN" },
  Moonshot: { country: "CN" },
  Zhipu: { country: "CN" },
  MiniMax: { country: "CN" },
  Tencent: { country: "CN" },
  Baidu: { country: "CN" },
  ByteDance: { country: "CN" },
  "Ant Group": { country: "CN" },

  // Elsewhere
  Mistral: { country: "FR" },
  Cohere: {
    country: "CA",
    note: "Toronto-headquartered, with a large share of its staff in San Francisco and London.",
  },
  AI21: { country: "IL" },
  TII: { country: "AE" },
  "Swiss AI": { country: "CH" },
};

export function originOf(provider: string): Origin {
  return PROVIDER_ORIGIN[provider] ?? { country: "XX" };
}

export function countryOf(provider: string): Country {
  return COUNTRIES.get(originOf(provider).country) ?? UNATTRIBUTED;
}

export function countryTint(code: CountryCode): string {
  return COUNTRIES.get(code)?.tint ?? UNATTRIBUTED.tint;
}

/** One country's position in the catalog as it stands today. */
export interface Standing {
  country: Country;
  models: DerivedModel[];
  /** Providers based here, alphabetical. */
  providers: string[];
  /** Share of the whole pool, 0–1. */
  share: number;
  /** Open-weight releases ÷ releases, 0–1. */
  openShare: number;
  /** Earliest and latest release month in the pool, `"YYYY-MM"`. */
  first: string | null;
  latest: string | null;
  /** Highest capability index published from here, and the model holding it. */
  best: DerivedModel | null;
  capability: number | null;
  /** Points behind the catalog's best model. Zero for the country holding it. */
  gap: number | null;
  /** Models in the current top `frontierSize` by capability. */
  frontier: DerivedModel[];
  /** Providers' notes worth showing, already prefixed with the provider name. */
  notes: string[];
}

function byCapabilityDesc(a: DerivedModel, b: DerivedModel): number {
  return (b.capability ?? -1) - (a.capability ?? -1) || a.name.localeCompare(b.name);
}

/**
 * The frontier at a point in time: the `size` highest-scoring models among
 * everything released so far. Models with no published capability index cannot
 * be ranked and are left out rather than sorted to the bottom — an unmeasured
 * model is not a weak one.
 */
export function frontierOf(models: DerivedModel[], size: number): DerivedModel[] {
  return models
    .filter((m) => m.capability !== null)
    .sort(byCapabilityDesc)
    .slice(0, size);
}

/** Today's standings over an arbitrary pool, strongest-held country first. */
export function standingsOf(models: DerivedModel[] = MODELS, frontierSize = 10): Standing[] {
  const buckets = new Map<CountryCode, DerivedModel[]>();
  for (const m of models) {
    const code = countryOf(m.provider).code;
    const list = buckets.get(code);
    if (list) list.push(m);
    else buckets.set(code, [m]);
  }

  const frontier = frontierOf(models, frontierSize);
  const bestOverall = frontier[0]?.capability ?? null;

  const standings = Array.from(buckets.entries()).map(([code, list]) => {
    const country = COUNTRIES.get(code) ?? UNATTRIBUTED;
    const sorted = [...list].sort(byCapabilityDesc);
    const best = sorted.find((m) => m.capability !== null) ?? null;
    const months = list.map((m) => m.released).sort();
    const providers = Array.from(new Set(list.map((m) => m.provider))).sort();

    return {
      country,
      models: sorted,
      providers,
      share: models.length ? list.length / models.length : 0,
      openShare: list.length ? list.filter((m) => m.license === "open").length / list.length : 0,
      first: months[0] ?? null,
      latest: months[months.length - 1] ?? null,
      best,
      capability: best?.capability ?? null,
      gap:
        best?.capability != null && bestOverall !== null ? bestOverall - best.capability : null,
      frontier: frontier.filter((m) => countryOf(m.provider).code === code),
      notes: providers
        .map((p) => ({ p, note: originOf(p).note }))
        .filter((n): n is { p: string; note: string } => Boolean(n.note))
        .map((n) => `${n.p}: ${n.note}`),
    };
  });

  return standings.sort(
    (a, b) =>
      b.frontier.length - a.frontier.length ||
      (b.capability ?? -1) - (a.capability ?? -1) ||
      b.models.length - a.models.length
  );
}

/** One month of the journey, with every country present in the pool accounted for. */
export interface JourneyMonth {
  month: string;
  idx: number;
  /** Models shipped in this month, by country code. */
  released: Record<string, number>;
  /** Everything shipped up to and including this month, by country code. */
  cumulative: Record<string, number>;
  /** Best capability index published up to this month, by country code. */
  best: Record<string, number | null>;
  /** Seats held in the running top-N, by country code. */
  frontier: Record<string, number>;
  /** Those seats as a share of the frontier, 0–1, by country code. */
  frontierShare: Record<string, number>;
  /** The best index anywhere in the catalog at this point. */
  ceiling: number | null;
  /** The country holding that best model. Ties go to whoever reached it first. */
  leader: CountryCode | null;
  /** How many models the frontier actually holds — fewer than N early on. */
  frontierSize: number;
}

/**
 * The whole journey, month by month, from the catalog's first release to its
 * last. Each month is read against the catalog *as it stood then*: the
 * cumulative set of everything released up to that point, ranked by capability
 * index, with the top N counted as the frontier. A country's "hold" is how many
 * of those N seats it occupies.
 *
 * Two things this cannot see, both worth stating before reading anything into
 * the shape. The catalog keeps superseded models, so a country that shipped six
 * near-identical checkpoints holds more seats than one that shipped a single
 * stronger model — seats measure presence, not lead. And benchmark coverage is
 * thin and uneven, so a country whose labs publish less appears later here than
 * it did in reality.
 */
export function journeyOf(models: DerivedModel[] = MODELS, frontierSize = 10): JourneyMonth[] {
  if (models.length === 0) return [];

  const codes = Array.from(new Set(models.map((m) => countryOf(m.provider).code)));
  const indices = models.map((m) => monthIndex(m.released));
  const from = Math.min(...indices);
  const to = Math.max(...indices);

  const shipped = new Map<number, DerivedModel[]>();
  for (const m of models) {
    const idx = monthIndex(m.released);
    const list = shipped.get(idx);
    if (list) list.push(m);
    else shipped.set(idx, [m]);
  }

  const zeros = () => Object.fromEntries(codes.map((c) => [c, 0]));

  const cumulative = zeros();
  const best: Record<string, number | null> = Object.fromEntries(codes.map((c) => [c, null]));
  let leader: CountryCode | null = null;
  let ceiling: number | null = null;
  const sofar: DerivedModel[] = [];
  const months: JourneyMonth[] = [];

  for (let idx = from; idx <= to; idx++) {
    const batch = shipped.get(idx) ?? [];
    const released = zeros();

    for (const m of batch) {
      const code = countryOf(m.provider).code;
      released[code] += 1;
      cumulative[code] += 1;
      sofar.push(m);
      if (m.capability !== null && (best[code] === null || m.capability > (best[code] as number))) {
        best[code] = m.capability;
      }
      // Strictly greater, so the country that first reached a score keeps the
      // lead until somebody actually beats it rather than merely matching it.
      if (m.capability !== null && (ceiling === null || m.capability > ceiling)) {
        ceiling = m.capability;
        leader = code;
      }
    }

    const top = frontierOf(sofar, frontierSize);
    const frontier = zeros();
    for (const m of top) frontier[countryOf(m.provider).code] += 1;
    const frontierShare = Object.fromEntries(
      codes.map((c) => [c, top.length ? frontier[c] / top.length : 0])
    );

    months.push({
      month: indexToMonth(idx),
      idx,
      released,
      cumulative: { ...cumulative },
      best: { ...best },
      frontier,
      frontierShare,
      ceiling,
      leader,
      frontierSize: top.length,
    });
  }

  return months;
}

/**
 * The months where a country's own best score moved — its milestones. Every
 * other release is a model it already had a better version of, and plotting
 * those as steps would draw a staircase with no steps in it.
 */
export interface Milestone {
  model: DerivedModel;
  /** The country's best index before this model landed. Null for its first. */
  from: number | null;
  to: number;
  /** Points behind the catalog's best at that moment. */
  gap: number;
  /** Whether this model took the overall lead. */
  tookLead: boolean;
}

export function milestonesOf(code: CountryCode, models: DerivedModel[] = MODELS): Milestone[] {
  const ordered = models
    .filter((m) => m.capability !== null)
    .sort((a, b) => monthIndex(a.released) - monthIndex(b.released) || a.name.localeCompare(b.name));

  let best: number | null = null;
  let ceiling: number | null = null;
  const out: Milestone[] = [];

  for (const m of ordered) {
    const score = m.capability as number;
    const mine = countryOf(m.provider).code === code;
    if (mine && (best === null || score > best)) {
      out.push({
        model: m,
        from: best,
        to: score,
        gap: Math.max(0, (ceiling ?? score) - score),
        tookLead: ceiling === null || score > ceiling,
      });
      best = score;
    }
    if (ceiling === null || score > ceiling) ceiling = score;
  }

  return out.reverse();
}

/** `0.42` → `42%`, matching how the coverage page reads a share. */
export function formatPercent(share: number): string {
  const pct = share * 100;
  if (pct > 0 && pct < 1) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}
