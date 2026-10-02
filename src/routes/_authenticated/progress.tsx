import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardMetrics } from "@/components/dashboard-metrics";
import { ProgressCalendar } from "@/components/progress-calendar";

type TabKey = "weight" | "volume" | "strength" | "calendar";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "weight", label: "PESO" },
  { key: "volume", label: "VOLUME" },
  { key: "strength", label: "FORZA" },
  { key: "calendar", label: "CALENDARIO" },
];

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progressi — GAINZ" },
      { name: "description", content: "Peso, volume, forza e calendario degli allenamenti nel tempo." },
      { property: "og:title", content: "Progressi — GAINZ" },
      { property: "og:description", content: "Grafici e calendario di peso, volume e forza su GAINZ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const [active, setActive] = useState<TabKey>("weight");

  return (
    <main className="mx-auto flex h-[calc(100dvh-4.5rem)] max-w-5xl flex-col px-4 pt-4 pb-4">
      <div className="grid grid-cols-4 border-b border-border">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`relative min-w-0 py-3 text-center text-[10px] font-semibold transition-colors sm:text-sm ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
              aria-pressed={isActive}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto pt-4">
        {active === "calendar" ? <ProgressCalendar /> : <DashboardMetrics only={active} />}
      </div>
    </main>
  );
}

