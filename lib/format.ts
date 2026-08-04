export function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function formatPrice(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.1) return `$${n.toFixed(3).replace(/0$/, "")}`;
  if (n < 10) return `$${n.toFixed(2).replace(/\.00$/, "")}`;
  return `$${n.toFixed(0)}`;
}

export function formatParams(b: number | null): string {
  if (b === null) return "—";
  if (b >= 1000) return `${(b / 1000).toFixed(1).replace(/\.0$/, "")}T`;
  return `${b}B`;
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${month} ${y}`;
}

export function formatScore(v: number | null | undefined): string {
  return typeof v === "number" ? v.toFixed(0) : "—";
}

/** Elo is a rating, not a percentage — no unit, no decimals. */
export function formatElo(v: number | null | undefined): string {
  return typeof v === "number" ? String(Math.round(v)) : "—";
}

/** A task length, read the way a person would say it: 40s, 12m, 1h 25m, 6.5h. */
export function formatHours(v: number | null | undefined): string {
  if (typeof v !== "number") return "—";
  if (v < 1 / 60) return `${Math.round(v * 3600)}s`;
  if (v < 1) return `${Math.round(v * 60)}m`;
  if (v < 10) {
    const h = Math.floor(v);
    const m = Math.round((v - h) * 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${Math.round(v)}h`;
}
