import { describe, expect, it } from "vitest";
import { covers, dragDomain, intersect, linearTicks, logTicks, zoomDomain, type Domain } from "@/lib/zoom";

const BASE: Domain = [0, 100];

describe("zoomDomain", () => {
  it("halves the span about the centre", () => {
    expect(zoomDomain([0, 100], BASE, 0.5, false)).toEqual([25, 75]);
  });

  it("never zooms out past the full range", () => {
    expect(zoomDomain([25, 75], BASE, 4, false)).toEqual([0, 100]);
  });

  it("shifts back inside the range instead of cutting at an edge", () => {
    const d = zoomDomain([80, 100], BASE, 2, false);
    expect(d[1]).toBe(100);
    expect(d[1] - d[0]).toBeCloseTo(40);
  });

  it("zooms a log axis in decades", () => {
    const [lo, hi] = zoomDomain([0.01, 100], [0.01, 100], 0.5, true);
    expect(lo).toBeCloseTo(0.1);
    expect(hi).toBeCloseTo(10);
  });

  it("stops at a minimum span", () => {
    const d = zoomDomain([50, 50.001], BASE, 0.5, false);
    expect(d[1] - d[0]).toBeCloseTo(1);
  });
});

describe("dragDomain", () => {
  it("zooms to the dragged range in either direction", () => {
    expect(dragDomain(60, 20, BASE, BASE, false)).toEqual([20, 60]);
  });

  it("ignores a drag too short to mean anything on that axis", () => {
    expect(dragDomain(50, 51, [0, 100], BASE, false)).toEqual([0, 100]);
  });

  it("clamps a drag to the full range", () => {
    expect(dragDomain(-20, 40, BASE, BASE, false)).toEqual([0, 40]);
  });
});

describe("helpers", () => {
  it("knows an unzoomed domain", () => {
    expect(covers([0, 100], BASE, false)).toBe(true);
    expect(covers([0, 99], BASE, false)).toBe(false);
  });

  it("intersects or reports no overlap", () => {
    expect(intersect([50, 150], BASE)).toEqual([50, 100]);
    expect(intersect([150, 200], BASE)).toBeNull();
  });

  it("puts round ticks inside the domain", () => {
    expect(linearTicks([12, 58])).toEqual([20, 30, 40, 50]);
    expect(linearTicks([3.2, 4.1], 5, true)).toEqual([4]);
  });

  it("uses 1-2-5 log ticks, falling back under a decade", () => {
    expect(logTicks([0.5, 60])).toEqual([0.5, 1, 2, 5, 10, 20, 50]);
    const narrow = logTicks([30, 70]);
    expect(narrow.length).toBeGreaterThanOrEqual(3);
    expect(narrow.every((t) => t >= 30 && t <= 70)).toBe(true);
  });
});
