import { Suspense } from "react";
import type { Metadata } from "next";
import { DealsView } from "@/components/DealsView";
import { Skeleton } from "@/components/ui/skeleton";
import { parseUrlStateFromRecord } from "@/lib/urlState";

export const metadata: Metadata = {
  title: "Today's deals · Markdown Before Waste",
  description:
    "The shopper's view of the same simulation: what is marked down today, and why it saves food.",
};

function parseDay(value: string | string[] | undefined, days: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(days - 1, Math.max(0, parsed));
}

/**
 * The URL carries the seed, the rule and the day, so a shared deals link
 * always reproduces the same shelf. It is read inside the Suspense boundary
 * (the pattern Next.js asks for when a route depends on the URL).
 */
export default function DealsPage({ searchParams }: PageProps<"/deals">) {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-96 w-full" />}>
      <DealsFromUrl searchParams={searchParams} />
    </Suspense>
  );
}

async function DealsFromUrl({
  searchParams,
}: {
  searchParams: PageProps<"/deals">["searchParams"];
}) {
  const params = await searchParams;
  const state = parseUrlStateFromRecord(params);
  const day = parseDay(params.day, 30);

  return <DealsView seed={state.seed} tiers={state.tiers} initialDay={day} />;
}
