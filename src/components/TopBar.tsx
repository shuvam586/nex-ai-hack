"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSimStore } from "@/store/useSimStore";
import { AssumptionsSheet } from "@/components/AssumptionsSheet";

/**
 * The top bar: brand, and the seed — always visible, always editable.
 *
 * The seed is the reproducibility guarantee, so it never goes behind a menu:
 * change it and the numbers change, keep it and the numbers are identical
 * everywhere.
 */
export function TopBar() {
  const seed = useSimStore((state) => state.seed);
  const setSeed = useSimStore((state) => state.setSeed);
  const [draft, setDraft] = useState(String(seed));
  const [syncedSeed, setSyncedSeed] = useState(seed);

  // Keep the input in step with the seed when it changes elsewhere (the
  // re-roll button, or the URL). Adjusting during render is React's
  // alternative to an effect for this.
  if (seed !== syncedSeed) {
    setSyncedSeed(seed);
    setDraft(String(seed));
  }

  const commit = () => {
    const parsed = Number.parseInt(draft.trim(), 10);
    if (Number.isFinite(parsed)) {
      setSeed(parsed);
    } else {
      setDraft(String(seed));
    }
  };

  const reroll = () => {
    // A UI convenience, not simulation randomness: the sim itself is seeded.
    setSeed(Math.floor(Math.random() * 9000) + 100);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          🥖
        </span>
        <div>
          <h1 className="font-heading text-lg leading-tight font-semibold">
            Markdown Before Waste
          </h1>
          <p className="text-xs text-muted-foreground">
            Does marking down perishables actually pay?
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="seed" className="text-sm text-muted-foreground">
            Seed
          </Label>
          <Input
            id="seed"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
            }}
            inputMode="numeric"
            className="h-8 w-20 font-mono tabular-nums"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={reroll}
                aria-label="Re-roll the seed"
              >
                <Dices className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pick a new seed</TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4">
              same seed ⇒ same numbers
            </span>
          </TooltipTrigger>
          <TooltipContent>
            The seed drives every random draw, so the same seed reproduces the
            same run on any machine.
          </TooltipContent>
        </Tooltip>

        <AssumptionsSheet />
      </div>
    </header>
  );
}
