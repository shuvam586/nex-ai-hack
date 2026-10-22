import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { SimStoreProvider } from "@/store/useSimStore";
import { parseUrlStateFromRecord } from "@/lib/urlState";

/**
 * The dashboard.
 *
 * The URL is read on the server and handed to the store, so the first paint
 * already shows the seed and the rule from the link — no flash of defaults,
 * and the server and the client agree on the first render.
 *
 * The read sits behind a Suspense boundary (the pattern Next.js asks for
 * when a route depends on the URL): the shell streams in first, the
 * URL-dependent part follows.
 */
export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardFromUrl searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardFromUrl({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = await searchParams;
  const initialState = parseUrlStateFromRecord(params);

  return (
    <SimStoreProvider initialState={initialState}>
      <Dashboard />
    </SimStoreProvider>
  );
}
