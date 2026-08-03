"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HardwarePicker, CUSTOM_ID, type CustomRig } from "@/components/HardwarePicker";
import { HardwareFit } from "@/components/HardwareFit";
import { PageHeader } from "@/components/PageHeader";
import { FitPanel } from "@/components/charts/FitPanel";
import {
  CONTEXT_CHOICES,
  DEFAULT_CONTEXT,
  DEFAULT_DEVICE_ID,
  DEFAULT_FLOOR,
  DEVICE_BY_ID,
  QUANT_BY_KEY,
  fitCatalog,
  rigFromDevice,
  type KvQuantKey,
  type QuantKey,
  type Rig,
} from "@/lib/hardware";
import { MODELS } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";

const DEFAULT_CUSTOM: CustomRig = {
  memoryGB: 24,
  bandwidthGBs: 1000,
  devices: 1,
  unified: false,
};

export default function HardwarePage() {
  const { ids, models, hidden, toggle, toggleVisible, solo, showAll } = useSelection();

  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [custom, setCustom] = useState<CustomRig>(DEFAULT_CUSTOM);
  const [context, setContext] = useState<number>(DEFAULT_CONTEXT);
  const [kvQuant, setKvQuant] = useState<KvQuantKey>("fp16");
  const [floor, setFloor] = useState<QuantKey>(DEFAULT_FLOOR);
  const [hydrated, setHydrated] = useState(false);

  // The rig rides in the query next to ?m=, so a link to "what runs on a 4090"
  // is as shareable as a link to a comparison.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const hw = params.get("hw");
    if (hw === CUSTOM_ID) {
      setDeviceId(CUSTOM_ID);
      const mem = Number(params.get("mem"));
      const bw = Number(params.get("bw"));
      const n = Number(params.get("n"));
      setCustom({
        memoryGB: Number.isFinite(mem) && mem > 0 ? mem : DEFAULT_CUSTOM.memoryGB,
        bandwidthGBs: Number.isFinite(bw) && bw > 0 ? bw : DEFAULT_CUSTOM.bandwidthGBs,
        devices: Number.isFinite(n) && n > 0 ? n : DEFAULT_CUSTOM.devices,
        unified: params.get("u") === "1",
      });
    } else if (hw && DEVICE_BY_ID.has(hw)) {
      setDeviceId(hw);
    }

    const ctx = Number(params.get("ctx"));
    if (CONTEXT_CHOICES.includes(ctx as (typeof CONTEXT_CHOICES)[number])) setContext(ctx);

    const kv = params.get("kv");
    if (kv === "q8" || kv === "fp16") setKvQuant(kv);

    const q = params.get("q");
    if (q && QUANT_BY_KEY.has(q as QuantKey)) setFloor(q as QuantKey);

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);

    params.set("hw", deviceId);
    params.set("ctx", String(context));
    params.set("kv", kvQuant);
    params.set("q", floor);
    for (const key of ["mem", "bw", "n", "u"]) params.delete(key);
    if (deviceId === CUSTOM_ID) {
      params.set("mem", String(custom.memoryGB));
      params.set("bw", String(custom.bandwidthGBs));
      params.set("n", String(custom.devices));
      params.set("u", custom.unified ? "1" : "0");
    }

    // The selection owns ?m= and ?hide= and writes them itself; rebuilding them
    // by hand here keeps the commas unescaped in both writers.
    const selectionParts = ids.length ? [`m=${ids.join(",")}`] : [];
    const rest: string[] = [];
    params.forEach((value, key) => {
      if (key !== "m" && key !== "hide") rest.push(`${key}=${value}`);
    });
    const hide = new URLSearchParams(window.location.search).get("hide");
    if (ids.length && hide) selectionParts.push(`hide=${hide}`);

    const query = [...selectionParts, ...rest].join("&");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
  }, [hydrated, deviceId, custom, context, kvQuant, floor, ids]);

  const rig: Rig = useMemo(() => {
    if (deviceId === CUSTOM_ID) {
      return {
        label: `Custom · ${custom.memoryGB} GB`,
        memoryGB: custom.memoryGB,
        bandwidthGBs: custom.bandwidthGBs,
        devices: custom.devices,
        unified: custom.unified,
      };
    }
    const device = DEVICE_BY_ID.get(deviceId) ?? DEVICE_BY_ID.get(DEFAULT_DEVICE_ID)!;
    return rigFromDevice(device);
  }, [deviceId, custom]);

  const fits = useMemo(
    () => fitCatalog(MODELS, rig, context, kvQuant, floor),
    [rig, context, kvQuant, floor]
  );

  const onCustom = useCallback((next: CustomRig) => setCustom(next), []);

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Run it yourself"
        lead="Pick the machine you actually have. Every open-weight model in the catalog is sized against it — weights, KV cache and runtime overhead — to show which ones fit, at what quantization, and roughly how fast they will decode."
      />

      <HardwarePicker
        deviceId={deviceId}
        custom={custom}
        context={context}
        kvQuant={kvQuant}
        floor={floor}
        rig={rig}
        onDevice={setDeviceId}
        onCustom={onCustom}
        onContext={setContext}
        onKvQuant={setKvQuant}
        onFloor={setFloor}
      />

      <HardwareFit
        fits={fits}
        rig={rig}
        floor={floor}
        context={context}
        selected={ids}
        onToggle={toggle}
      />

      <FitPanel
        fits={fits}
        rig={rig}
        floor={floor}
        selected={models}
        hidden={hidden}
        onToggle={toggleVisible}
        onSolo={solo}
        onShowAll={showAll}
      />

      <p className="px-1 text-xs text-ink-muted">
        These are estimates from published architecture, not measurements — a real runtime will
        land within roughly 10-20% on memory, and speed is an upper bound that batching, long
        prompts and multi-GPU sync all pull down.{" "}
        <Link href={withSelection("/methodology", ids)} className="link">
          How the sizing works
        </Link>
        .
      </p>
    </main>
  );
}
