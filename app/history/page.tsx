import Link from "next/link";

import { getAllocationSnapshots } from "@/lib/server/allocations";
import { formatSupabaseError } from "@/lib/server/supabase-errors";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function HistoryRoute() {
  let allocations: Awaited<ReturnType<typeof getAllocationSnapshots>> = [];
  let error: string | null = null;

  try {
    allocations = await getAllocationSnapshots();
  } catch (caught) {
    error = formatSupabaseError(caught, "Unable to load allocation history.");
  }

  const isConfigError = error?.toLowerCase().includes("supabase is not configured") ?? false;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#09090b] px-3 py-6 text-[#e4e4e7] sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[34px] font-normal leading-none text-[#ffffff] [font-family:var(--font-logo)]">Tranche</h1>
            <p className="text-sm text-[#a1a1aa]">Saved allocation history.</p>
          </div>
          <nav className="flex w-full gap-2 rounded-sm border border-[#27272a] bg-[#111113] p-1 sm:w-auto">
            <Link
              href="/allocation"
              className="flex-1 rounded-sm px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#e4e4e7] hover:bg-[#202024] sm:flex-none"
            >
              Allocation
            </Link>
            <Link
              href="/history"
              className="flex-1 rounded-sm bg-[#f59e0b] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#09090b] sm:flex-none"
            >
              History
            </Link>
          </nav>
        </div>

        <section className="rounded-sm border border-[#1a1a1e] bg-[#18181b]">
          <div className="border-b border-[#27272a] bg-[#111113] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#f4f4f5]">
            Saved Allocations
          </div>

          {error ? (
            <div className="px-4 py-6">
              <p className="text-sm text-[#f87171]">{error}</p>
              {isConfigError ? (
                <p className="mt-2 text-sm text-[#a1a1aa]">
                  Add the Supabase table from <code>supabase/migrations</code>, then set{" "}
                  <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
                </p>
              ) : (
                <p className="mt-2 text-sm text-[#a1a1aa]">
                  Your saved allocations are still in Supabase. The History page will recover once the database is
                  available again.
                </p>
              )}
            </div>
          ) : allocations.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#a1a1aa]">
              No saved allocations yet.
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1e]">
              {allocations.map((allocation) => (
                <article
                  key={allocation.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_160px_190px] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#ffffff]">
                      {dateFormatter.format(new Date(allocation.created_at))}
                    </p>
                    <p className="mt-1 text-xs text-[#a1a1aa] [font-family:var(--font-mono)]">
                      {allocation.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d4d4d8]">
                      Stock entries
                    </p>
                    <p className="mt-1 text-lg text-[#e4e4e7] [font-family:var(--font-mono)]">
                      {allocation.entry_count}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d4d4d8]">
                      Proceeds
                    </p>
                    <p className="mt-1 text-lg text-[#f59e0b] [font-family:var(--font-mono)]">
                      {currency.format(Number(allocation.budget))}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
