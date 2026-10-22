import { Skeleton } from "@/components/ui/skeleton";

/**
 * The fallback while the URL is read on the server.
 *
 * It mirrors the dashboard's shape so the page does not jump when the real
 * content arrives.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-brand-ink">
      <header className="flex items-center justify-between gap-4 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            🥖
          </span>
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-40" />
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b bg-card p-4 lg:w-72 lg:border-r lg:border-b-0">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-32 w-full" />
          <Skeleton className="mt-4 h-32 w-full" />
        </aside>

        <main className="flex-1 p-4 lg:p-6">
          <Skeleton className="h-12 w-full" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
