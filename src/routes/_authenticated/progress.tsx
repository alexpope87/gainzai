import { createFileRoute } from "@tanstack/react-router";
import { DashboardMetrics } from "@/components/dashboard-metrics";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progressi — GAINZ" },
      { name: "description", content: "Peso, volume di allenamento e trend di forza nel tempo." },
      { property: "og:title", content: "Progressi — GAINZ" },
      { property: "og:description", content: "Grafici di peso, volume e forza su GAINZ." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pt-10 pb-10">
      <p className="label-caps">Progressi</p>
      <h1 className="mt-4 text-3xl font-semibold">I tuoi numeri</h1>

      <div className="mt-8">
        <DashboardMetrics only="metrics" />
      </div>
      <div className="mt-8">
        <DashboardMetrics only="charts" />
      </div>
    </main>
  );
}
