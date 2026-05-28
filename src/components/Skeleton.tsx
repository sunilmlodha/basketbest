/**
 * Skeleton loading components for BasketBest UK.
 *
 * Design rules:
 *   - bg-gray-200 animate-pulse rounded
 *   - Heights / widths mirror the real component's visual weight
 *   - Aria: role="status" + aria-label on each top-level skeleton
 */

// ---------------------------------------------------------------------------
// Base block
// ---------------------------------------------------------------------------

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Single basket item row skeleton
// Mirrors: [icon] [text lines …] [qty stepper]
// ---------------------------------------------------------------------------

function BasketItemRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      {/* Product image placeholder */}
      <SkeletonBlock className="h-14 w-14 shrink-0 rounded-lg" />

      {/* Text lines */}
      <div className="flex flex-1 flex-col gap-1.5">
        <SkeletonBlock className="h-3.5 w-3/4 rounded" />
        <SkeletonBlock className="h-3 w-1/2 rounded" />
      </div>

      {/* Quantity controls placeholder: [−] [n] [+] */}
      <div className="flex shrink-0 items-center gap-1">
        <SkeletonBlock className="h-7 w-7 rounded-full" />
        <SkeletonBlock className="h-5 w-5 rounded" />
        <SkeletonBlock className="h-7 w-7 rounded-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BasketSkeleton — 5 item rows + a summary footer
// ---------------------------------------------------------------------------

export function BasketSkeleton() {
  return (
    <div
      className="page-container"
      role="status"
      aria-label="Loading basket…"
    >
      {/* Page heading placeholder */}
      <div className="flex items-center justify-between py-4">
        <SkeletonBlock className="h-6 w-32 rounded" />
        <SkeletonBlock className="h-5 w-20 rounded" />
      </div>

      {/* Item rows */}
      <div className="card divide-y divide-gray-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <BasketItemRowSkeleton key={i} />
        ))}
      </div>

      {/* Summary footer */}
      <div className="mt-4 space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-24 rounded" />
          <SkeletonBlock className="h-4 w-16 rounded" />
        </div>
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-28 rounded" />
          <SkeletonBlock className="h-4 w-14 rounded" />
        </div>
        <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
      </div>

      <span className="sr-only">Loading basket…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardSkeleton — greeting, 3 stat tiles, basket preview card
// ---------------------------------------------------------------------------

export function DashboardSkeleton() {
  return (
    <div
      className="page-container space-y-5 py-4"
      role="status"
      aria-label="Loading dashboard…"
    >
      {/* Greeting row */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-6 w-40 rounded" />
          <SkeletonBlock className="h-4 w-56 rounded" />
        </div>
        {/* Avatar / profile chip */}
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>

      {/* Stats row — 3 equal tiles */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="card flex flex-col items-center gap-2 py-4"
          >
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <SkeletonBlock className="h-5 w-10 rounded" />
            <SkeletonBlock className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>

      {/* Basket preview card */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-28 rounded" />
          <SkeletonBlock className="h-4 w-16 rounded" />
        </div>
        {/* 3 mini item rows */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10 shrink-0 rounded-md" />
            <div className="flex-1 space-y-1">
              <SkeletonBlock className="h-3.5 w-3/4 rounded" />
              <SkeletonBlock className="h-3 w-1/3 rounded" />
            </div>
            <SkeletonBlock className="h-4 w-10 rounded" />
          </div>
        ))}
        <SkeletonBlock className="h-9 w-full rounded-lg" />
      </div>

      {/* Recent savings banner */}
      <div className="card flex items-center gap-4 p-4">
        <SkeletonBlock className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-4 w-1/2 rounded" />
          <SkeletonBlock className="h-3.5 w-3/4 rounded" />
        </div>
      </div>

      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single comparison store card skeleton
// ---------------------------------------------------------------------------

function ComparisonCardSkeleton() {
  return (
    <div className="card flex flex-col gap-3 p-4">
      {/* Store logo row */}
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-md" />
        <SkeletonBlock className="h-4 w-24 rounded" />
      </div>

      {/* Price */}
      <SkeletonBlock className="h-7 w-20 rounded" />

      {/* Sub-line: items available */}
      <SkeletonBlock className="h-3 w-32 rounded" />

      {/* CTA button */}
      <SkeletonBlock className="h-9 w-full rounded-lg" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComparisonSkeleton — 6 store result cards
// ---------------------------------------------------------------------------

export function ComparisonSkeleton() {
  return (
    <div
      className="page-container space-y-4 py-4"
      role="status"
      aria-label="Loading price comparison…"
    >
      {/* Header / filters row */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-6 w-44 rounded" />
        <SkeletonBlock className="h-8 w-20 rounded-full" />
      </div>

      {/* Summary banner */}
      <div className="card flex items-center gap-3 p-3">
        <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1">
          <SkeletonBlock className="h-3.5 w-1/2 rounded" />
          <SkeletonBlock className="h-3 w-3/4 rounded" />
        </div>
      </div>

      {/* 6 store cards in a 2-column grid on sm+, single column on mobile */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ComparisonCardSkeleton key={i} />
        ))}
      </div>

      <span className="sr-only">Loading price comparison…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single product result row skeleton
// ---------------------------------------------------------------------------

function ProductResultRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      {/* Product image */}
      <SkeletonBlock className="h-16 w-16 shrink-0 rounded-lg" />

      {/* Text stack */}
      <div className="flex flex-1 flex-col gap-1.5">
        <SkeletonBlock className="h-3.5 w-4/5 rounded" />
        <SkeletonBlock className="h-3 w-1/2 rounded" />
        <SkeletonBlock className="h-3 w-1/3 rounded" />
      </div>

      {/* Price + add button */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <SkeletonBlock className="h-5 w-12 rounded" />
        <SkeletonBlock className="h-7 w-14 rounded-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductSearchSkeleton — search bar + result rows
// ---------------------------------------------------------------------------

export function ProductSearchSkeleton() {
  return (
    <div
      className="page-container space-y-3 py-4"
      role="status"
      aria-label="Loading search results…"
    >
      {/* Search bar placeholder */}
      <SkeletonBlock className="h-11 w-full rounded-full" />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="h-8 w-20 shrink-0 rounded-full"
          />
        ))}
      </div>

      {/* Result count line */}
      <SkeletonBlock className="h-3.5 w-32 rounded" />

      {/* Result rows */}
      <div className="card divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductResultRowSkeleton key={i} />
        ))}
      </div>

      <span className="sr-only">Loading search results…</span>
    </div>
  );
}
