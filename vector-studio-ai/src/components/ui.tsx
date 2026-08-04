"use client";
/**
 * Primitivas de UI reutilizables: Slider, Switch, Selector segmentado, Sección.
 */
import { motion } from "framer-motion";

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[hsl(var(--border))] bg-surface-raised p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-[hsl(var(--text-muted))]">{label}</span>
        <span className="font-mono text-xs text-[hsl(var(--text))]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        title={hint}
      />
    </label>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-sm text-[hsl(var(--text))] hover:bg-surface-hover"
      title={hint}
    >
      <span>{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--border))]"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-surface-hover p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-fg))] shadow"
              : "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-fg))] hover:opacity-90 shadow",
    secondary: "bg-surface-hover text-[hsl(var(--text))] hover:bg-[hsl(var(--border))]",
    ghost: "bg-transparent text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] hover:bg-surface-hover",
    danger: "bg-red-500/15 text-red-500 hover:bg-red-500/25",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
