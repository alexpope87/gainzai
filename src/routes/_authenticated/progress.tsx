import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardMetrics } from "@/components/dashboard-metrics";

type TabKey = "weight" | "volume" | "strength";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "weight", label: "PESO" },
  { key: "volume", label: "VOLUME" },
  { key: "strength", label: "FORZA" },
];

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
  const [active, setActive] = useState<TabKey>("weight");

  return (
    <main className="mx-auto flex h-[calc(100dvh-5rem)] max-w-5xl flex-col px-4 pt-4 pb-24">
      <div className="grid grid-cols-3 border-b border-border">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`relative py-3 text-center text-sm font-semibold tracking-wide transition-colors ${
                isActive ? "text-[#00FF87]" : "text-muted-foreground"
              }`}
              aria-pressed={isActive}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#00FF87]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto pt-4">
        <DashboardMetrics only={active} />
      </div>
    </main>
  );
}

