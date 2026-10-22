"use client";

/**
 * The assumption register, one click away (plans/03 §2).
 *
 * Two halves: the live global parameters, editable so a judge can watch the
 * conclusion move when an assumption changes, and the full register so every
 * number has a reason attached. "Reset to defaults" is always one click away.
 */

import { Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSUMPTIONS } from "@/lib/assumptions";
import type { SimParams } from "@/sim/types";
import { useSimStore } from "@/store/useSimStore";

type NumericParamKey =
  | "responseScale"
  | "tradeDownK"
  | "dealReach"
  | "demandSigma"
  | "overorderScale"
  | "demandScale"
  | "shelfLifeShift";

const PARAM_CONTROLS: { key: NumericParamKey; label: string; min: number; max: number; step: number }[] = [
  { key: "responseScale", label: "Response scale s", min: 0.5, max: 1.5, step: 0.05 },
  { key: "tradeDownK", label: "Trade-down κ", min: 0, max: 3, step: 0.05 },
  { key: "dealReach", label: "Deal reach ρ", min: 0, max: 1, step: 0.05 },
  { key: "demandSigma", label: "Demand noise σ", min: 0, max: 0.5, step: 0.01 },
  { key: "overorderScale", label: "Over-order scale", min: 0.5, max: 1.5, step: 0.05 },
  { key: "demandScale", label: "Demand scale", min: 0.5, max: 1.5, step: 0.05 },
  { key: "shelfLifeShift", label: "Shelf-life shift (days)", min: -2, max: 2, step: 1 },
];

export function AssumptionsSheet() {
  const params = useSimStore((state) => state.params);
  const setParam = useSimStore((state) => state.setParam);
  const resetParams = useSimStore((state) => state.resetParams);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="size-4" />
          Assumptions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Every assumption, with a reason</SheetTitle>
          <SheetDescription>
            The store and its shoppers are synthetic. Turn a knob and watch the conclusion move —
            that is the point of writing the assumptions down.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Global parameters</h3>
            <Button size="sm" variant="ghost" onClick={() => resetParams()}>
              <RotateCcw className="size-4" />
              Reset to defaults
            </Button>
          </div>

          <div className="space-y-4">
            {PARAM_CONTROLS.map((control) => (
              <div key={control.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`param-${control.key}`} className="text-xs">
                    {control.label}
                  </Label>
                  <span className="font-mono text-xs tabular-nums">
                    {params[control.key].toFixed(2)}
                  </span>
                </div>
                <Slider
                  id={`param-${control.key}`}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={[params[control.key]]}
                  onValueChange={([value]) => setParam({ [control.key]: value } as Partial<SimParams>)}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="weekday-mode" className="text-xs">
                Weekday shape
              </Label>
              <Select
                value={params.weekdayMode}
                onValueChange={(value) => setParam({ weekdayMode: value as SimParams["weekdayMode"] })}
              >
                <SelectTrigger id="weekday-mode" className="w-full" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uci">Blend (UCI · prior)</SelectItem>
                  <SelectItem value="prior">Grocery prior only</SelectItem>
                  <SelectItem value="flat">Flat (no weekly shape)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The blend is 50% UCI Online Retail II + 50% grocery prior. The source is a B2B
                wholesaler with almost no Saturday trade, so Saturday is imputed from Friday and
                Sunday.
              </p>
            </div>
          </div>

          <h3 className="pt-2 text-sm font-semibold">Register</h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Assumption</TableHead>
              <TableHead className="w-32">Value</TableHead>
              <TableHead className="w-28">Range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ASSUMPTIONS.map((assumption) => (
              <TableRow key={assumption.id}>
                <TableCell className="font-mono text-xs">{assumption.id}</TableCell>
                <TableCell>
                  <span className="font-medium">{assumption.assumption}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{assumption.why}</p>
                </TableCell>
                <TableCell className="text-xs">{assumption.value}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {assumption.sensitivity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  );
}
