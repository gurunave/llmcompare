"use client";

import {
  CONTEXT_CHOICES,
  CONTEXT_LABELS,
  DEVICE_GROUPS,
  KV_QUANTS,
  QUANTS,
  formatGiB,
  usableBytes,
  type KvQuantKey,
  type QuantKey,
  type Rig,
} from "@/lib/hardware";

export interface CustomRig {
  memoryGB: number;
  bandwidthGBs: number;
  devices: number;
  unified: boolean;
}

export const CUSTOM_ID = "custom";

interface Props {
  deviceId: string;
  custom: CustomRig;
  context: number;
  kvQuant: KvQuantKey;
  floor: QuantKey;
  rig: Rig;
  onDevice: (id: string) => void;
  onCustom: (next: CustomRig) => void;
  onContext: (tokens: number) => void;
  onKvQuant: (key: KvQuantKey) => void;
  onFloor: (key: QuantKey) => void;
}

export function HardwarePicker({
  deviceId,
  custom,
  context,
  kvQuant,
  floor,
  rig,
  onDevice,
  onCustom,
  onContext,
  onKvQuant,
  onFloor,
}: Props) {
  const isCustom = deviceId === CUSTOM_ID;

  return (
    <section className="card p-4 sm:p-5">
      <div className="space-y-4">
        <Field label="What are you running it on?">
          {/* A grouped select rather than 24 chips — it works on touch and by
              keyboard, and the groups are how people actually think about it. */}
          <select
            value={deviceId}
            onChange={(e) => onDevice(e.target.value)}
            aria-label="Hardware"
            className="field w-auto max-w-full py-1.5"
          >
            {DEVICE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} — {d.memoryGB} GB
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Something else">
              <option value={CUSTOM_ID}>Custom…</option>
            </optgroup>
          </select>
        </Field>

        {isCustom && (
          <div className="grid gap-3 rounded-lg border border-hairline bg-plane p-3 sm:grid-cols-4">
            <NumberField
              label="Memory"
              suffix="GB"
              value={custom.memoryGB}
              min={1}
              max={2048}
              onChange={(memoryGB) => onCustom({ ...custom, memoryGB })}
            />
            <NumberField
              label="Bandwidth"
              suffix="GB/s"
              value={custom.bandwidthGBs}
              min={10}
              max={10000}
              onChange={(bandwidthGBs) => onCustom({ ...custom, bandwidthGBs })}
            />
            <NumberField
              label="Devices"
              suffix="×"
              value={custom.devices}
              min={1}
              max={64}
              onChange={(devices) => onCustom({ ...custom, devices })}
            />
            <label className="flex flex-col gap-1 text-xs text-ink-secondary">
              <span className="font-medium">Memory type</span>
              <select
                value={custom.unified ? "unified" : "discrete"}
                onChange={(e) => onCustom({ ...custom, unified: e.target.value === "unified" })}
                className="field py-1.5 text-sm"
              >
                <option value="discrete">Dedicated VRAM</option>
                <option value="unified">Shared with the CPU</option>
              </select>
            </label>
            <p className="text-xs text-ink-muted sm:col-span-4">
              Memory is the total across all devices. Bandwidth is the per-device figure —
              it sets the speed estimate, and the spec sheet for your card will have it.
            </p>
          </div>
        )}

        <Field label="How much context do you need to hold?">
          {CONTEXT_CHOICES.map((c) => (
            <Choice key={c} active={context === c} onClick={() => onContext(c)}>
              {CONTEXT_LABELS[c]}
            </Choice>
          ))}
          <span className="mx-1 h-5 w-px bg-hairline" aria-hidden />
          {KV_QUANTS.map((k) => (
            <Choice key={k.key} active={kvQuant === k.key} onClick={() => onKvQuant(k.key)}>
              {k.label}
            </Choice>
          ))}
        </Field>

        <Field label="How much quantization will you accept?">
          {QUANTS.map((q) => (
            <Choice key={q.key} active={floor === q.key} onClick={() => onFloor(q.key)} title={q.quality}>
              {q.label}
            </Choice>
          ))}
        </Field>

        <p className="border-t border-hairline pt-3 text-xs text-ink-muted">
          <span className="font-medium text-ink-secondary">{rig.label}</span> ·{" "}
          {rig.memoryGB} GB total
          {rig.devices > 1 && ` across ${rig.devices} devices`} · {rig.bandwidthGBs} GB/s ·{" "}
          <span className="num">{formatGiB(usableBytes(rig))}</span> usable for a model, after the{" "}
          {rig.unified ? "OS takes its share of a pool it shares with the GPU" : "driver and display reserve"}.
        </p>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </fieldset>
  );
}

function Choice({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`chip ${active ? "chip-active" : "hover:border-[var(--border-strong)]"}`}
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  suffix,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-secondary">
      <span className="font-medium">
        {label} <span className="text-ink-muted">({suffix})</span>
      </span>
      <input
        type="number"
        className="field num py-1.5 text-sm"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
      />
    </label>
  );
}
