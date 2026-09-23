"use client";

import { useState } from "react";
import {
  covers,
  dragDomain,
  inDomain,
  intersect,
  linearTicks,
  logTicks,
  zoomDomain,
  type Domain,
} from "@/lib/zoom";

interface Axis {
  /** The unzoomed domain — what the chart shows with no zoom applied. */
  base: Domain;
  log?: boolean;
  /** Ticks for a zoomed view; defaults to 1-2-5 on a log axis, round steps otherwise. */
  ticks?: (d: Domain) => number[];
}

/** What Recharts passes a chart mouse handler — data coordinates only for a scatter. */
interface ChartMouse {
  xValue?: number | null;
  yValue?: number | null;
}

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const STEP = 0.5;

/** Recharts routes touches through the mouse handlers too; only real mouse events drag by default. */
function isMouse(e: unknown): boolean {
  const type = (e as { type?: unknown } | undefined)?.type;
  return typeof type === "string" && type.startsWith("mouse");
}

/**
 * Zoom for a Recharts scatter: drag a box, step in and out about the centre,
 * reset. The zoomed domain lives in state, so it survives re-renders; it is
 * dropped whenever `resetKey` changes, which callers tie to the axis metrics —
 * a zoom window on one metric means nothing on another.
 */
export function useChartZoom({ x, y, resetKey }: { x: Axis; y: Axis; resetKey: string }) {
  const [zoom, setZoom] = useState<{ x: Domain; y: Domain } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [areaMode, setAreaMode] = useState(false);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setZoom(null);
    setBox(null);
  }

  // A filter can shrink the full range under a live zoom; keep what overlaps.
  const zx = zoom ? intersect(zoom.x, x.base) : null;
  const zy = zoom ? intersect(zoom.y, y.base) : null;
  const domainX = zx ?? x.base;
  const domainY = zy ?? y.base;
  const zoomed =
    !covers(domainX, x.base, Boolean(x.log)) || !covers(domainY, y.base, Boolean(y.log));

  const ticksFor = (axis: Axis, d: Domain) =>
    axis.ticks ? axis.ticks(d) : axis.log ? logTicks(d) : linearTicks(d);

  function apply(nextX: Domain, nextY: Domain) {
    const whole =
      covers(nextX, x.base, Boolean(x.log)) && covers(nextY, y.base, Boolean(y.log));
    setZoom(whole ? null : { x: nextX, y: nextY });
  }

  function step(factor: number) {
    apply(
      zoomDomain(domainX, x.base, factor, Boolean(x.log)),
      zoomDomain(domainY, y.base, factor, Boolean(y.log))
    );
  }

  const handlers = {
    onMouseDown: (state: ChartMouse | null, e: unknown) => {
      if (!state || state.xValue == null || state.yValue == null) return;
      if (!isMouse(e) && !areaMode) return;
      setBox({ x1: state.xValue, y1: state.yValue, x2: state.xValue, y2: state.yValue });
    },
    onMouseMove: (state: ChartMouse | null) => {
      if (!box || !state || state.xValue == null || state.yValue == null) return;
      setBox({ ...box, x2: state.xValue, y2: state.yValue });
    },
    onMouseUp: () => {
      if (!box) return;
      apply(
        dragDomain(box.x1, box.x2, domainX, x.base, Boolean(x.log)),
        dragDomain(box.y1, box.y2, domainY, y.base, Boolean(y.log))
      );
      setBox(null);
      setAreaMode(false);
    },
    onMouseLeave: () => setBox(null),
    onDoubleClick: () => setZoom(null),
  };

  return {
    zoomed,
    domain: { x: domainX, y: domainY },
    /** Undefined while unzoomed, so the chart keeps its own hand-picked ticks. */
    ticks: {
      x: zoomed ? ticksFor(x, domainX) : undefined,
      y: zoomed ? ticksFor(y, domainY) : undefined,
    },
    visible: (px: number, py: number) => inDomain(px, domainX) && inDomain(py, domainY),
    selection: box,
    handlers,
    /** Stops a touch drag from scrolling the page, only while area selection is armed. */
    containerStyle: areaMode ? ({ touchAction: "none" } as const) : undefined,
    controls: {
      zoomed,
      areaMode,
      zoomIn: () => step(STEP),
      zoomOut: () => step(1 / STEP),
      toggleArea: () => setAreaMode((v) => !v),
      reset: () => setZoom(null),
    },
  };
}

export function ZoomControls({
  zoomed,
  areaMode,
  zoomIn,
  zoomOut,
  toggleArea,
  reset,
}: ReturnType<typeof useChartZoom>["controls"]) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-ink-muted">
        {areaMode
          ? "Drag across the plot to zoom into that area."
          : zoomed
            ? "Zoomed in — double-click the plot or reset to see everything."
            : "Drag across the plot to zoom in."}
      </p>
      <div className="flex items-center gap-1" role="group" aria-label="Zoom">
        <button
          type="button"
          onClick={zoomIn}
          className="chip px-2 hover:border-[var(--border-strong)]"
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={zoomOut}
          disabled={!zoomed}
          className="chip px-2 hover:border-[var(--border-strong)] disabled:opacity-40"
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={toggleArea}
          aria-pressed={areaMode}
          className={`chip ${areaMode ? "chip-active" : "hover:border-[var(--border-strong)]"}`}
          title="Drag a box on the plot to zoom into it — needed on touch screens"
        >
          Select area
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={!zoomed}
          className="chip hover:border-[var(--border-strong)] disabled:opacity-40"
        >
          Reset zoom
        </button>
      </div>
    </div>
  );
}
