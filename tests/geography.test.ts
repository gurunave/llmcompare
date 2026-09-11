import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  PROVIDER_ORIGIN,
  countryOf,
  formatPercent,
  frontierOf,
  journeyOf,
  milestonesOf,
  originOf,
  standingsOf,
} from "@/lib/geography";
import { MODELS, PROVIDERS } from "@/lib/models";
import { monthIndex } from "@/lib/timeline";

/**
 * The country page reads a political claim off a catalog that records none, so
 * the mapping and the month-by-month replay are the only things standing
 * between the data and a wrong flag on a chart.
 */
describe("geography", () => {
  it("maps every provider in the catalog to a real country", () => {
    for (const provider of PROVIDERS) {
      const origin = PROVIDER_ORIGIN[provider];
      expect(origin, `${provider} has no entry in PROVIDER_ORIGIN`).toBeDefined();
      expect(COUNTRIES.has(origin.country)).toBe(true);
      expect(origin.country).not.toBe("XX");
    }
  });

  it("maps nothing that is not in the catalog", () => {
    const known = new Set(PROVIDERS);
    for (const provider of Object.keys(PROVIDER_ORIGIN)) {
      expect(known.has(provider), `${provider} is mapped but not in the catalog`).toBe(true);
    }
  });

  it("falls back to unattributed rather than throwing on an unknown provider", () => {
    expect(countryOf("Nobody Ltd").code).toBe("XX");
    expect(originOf("Nobody Ltd").note).toBeUndefined();
  });

  it("gives every country its own colour", () => {
    const tints = Array.from(COUNTRIES.values()).map((c) => c.tint);
    expect(new Set(tints).size).toBe(tints.length);
  });
});

describe("standings", () => {
  const standings = standingsOf();

  it("accounts for every model exactly once", () => {
    const total = standings.reduce((n, s) => n + s.models.length, 0);
    expect(total).toBe(MODELS.length);
    const ids = new Set(standings.flatMap((s) => s.models.map((m) => m.id)));
    expect(ids.size).toBe(MODELS.length);
  });

  it("shares sum to one", () => {
    expect(standings.reduce((n, s) => n + s.share, 0)).toBeCloseTo(1);
  });

  it("hands out exactly as many seats as the frontier holds", () => {
    const ranked = MODELS.filter((m) => m.capability !== null).length;
    for (const size of [5, 10, 20]) {
      const seats = standingsOf(MODELS, size).reduce((n, s) => n + s.frontier.length, 0);
      expect(seats).toBe(Math.min(size, ranked));
    }
  });

  it("measures the gap against the best model anywhere", () => {
    const best = Math.max(
      ...MODELS.filter((m) => m.capability !== null).map((m) => m.capability as number)
    );
    const leader = standings.find((s) => s.capability === best);
    expect(leader?.gap).toBe(0);
    for (const s of standings) {
      if (s.gap !== null) expect(s.gap).toBeGreaterThanOrEqual(0);
    }
  });

  it("narrows to the pool it is given", () => {
    const open = standingsOf(MODELS.filter((m) => m.license === "open"));
    expect(open.every((s) => s.openShare === 1)).toBe(true);
    expect(standingsOf([])).toEqual([]);
  });

  it("ranks models with no published score below every measured one", () => {
    const unranked = MODELS.filter((m) => m.capability === null);
    expect(frontierOf(unranked, 10)).toEqual([]);
    expect(frontierOf(MODELS, 10).every((m) => m.capability !== null)).toBe(true);
  });
});

describe("journey", () => {
  const journey = journeyOf();

  it("covers every month from the first release to the last, with no gaps", () => {
    const indices = MODELS.map((m) => monthIndex(m.released));
    expect(journey[0].idx).toBe(Math.min(...indices));
    expect(journey[journey.length - 1].idx).toBe(Math.max(...indices));
    for (let i = 1; i < journey.length; i++) {
      expect(journey[i].idx).toBe(journey[i - 1].idx + 1);
    }
  });

  it("ends on the same standings the catalog shows today", () => {
    const last = journey[journey.length - 1];
    for (const s of standingsOf(MODELS, 10)) {
      expect(last.cumulative[s.country.code]).toBe(s.models.length);
      expect(last.frontier[s.country.code]).toBe(s.frontier.length);
      expect(last.best[s.country.code]).toBe(s.capability);
    }
  });

  it("accumulates releases monotonically and never loses one", () => {
    for (let i = 1; i < journey.length; i++) {
      for (const code of Object.keys(journey[i].cumulative)) {
        expect(journey[i].cumulative[code]).toBe(
          journey[i - 1].cumulative[code] + journey[i].released[code]
        );
      }
    }
    const last = journey[journey.length - 1];
    expect(Object.values(last.cumulative).reduce((a, b) => a + b, 0)).toBe(MODELS.length);
  });

  it("only ever steps a running best upwards", () => {
    for (let i = 1; i < journey.length; i++) {
      for (const [code, best] of Object.entries(journey[i].best)) {
        const previous = journey[i - 1].best[code];
        if (previous !== null) expect(best).toBeGreaterThanOrEqual(previous);
      }
      if (journey[i - 1].ceiling !== null) {
        expect(journey[i].ceiling).toBeGreaterThanOrEqual(journey[i - 1].ceiling as number);
      }
    }
  });

  it("fills the frontier as soon as there are enough ranked models", () => {
    for (const m of journey) {
      const seats = Object.values(m.frontier).reduce((a, b) => a + b, 0);
      expect(seats).toBe(m.frontierSize);
      expect(m.frontierSize).toBeLessThanOrEqual(10);
      const share = Object.values(m.frontierShare).reduce((a, b) => a + b, 0);
      if (m.frontierSize > 0) expect(share).toBeCloseTo(1);
    }
    expect(journey[journey.length - 1].frontierSize).toBe(10);
  });

  it("credits the lead to the country holding the best model of the moment", () => {
    for (const m of journey) {
      if (m.ceiling === null) {
        expect(m.leader).toBeNull();
        continue;
      }
      expect(m.best[m.leader as string]).toBe(m.ceiling);
      for (const best of Object.values(m.best)) {
        if (best !== null) expect(best).toBeLessThanOrEqual(m.ceiling);
      }
    }
  });

  it("survives an empty pool rather than dividing by zero", () => {
    expect(journeyOf([])).toEqual([]);
  });
});

describe("milestones", () => {
  it("lists only the releases that moved a country's own record", () => {
    const us = milestonesOf("US");
    expect(us.length).toBeGreaterThan(0);
    // Reversed to newest-first, so scores descend down the list.
    for (let i = 1; i < us.length; i++) {
      expect(us[i].to).toBeLessThan(us[i - 1].to);
      expect(us[i - 1].from).toBe(us[i].to);
    }
    expect(us[us.length - 1].from).toBeNull();
    expect(us.every((ms) => countryOf(ms.model.provider).code === "US")).toBe(true);
  });

  it("ends on the country's current best", () => {
    for (const s of standingsOf()) {
      const steps = milestonesOf(s.country.code);
      if (s.capability === null) expect(steps).toEqual([]);
      else expect(steps[0].to).toBe(s.capability);
    }
  });

  it("marks a step as taking the lead only when nothing scored higher first", () => {
    for (const ms of milestonesOf("US")) {
      if (ms.tookLead) expect(ms.gap).toBe(0);
      else expect(ms.gap).toBeGreaterThan(0);
    }
  });

  it("reads a share the way the coverage page does", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.005)).toBe("0.5%");
    expect(formatPercent(0.426)).toBe("43%");
    expect(formatPercent(1)).toBe("100%");
  });
});
