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
