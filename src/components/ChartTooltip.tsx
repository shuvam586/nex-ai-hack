"use client";

/**
 * A compact tooltip shared by every chart (plans/03 §1).
 *
 * Colour is never the only signal: each row names its series and prints the
 * value, so the tooltip survives a greyscale printout.
 */

export interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number, dataKey?: string | number) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined ? (
        <p className="mb-1 font-medium">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="space-y-0.5">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey ?? index}`} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-mono tabular-nums">
              {valueFormatter && typeof entry.value === "number"
                ? valueFormatter(entry.value, entry.dataKey)
                : String(entry.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
