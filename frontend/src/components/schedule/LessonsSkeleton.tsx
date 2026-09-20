export function LessonsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Загружаем расписание</span>
      <div className="grid gap-5" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex gap-3" key={index}>
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-[var(--line)]" />
            <div className="grid flex-1 gap-2 pt-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--line)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--line)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
