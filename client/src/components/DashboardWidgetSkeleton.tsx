import { Skeleton } from "@/components/ui/skeleton";

export function DashboardWidgetSkeleton() {
  return (
    <section
      className="role-console__metrics role-console__metrics--loading"
      aria-label="Loading dashboard widgets"
      aria-busy="true"
    >
      {["source-records", "pending-verification", "reviewed-submissions"].map(
        widget => (
          <article key={widget} className="role-console__metric-skeleton">
            <Skeleton className="h-2 w-24" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-2.5 w-full" />
          </article>
        )
      )}
    </section>
  );
}
